import type { UserRole } from "@/lib/settings";

export type PunchMode = "Mobile" | "Terminal" | "Manuel";

export type PunchStatus =
  | "En cours"
  | "Complet"
  | "Retard"
  | "Absent"
  | "Anomalie"
  | "Validé";

export type GeoPoint = {
  lat: number;
  lng: number;
  accuracy: number | null;
};

export type PointagePunch = {
  id: string;
  /** Clé anti-doublon : un enregistrement / agent / jour */
  userId: string;
  employeeId: string;
  employeeName: string;
  email: string;
  site: string;
  siteId: string;
  planningSlotId: string;
  date: string;
  plannedIn: string;
  plannedOut: string;
  actualIn: string | null;
  actualOut: string | null;
  actualInAt: string | null;
  actualOutAt: string | null;
  mode: PunchMode;
  status: PunchStatus;
  anomaly: string;
  anomalies: string[];
  validatedBy: string | null;
  validatedById: string | null;
  note: string;
  geoIn: GeoPoint | null;
  geoOut: GeoPoint | null;
  /** Dernières clés d’idempotence (anti rejeu / double-clic) */
  clientRequestIds: string[];
  history: Array<{
    id: string;
    at: string;
    by: string;
    byName: string;
    detail: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export const PUNCH_MODES: PunchMode[] = ["Mobile", "Terminal", "Manuel"];

export const PUNCH_STATUS_LABELS: Record<PunchStatus, string> = {
  "En cours": "En cours",
  Complet: "Complet",
  Retard: "Retard",
  Absent: "Absent",
  Anomalie: "Anomalie",
  Validé: "Validé",
};

export const GRACE_MINUTES = 10;

/** Cible de recette : pointages simultanés sans perte ni duplication. */
export function concurrencyTarget(): number {
  const n = Number(process.env.POINTAGE_CONCURRENCY_TARGET || "50");
  if (!Number.isFinite(n) || n < 5) return 50;
  return Math.min(200, Math.floor(n));
}

/** Géolocalisation uniquement si retenue (env) et applicable. */
export function isPointageGeoEnabled(): boolean {
  const v = (process.env.POINTAGE_GEO_ENABLED || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "oui";
}

export function canAccessPointage(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "ops" ||
    role === "rh" ||
    role === "manager" ||
    role === "nettoyeur"
  );
}

export function canSupervisePointage(role: UserRole): boolean {
  return (
    role === "admin" ||
    role === "ops" ||
    role === "rh" ||
    role === "manager"
  );
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentTimeHm(d = new Date()): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatDuration(inHm: string, outHm: string): string {
  let mins = toMinutes(outHm) - toMinutes(inHm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function workedHours(punch: PointagePunch): string {
  if (!punch.actualIn || !punch.actualOut) return "—";
  return formatDuration(punch.actualIn, punch.actualOut);
}

export function isPunchMode(v: unknown): v is PunchMode {
  return typeof v === "string" && PUNCH_MODES.includes(v as PunchMode);
}

export function parseGeo(raw: unknown): GeoPoint | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const accuracy =
    o.accuracy !== undefined && o.accuracy !== null
      ? Number(o.accuracy)
      : null;
  return {
    lat,
    lng,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
  };
}

export function evaluatePunch(punch: PointagePunch): PointagePunch {
  const anomalies: string[] = [];
  let status: PunchStatus = punch.status;

  if (!punch.planningSlotId && punch.mode !== "Manuel") {
    anomalies.push("Hors planning");
  }

  if (!punch.actualIn) {
    status = "Absent";
    anomalies.push("Pas d’arrivée");
  } else {
    const lateBy = toMinutes(punch.actualIn) - toMinutes(punch.plannedIn || "00:00");
    if (punch.plannedIn && lateBy > GRACE_MINUTES) {
      status = "Retard";
      anomalies.push(`Retard ${lateBy} min`);
    } else if (!punch.actualOut) {
      status = "En cours";
      anomalies.push("Départ manquant");
    } else {
      const earlyBy =
        toMinutes(punch.plannedOut || "23:59") - toMinutes(punch.actualOut);
      if (punch.plannedOut && earlyBy > GRACE_MINUTES) {
        status = "Anomalie";
        anomalies.push(`Départ anticipé ${earlyBy} min`);
      } else {
        status = punch.validatedBy ? "Validé" : "Complet";
      }
    }
  }

  if (punch.validatedBy && punch.actualIn && punch.actualOut) {
    status = "Validé";
  }

  const unique = Array.from(new Set(anomalies));
  const anomaly =
    unique.length === 0 || (unique.length === 1 && unique[0] === "Départ manquant" && status === "En cours")
      ? status === "En cours"
        ? "Départ manquant"
        : status === "Absent"
          ? "Pas d’arrivée"
          : "Aucune"
      : unique.filter((a) => a !== "Départ manquant" || status !== "Complet").join(" · ") || "Aucune";

  return {
    ...punch,
    status,
    anomalies: unique,
    anomaly:
      status === "Complet" || status === "Validé"
        ? unique.includes("Hors planning")
          ? "Hors planning"
          : "Aucune"
        : anomaly,
  };
}

export function pointageStats(punches: PointagePunch[]) {
  const present = punches.filter((p) => p.actualIn).length;
  const late = punches.filter((p) => p.status === "Retard").length;
  const open = punches.filter((p) => p.actualIn && !p.actualOut).length;
  const absent = punches.filter((p) => !p.actualIn).length;
  const validated = punches.filter((p) => p.status === "Validé").length;
  const anomaly = punches.filter(
    (p) =>
      p.status === "Anomalie" ||
      (p.anomaly && p.anomaly !== "Aucune" && p.anomaly !== "Départ manquant"),
  ).length;
  return {
    present,
    late,
    open,
    absent,
    validated,
    anomaly,
    total: punches.length,
  };
}

export type ConcurrentTestResult = {
  target: number;
  attempted: number;
  inserted: number;
  duplicatesBlocked: number;
  lost: number;
  durationMs: number;
  ok: boolean;
  detail: string;
};
