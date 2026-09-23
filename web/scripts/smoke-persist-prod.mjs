import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv(file) {
  try {
    const text = readFileSync(resolve(file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      let v = m[2].trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[m[1]]) process.env[m[1]] = v;
    }
  } catch {
    /* ignore */
  }
}

loadEnv(".env.local");

const base = process.env.E2E_BASE_URL || "https://servicesnecs.vercel.app";
const email =
  process.env.E2E_ADMIN_EMAIL ||
  process.env.ADMIN_BOOTSTRAP_EMAIL ||
  "direction@necs.cm";
const password =
  process.env.E2E_ADMIN_PASSWORD ||
  process.env.ADMIN_BOOTSTRAP_PASSWORD ||
  "";

if (!password) {
  console.error(JSON.stringify({ error: "password missing in env" }));
  process.exit(1);
}

const jar = new Map();

function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function req(path, opts = {}) {
  const headers = {
    ...(opts.headers || {}),
    Origin: base,
    Referer: `${base}/admin/login`,
  };
  if (jar.size) headers.Cookie = cookieHeader();
  const res = await fetch(base + path, {
    ...opts,
    headers,
    redirect: "manual",
  });
  storeCookies(res);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 160);
  }
  return { status: res.status, json };
}

function summarize(body) {
  if (body && typeof body === "object") {
    if (body.error) return `error:${body.error}`;
    if (Array.isArray(body)) return `array:${body.length}`;
    for (const key of [
      "items",
      "prospects",
      "quotes",
      "leads",
      "clients",
      "contracts",
      "visits",
      "orders",
      "opportunities",
    ]) {
      if (Array.isArray(body[key])) return `${key}:${body[key].length}`;
    }
    return `keys:${Object.keys(body).slice(0, 8).join(",")}`;
  }
  return String(body).slice(0, 80);
}

const report = [];
report.push({ base, email });
report.push({ step: "blob/status-anon", ...(await req("/api/blob/status")) });

const login = await req("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, remember: true }),
});
report.push({
  step: "login",
  status: login.status,
  summary: login.json?.ok
    ? `ok:${login.json.session?.role}`
    : login.json?.error || summarize(login.json),
});

if (!login.json?.ok) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

report.push({
  step: "me",
  status: (await req("/api/auth/me")).status,
  summary: summarize((await req("/api/auth/me")).json),
});
// re-fetch me once for clean summary
const me = await req("/api/auth/me");
report[report.length - 1] = {
  step: "me",
  status: me.status,
  summary: me.json?.authenticated
    ? `auth:${me.json.session?.email}`
    : summarize(me.json),
};

const blobAuth = await req("/api/blob/status");
report.push({
  step: "blob/status-auth",
  status: blobAuth.status,
  summary: blobAuth.json?.configured
    ? "configured:true"
    : summarize(blobAuth.json),
});

const apis = [
  "/api/leads?meta=1",
  "/api/prospects",
  "/api/quotes",
  "/api/clients",
  "/api/contracts",
  "/api/pipeline",
  "/api/pointage",
  "/api/work-orders",
  "/api/commercial-offers",
  "/api/need-qualification",
  "/api/technical-visits",
  "/api/quality-controls",
  "/api/finance",
  "/api/ops-planning",
  "/api/purchase-orders",
  "/api/non-conformities",
  "/api/satisfaction",
  "/api/inventory",
  "/api/recrutement",
  "/api/documents-signatures",
];

for (const p of apis) {
  const r = await req(p);
  report.push({ step: p, status: r.status, summary: summarize(r.json) });
}

const stamp = Date.now();
const create = await req("/api/prospects", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    company: `QA Persist Prod ${stamp}`,
    name: "Test QA Prod",
    email: `qa.persist.prod.${stamp}@necs.test`,
    phone: "+237600000001",
    city: "Douala",
    source: "autre",
  }),
});
const createdId = create.json?.item?.id || create.json?.id;
report.push({
  step: "prospect-create",
  status: create.status,
  summary: create.json?.error || createdId || summarize(create.json),
});

if (createdId) {
  const got = await req(`/api/prospects?id=${encodeURIComponent(createdId)}`);
  report.push({
    step: "prospect-get",
    status: got.status,
    summary: got.json?.item?.id === createdId ? "persist-ok" : summarize(got.json),
  });

  const patch = await req("/api/prospects", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update",
      id: createdId,
      city: "Yaounde",
      note: `note-qa-prod-${stamp}`,
    }),
  });
  report.push({
    step: "prospect-patch",
    status: patch.status,
    summary:
      patch.json?.item?.city === "Yaounde"
        ? "update-ok"
        : patch.json?.error || summarize(patch.json),
  });

  const got2 = await req(`/api/prospects?id=${encodeURIComponent(createdId)}`);
  report.push({
    step: "prospect-reget",
    status: got2.status,
    summary:
      got2.json?.item?.city === "Yaounde" &&
      String(got2.json?.item?.note || "").includes(`note-qa-prod-${stamp}`)
        ? "persist-update-ok"
        : summarize(got2.json),
  });
}

// Authenticated blob upload token request (not a full file upload)
const tokenRes = await req("/api/blob/upload", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "blob.generate-client-token",
    payload: {
      pathname: `necs/terrain/qa-${stamp}.jpg`,
      callbackUrl: `${base}/api/blob/upload`,
      clientPayload: null,
      multipart: false,
    },
  }),
});
report.push({
  step: "blob-token",
  status: tokenRes.status,
  summary: tokenRes.json?.clientToken
    ? "token-ok"
    : tokenRes.json?.error || summarize(tokenRes.json),
});

console.log(JSON.stringify(report, null, 2));
