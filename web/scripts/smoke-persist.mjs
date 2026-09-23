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

const base = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const email =
  process.env.ADMIN_BOOTSTRAP_EMAIL ||
  process.env.E2E_ADMIN_EMAIL ||
  "direction@necs.cm";
const password =
  process.env.ADMIN_BOOTSTRAP_PASSWORD ||
  process.env.E2E_ADMIN_PASSWORD ||
  "";

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
  const res = await fetch(base + path, { ...opts, headers, redirect: "manual" });
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
report.push({ step: "blob/status-anon", ...(await req("/api/blob/status")) });
report.push({
  step: "login",
  ...(await req("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, remember: true }),
  })),
});
report.push({ step: "me", ...(await req("/api/auth/me")) });
report.push({
  step: "blob/status-auth",
  ...(await req("/api/blob/status")),
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
    company: `QA Persist ${stamp}`,
    name: "Test QA",
    email: `qa.persist.${stamp}@necs.test`,
    phone: "+237600000000",
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
  const gotId = got.json?.item?.id;
  report.push({
    step: "prospect-get",
    status: got.status,
    summary: gotId === createdId ? "persist-ok" : summarize(got.json),
  });

  const patch = await req("/api/prospects", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "update",
      id: createdId,
      city: "Yaounde",
      note: `note-qa-${stamp}`,
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
      String(got2.json?.item?.note || "").includes(`note-qa-${stamp}`)
        ? "persist-update-ok"
        : summarize(got2.json),
  });
}

// Tiny PNG upload via blob client token flow is heavy; just verify upload route rejects unauth
const uploadUnauth = await fetch(`${base}/api/blob/upload`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: base,
  },
  body: JSON.stringify({ type: "blob.generate-client-token" }),
});
report.push({
  step: "blob-upload-unauth",
  status: uploadUnauth.status,
  summary: (await uploadUnauth.text()).slice(0, 80),
});

console.log(JSON.stringify(report, null, 2));
