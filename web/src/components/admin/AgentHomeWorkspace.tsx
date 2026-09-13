"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  type PunchRecord,
  type PointageStore,
  currentTimeHm,
  ensureDayPunches,
  loadPointageStore,
  punchIn,
  punchOut,
  savePointageStore,
  todayIso,
  upsertEmployee,
  workedHours,
} from "@/lib/pointage";
import { isNettoyeur, loadSession } from "@/lib/auth";
import { StatusBadge } from "@/components/admin/Ui";
import { IconClock, IconVisit } from "@/components/admin/Icons";
import type { StatusTone } from "@/lib/mock-data";

function toneForStatus(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s.includes("valid")) return "ok";
  if (s.includes("retard") || s.includes("anomal")) return "warn";
  if (s.includes("absent")) return "danger";
  if (s.includes("cours") || s.includes("complet")) return "info";
  return "neutral";
}

function ensureLinkedEmployee(
  store: PointageStore,
  opts: {
    employeeId: string;
    name: string;
  },
): PointageStore {
  const exists = store.employees.some((e) => e.id === opts.employeeId);
  if (exists) return store;
  return upsertEmployee(store, {
    id: opts.employeeId,
    name: opts.name,
    role: "Agent d’entretien",
    site: "Immeuble Horizon",
    shiftStart: "06:00",
    shiftEnd: "14:00",
    active: true,
  });
}

export function AgentHomeWorkspace() {
  const [store, setStore] = useState<PointageStore | null>(null);
  const [ready, setReady] = useState(false);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("Agent");
  const [flash, setFlash] = useState<string | null>(null);
  const [clock, setClock] = useState(currentTimeHm());
  const date = todayIso();

  useEffect(() => {
    const session = loadSession();
    if (!session || !isNettoyeur(session)) {
      setReady(true);
      return;
    }
    setAgentName(session.name);
    const empId =
      session.employeeId ||
      `EMP-${session.userId.replace(/^USR-/i, "")}`;
    setEmployeeId(empId);

    let loaded = loadPointageStore();
    loaded = ensureLinkedEmployee(loaded, {
      employeeId: empId,
      name: session.name,
    });
    loaded = ensureDayPunches(loaded, todayIso());
    savePointageStore(loaded);
    setStore(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setClock(currentTimeHm()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const punch: PunchRecord | null = useMemo(() => {
    if (!store || !employeeId) return null;
    return (
      store.punches.find(
        (p) => p.employeeId === employeeId && p.date === date,
      ) ?? null
    );
  }, [store, employeeId, date]);

  const emp = useMemo(() => {
    if (!store || !employeeId) return null;
    return store.employees.find((e) => e.id === employeeId) ?? null;
  }, [store, employeeId]);

  const persist = (next: PointageStore) => {
    setStore(next);
    savePointageStore(next);
  };

  const notify = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2200);
  };

  const onPunchIn = () => {
    if (!store || !punch) return;
    if (punch.actualIn) {
      notify("Arrivée déjà enregistrée.");
      return;
    }
    persist(punchIn(store, punch.id, "Mobile"));
    notify(`Arrivée pointée à ${currentTimeHm()}`);
  };

  const onPunchOut = () => {
    if (!store || !punch) return;
    if (!punch.actualIn) {
      notify("Pointer l’arrivée d’abord.");
      return;
    }
    if (punch.actualOut) {
      notify("Départ déjà enregistré.");
      return;
    }
    persist(punchOut(store, punch.id, "Mobile"));
    notify(`Départ pointé à ${currentTimeHm()}`);
  };

  if (!ready || !store) {
    return (
      <div className="doc-workspace">
        <p className="note">Chargement de votre espace…</p>
      </div>
    );
  }

  if (!punch) {
    return (
      <div className="doc-workspace">
        <p className="note">
          Aucun pointage trouvé pour aujourd’hui. Contactez votre superviseur.
        </p>
      </div>
    );
  }

  return (
    <div className="doc-workspace agent-home">
      <header className="doc-hero" style={{ ["--doc-tone" as string]: "#1260a8" }}>
        <div className="doc-hero__glow" aria-hidden />
        <div className="doc-hero__main">
          <div className="doc-hero__badge">
            <span className="doc-hero__glyph" aria-hidden>
              <IconClock size={22} />
            </span>
            <span>Espace agent</span>
          </div>
          <h1>Bonjour, {agentName.split(" ")[0]}</h1>
          <p>
            Pointez votre journée, puis photographiez le site{" "}
            <strong>après le nettoyage</strong> pour prouver l’intervention.
          </p>
          <div className="doc-hero__meta">
            <span>
              <strong>Heure</strong>
              {clock}
            </span>
            <span>
              <strong>Site</strong>
              {punch.site}
            </span>
            <span>
              <strong>Shift</strong>
              {punch.plannedIn} – {punch.plannedOut}
            </span>
          </div>
        </div>
        <div className="doc-hero__actions">
          <StatusBadge tone={toneForStatus(punch.status)}>
            {punch.status}
          </StatusBadge>
        </div>
      </header>

      {flash ? <div className="pointage-flash">{flash}</div> : null}

      <section className="agent-home__punch panel-card">
        <div className="agent-home__punch-head">
          <div>
            <h2>Pointage du jour</h2>
            <p>
              {emp?.role ?? "Agent d’entretien"} · {punch.site}
            </p>
          </div>
          <span className="agent-home__duration">
            Durée <strong>{workedHours(punch)}</strong>
          </span>
        </div>

        <div className="agent-home__cta-row">
          <button
            type="button"
            className="agent-home__cta agent-home__cta--in"
            disabled={Boolean(punch.actualIn)}
            onClick={onPunchIn}
          >
            <span>Arrivée</span>
            <strong>{punch.actualIn ?? "Pointer maintenant"}</strong>
          </button>
          <button
            type="button"
            className="agent-home__cta agent-home__cta--out"
            disabled={!punch.actualIn || Boolean(punch.actualOut)}
            onClick={onPunchOut}
          >
            <span>Départ</span>
            <strong>
              {punch.actualOut ??
                (punch.actualIn ? "Pointer maintenant" : "Après l’arrivée")}
            </strong>
          </button>
        </div>

        {punch.anomaly && punch.anomaly !== "Aucune" ? (
          <p className="pointage-detail__warn">{punch.anomaly}</p>
        ) : (
          <p className="pointage-detail__ok">Aucune anomalie détectée</p>
        )}
      </section>

      <div className="agent-home__links">
        <Link href="/admin/pointage" className="agent-home__link">
          <IconClock size={18} />
          <span>
            <strong>Détail pointage</strong>
            <small>Historique du jour</small>
          </span>
        </Link>
        <Link href="/admin/terrain" className="agent-home__link">
          <IconVisit size={18} />
          <span>
            <strong>Photos après nettoyage</strong>
            <small>Preuve obligatoire sur site</small>
          </span>
        </Link>
      </div>
    </div>
  );
}
