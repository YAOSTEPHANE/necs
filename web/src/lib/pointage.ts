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

function seedEmployees(): Employee[] {
  return [
    {
      id: "EMP-001",
      name: "Amina Kouam",
      role: "Agent d’entretien",
      site: "Immeuble Horizon",
      shiftStart: "06:00",
      shiftEnd: "14:00",
      active: true,
    },
    {
      id: "EMP-002",
      name: "Marc Ngo",
      role: "Agent d’entretien",
      site: "Immeuble Horizon",
      shiftStart: "06:00",
      shiftEnd: "14:00",
      active: true,
    },
    {
      id: "EMP-003",
      name: "Sandrine Talla",
      role: "Chef d’équipe",
      site: "Usine Bassa",
      shiftStart: "14:00",
      shiftEnd: "22:00",
      active: true,
    },
    {
      id: "EMP-004",
      name: "Paul Essomba",
      role: "Agent d’entretien",
      site: "Mall Riviera",
      shiftStart: "22:00",
      shiftEnd: "06:00",
      active: true,
    },
    {
      id: "EMP-005",
      name: "Grace Embolo",
      role: "Agent d’entretien",
      site: "Mall Riviera",
      shiftStart: "06:00",
      shiftEnd: "14:00",
      active: true,
    },
  ];
}

function seedPunches(employees: Employee[]): PunchRecord[] {
  const today = todayIso();
  const demo: PunchRecord[] = [
    evaluatePunch({
      id: `PTG-EMP-001-${today}`,
      employeeId: "EMP-001",
      employeeName: "Amina Kouam",
      site: "Immeuble Horizon",
      date: today,
      plannedIn: "06:00",
      plannedOut: "14:00",
      actualIn: "06:02",
      actualOut: "14:05",
      mode: "Mobile",
      status: "Complet",
      anomaly: "Aucune",
      validatedBy: "Superviseur",
      note: "",
      updatedAt: nowLabel(),
    }),
    evaluatePunch({
      id: `PTG-EMP-002-${today}`,
      employeeId: "EMP-002",
      employeeName: "Marc Ngo",
      site: "Immeuble Horizon",
      date: today,
      plannedIn: "06:00",
      plannedOut: "14:00",
      actualIn: "06:18",
      actualOut: null,
      mode: "Mobile",
      status: "Retard",
      anomaly: "Retard",
      validatedBy: null,
      note: "",
      updatedAt: nowLabel(),
    }),
    evaluatePunch({
      id: `PTG-EMP-003-${today}`,
      employeeId: "EMP-003",
      employeeName: "Sandrine Talla",
      site: "Usine Bassa",
      date: today,
      plannedIn: "14:00",
      plannedOut: "22:00",
      actualIn: "13:58",
      actualOut: null,
      mode: "Terminal",
      status: "En cours",
      anomaly: "",
      validatedBy: null,
      note: "",
      updatedAt: nowLabel(),
    }),
  ];

  // Ensure every active employee has a row for today
  for (const emp of employees.filter((e) => e.active)) {
    if (!demo.some((p) => p.employeeId === emp.id && p.date === today)) {
      demo.push(
        evaluatePunch({
          id: `PTG-${emp.id}-${today}`,
          employeeId: emp.id,
          employeeName: emp.name,
          site: emp.site,
          date: today,
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

  return demo;
}

function seedStore(): PointageStore {
  const employees = seedEmployees();
  return { employees, punches: seedPunches(employees) };
}

function emitUpdate() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NECS_POINTAGE_EVENT));
  }
}

export function loadPointageStore(): PointageStore {
  if (typeof window === "undefined") return seedStore();
  try {
    const raw = localStorage.getItem(NECS_POINTAGE_KEY);
    if (!raw) {
      const seeded = seedStore();
      localStorage.setItem(NECS_POINTAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as PointageStore;
    if (!parsed?.employees?.length) {
      const seeded = seedStore();
      localStorage.setItem(NECS_POINTAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return {
      employees: parsed.employees,
      punches: Array.isArray(parsed.punches) ? parsed.punches : [],
    };
  } catch {
    return seedStore();
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
  return { present, late, open, absent, validated, total: punches.length };
}
