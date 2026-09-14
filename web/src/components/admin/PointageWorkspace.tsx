"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  type Employee,
  type PunchMode,
  type PunchRecord,
  type PointageStore,
  createEmployeeId,
  currentTimeHm,
  ensureDayPunches,
  loadPointageStore,
  pointageStats,
  punchIn,
  punchOut,
  savePointageStore,
  todayIso,
  updatePunchNote,
  upsertEmployee,
  validatePunch,
  workedHours,
} from "@/lib/pointage";
import { isNettoyeur, loadSession } from "@/lib/auth";
import { EmptyState, ModuleHeader, StatusBadge } from "@/components/admin/Ui";
import { toast } from "@/lib/toast";
import { IconClock } from "@/components/admin/Icons";
import type { StatusTone } from "@/lib/mock-data";

function toneForStatus(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s.includes("valid")) return "ok";
  if (s.includes("retard") || s.includes("anomal")) return "warn";
  if (s.includes("absent")) return "danger";
  if (s.includes("cours") || s.includes("complet")) return "info";
  return "neutral";
}

function formatDateLabel(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function ensureLinkedEmployee(
  store: PointageStore,
  opts: { employeeId: string; name: string },
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

const SITES = [
  "Immeuble Horizon",
  "Usine Bassa",
  "Mall Riviera",
  "Tous les sites",
] as const;

export function PointageWorkspace() {
  const [store, setStore] = useState<PointageStore | null>(null);
  const [ready, setReady] = useState(false);
  const [actorName, setActorName] = useState("Superviseur");
  const [agentMode, setAgentMode] = useState(false);
  const [agentEmployeeId, setAgentEmployeeId] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso());
  const [siteFilter, setSiteFilter] = useState<string>("Tous les sites");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [empDraft, setEmpDraft] = useState<Employee | null>(null);
  const [clock, setClock] = useState(currentTimeHm());

  useEffect(() => {
    const session = loadSession();
    setActorName(session?.name || "Superviseur");
    const agent = isNettoyeur(session);
    setAgentMode(agent);
    let loaded = loadPointageStore();
    if (agent && session) {
      const empId =
        session.employeeId ||
        `EMP-${session.userId.replace(/^USR-/i, "")}`;
      setAgentEmployeeId(empId);
      loaded = ensureLinkedEmployee(loaded, {
        employeeId: empId,
        name: session.name,
      });
    }
    loaded = ensureDayPunches(loaded, todayIso());
    savePointageStore(loaded);
    setStore(loaded);
    setReady(true);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setClock(currentTimeHm()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const persist = (next: PointageStore) => {
    setStore(next);
    savePointageStore(next);
  };

  /** Toujours travailler sur un store qui contient les lignes du jour affiché. */
  const baseForDate = (s: PointageStore) => ensureDayPunches(s, date);

  const dayStore = useMemo(() => {
    if (!store) return null;
    return ensureDayPunches(store, date);
  }, [store, date]);

  useEffect(() => {
    if (!dayStore || !store) return;
    if (dayStore.punches.length !== store.punches.length) {
      persist(dayStore);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, dayStore?.punches.length]);

  const dayPunchesFixed = useMemo(() => {
    if (!dayStore) return [];
    const q = query.trim().toLowerCase();
    return dayStore.punches
      .filter((p) => p.date === date)
      .filter((p) =>
        agentMode && agentEmployeeId
          ? p.employeeId === agentEmployeeId
          : true,
      )
      .filter((p) =>
        agentMode || siteFilter === "Tous les sites"
          ? true
          : p.site === siteFilter,
      )
      .filter((p) => {
        if (agentMode || statusFilter === "all") return true;
        if (statusFilter === "open") return Boolean(p.actualIn && !p.actualOut);
        if (statusFilter === "late") return p.status === "Retard";
        if (statusFilter === "absent") return !p.actualIn;
        if (statusFilter === "ok")
          return p.status === "Complet" || p.status === "Validé";
        return true;
      })
      .filter((p) => {
        if (agentMode || !q) return true;
        const emp = dayStore.employees.find((e) => e.id === p.employeeId);
        return (
          p.employeeName.toLowerCase().includes(q) ||
          p.site.toLowerCase().includes(q) ||
          (emp?.role ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.employeeName.localeCompare(b.employeeName, "fr"));
  }, [
    dayStore,
    date,
    siteFilter,
    statusFilter,
    query,
    agentMode,
    agentEmployeeId,
  ]);

  useEffect(() => {
    if (!agentMode || dayPunchesFixed.length === 0) return;
    if (!selectedId || !dayPunchesFixed.some((p) => p.id === selectedId)) {
      setSelectedId(dayPunchesFixed[0]?.id ?? null);
    }
  }, [agentMode, dayPunchesFixed, selectedId]);

  const stats = useMemo(
    () =>
      pointageStats(
        (dayStore?.punches ?? []).filter((p) => p.date === date),
      ),
    [dayStore, date],
  );

  const selected = useMemo(
    () => dayPunchesFixed.find((p) => p.id === selectedId) ?? null,
    [dayPunchesFixed, selectedId],
  );

  const onPunchIn = (id: string) => {
    if (!store) return;
    const base = baseForDate(store);
    const target = base.punches.find((p) => p.id === id);
    if (target?.actualIn) {
      toast.warning("Arrivée déjà enregistrée (anti double-pointage).");
      return;
    }
    if (!target) {
      toast.error("Pointage introuvable pour ce jour.");
      return;
    }
    persist(punchIn(base, id, "Mobile"));
    setSelectedId(id);
    toast.success(`Arrivée pointée à ${currentTimeHm()}`);
  };

  const onPunchOut = (id: string) => {
    if (!store) return;
    const base = baseForDate(store);
    const target = base.punches.find((p) => p.id === id);
    if (!target?.actualIn) {
      toast.warning("Pointer l’arrivée d’abord.");
      return;
    }
    if (target.actualOut) {
      toast.warning("Départ déjà enregistré.");
      return;
    }
    persist(punchOut(base, id, "Mobile"));
    setSelectedId(id);
    toast.success(`Départ pointé à ${currentTimeHm()}`);
  };

  const onValidate = (id: string, pendingNote?: string) => {
    if (!store) return;
    let base = baseForDate(store);
    const target = base.punches.find((p) => p.id === id);
    if (!target?.actualIn || !target.actualOut) {
      toast.warning("Arrivée et départ requis pour valider.");
      return;
    }
    if (target.status === "Validé") {
      toast.info("Déjà validé.");
      return;
    }
    if (pendingNote !== undefined && pendingNote !== target.note) {
      base = updatePunchNote(base, id, pendingNote);
    }
    persist(validatePunch(base, id, actorName));
    toast.success("Pointage validé.");
  };

  const onSaveNote = (id: string, note: string) => {
    if (!store) return;
    persist(updatePunchNote(baseForDate(store), id, note));
  };

  const openNewEmployee = () => {
    setEmpDraft({
      id: createEmployeeId(),
      name: "",
      role: "Agent d’entretien",
      site: "Immeuble Horizon",
      shiftStart: "06:00",
      shiftEnd: "14:00",
      active: true,
    });
    setShowEmployeeForm(true);
  };

  const saveEmployee = (e: FormEvent) => {
    e.preventDefault();
    if (!store || !empDraft) return;
    if (!empDraft.name.trim()) {
      toast.warning("Le nom est obligatoire.");
      return;
    }
    let next = upsertEmployee(baseForDate(store), {
      ...empDraft,
      name: empDraft.name.trim(),
      role: empDraft.role.trim() || "Agent",
      site: empDraft.site.trim(),
    });
    next = ensureDayPunches(next, date);
    persist(next);
    setShowEmployeeForm(false);
    setEmpDraft(null);
    toast.success("Employé ajouté au pointage.");
  };

  if (!ready || !store || !dayStore) {
    return (
      <div className="doc-workspace">
        <p className="note">Chargement du pointage…</p>
      </div>
    );
  }

  return (
    <div className="doc-workspace pointage-page">
      <ModuleHeader
        tone="#1260a8"
        badge="Opérations · RH"
        icon={<IconClock size={22} />}
        title={agentMode ? "Mon pointage" : "Pointage des employés"}
        description={
          agentMode
            ? "Enregistrez votre arrivée et votre départ — anti double-pointage intégré."
            : "Arrivée et départ en un clic, détection des retards, validation superviseur — anti double-pointage intégré."
        }
        meta={
          <>
            <span>
              <strong>Date</strong>
              {formatDateLabel(date)}
            </span>
            <span>
              <strong>Heure</strong>
              {clock}
            </span>
            {!agentMode ? (
              <span>
                <strong>Effectif</strong>
                {store.employees.filter((e) => e.active).length} actifs
              </span>
            ) : (
              <span>
                <strong>Statut</strong>
                {selected?.status ?? "—"}
              </span>
            )}
          </>
        }
        actions={
          !agentMode ? (
            <>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={openNewEmployee}
              >
                + Employé
              </button>
              <input
                type="date"
                className="pointage-date"
                value={date}
                onChange={(e) => setDate(e.target.value || todayIso())}
                aria-label="Date de pointage"
              />
            </>
          ) : undefined
        }
      />

      {!agentMode ? (
        <div className="doc-kpi-strip">
          <div className="doc-kpi">
            <span>Présents</span>
            <strong>{stats.present}</strong>
          </div>
          <div className="doc-kpi">
            <span>En service</span>
            <strong>{stats.open}</strong>
          </div>
          <div className="doc-kpi">
            <span>Retards</span>
            <strong>{stats.late}</strong>
          </div>
          <div className="doc-kpi">
            <span>Absents</span>
            <strong>{stats.absent}</strong>
          </div>
        </div>
      ) : null}

      <section className="panel-card pointage-board">
        <div className="panel-card__head">
          <h3>
            {agentMode
              ? "Ma fiche du jour"
              : `Tableau du jour (${dayPunchesFixed.length})`}
          </h3>
          {!agentMode ? (
            <div className="doc-records-toolbar pointage-toolbar">
              <input
                type="search"
                className="doc-records-search"
                placeholder="Rechercher un agent…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                aria-label="Filtrer par site"
              >
                {SITES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <div className="doc-records-chips">
                {(
                  [
                    ["all", "Tous"],
                    ["open", "En service"],
                    ["late", "Retards"],
                    ["absent", "Absents"],
                    ["ok", "OK"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`doc-chip${statusFilter === id ? " is-active" : ""}`}
                    onClick={() => setStatusFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="pointage-grid">
          <div className="pointage-list">
            {dayPunchesFixed.length === 0 ? (
              <EmptyState
                title="Aucun pointage"
                hint="Changez la date ou les filtres."
              />
            ) : (
              dayPunchesFixed.map((p) => {
                const emp = store.employees.find((e) => e.id === p.employeeId);
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    className={`pointage-card${selectedId === p.id ? " is-active" : ""}`}
                    onClick={() => setSelectedId(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(p.id);
                      }
                    }}
                  >
                    <div className="pointage-card__top">
                      <strong>{p.employeeName}</strong>
                      <StatusBadge tone={toneForStatus(p.status)}>
                        {p.status}
                      </StatusBadge>
                    </div>
                    <p>
                      {emp?.role ?? "Agent"} · {p.site}
                    </p>
                    <div className="pointage-card__times">
                      <span>
                        Arrivée <b>{p.actualIn ?? "—"}</b>
                      </span>
                      <span>
                        Départ <b>{p.actualOut ?? "—"}</b>
                      </span>
                      <span>
                        Durée <b>{workedHours(p)}</b>
                      </span>
                    </div>
                    {p.anomaly !== "Aucune" && p.anomaly ? (
                      <em className="pointage-card__anomaly">{p.anomaly}</em>
                    ) : null}
                    <div
                      className="pointage-card__actions"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="btn-admin btn-admin--primary"
                        disabled={Boolean(p.actualIn)}
                        onClick={() => onPunchIn(p.id)}
                      >
                        Arrivée
                      </button>
                      <button
                        type="button"
                        className="btn-admin btn-admin--ghost"
                        disabled={!p.actualIn || Boolean(p.actualOut)}
                        onClick={() => onPunchOut(p.id)}
                      >
                        Départ
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <aside className="pointage-detail panel-card">
            {selected ? (
              <PunchDetail
                punch={selected}
                role={
                  store.employees.find((e) => e.id === selected.employeeId)
                    ?.role ?? "Agent"
                }
                actorName={actorName}
                agentMode={agentMode}
                onPunchIn={() => onPunchIn(selected.id)}
                onPunchOut={() => onPunchOut(selected.id)}
                onValidate={(pendingNote) => onValidate(selected.id, pendingNote)}
                onNote={(note) => onSaveNote(selected.id, note)}
              />
            ) : (
              <EmptyState
                title="Sélectionnez un agent"
                hint="Consultez le détail et validez le pointage."
              />
            )}
          </aside>
        </div>
      </section>

      {showEmployeeForm && empDraft ? (
        <div
          className="doc-overlay-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEmployeeForm(false);
          }}
        >
          <div className="doc-overlay-dialog" style={{ maxWidth: 520 }}>
            <div className="doc-overlay-header">
              <div>
                <h2>Nouvel employé</h2>
                <p className="doc-overlay-header__sub">
                  Ajouté au tableau de pointage du jour
                </p>
              </div>
              <button
                type="button"
                className="btn-admin btn-admin--ghost"
                onClick={() => setShowEmployeeForm(false)}
              >
                Fermer
              </button>
            </div>
            <form className="doc-overlay-body" onSubmit={saveEmployee}>
              <div className="doc-fields">
                <label className="doc-field">
                  <span>Nom complet</span>
                  <input
                    value={empDraft.name}
                    onChange={(e) =>
                      setEmpDraft({ ...empDraft, name: e.target.value })
                    }
                    required
                  />
                </label>
                <label className="doc-field">
                  <span>Poste</span>
                  <input
                    value={empDraft.role}
                    onChange={(e) =>
                      setEmpDraft({ ...empDraft, role: e.target.value })
                    }
                  />
                </label>
                <label className="doc-field">
                  <span>Site</span>
                  <select
                    value={empDraft.site}
                    onChange={(e) =>
                      setEmpDraft({ ...empDraft, site: e.target.value })
                    }
                  >
                    {SITES.filter((s) => s !== "Tous les sites").map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="doc-field">
                  <span>Début shift</span>
                  <input
                    type="time"
                    value={empDraft.shiftStart}
                    onChange={(e) =>
                      setEmpDraft({ ...empDraft, shiftStart: e.target.value })
                    }
                  />
                </label>
                <label className="doc-field">
                  <span>Fin shift</span>
                  <input
                    type="time"
                    value={empDraft.shiftEnd}
                    onChange={(e) =>
                      setEmpDraft({ ...empDraft, shiftEnd: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="doc-overlay-footer" style={{ marginTop: "1rem" }}>
                <div />
                <button type="submit" className="btn-admin btn-admin--primary">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PunchDetail({
  punch,
  role,
  actorName,
  agentMode,
  onPunchIn,
  onPunchOut,
  onValidate,
  onNote,
}: {
  punch: PunchRecord;
  role: string;
  actorName: string;
  agentMode: boolean;
  onPunchIn: () => void;
  onPunchOut: () => void;
  onValidate: (pendingNote?: string) => void;
  onNote: (note: string) => void;
}) {
  const [note, setNote] = useState(punch.note);
  const [mode] = useState<PunchMode>(punch.mode);

  useEffect(() => {
    setNote(punch.note);
  }, [punch.id, punch.note]);

  return (
    <div className="pointage-detail__inner">
      <header className="pointage-detail__head">
        <div>
          <p className="pointage-detail__eyebrow">{role}</p>
          <h3>{punch.employeeName}</h3>
          <p>{punch.site}</p>
        </div>
        <StatusBadge tone={toneForStatus(punch.status)}>{punch.status}</StatusBadge>
      </header>

      <div className="pointage-detail__plan">
        <div>
          <span>Planning</span>
          <strong>
            {punch.plannedIn} – {punch.plannedOut}
          </strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>{mode}</strong>
        </div>
        <div>
          <span>Durée</span>
          <strong>{workedHours(punch)}</strong>
        </div>
      </div>

      <div className="pointage-detail__punch">
        <div className={`pointage-slot${punch.actualIn ? " is-done" : ""}`}>
          <span>Arrivée réelle</span>
          <strong>{punch.actualIn ?? "En attente"}</strong>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            disabled={Boolean(punch.actualIn)}
            onClick={onPunchIn}
          >
            Pointer arrivée
          </button>
        </div>
        <div className={`pointage-slot${punch.actualOut ? " is-done" : ""}`}>
          <span>Départ réel</span>
          <strong>{punch.actualOut ?? "En attente"}</strong>
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            disabled={!punch.actualIn || Boolean(punch.actualOut)}
            onClick={onPunchOut}
          >
            Pointer départ
          </button>
        </div>
      </div>

      {punch.anomaly && punch.anomaly !== "Aucune" ? (
        <p className="pointage-detail__warn">{punch.anomaly}</p>
      ) : (
        <p className="pointage-detail__ok">Aucune anomalie détectée</p>
      )}

      {!agentMode ? (
        <label className="doc-field">
          <span>Commentaire superviseur</span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => onNote(note)}
            placeholder="Observation, justification retard…"
          />
        </label>
      ) : null}

      {!agentMode ? (
        <div className="pointage-detail__footer">
          <span>
            {punch.validatedBy
              ? `Validé par ${punch.validatedBy}`
              : `Validateur : ${actorName}`}
          </span>
          <button
            type="button"
            className="btn-admin btn-admin--primary"
            disabled={
              !punch.actualIn ||
              !punch.actualOut ||
              punch.status === "Validé"
            }
            onClick={() => onValidate(note)}
          >
            Valider
          </button>
        </div>
      ) : punch.validatedBy ? (
        <p className="pointage-detail__ok">Validé par {punch.validatedBy}</p>
      ) : null}
    </div>
  );
}
