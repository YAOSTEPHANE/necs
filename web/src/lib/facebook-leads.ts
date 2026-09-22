import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { getDb } from "@/lib/mongo";
import {
  notifyCommercialNewLead,
  upsertLeadFromWeb,
  type LeadInput,
} from "@/lib/leads-crm";
import {
  FACEBOOK_REQUIRED_PERMISSIONS,
  isTokenExpired,
  maskToken,
  type FacebookLeadConfigPublic,
  type FacebookSyncResult,
} from "@/lib/facebook-leads-shared";
import { readAuthSecretRaw } from "@/lib/auth-secret";
import type { UserRole } from "@/lib/settings";

const CONFIG_ID = "default";
const GRAPH_VERSION = "v21.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

type Actor = { userId: string; name: string; email: string; role: UserRole };

type FacebookLeadConfigDoc = {
  id: string;
  enabled: boolean;
  pageId: string;
  pageName: string;
  formIds: string[];
  /** AES-GCM token chiffré (base64url). */
  tokenCipher: string;
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
  lastWebhookAt: string | null;
  lastError: string;
  processedCount: number;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
};

type ProcessedLeadDoc = {
  facebookLeadId: string;
  email: string;
  crmLeadId: string;
  at: string;
  source: "webhook" | "sync" | "test";
};

type GraphLeadField = { name?: string; values?: string[] };
type GraphLead = {
  id?: string;
  created_time?: string;
  ad_id?: string;
  form_id?: string;
  field_data?: GraphLeadField[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function clean(value: unknown, max = 400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function secretKey(): Buffer {
  const raw =
    readAuthSecretRaw() || process.env.FACEBOOK_APP_SECRET?.trim() || "";
  if (!raw) {
    throw new Error(
      "AUTH_SECRET ou FACEBOOK_APP_SECRET requis pour chiffrer les tokens Meta.",
    );
  }
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64url");
  if (buf.length < 29) throw new Error("Jeton chiffré invalide");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", secretKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export function appIsConfigured(): boolean {
  return Boolean(
    process.env.FACEBOOK_APP_ID?.trim() &&
      process.env.FACEBOOK_APP_SECRET?.trim(),
  );
}

export function webhookVerifyToken(): string {
  return process.env.FACEBOOK_VERIFY_TOKEN?.trim() || "";
}

async function configCol() {
  const db = await getDb();
  return db.collection<FacebookLeadConfigDoc>("facebook_lead_config");
}

async function processedCol() {
  const db = await getDb();
  const col = db.collection<ProcessedLeadDoc>("facebook_processed_leads");
  void col
    .createIndex({ facebookLeadId: 1 }, { unique: true })
    .catch(() => undefined);
  return col;
}

async function getConfigDoc(): Promise<FacebookLeadConfigDoc | null> {
  const col = await configCol();
  return col.findOne({ id: CONFIG_ID });
}

function toPublic(
  doc: FacebookLeadConfigDoc | null,
): FacebookLeadConfigPublic {
  let tokenPlain = "";
  if (doc?.tokenCipher) {
    try {
      tokenPlain = decryptSecret(doc.tokenCipher);
    } catch {
      tokenPlain = "";
    }
  }
  const expiresAt = doc?.tokenExpiresAt ?? null;
  return {
    enabled: Boolean(doc?.enabled),
    pageId: doc?.pageId ?? "",
    pageName: doc?.pageName ?? "",
    formIds: doc?.formIds ?? [],
    tokenMasked: maskToken(tokenPlain),
    tokenPresent: Boolean(tokenPlain),
    tokenExpiresAt: expiresAt,
    tokenExpired: isTokenExpired(expiresAt),
    webhookVerifyConfigured: Boolean(webhookVerifyToken()),
    appConfigured: appIsConfigured(),
    lastSyncAt: doc?.lastSyncAt ?? null,
    lastWebhookAt: doc?.lastWebhookAt ?? null,
    lastError: doc?.lastError ?? "",
    processedCount: doc?.processedCount ?? 0,
    updatedAt: doc?.updatedAt ?? null,
    updatedByName: doc?.updatedByName ?? "",
    webhookCallbackPath: "/api/facebook/webhook",
    permissions: FACEBOOK_REQUIRED_PERMISSIONS,
  };
}

export async function getFacebookLeadConfigPublic(): Promise<FacebookLeadConfigPublic> {
  const doc = await getConfigDoc();
  return toPublic(doc);
}

export async function saveFacebookLeadConfig(
  input: {
    enabled?: boolean;
    pageId?: string;
    pageName?: string;
    formIds?: string[];
    pageAccessToken?: string;
    tokenExpiresAt?: string | null;
  },
  actor: Actor,
): Promise<FacebookLeadConfigPublic> {
  const existing = await getConfigDoc();
  const pageId = clean(input.pageId ?? existing?.pageId, 80);
  const pageName = clean(input.pageName ?? existing?.pageName, 160);
  const formIds = Array.isArray(input.formIds)
    ? input.formIds.map((f) => clean(f, 80)).filter(Boolean)
    : existing?.formIds ?? [];

  let tokenCipher = existing?.tokenCipher ?? "";
  const rawToken = clean(input.pageAccessToken, 500);
  if (rawToken) {
    tokenCipher = encryptSecret(rawToken);
  }
  if (!pageId) throw new Error("Page ID obligatoire.");
  if (!tokenCipher) throw new Error("Page Access Token obligatoire.");

  const tokenExpiresAt =
    input.tokenExpiresAt === null
      ? null
      : clean(input.tokenExpiresAt ?? existing?.tokenExpiresAt, 40) || null;

  const stamp = nowIso();
  const next: FacebookLeadConfigDoc = {
    id: CONFIG_ID,
    enabled: input.enabled ?? existing?.enabled ?? true,
    pageId,
    pageName,
    formIds,
    tokenCipher,
    tokenExpiresAt,
    lastSyncAt: existing?.lastSyncAt ?? null,
    lastWebhookAt: existing?.lastWebhookAt ?? null,
    lastError: "",
    processedCount: existing?.processedCount ?? 0,
    updatedAt: stamp,
    updatedBy: actor.userId,
    updatedByName: actor.name,
  };

  const col = await configCol();
  await col.replaceOne({ id: CONFIG_ID }, next, { upsert: true });
  return toPublic(next);
}

async function requireAccessToken(): Promise<{
  token: string;
  config: FacebookLeadConfigDoc;
}> {
  const config = await getConfigDoc();
  if (!config?.enabled) {
    throw new Error("Intégration Facebook désactivée.");
  }
  if (!config.tokenCipher) {
    throw new Error("Page Access Token manquant.");
  }
  if (isTokenExpired(config.tokenExpiresAt)) {
    throw new Error(
      "Page Access Token expiré. Renouvelez-le dans la configuration.",
    );
  }
  const token = decryptSecret(config.tokenCipher);
  if (!token) throw new Error("Impossible de lire le token.");
  return { token, config };
}

async function graphGet<T>(
  path: string,
  token: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${GRAPH}${path.startsWith("/") ? path : `/${path}`}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  const data = (await res.json()) as T & {
    error?: { message?: string; code?: number };
  };
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.message || `Graph API ${res.status} sur ${path}`,
    );
  }
  return data;
}

function fieldMap(fields: GraphLeadField[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of fields ?? []) {
    const key = clean(f.name, 80).toLowerCase();
    const value = clean(f.values?.[0], 500);
    if (key && value) out[key] = value;
  }
  return out;
}

function pickField(
  map: Record<string, string>,
  keys: string[],
): string {
  for (const k of keys) {
    if (map[k]) return map[k]!;
  }
  // fuzzy
  for (const [key, value] of Object.entries(map)) {
    if (keys.some((k) => key.includes(k))) return value;
  }
  return "";
}

function leadInputFromGraph(opts: {
  lead: GraphLead;
  formName?: string;
  pageId: string;
  pageName?: string;
}): LeadInput {
  const map = fieldMap(opts.lead.field_data);
  const email = pickField(map, [
    "email",
    "e-mail",
    "work_email",
    "courriel",
  ]).toLowerCase();
  const phone = pickField(map, [
    "phone_number",
    "phone",
    "tel",
    "mobile",
    "téléphone",
    "telephone",
  ]);
  const fullName =
    pickField(map, ["full_name", "fullname", "name", "nom_complet"]) ||
    [pickField(map, ["first_name", "prenom", "prénom"]), pickField(map, ["last_name", "nom"])]
      .filter(Boolean)
      .join(" ");
  const company = pickField(map, [
    "company_name",
    "company",
    "entreprise",
    "societe",
    "société",
  ]);
  const city = pickField(map, ["city", "ville"]);
  const messageExtra = Object.entries(map)
    .filter(
      ([k]) =>
        !["email", "phone_number", "phone", "full_name", "first_name", "last_name"].includes(
          k,
        ),
    )
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const formLabel = opts.formName || opts.lead.form_id || "Lead Ads";
  const subject = `Lead Facebook · ${formLabel}`;
  const message = [
    `Lead importé depuis Facebook Lead Ads.`,
    opts.pageName ? `Page: ${opts.pageName}` : "",
    city ? `Ville: ${city}` : "",
    messageExtra ? `\nChamps:\n${messageExtra}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!email && !phone) {
    throw new Error(
      `Lead ${opts.lead.id || "?"} sans e-mail ni téléphone exploitables.`,
    );
  }

  return {
    name: fullName || email || phone || "Lead Facebook",
    company,
    email: email || `fb-${opts.lead.id}@facebook.lead`,
    phone,
    subject,
    message,
    formType: "contact",
    source: "facebook",
    campaign: formLabel.slice(0, 120),
    medium: "lead_ad",
    utmSource: "facebook",
    pagePath: `facebook://page/${opts.pageId}/form/${opts.lead.form_id || ""}`,
    consent: true,
    facebookLeadId: clean(opts.lead.id, 80),
    facebookFormId: clean(opts.lead.form_id, 80),
    facebookPageId: clean(opts.pageId, 80),
    facebookAdId: clean(opts.lead.ad_id, 80),
    facebookFormName: clean(formLabel, 160),
  };
}

async function markProcessed(
  facebookLeadId: string,
  email: string,
  crmLeadId: string,
  source: ProcessedLeadDoc["source"],
): Promise<boolean> {
  const col = await processedCol();
  try {
    await col.insertOne({
      facebookLeadId,
      email,
      crmLeadId,
      at: nowIso(),
      source,
    });
    return true;
  } catch {
    return false; // already processed
  }
}

async function bumpProcessed(configId: string): Promise<void> {
  const col = await configCol();
  await col.updateOne(
    { id: configId },
    { $inc: { processedCount: 1 }, $set: { lastError: "" } },
  );
}

async function setConfigError(message: string): Promise<void> {
  const col = await configCol();
  await col.updateOne(
    { id: CONFIG_ID },
    { $set: { lastError: message.slice(0, 400), updatedAt: nowIso() } },
  );
}

export async function ingestFacebookLead(opts: {
  lead: GraphLead;
  formName?: string;
  pageId: string;
  pageName?: string;
  origin: ProcessedLeadDoc["source"];
}): Promise<{
  created: boolean;
  skipped: boolean;
  leadId: string;
  email: string;
}> {
  const fbId = clean(opts.lead.id, 80);
  if (!fbId) throw new Error("leadgen_id manquant");

  const processed = await processedCol();
  const already = await processed.findOne({ facebookLeadId: fbId });
  if (already) {
    return {
      created: false,
      skipped: true,
      leadId: already.crmLeadId,
      email: already.email,
    };
  }

  const input = leadInputFromGraph(opts);
  const result = await upsertLeadFromWeb(input);
  if (result.duplicate) {
    await markProcessed(fbId, input.email, result.id, opts.origin);
    return {
      created: false,
      skipped: true,
      leadId: result.id,
      email: input.email,
    };
  }

  const inserted = await markProcessed(fbId, input.email, result.id, opts.origin);
  if (!inserted) {
    return {
      created: false,
      skipped: true,
      leadId: result.id,
      email: input.email,
    };
  }

  await bumpProcessed(CONFIG_ID);
  if (result.created) {
    void notifyCommercialNewLead({ lead: result.lead, created: true }).catch(
      () => undefined,
    );
  }
  return {
    created: result.created,
    skipped: false,
    leadId: result.id,
    email: input.email,
  };
}

export async function fetchAndIngestLeadgenId(
  leadgenId: string,
  meta: {
    pageId?: string;
    formId?: string;
    adId?: string;
    origin: ProcessedLeadDoc["source"];
  },
): Promise<{ created: boolean; skipped: boolean; leadId: string; email: string }> {
  const { token, config } = await requireAccessToken();
  const lead = await graphGet<GraphLead>(`/${leadgenId}`, token, {
    fields: "id,created_time,ad_id,form_id,field_data",
  });
  if (meta.formId && !lead.form_id) lead.form_id = meta.formId;
  if (meta.adId && !lead.ad_id) lead.ad_id = meta.adId;

  let formName = "";
  const formId = lead.form_id || meta.formId || "";
  if (formId) {
    try {
      const form = await graphGet<{ name?: string; id?: string }>(
        `/${formId}`,
        token,
        { fields: "id,name" },
      );
      formName = clean(form.name, 160);
    } catch {
      formName = formId;
    }
  }

  return ingestFacebookLead({
    lead,
    formName,
    pageId: meta.pageId || config.pageId,
    pageName: config.pageName,
    origin: meta.origin,
  });
}

/** Sync pull : formulaires de la Page → derniers leads. */
export async function syncFacebookLeads(opts?: {
  limitPerForm?: number;
}): Promise<FacebookSyncResult> {
  const { token, config } = await requireAccessToken();
  const limit = Math.min(Math.max(opts?.limitPerForm ?? 25, 1), 100);
  const result: FacebookSyncResult = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    type FormsRes = {
      data?: Array<{ id?: string; name?: string; status?: string }>;
    };
    const formsRes = await graphGet<FormsRes>(
      `/${config.pageId}/leadgen_forms`,
      token,
      { fields: "id,name,status", limit: "50" },
    );
    let forms = formsRes.data ?? [];
    if (config.formIds.length > 0) {
      const allow = new Set(config.formIds);
      forms = forms.filter((f) => f.id && allow.has(f.id));
    }

    for (const form of forms) {
      if (!form.id) continue;
      try {
        type LeadsRes = { data?: GraphLead[] };
        const leadsRes = await graphGet<LeadsRes>(`/${form.id}/leads`, token, {
          fields: "id,created_time,ad_id,form_id,field_data",
          limit: String(limit),
        });
        for (const lead of leadsRes.data ?? []) {
          result.fetched += 1;
          try {
            const ing = await ingestFacebookLead({
              lead: { ...lead, form_id: lead.form_id || form.id },
              formName: form.name,
              pageId: config.pageId,
              pageName: config.pageName,
              origin: "sync",
            });
            if (ing.skipped) result.skipped += 1;
            else if (ing.created) result.created += 1;
            else result.updated += 1;
          } catch (err) {
            result.errors.push(
              err instanceof Error ? err.message : "Lead ignoré",
            );
          }
        }
      } catch (err) {
        result.errors.push(
          `Formulaire ${form.id}: ${
            err instanceof Error ? err.message : "erreur"
          }`,
        );
      }
    }

    const col = await configCol();
    await col.updateOne(
      { id: CONFIG_ID },
      {
        $set: {
          lastSyncAt: nowIso(),
          lastError: result.errors[0] ?? "",
          updatedAt: nowIso(),
        },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync Facebook échouée";
    await setConfigError(msg);
    throw err;
  }

  return result;
}

/** Webhook Meta — vérification abonnement. */
export function verifyFacebookWebhookChallenge(params: {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
}): string | null {
  const expected = webhookVerifyToken();
  if (!expected) return null;
  if (params.mode !== "subscribe") return null;
  if (!params.verifyToken || !params.challenge) return null;
  const a = Buffer.from(params.verifyToken);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return params.challenge;
}

/** Valide signature X-Hub-Signature-256. Refuse si APP_SECRET absent. */
export function verifyFacebookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.FACEBOOK_APP_SECRET?.trim();
  if (!secret) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = signatureHeader.slice("sha256=".length);
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(got, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type WebhookBody = {
  object?: string;
  entry?: Array<{
    id?: string;
    time?: number;
    changes?: Array<{
      field?: string;
      value?: {
        leadgen_id?: string;
        page_id?: string;
        form_id?: string;
        ad_id?: string;
        created_time?: number;
      };
    }>;
  }>;
};

export async function processFacebookWebhook(
  body: WebhookBody,
): Promise<{ handled: number; errors: string[] }> {
  const errors: string[] = [];
  let handled = 0;
  if (body.object !== "page") {
    return { handled: 0, errors: ["object ≠ page"] };
  }

  const col = await configCol();
  await col.updateOne(
    { id: CONFIG_ID },
    { $set: { lastWebhookAt: nowIso() } },
  );

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = clean(change.value?.leadgen_id, 80);
      if (!leadgenId) continue;
      try {
        await fetchAndIngestLeadgenId(leadgenId, {
          pageId: clean(change.value?.page_id, 80),
          formId: clean(change.value?.form_id, 80),
          adId: clean(change.value?.ad_id, 80),
          origin: "webhook",
        });
        handled += 1;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Webhook leadgen échoué";
        errors.push(msg);
        await setConfigError(msg);
      }
    }
  }
  return { handled, errors };
}

/** Injecte un lead de recette (mécanisme Facebook supporté / simulation). */
export async function injectFacebookTestLead(input?: {
  name?: string;
  email?: string;
  phone?: string;
}): Promise<{ leadId: string; email: string; created: boolean }> {
  const config = await getConfigDoc();
  const fbId = `TEST-${Date.now()}-${randomBytes(3).toString("hex")}`;
  const email =
    clean(input?.email, 180).toLowerCase() ||
    `fb.test.${Date.now()}@example.com`;
  const lead: GraphLead = {
    id: fbId,
    created_time: nowIso(),
    form_id: config?.formIds[0] || "test_form",
    ad_id: "test_ad",
    field_data: [
      {
        name: "full_name",
        values: [clean(input?.name, 120) || "Lead Facebook Test"],
      },
      { name: "email", values: [email] },
      {
        name: "phone_number",
        values: [clean(input?.phone, 40) || "+237600000000"],
      },
      { name: "company_name", values: ["NECS Demo"] },
      { name: "city", values: ["Douala"] },
    ],
  };
  const result = await ingestFacebookLead({
    lead,
    formName: "Formulaire test Lead Ads",
    pageId: config?.pageId || "test_page",
    pageName: config?.pageName || "NECS Facebook",
    origin: "test",
  });
  return {
    leadId: result.leadId,
    email: result.email,
    created: result.created,
  };
}

export async function listRecentFacebookIngestions(limit = 20) {
  const col = await processedCol();
  return col.find({}).sort({ at: -1 }).limit(limit).toArray();
}
