import { randomUUID } from "crypto";
import { getDb } from "@/lib/mongo";
import type { UserRole } from "@/lib/settings";
import {
  CONSENT_CHANNEL_LABELS,
  CONSENT_CHANNELS,
  CONSENT_PURPOSE_LABELS,
  CONSENT_PURPOSES,
  canTargetContact,
  emptyChannelState,
  emptyPurposeState,
  isConsentChannel,
  isConsentPurpose,
  purposeIsAllowed,
  type ConsentAudienceRow,
  type ConsentAudienceSnapshot,
  type ConsentChannel,
  type ConsentPreference,
  type ConsentPurpose,
  type ConsentPurposeState,
} from "@/lib/consent-preferences-shared";

const COLLECTION = "consent_preferences";

type Actor = { userId: string; name: string; email: string; role: UserRole };

function nowIso() {
  return new Date().toISOString();
}

function cleanEmail(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
}

function defaultChannels() {
  return Object.fromEntries(
    CONSENT_CHANNELS.map((c) => [c, emptyChannelState()]),
  ) as ConsentPreference["channels"];
}

function defaultPurposes() {
  return Object.fromEntries(
    CONSENT_PURPOSES.map((p) => [p, emptyPurposeState(true)]),
  ) as ConsentPreference["purposes"];
}

function coercePurpose(
  raw: ConsentPurposeState | boolean | undefined,
): ConsentPurposeState {
  if (typeof raw === "boolean") return emptyPurposeState(raw);
  if (!raw || typeof raw !== "object") return emptyPurposeState(true);
  return {
    ...emptyPurposeState(true),
    ...raw,
    allowed: raw.allowed !== false,
  };
}

async function col() {
  const db = await getDb();
  const c = db.collection<ConsentPreference>(COLLECTION);
  void Promise.all([
    c.createIndex({ email: 1 }, { unique: true }).catch(() => undefined),
    c.createIndex({ updatedAt: -1 }).catch(() => undefined),
  ]);
  return c;
}

function stripMongo<T extends { _id?: unknown }>(doc: T): Omit<T, "_id"> {
  const { _id: _, ...rest } = doc;
  return rest;
}

function normalize(doc: ConsentPreference): ConsentPreference {
  const channels = { ...defaultChannels(), ...doc.channels };
  for (const ch of CONSENT_CHANNELS) {
    channels[ch] = { ...emptyChannelState(), ...channels[ch] };
  }
  const purposes = { ...defaultPurposes() };
  for (const p of CONSENT_PURPOSES) {
    const raw = (
      doc.purposes as Record<string, ConsentPurposeState | boolean>
    )?.[p];
    purposes[p] = coercePurpose(raw);
  }
  return {
    ...doc,
    channels,
    purposes,
    history: Array.isArray(doc.history) ? doc.history : [],
  };
}

function hist(
  actor: Actor | { userId: string; name: string },
  detail: string,
  extra?: {
    channel?: ConsentChannel;
    purpose?: ConsentPurpose;
    action?: "grant" | "withdraw" | "create";
  },
): ConsentPreference["history"][number] {
  return {
    id: `CH-${randomUUID().slice(0, 6).toUpperCase()}`,
    at: nowIso(),
    by: actor.userId,
    byName: actor.name,
    detail: detail.slice(0, 400),
    channel: extra?.channel ?? "",
    purpose: extra?.purpose ?? "",
    action: extra?.action ?? "",
  };
}

async function syncLeadConsentFlag(email: string, allowedEmail: boolean) {
  try {
    const db = await getDb();
    const stamp = nowIso();
    await db.collection("leads").updateOne(
      { email },
      {
        $set: {
          consent: allowedEmail,
          consentAt: allowedEmail ? stamp : null,
          updatedAt: Date.now(),
        },
      },
    );
    await db.collection("clients").updateOne(
      { email },
      {
        $set: {
          consent: allowedEmail,
          consentAt: allowedEmail ? stamp : null,
          updatedAt: stamp,
        },
      },
    );
  } catch {
    /* ignore sync errors */
  }
}

export async function listConsentPreferences(): Promise<ConsentPreference[]> {
  const c = await col();
  const rows = await c.find({}).sort({ updatedAt: -1 }).limit(500).toArray();
  return rows.map((r) => normalize(stripMongo(r) as ConsentPreference));
}

export async function getConsentByEmail(
  emailRaw: string,
): Promise<ConsentPreference | null> {
  const email = cleanEmail(emailRaw);
  if (!email) return null;
  const c = await col();
  const row = await c.findOne({ email });
  if (!row) return null;
  return normalize(stripMongo(row) as ConsentPreference);
}

export async function ensureConsentPreference(
  input: {
    email: string;
    contactName?: string;
    company?: string;
  },
  actor?: Actor,
): Promise<ConsentPreference> {
  const email = cleanEmail(input.email);
  if (!email || !email.includes("@")) {
    throw new Error("E-mail contact requis.");
  }
  const existing = await getConsentByEmail(email);
  if (existing) {
    const stamp = nowIso();
    const patch: Partial<ConsentPreference> = {
      contactName:
        String(input.contactName ?? "").trim().slice(0, 120) ||
        existing.contactName,
      company:
        String(input.company ?? "").trim().slice(0, 160) || existing.company,
      updatedAt: stamp,
    };
    const c = await col();
    await c.updateOne({ email }, { $set: patch });
    return { ...existing, ...patch };
  }

  const stamp = nowIso();
  const actorRef = actor || { userId: "system", name: "Système" };
  const doc: ConsentPreference = {
    id: `CNS-${randomUUID().slice(0, 8).toUpperCase()}`,
    email,
    contactName: String(input.contactName ?? "").trim().slice(0, 120),
    company: String(input.company ?? "").trim().slice(0, 160),
    channels: defaultChannels(),
    purposes: defaultPurposes(),
    history: [
      hist(actorRef, "Préférences créées (enregistrement initial)", {
        action: "create",
      }),
    ],
    createdAt: stamp,
    updatedAt: stamp,
  };
  const c = await col();
  await c.insertOne(doc);
  return doc;
}

export async function setConsentChannel(
  emailRaw: string,
  channel: ConsentChannel,
  allowed: boolean,
  actor: Actor,
  note = "",
): Promise<ConsentPreference> {
  if (!isConsentChannel(channel)) throw new Error("Canal invalide.");
  const pref = await ensureConsentPreference({ email: emailRaw }, actor);
  const stamp = nowIso();
  const next: ConsentPreference = {
    ...pref,
    channels: {
      ...pref.channels,
      [channel]: {
        allowed,
        updatedAt: stamp,
        updatedBy: actor.userId,
        updatedByName: actor.name,
        note: note.trim().slice(0, 400),
      },
    },
    history: [
      hist(
        actor,
        `${CONSENT_CHANNEL_LABELS[channel]} → ${allowed ? "enregistré (autorisé)" : "retiré"}${note ? ` · ${note.trim().slice(0, 120)}` : ""}`,
        {
          channel,
          action: allowed ? "grant" : "withdraw",
        },
      ),
      ...pref.history,
    ].slice(0, 80),
    updatedAt: stamp,
  };
  const c = await col();
  await c.replaceOne({ email: pref.email }, next);
  if (channel === "email") {
    await syncLeadConsentFlag(pref.email, allowed);
  }
  return next;
}

export async function setConsentPurpose(
  emailRaw: string,
  purpose: ConsentPurpose,
  allowed: boolean,
  actor: Actor,
  note = "",
): Promise<ConsentPreference> {
  if (!isConsentPurpose(purpose)) throw new Error("Finalité invalide.");
  const pref = await ensureConsentPreference({ email: emailRaw }, actor);
  const stamp = nowIso();
  const next: ConsentPreference = {
    ...pref,
    purposes: {
      ...pref.purposes,
      [purpose]: {
        allowed,
        updatedAt: stamp,
        updatedBy: actor.userId,
        updatedByName: actor.name,
        note: note.trim().slice(0, 400),
      },
    },
    history: [
      hist(
        actor,
        `${CONSENT_PURPOSE_LABELS[purpose]} → ${allowed ? "enregistré" : "retiré"}${note ? ` · ${note.trim().slice(0, 120)}` : ""}`,
        {
          purpose,
          action: allowed ? "grant" : "withdraw",
        },
      ),
      ...pref.history,
    ].slice(0, 80),
    updatedAt: stamp,
  };
  const c = await col();
  await c.replaceOne({ email: pref.email }, next);
  return next;
}

export async function seedConsentFromLeads(): Promise<number> {
  const db = await getDb();
  const leads = await db
    .collection<{
      email?: string;
      name?: string;
      company?: string;
      consent?: boolean;
    }>("leads")
    .find({})
    .project({ email: 1, name: 1, company: 1, consent: 1 })
    .limit(500)
    .toArray();

  let created = 0;
  const system = {
    userId: "system",
    name: "Import leads",
    email: "system@necs.cm",
    role: "admin" as UserRole,
  };
  for (const lead of leads) {
    const email = cleanEmail(lead.email);
    if (!email) continue;
    const existing = await getConsentByEmail(email);
    if (existing) continue;
    await ensureConsentPreference({
      email,
      contactName: lead.name,
      company: lead.company,
    });
    await setConsentChannel(
      email,
      "email",
      lead.consent !== false,
      system,
      lead.consent === false
        ? "Import lead · consentement refusé"
        : "Import lead · consentement accepté",
    );
    created += 1;
  }
  return created;
}

/**
 * Alignement formulaire / lead → préférences (enregistrement ou retrait).
 * Pas un module séparé : appelée à la capture lead.
 */
export async function syncConsentPreferenceFromLead(input: {
  email: string;
  contactName?: string;
  company?: string;
  consent: boolean;
}): Promise<void> {
  const system = {
    userId: "system",
    name: "Formulaire site",
    email: "system@necs.cm",
    role: "admin" as UserRole,
  };
  const pref = await ensureConsentPreference({
    email: input.email,
    contactName: input.contactName,
    company: input.company,
  });
  const wantEmail = Boolean(input.consent);
  if (pref.channels.email.allowed !== wantEmail) {
    await setConsentChannel(
      input.email,
      "email",
      wantEmail,
      system,
      wantEmail
        ? "Enregistrement consentement formulaire"
        : "Retrait / refus consentement formulaire",
    );
  }
  if (wantEmail && !purposeIsAllowed(pref.purposes.marketing)) {
    await setConsentPurpose(
      input.email,
      "marketing",
      true,
      system,
      "Enregistrement finalité marketing (formulaire)",
    );
  }
}

export async function buildConsentAudience(
  channel: ConsentChannel,
  purpose: ConsentPurpose = "marketing",
): Promise<ConsentAudienceSnapshot> {
  if (!isConsentChannel(channel)) {
    throw new Error("Canal invalide.");
  }
  if (!isConsentPurpose(purpose)) {
    throw new Error("Finalité invalide.");
  }

  const prefs = await listConsentPreferences();
  const eligible: ConsentAudienceRow[] = [];
  const excluded: ConsentAudienceRow[] = [];

  for (const pref of prefs) {
    const ok = canTargetContact(pref, channel, purpose);
    const chState = pref.channels[channel];
    const puState = pref.purposes[purpose];
    const row: ConsentAudienceRow = {
      email: pref.email,
      contactName: pref.contactName,
      company: pref.company,
      eligible: ok,
      reason: ok
        ? "Autorisé"
        : !purposeIsAllowed(puState) && purpose !== "service"
          ? `Finalité « ${CONSENT_PURPOSE_LABELS[purpose]} » retirée${
              puState?.updatedAt ? ` le ${puState.updatedAt.slice(0, 10)}` : ""
            }`
          : `Canal « ${CONSENT_CHANNEL_LABELS[channel]} » retiré${
              chState?.updatedAt ? ` le ${chState.updatedAt.slice(0, 10)}` : ""
            }`,
    };
    if (ok) eligible.push(row);
    else excluded.push(row);
  }

  return {
    channel,
    purpose,
    channelLabel: CONSENT_CHANNEL_LABELS[channel],
    purposeLabel: CONSENT_PURPOSE_LABELS[purpose],
    total: prefs.length,
    eligible,
    excluded,
  };
}

/** Filtre une liste d’e-mails : ne garde que les contacts ciblables. */
export async function filterTargetableEmails(
  emails: string[],
  channel: ConsentChannel,
  purpose: ConsentPurpose = "marketing",
): Promise<{
  allowed: string[];
  blocked: Array<{ email: string; reason: string }>;
}> {
  const allowed: string[] = [];
  const blocked: Array<{ email: string; reason: string }> = [];
  for (const raw of emails) {
    const email = cleanEmail(raw);
    if (!email) continue;
    const check = await assertCanTarget(email, channel, purpose);
    if (check.ok) allowed.push(email);
    else blocked.push({ email, reason: check.reason });
  }
  return { allowed, blocked };
}

export async function assertCanTarget(
  email: string,
  channel: ConsentChannel,
  purpose: ConsentPurpose = "marketing",
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const pref = await getConsentByEmail(email);
  if (canTargetContact(pref, channel, purpose)) return { ok: true };
  return {
    ok: false,
    reason: `Contact ${email} : préférence retirée pour ${CONSENT_CHANNEL_LABELS[channel]} / ${CONSENT_PURPOSE_LABELS[purpose]}.`,
  };
}
