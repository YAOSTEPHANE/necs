export const NECS_POINTAGE_KEY = "necs_pointage_v1";
export const NECS_POINTAGE_EVENT = "necs-pointage-updated";

export type PunchMode = "Mobile" | "Terminal" | "Manuel";

export type PunchStatus =
  | "En cours"
  | "Complet"
  | "Retard"
  | "Absent"
  | "Anomalie"
  | "Validé";

export type Employee = {
  id: string;
  name: string;
  role: string;
  site: string;
  shiftStart: string; // HH:MM
  shiftEnd: string;
  active: boolean;
};

export type PunchRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  site: string;
  date: string; // YYYY-MM-DD
  plannedIn: string;
  plannedOut: string;
  actualIn: string | null;
  actualOut: string | null;
  mode: PunchMode;
  status: PunchStatus;
  anomaly: string;
  validatedBy: string | null;
  note: string;
  updatedAt: string;
};

export type PointageStore = {
  employees: Employee[];
  punches: PunchRecord[];
};

function nowLabel(): string {
  return new Date().toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function currentTimeHm(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function createEmployeeId(): string {
  return `EMP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
}

export function createPunchId(): string {
  return `PTG-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
}

function toMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatDuration(inHm: string, outHm: string): string {
  let mins = toMinutes(outHm) - toMinutes(inHm);
  if (mins < 0) mins += 24 * 60; // shift de nuit
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const GRACE_MINUTES = 10;

export function evaluatePunch(punch: PunchRecord): PunchRecord {
  let status: PunchStatus = punch.status;
  let anomaly = "Aucune";

  if (!punch.actualIn) {
    status = "Absent";
    anomaly = "Pas d’arrivée";
  } else {
    const lateBy = toMinutes(punch.actualIn) - toMinutes(punch.plannedIn);
    if (lateBy > GRACE_MINUTES) {
      status = "Retard";
      anomaly = `Retard ${lateBy} min`;
    } else if (!punch.actualOut) {
      status = "En cours";
      anomaly = "Départ manquant";
    } else {
      const earlyBy = toMinutes(punch.plannedOut) - toMinutes(punch.actualOut);
      if (earlyBy > GRACE_MINUTES) {
        status = "Anomalie";
        anomaly = `Départ anticipé ${earlyBy} min`;
      } else {
        status = punch.validatedBy ? "Validé" : "Complet";
        anomaly = "Aucune";
      }
    }
  }

  if (punch.validatedBy && punch.actualIn && punch.actualOut) {
    status = "Validé";
  }

  return { ...punch, status, anomaly, updatedAt: nowLabel() };
}

/** Anciens employés de démo semés dans le navigateur (à purger). */
const LEGACY_DEMO_EMPLOYEES: Record<string, string> = {
  "EMP-001": "Amina Kouam",
  "EMP-002": "Marc Ngo",
  "EMP-003": "Sandrine Talla",
  "EMP-004": "Paul Essomba",
  "EMP-005": "Grace Embolo",
};

function isLegacyDemoEmployee(id: string, name: string): boolean {
  return LEGACY_DEMO_EMPLOYEES[id] === name;
}

function emptyStore(): PointageStore {
  return { employees: [], punches: [] };
}

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NECS_POINTAGE_EVENT));
  }
}

export function loadPointageStore(): PointageStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(NECS_POINTAGE_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Partial<PointageStore>;
    const storedEmployees = Array.isArray(parsed?.employees) ? parsed.employees : [];
    const storedPunches = Array.isArray(parsed?.punches) ? parsed.punches : [];
    const employees = storedEmployees.filter(
      (e) => !isLegacyDemoEmployee(e.id, e.name),
    );
    const punches = storedPunches.filter(
      (p) => !isLegacyDemoEmployee(p.employeeId, p.employeeName),
    );
    if (
      employees.length !== storedEmployees.length ||
      punches.length !== storedPunches.length
    ) {
      localStorage.setItem(
        NECS_POINTAGE_KEY,
        JSON.stringify({ employees, punches }),
      );
    }
    return { employees, punches };
  } catch {
    return emptyStore();
  }
}

export function savePointageStore(store: PointageStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NECS_POINTAGE_KEY, JSON.stringify(store));
  emitUpdate();
}

export function ensureDayPunches(
  store: PointageStore,
  date: string,
): PointageStore {
  const punches = [...store.punches];
  for (const emp of store.employees.filter((e) => e.active)) {
    const exists = punches.some(
      (p) => p.employeeId === emp.id && p.date === date,
    );
    if (!exists) {
      punches.unshift(
        evaluatePunch({
          // ID stable : évite des lignes fantômes si ensureDay est appelé 2× avant persist
          id: `PTG-${emp.id}-${date}`,
          employeeId: emp.id,
          employeeName: emp.name,
          site: emp.site,
          date,
          plannedIn: emp.shiftStart,
          plannedOut: emp.shiftEnd,
          actualIn: null,
          actualOut: null,
          mode: "Mobile",
          status: "Absent",
          anomaly: "",
          validatedBy: null,
          note: "",
          updatedAt: nowLabel(),
        }),
      );
    }
  }
  return { ...store, punches };
}

export function punchIn(
  store: PointageStore,
  punchId: string,
  mode: PunchMode = "Mobile",
): PointageStore {
  const time = currentTimeHm();
  const punches = store.punches.map((p) => {
    if (p.id !== punchId) return p;
    if (p.actualIn) return p; // anti double-pointage
    return evaluatePunch({
      ...p,
      actualIn: time,
      mode,
      validatedBy: null,
    });
  });
  return { ...store, punches };
}

export function punchOut(
  store: PointageStore,
  punchId: string,
  mode: PunchMode = "Mobile",
): PointageStore {
  const time = currentTimeHm();
  const punches = store.punches.map((p) => {
    if (p.id !== punchId) return p;
    if (!p.actualIn || p.actualOut) return p;
    return evaluatePunch({
      ...p,
      actualOut: time,
      mode,
      validatedBy: null,
    });
  });
  return { ...store, punches };
}

export function validatePunch(
  store: PointageStore,
  punchId: string,
  validatorName: string,
): PointageStore {
  const punches = store.punches.map((p) => {
    if (p.id !== punchId) return p;
    if (!p.actualIn || !p.actualOut) return p;
    return evaluatePunch({
      ...p,
      validatedBy: validatorName,
      status: "Validé",
    });
  });
  return { ...store, punches };
}

export function updatePunchNote(
  store: PointageStore,
  punchId: string,
  note: string,
): PointageStore {
  const punches = store.punches.map((p) =>
    p.id === punchId ? { ...p, note, updatedAt: nowLabel() } : p,
  );
  return { ...store, punches };
}

/** Correction manuelle des horaires (mode Manuel) + recalcul statut / anomalies. */
export function correctPunch(
  store: PointageStore,
  punchId: string,
  patch: {
    actualIn?: string | null;
    actualOut?: string | null;
    mode?: PunchMode;
    note?: string;
    plannedIn?: string;
    plannedOut?: string;
  },
): PointageStore {
  const punches = store.punches.map((p) => {
    if (p.id !== punchId) return p;
    const next: PunchRecord = {
      ...p,
      actualIn:
        patch.actualIn !== undefined ? patch.actualIn || null : p.actualIn,
      actualOut:
        patch.actualOut !== undefined ? patch.actualOut || null : p.actualOut,
      mode: patch.mode ?? "Manuel",
      note: patch.note !== undefined ? patch.note.trim() : p.note,
      plannedIn: patch.plannedIn?.trim() || p.plannedIn,
      plannedOut: patch.plannedOut?.trim() || p.plannedOut,
      validatedBy: null,
    };
    return evaluatePunch(next);
  });
  return { ...store, punches };
}

export function upsertEmployee(
  store: PointageStore,
  employee: Employee,
): PointageStore {
  const exists = store.employees.some((e) => e.id === employee.id);
  const employees = exists
    ? store.employees.map((e) => (e.id === employee.id ? employee : e))
    : [employee, ...store.employees];
  return { ...store, employees };
}

/** Met à jour la fiche employé et synchronise les pointages non validés du jour. */
export function updateEmployee(
  store: PointageStore,
  employeeId: string,
  patch: Partial<Omit<Employee, "id">>,
): PointageStore {
  const employees = store.employees.map((e) => {
    if (e.id !== employeeId) return e;
    return {
      ...e,
      name: (patch.name ?? e.name).trim(),
      role: (patch.role ?? e.role).trim(),
      site: (patch.site ?? e.site).trim(),
      shiftStart: patch.shiftStart ?? e.shiftStart,
      shiftEnd: patch.shiftEnd ?? e.shiftEnd,
      active: patch.active ?? e.active,
    };
  });
  const emp = employees.find((e) => e.id === employeeId);
  if (!emp) return { ...store, employees };

  const punches = store.punches.map((p) => {
    if (p.employeeId !== employeeId) return p;
    if (p.status === "Validé") {
      return {
        ...p,
        employeeName: emp.name,
        site: emp.site,
      };
    }
    return evaluatePunch({
      ...p,
      employeeName: emp.name,
      site: emp.site,
      plannedIn: emp.shiftStart,
      plannedOut: emp.shiftEnd,
    });
  });
  return { employees, punches };
}

export function listSites(store: PointageStore): string[] {
  const set = new Set(
    store.employees
      .map((e) => e.site.trim())
      .filter(Boolean)
      .concat(store.punches.map((p) => p.site.trim()).filter(Boolean)),
  );
  return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
}

export function isTodayPointage(isoDate: string): boolean {
  return isoDate === todayIso();
}

export function workedHours(punch: PunchRecord): string {
  if (!punch.actualIn || !punch.actualOut) return "—";
  return formatDuration(punch.actualIn, punch.actualOut);
}

export function pointageStats(punches: PunchRecord[]) {
  const present = punches.filter((p) => p.actualIn).length;
  const late = punches.filter((p) => p.status === "Retard").length;
  const open = punches.filter((p) => p.actualIn && !p.actualOut).length;
  const absent = punches.filter((p) => !p.actualIn).length;
  const validated = punches.filter((p) => p.status === "Validé").length;
  const anomaly = punches.filter(
    (p) => p.status === "Anomalie" || (p.anomaly && p.anomaly !== "Aucune"),
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
