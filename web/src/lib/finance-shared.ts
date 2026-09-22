import type { UserRole } from "@/lib/settings";

export type FinanceDocStatus =
  | "brouillon"
  | "valide"
  | "envoye"
  | "paye"
  | "annule";

export type FinancePeriodicity =
  | "mensuel"
  | "trimestriel"
  | "semestriel"
  | "annuel"
  | "ponctuel"
  | "autre";

export type FinanceHistoryEntry = {
  id: string;
  at: string;
  by: string;
  byName: string;
  detail: string;
};

export type FinanceLine = {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
};

export type NecsIssuer = {
  legalName: string;
  tradeName: string;
  address: string;
  phone: string;
  email: string;
  rccm: string;
  niu: string;
  bankRefs: string;
};

export const DEFAULT_NECS_ISSUER: NecsIssuer = {
  legalName: "NECS / NECLEANING & SERVICES SARL",
  tradeName: "NECS",
  address: "Douala — Cameroun",
  phone: "+237 6 XX XX XX XX",
  email: "finance@necs.cm",
  rccm: "RCCM à compléter",
  niu: "NIU à compléter",
  bankRefs: "Compte NECS — à rappeler sur tout paiement",
};

export const DEFAULT_TAX_RATE = 19.25;

export const FINANCE_PERIODICITY_LABELS: Record<FinancePeriodicity, string> = {
  mensuel: "Mensuel",
  trimestriel: "Trimestriel",
  semestriel: "Semestriel",
  annuel: "Annuel",
  ponctuel: "Ponctuel",
  autre: "Autre",
};

export const FINANCE_DOC_STATUS_LABELS: Record<FinanceDocStatus, string> = {
  brouillon: "Brouillon",
  valide: "Validé",
  envoye: "Envoyé",
  paye: "Payé / soldé",
  annule: "Annulé",
};

export const FINANCE_PERIODICITIES = Object.keys(
  FINANCE_PERIODICITY_LABELS,
) as FinancePeriodicity[];

export const FINANCE_DOC_STATUSES = Object.keys(
  FINANCE_DOC_STATUS_LABELS,
) as FinanceDocStatus[];

/** Devis commercial formalisé (module Finance). */
export type FinanceQuote = {
  id: string;
  number: string;
  status: FinanceDocStatus;
  clientName: string;
  site: string;
  contactName: string;
  contactEmail: string;
  issueDate: string;
  validityDays: number;
  expiresAt: string | null;
  periodicity: FinancePeriodicity;
  taxRatePct: number;
  paymentTerms: string;
  conditions: string;
  lines: FinanceLine[];
  subtotalHT: number;
  taxAmount: number;
  totalTTC: number;
  note: string;
  history: FinanceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

/** Facture NECS. */
export type FinanceInvoice = {
  id: string;
  number: string;
  status: FinanceDocStatus;
  issuer: NecsIssuer;
  clientName: string;
  site: string;
  contactName: string;
  contactEmail: string;
  contractRef: string;
  periodStart: string;
  periodEnd: string;
  issueDate: string;
  dueDate: string;
  taxRatePct: number;
  paymentTerms: string;
  paymentRefs: string;
  lines: FinanceLine[];
  subtotalHT: number;
  taxAmount: number;
  totalTTC: number;
  quoteId: string;
  quoteNumber: string;
  note: string;
  history: FinanceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

/** Avoir / note de crédit. */
export type FinanceCreditNote = {
  id: string;
  number: string;
  status: FinanceDocStatus;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  reason: string;
  issueDate: string;
  taxRatePct: number;
  lines: FinanceLine[];
  subtotalHT: number;
  taxAmount: number;
  totalTTC: number;
  validatedAt: string | null;
  validatedBy: string;
  validatedByName: string;
  note: string;
  history: FinanceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export function canAccessFinance(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "finance" ||
    role === "manager" ||
    role === "commercial" ||
    role === "ops"
  );
}

export function canEditFinance(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "finance" ||
    role === "commercial" ||
    role === "ops"
  );
}

export function canValidateFinance(role: UserRole): boolean {
  return role === "admin" || role === "finance" || role === "manager";
}

export function isFinanceDocStatus(v: unknown): v is FinanceDocStatus {
  return (
    typeof v === "string" &&
    FINANCE_DOC_STATUSES.includes(v as FinanceDocStatus)
  );
}

export function isFinancePeriodicity(v: unknown): v is FinancePeriodicity {
  return (
    typeof v === "string" &&
    FINANCE_PERIODICITIES.includes(v as FinancePeriodicity)
  );
}

export function roundMoney(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function formatFinanceFcfa(amount: number): string {
  return `${Math.round(amount || 0).toLocaleString("fr-FR")} FCFA`;
}

export function makeFinanceLine(
  partial: Partial<FinanceLine> & { label: string },
): FinanceLine {
  const quantity = Math.max(0, Number(partial.quantity) || 0);
  const unitPrice = roundMoney(Math.max(0, Number(partial.unitPrice) || 0));
  return {
    id:
      partial.id ||
      `FL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    label: String(partial.label || "Prestation").trim().slice(0, 240),
    quantity,
    unit: String(partial.unit || "u").trim().slice(0, 40) || "u",
    unitPrice,
    amount: roundMoney(quantity * unitPrice),
  };
}

export function computeFinanceTotals(
  lines: FinanceLine[],
  taxRatePct: number,
): { subtotalHT: number; taxAmount: number; totalTTC: number } {
  const subtotalHT = roundMoney(
    lines.reduce((s, l) => s + (Number(l.amount) || 0), 0),
  );
  const rate = Math.max(0, Number(taxRatePct) || 0);
  const taxAmount = roundMoney((subtotalHT * rate) / 100);
  return {
    subtotalHT,
    taxAmount,
    totalTTC: roundMoney(subtotalHT + taxAmount),
  };
}

export function expiryFromValidity(
  issueDate: string,
  validityDays: number,
): string | null {
  if (!issueDate || !validityDays) return null;
  const d = new Date(`${issueDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Math.max(1, validityDays));
  return d.toISOString().slice(0, 10);
}

export function quoteReady(q: FinanceQuote): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!q.number.trim()) missing.push("Numéro");
  if (!q.clientName.trim()) missing.push("Client");
  if (!q.site.trim()) missing.push("Site");
  if (!q.issueDate) missing.push("Date");
  if (!q.lines.some((l) => l.label.trim() && l.amount > 0)) {
    missing.push("Prestations chiffrées");
  }
  if (!q.paymentTerms.trim()) missing.push("Conditions de paiement");
  if (!q.validityDays) missing.push("Validité");
  return { ok: missing.length === 0, missing };
}

export function invoiceReady(
  inv: FinanceInvoice,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!inv.clientName.trim()) missing.push("Client");
  if (!inv.contractRef.trim()) missing.push("Référence contrat");
  if (!inv.periodStart || !inv.periodEnd) missing.push("Période");
  if (!inv.dueDate) missing.push("Échéance");
  if (!inv.lines.some((l) => l.label.trim() && l.amount > 0)) {
    missing.push("Prestations");
  }
  if (!inv.paymentTerms.trim()) missing.push("Modalités de paiement");
  return { ok: missing.length === 0, missing };
}

export function creditNoteReady(
  cn: FinanceCreditNote,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!cn.invoiceNumber.trim() && !cn.invoiceId.trim()) {
    missing.push("Facture initiale");
  }
  if (!cn.reason.trim()) missing.push("Motif");
  if (!cn.lines.some((l) => l.label.trim() && l.amount > 0)) {
    missing.push("Lignes concernées");
  }
  return { ok: missing.length === 0, missing };
}

export const DEFAULT_PAYMENT_TERMS =
  "Paiement à 30 jours fin de mois par virement bancaire. Pénalités de retard applicables.";

export const DEFAULT_QUOTE_CONDITIONS =
  "Devis valable pour la durée indiquée. Prestations HT hors taxes applicables. Toute commande vaut acceptation des présentes conditions.";

/* ——— Règlements ——— */

export type FinancePaymentMethod =
  | "virement"
  | "cheque"
  | "especes"
  | "mobile_money"
  | "autre";

export const FINANCE_PAYMENT_METHOD_LABELS: Record<
  FinancePaymentMethod,
  string
> = {
  virement: "Virement",
  cheque: "Chèque",
  especes: "Espèces",
  mobile_money: "Mobile money",
  autre: "Autre",
};

export const FINANCE_PAYMENT_METHODS = Object.keys(
  FINANCE_PAYMENT_METHOD_LABELS,
) as FinancePaymentMethod[];

export type FinancePayment = {
  id: string;
  number: string;
  clientName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paidAt: string;
  method: FinancePaymentMethod;
  reference: string;
  note: string;
  history: FinanceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export function isFinancePaymentMethod(
  v: unknown,
): v is FinancePaymentMethod {
  return (
    typeof v === "string" &&
    FINANCE_PAYMENT_METHODS.includes(v as FinancePaymentMethod)
  );
}

/* ——— Relevé de compte client ——— */

export type StatementMovementKind = "facture" | "avoir" | "reglement";

export const STATEMENT_MOVEMENT_LABELS: Record<StatementMovementKind, string> =
  {
    facture: "Facture",
    avoir: "Avoir",
    reglement: "Règlement",
  };

export type StatementMovement = {
  id: string;
  kind: StatementMovementKind;
  date: string;
  dueDate: string | null;
  ref: string;
  label: string;
  debit: number;
  credit: number;
  balanceAfter: number;
};

export type StatementDueItem = {
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  overdue: boolean;
  status: FinanceDocStatus;
};

export type FinanceStatement = {
  id: string;
  number: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  openingBalance: number;
  closingBalance: number;
  totalInvoices: number;
  totalCredits: number;
  totalPayments: number;
  receivables: number;
  overdueAmount: number;
  movements: StatementMovement[];
  dueItems: StatementDueItem[];
  note: string;
  history: FinanceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export function statementReady(
  s: FinanceStatement,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!s.clientName.trim()) missing.push("Client");
  if (!s.periodStart || !s.periodEnd) missing.push("Période");
  return { ok: missing.length === 0, missing };
}

/* ——— Accusé de réception / preuve de transmission ——— */

export type FinanceAckDocType =
  | "devis"
  | "facture"
  | "avoir"
  | "releve"
  | "autre";

export type FinanceAckChannel =
  | "email"
  | "whatsapp"
  | "courrier"
  | "remise_main"
  | "portail"
  | "autre";

export type FinanceAckStatus =
  | "en_attente"
  | "transmis"
  | "accuse"
  | "echec";

export const FINANCE_ACK_DOC_TYPE_LABELS: Record<FinanceAckDocType, string> = {
  devis: "Devis",
  facture: "Facture",
  avoir: "Avoir",
  releve: "Relevé de compte",
  autre: "Autre document",
};

export const FINANCE_ACK_CHANNEL_LABELS: Record<FinanceAckChannel, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  courrier: "Courrier",
  remise_main: "Remise en main propre",
  portail: "Portail client",
  autre: "Autre canal",
};

export const FINANCE_ACK_STATUS_LABELS: Record<FinanceAckStatus, string> = {
  en_attente: "En attente",
  transmis: "Transmis",
  accuse: "Accusé reçu",
  echec: "Échec",
};

export const FINANCE_ACK_DOC_TYPES = Object.keys(
  FINANCE_ACK_DOC_TYPE_LABELS,
) as FinanceAckDocType[];

export const FINANCE_ACK_CHANNELS = Object.keys(
  FINANCE_ACK_CHANNEL_LABELS,
) as FinanceAckChannel[];

export const FINANCE_ACK_STATUSES = Object.keys(
  FINANCE_ACK_STATUS_LABELS,
) as FinanceAckStatus[];

export type FinanceAck = {
  id: string;
  number: string;
  documentType: FinanceAckDocType;
  documentId: string;
  documentNumber: string;
  documentLabel: string;
  recipientName: string;
  recipientEmail: string;
  recipientOrg: string;
  channel: FinanceAckChannel;
  transmittedAt: string;
  status: FinanceAckStatus;
  proofNote: string;
  note: string;
  history: FinanceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export function isFinanceAckDocType(v: unknown): v is FinanceAckDocType {
  return (
    typeof v === "string" &&
    FINANCE_ACK_DOC_TYPES.includes(v as FinanceAckDocType)
  );
}

export function isFinanceAckChannel(v: unknown): v is FinanceAckChannel {
  return (
    typeof v === "string" &&
    FINANCE_ACK_CHANNELS.includes(v as FinanceAckChannel)
  );
}

export function isFinanceAckStatus(v: unknown): v is FinanceAckStatus {
  return (
    typeof v === "string" &&
    FINANCE_ACK_STATUSES.includes(v as FinanceAckStatus)
  );
}

export function ackReady(a: FinanceAck): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!a.documentNumber.trim() && !a.documentLabel.trim()) {
    missing.push("Document transmis");
  }
  if (!a.recipientName.trim()) missing.push("Destinataire");
  if (!a.channel) missing.push("Canal");
  if (!a.transmittedAt) missing.push("Date/heure");
  return { ok: missing.length === 0, missing };
}

/* ——— Préfacture / état des prestations facturables (TMP-18) ——— */

export type PrefactureStatus =
  | "brouillon"
  | "en_controle"
  | "validee"
  | "facturee"
  | "annulee";

export const PREFACTURE_STATUS_LABELS: Record<PrefactureStatus, string> = {
  brouillon: "Brouillon",
  en_controle: "En contrôle",
  validee: "Validée",
  facturee: "Facturée",
  annulee: "Annulée",
};

export const PREFACTURE_STATUSES = Object.keys(
  PREFACTURE_STATUS_LABELS,
) as PrefactureStatus[];

export type PrefactureLine = {
  id: string;
  label: string;
  qtyPlanned: number;
  qtyDone: number;
  /** Écart = réalisé − prévu */
  variance: number;
  adjustment: number;
  unit: string;
  unitPrice: number;
  amount: number;
};

export type FinancePrefacture = {
  id: string;
  number: string;
  status: PrefactureStatus;
  clientName: string;
  contractRef: string;
  site: string;
  periodStart: string;
  periodEnd: string;
  lines: PrefactureLine[];
  subtotalHT: number;
  taxRatePct: number;
  taxAmount: number;
  totalTTC: number;
  validatedAt: string | null;
  validatedBy: string;
  validatedByName: string;
  note: string;
  history: FinanceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export function isPrefactureStatus(v: unknown): v is PrefactureStatus {
  return (
    typeof v === "string" &&
    PREFACTURE_STATUSES.includes(v as PrefactureStatus)
  );
}

export function makePrefactureLine(
  partial: Partial<PrefactureLine> & { label: string },
): PrefactureLine {
  const qtyPlanned = Math.max(0, Number(partial.qtyPlanned) || 0);
  const qtyDone = Math.max(0, Number(partial.qtyDone) || 0);
  const variance =
    partial.variance !== undefined
      ? Number(partial.variance) || 0
      : roundMoney(qtyDone - qtyPlanned);
  const adjustment = Number(partial.adjustment) || 0;
  const unitPrice = roundMoney(Math.max(0, Number(partial.unitPrice) || 0));
  const billableQty = Math.max(0, qtyDone + adjustment);
  return {
    id:
      partial.id ||
      `PFL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    label: String(partial.label || "Prestation").trim().slice(0, 240),
    qtyPlanned,
    qtyDone,
    variance,
    adjustment,
    unit: String(partial.unit || "u").trim().slice(0, 40) || "u",
    unitPrice,
    amount: roundMoney(billableQty * unitPrice),
  };
}

export function prefactureReady(
  p: FinancePrefacture,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!p.clientName.trim()) missing.push("Client");
  if (!p.contractRef.trim()) missing.push("Contrat");
  if (!p.periodStart || !p.periodEnd) missing.push("Période");
  if (!p.lines.some((l) => l.label.trim())) missing.push("Prestations");
  return { ok: missing.length === 0, missing };
}

/* ——— Lettre / email de relance client (TMP-22) ——— */

export type ReminderLevel = "R1" | "R2" | "R3" | "R4";

export type ReminderChannel = "email" | "courrier" | "appel_email" | "autre";

export type ReminderStatus = "brouillon" | "envoyee" | "ignoree" | "soldee";

export const REMINDER_LEVEL_LABELS: Record<ReminderLevel, string> = {
  R1: "R1 — Amiable",
  R2: "R2 — Fermeté",
  R3: "R3 — Mise en demeure",
  R4: "R4 — Escalade direction",
};

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
  email: "E-mail",
  courrier: "Courrier",
  appel_email: "Appel + e-mail",
  autre: "Autre",
};

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  brouillon: "Brouillon",
  envoyee: "Envoyée",
  ignoree: "Ignorée",
  soldee: "Soldée",
};

export const REMINDER_LEVELS = Object.keys(
  REMINDER_LEVEL_LABELS,
) as ReminderLevel[];

export const REMINDER_CHANNELS = Object.keys(
  REMINDER_CHANNEL_LABELS,
) as ReminderChannel[];

export const REMINDER_STATUSES = Object.keys(
  REMINDER_STATUS_LABELS,
) as ReminderStatus[];

export type ReminderInvoiceLine = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  dueDate: string;
  amountDue: number;
  daysLate: number;
};

export type ReminderHistoryEntry = {
  id: string;
  at: string;
  level: ReminderLevel;
  channel: ReminderChannel;
  byName: string;
  detail: string;
};

export type FinanceReminder = {
  id: string;
  number: string;
  status: ReminderStatus;
  clientName: string;
  level: ReminderLevel;
  channel: ReminderChannel;
  sentAt: string | null;
  subject: string;
  body: string;
  invoices: ReminderInvoiceLine[];
  totalDue: number;
  reminderHistory: ReminderHistoryEntry[];
  note: string;
  history: FinanceHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName: string;
  ownerEmail: string;
  ownerName: string;
};

export function isReminderLevel(v: unknown): v is ReminderLevel {
  return typeof v === "string" && REMINDER_LEVELS.includes(v as ReminderLevel);
}

export function isReminderChannel(v: unknown): v is ReminderChannel {
  return (
    typeof v === "string" &&
    REMINDER_CHANNELS.includes(v as ReminderChannel)
  );
}

export function isReminderStatus(v: unknown): v is ReminderStatus {
  return (
    typeof v === "string" &&
    REMINDER_STATUSES.includes(v as ReminderStatus)
  );
}

export function daysLateFromDue(dueDate: string, asOf = new Date()): number {
  if (!dueDate) return 0;
  const d = new Date(
    dueDate.length <= 10 ? `${dueDate}T12:00:00` : dueDate,
  );
  if (Number.isNaN(d.getTime())) return 0;
  const ms = asOf.getTime() - d.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export function makeReminderInvoiceLine(
  partial: Partial<ReminderInvoiceLine> & {
    invoiceNumber: string;
    amountDue: number;
  },
): ReminderInvoiceLine {
  const dueDate = String(partial.dueDate || "").slice(0, 40);
  return {
    id:
      partial.id ||
      `RIL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    invoiceId: String(partial.invoiceId || "").slice(0, 40),
    invoiceNumber: String(partial.invoiceNumber || "").trim().slice(0, 80),
    dueDate,
    amountDue: roundMoney(Math.max(0, Number(partial.amountDue) || 0)),
    daysLate:
      partial.daysLate !== undefined
        ? Math.max(0, Number(partial.daysLate) || 0)
        : daysLateFromDue(dueDate),
  };
}

export const DEFAULT_REMINDER_SUBJECT =
  "Relance de paiement — factures échues";

export const DEFAULT_REMINDER_BODY =
  "Madame, Monsieur,\n\nSauf erreur de notre part, les factures ci-dessous restent impayées à ce jour. Nous vous remercions de bien vouloir régulariser sous huitaine.\n\nCordialement,\nService Recouvrement NECS";

export function reminderReady(
  r: FinanceReminder,
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!r.clientName.trim()) missing.push("Client");
  if (!r.level) missing.push("Niveau de relance");
  if (!r.invoices.length) missing.push("Factures dues");
  if (!r.subject.trim()) missing.push("Objet");
  if (!r.body.trim()) missing.push("Corps du message");
  return { ok: missing.length === 0, missing };
}
