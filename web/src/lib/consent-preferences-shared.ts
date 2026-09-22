import type { UserRole } from "@/lib/settings";

export type ConsentChannel =
  | "email"
  | "sms"
  | "whatsapp"
  | "telephone"
  | "facebook";

export type ConsentPurpose = "marketing" | "commercial" | "service";

export type ConsentChannelState = {
  allowed: boolean;
  updatedAt: string | null;
  updatedBy: string;
  updatedByName: string;
  note: string;
};

/** Même traçabilité pour les finalités (date + acteur). */
export type ConsentPurposeState = {
  allowed: boolean;
  updatedAt: string | null;
  updatedBy: string;
  updatedByName: string;
  note: string;
};

export type ConsentPreference = {
  id: string;
  email: string;
  contactName: string;
  company: string;
  channels: Record<ConsentChannel, ConsentChannelState>;
  purposes: Record<ConsentPurpose, ConsentPurposeState>;
  history: Array<{
    id: string;
    at: string;
    by: string;
    byName: string;
    detail: string;
    channel?: ConsentChannel | "";
    purpose?: ConsentPurpose | "";
    action?: "grant" | "withdraw" | "create" | "";
  }>;
  createdAt: string;
  updatedAt: string;
};

export type ConsentAudienceRow = {
  email: string;
  contactName: string;
  company: string;
  eligible: boolean;
  reason: string;
};

export type ConsentAudienceSnapshot = {
  channel: ConsentChannel;
  purpose: ConsentPurpose;
  channelLabel: string;
  purposeLabel: string;
  total: number;
  eligible: ConsentAudienceRow[];
  excluded: ConsentAudienceRow[];
};

export const CONSENT_CHANNEL_LABELS: Record<ConsentChannel, string> = {
  email: "E-mail",
  sms: "SMS",
  whatsapp: "WhatsApp",
  telephone: "Téléphone",
  facebook: "Facebook / Meta",
};

export const CONSENT_PURPOSE_LABELS: Record<ConsentPurpose, string> = {
  marketing: "Marketing / campagnes",
  commercial: "Relances commerciales",
  service: "Service client / transactional",
};

export const CONSENT_CHANNELS = Object.keys(
  CONSENT_CHANNEL_LABELS,
) as ConsentChannel[];

export const CONSENT_PURPOSES = Object.keys(
  CONSENT_PURPOSE_LABELS,
) as ConsentPurpose[];

export function canAccessConsentPreferences(role: UserRole): boolean {
  return role === "admin" || role === "marketing";
}

export function canManageConsentPreferences(role: UserRole): boolean {
  return role === "admin" || role === "marketing";
}

export function isConsentChannel(v: unknown): v is ConsentChannel {
  return typeof v === "string" && CONSENT_CHANNELS.includes(v as ConsentChannel);
}

export function isConsentPurpose(v: unknown): v is ConsentPurpose {
  return typeof v === "string" && CONSENT_PURPOSES.includes(v as ConsentPurpose);
}

export function emptyChannelState(): ConsentChannelState {
  return {
    allowed: true,
    updatedAt: null,
    updatedBy: "",
    updatedByName: "",
    note: "",
  };
}

export function emptyPurposeState(allowed = true): ConsentPurposeState {
  return {
    allowed,
    updatedAt: null,
    updatedBy: "",
    updatedByName: "",
    note: "",
  };
}

export function purposeIsAllowed(
  state: ConsentPurposeState | boolean | undefined,
): boolean {
  if (typeof state === "boolean") return state;
  if (!state) return true;
  return state.allowed !== false;
}

/** Un contact n’est ciblable que si canal + finalité marketing/commercial OK. */
export function canTargetContact(
  pref: ConsentPreference | null | undefined,
  channel: ConsentChannel,
  purpose: ConsentPurpose = "marketing",
): boolean {
  if (!pref) return true;
  if (purpose !== "service" && !purposeIsAllowed(pref.purposes[purpose])) {
    return false;
  }
  return pref.channels[channel]?.allowed !== false;
}
