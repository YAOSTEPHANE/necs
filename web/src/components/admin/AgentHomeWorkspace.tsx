"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type SiteVisit,
  NECS_SITE_PHOTOS_EVENT,
  loadPendingSiteVisits,
} from "@/lib/site-photos";
import { fetchSiteVisits } from "@/lib/site-visits-client";
import {
  currentTimeHm,
  todayIso,
  workedHours,
  type GeoPoint,
  type PointagePunch,
} from "@/lib/pointage-shared";
import { formatAccuracy, readPunchPosition } from "@/lib/pointage-geo-client";
import {
  enqueueOfflineOp,
  shouldUseOfflineQueue,
} from "@/lib/offline-queue";
import { isNettoyeur, loadSession } from "@/lib/auth";
import { ModuleHeader, StatusBadge } from "@/components/admin/Ui";
import { toast } from "@/lib/toast";
import {
  IconCalendar,
  IconCheck,
  IconChecklist,
  IconClock,
  IconHome,
  IconVisit,
} from "@/components/admin/Icons";
import type { StatusTone } from "@/lib/mock-data";

function toneForStatus(status: string): StatusTone {
  const s = status.toLowerCase();
  if (s.includes("valid")) return "ok";
  if (s.includes("retard") || s.includes("anomal")) return "warn";
  if (s.includes("absent")) return "danger";
  if (s.includes("cours") || s.includes("complet")) return "info";
  return "neutral";
}

function greetingForHour(hour: number): string {
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

function formatLongDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function sameAgent(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type DayStep = {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  active: boolean;
};

export function AgentHomeWorkspace() {
  const [punch, setPunch] = useState<PointagePunch | null>(null);
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Enregistrement…");
  const busyLock = useRef(false);
  const [geoRequired, setGeoRequired] = useState(false);
  const [agentName, setAgentName] = useState("Agent");
  const [clock, setClock] = useState(currentTimeHm());
  const date = todayIso();
  const firstName = agentName.split(/\s+/)[0] || "Agent";
  const hour = new Date().getHours();

  const refreshPunch = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/pointage?date=${encodeURIComponent(todayIso())}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        punches?: PointagePunch[];
        geoEnabled?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement");
      setPunch(data.punches?.[0] ?? null);
      setGeoRequired(Boolean(data.geoEnabled));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur pointage");
    }
  }, []);

  const refreshVisits = useCallback(async () => {
    const pending = loadPendingSiteVisits();
    try {
      const remote = await fetchSiteVisits();
      const remoteIds = new Set(remote.map((v) => v.id));
      setVisits([...pending.filter((v) => !remoteIds.has(v.id)), ...remote]);
    } catch {
      setVisits(pending);
    }
  }, []);

  useEffect(() => {
    const session = loadSession();
    if (!session || !isNettoyeur(session)) {
      setReady(true);
      return;
    }
    setAgentName(session.name);
    void Promise.all([refreshPunch(), refreshVisits()]).finally(() =>
      setReady(true),
    );
  }, [refreshPunch, refreshVisits]);

  useEffect(() => {
    const t = window.setInterval(() => setClock(currentTimeHm()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const onPhotos = () => void refreshVisits();
    window.addEventListener(NECS_SITE_PHOTOS_EVENT, onPhotos);
    return () => window.removeEventListener(NECS_SITE_PHOTOS_EVENT, onPhotos);
  }, [refreshVisits]);

  const myVisitsToday = useMemo(() => {
    return visits.filter(
      (v) => v.date === date && sameAgent(v.agent, agentName),
    );
  }, [visits, date, agentName]);

  const arrivalPhotoCount = myVisitsToday.reduce(
    (n, v) => n + v.photos.filter((p) => p.kind === "arrival").length,
    0,
  );
  const afterPhotoCount = myVisitsToday.reduce(
    (n, v) => n + v.photos.filter((p) => p.kind === "after").length,
    0,
  );
  const hasArrivalPhoto = arrivalPhotoCount > 0;
  const hasDeparturePhoto = afterPhotoCount > 0;

  const steps: DayStep[] = useMemo(() => {
    if (!punch) return [];
    const arrived = Boolean(punch.actualIn);
    const left = Boolean(punch.actualOut);
    return [
      {
        id: "in",
        label: "Pointer l’arrivée",
        hint: punch.actualIn
          ? `Enregistrée à ${punch.actualIn}`
          : `Prévu ${punch.plannedIn}`,
        done: arrived,
        active: !arrived,
      },
      {
        id: "photo-in",
        label: "Photo d’arrivée",
        hint: hasArrivalPhoto
          ? `${arrivalPhotoCount} photo${arrivalPhotoCount > 1 ? "s" : ""}`
          : "État du site au début",
        done: hasArrivalPhoto,
        active: arrived && !hasArrivalPhoto && !left,
      },
      {
        id: "photo-out",
        label: "Photo de départ",
        hint: hasDeparturePhoto
          ? `${afterPhotoCount} photo${afterPhotoCount > 1 ? "s" : ""}`
          : "Après nettoyage, avant de partir",
        done: hasDeparturePhoto,
        active: arrived && hasArrivalPhoto && !hasDeparturePhoto && !left,
      },
      {
        id: "out",
        label: "Pointer le départ",
        hint: punch.actualOut
          ? `Enregistré à ${punch.actualOut}`
          : arrived
            ? `Prévu ${punch.plannedOut}`
            : "Après l’arrivée",
        done: left,
        active: arrived && hasArrivalPhoto && hasDeparturePhoto && !left,
      },
    ];
  }, [
    punch,
    hasArrivalPhoto,
    hasDeparturePhoto,
    arrivalPhotoCount,
    afterPhotoCount,
  ]);

  const nextAction = steps.find((s) => s.active && !s.done) ?? null;

  const postPunch = async (action: "punch_in" | "punch_out") => {
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      let geo: GeoPoint | undefined;
      if (geoRequired) {
        setBusyLabel("Localisation…");
        geo = await readPunchPosition();
      }
      setBusyLabel("Enregistrement…");
      if (shouldUseOfflineQueue()) {
        const session = loadSession();
        if (!session?.userId) throw new Error("Session requise");
        await enqueueOfflineOp({
          userId: session.userId,
          kind: action === "punch_in" ? "pointage_in" : "pointage_out",
          payload: {
            userId: session.userId,
            date: todayIso(),
            mode: "Mobile",
            geo,
          },
          occurredAt: new Date().toISOString(),
        });
        setPunch((prev) =>
          prev
            ? action === "punch_in"
              ? {
                  ...prev,
                  actualIn: currentTimeHm(),
                  actualInAt: new Date().toISOString(),
                  status: "En cours",
                  anomaly: "Départ manquant · sync pending",
                }
              : {
                  ...prev,
                  actualOut: currentTimeHm(),
                  actualOutAt: new Date().toISOString(),
                  status: "Complet",
                  anomaly: "Sync pending",
                }
            : prev,
        );
        toast.success(
          action === "punch_in"
            ? "Arrivée hors ligne — sync au retour réseau"
            : "Départ hors ligne — sync au retour réseau",
        );
        return;
      }

      const res = await fetch("/api/pointage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          mode: "Mobile",
          clientRequestId: newClientRequestId(),
          geo,
        }),
      });
      const data = (await res.json()) as {
        punch?: PointagePunch;
        duplicate?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Échec");
      if (data.punch) setPunch(data.punch);
      if (data.duplicate) {
        toast.warning(
          action === "punch_in"
            ? "Arrivée déjà enregistrée."
            : "Départ déjà enregistré.",
        );
      } else {
        const where = geo ? ` · position ${formatAccuracy(geo)}` : "";
        toast.success(
          action === "punch_in"
            ? `Arrivée pointée à ${currentTimeHm()}${where}`
            : `Départ pointé à ${currentTimeHm()}${where}`,
        );
      }
      await refreshPunch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  };

  const onPunchIn = () => {
    if (!punch) return;
    if (punch.actualIn) {
      toast.warning("Arrivée déjà enregistrée.");
      return;
    }
    void postPunch("punch_in");
  };

  const onPunchOut = () => {
    if (!punch) return;
    if (!punch.actualIn) {
      toast.warning("Pointer l’arrivée d’abord.");
      return;
    }
    if (punch.actualOut) {
      toast.warning("Départ déjà enregistré.");
      return;
    }
    if (!hasArrivalPhoto) {
      toast.warning("Déposez d’abord une photo d’arrivée.");
      return;
    }
    if (!hasDeparturePhoto) {
      toast.warning("Déposez une photo de départ après nettoyage.");
      return;
    }
    void postPunch("punch_out");
  };

  if (!ready) {
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
          Impossible de charger le pointage. Vérifiez la connexion base de
          données ou contactez votre superviseur.
        </p>
        <button
          type="button"
          className="btn-admin btn-admin--primary"
          onClick={() => void refreshPunch()}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="doc-workspace agent-home">
      <ModuleHeader
        tone="#1260a8"
        badge="Espace agent"
        icon={<IconHome size={22} />}
        title={`${greetingForHour(hour)}, ${firstName}`}
        meta={
          <>
            <span>
              <strong>{formatLongDate(date)}</strong>
            </span>
            <span>
              <strong>{clock}</strong>
            </span>
            <span>
              <StatusBadge tone={toneForStatus(punch.status)}>
                {punch.status}
              </StatusBadge>
            </span>
          </>
        }
      />

      <section className="agent-home__punch-card panel-card">
        <div className="agent-home__punch-site">
          <strong>{punch.site}</strong>
          <span>
            {punch.plannedIn} – {punch.plannedOut}
            {punch.planningSlotId ? " · planning" : " · hors planning"}
          </span>
        </div>
        <dl className="agent-home__times">
          <div>
            <dt>Arrivée</dt>
            <dd>{punch.actualIn || "—"}</dd>
          </div>
          <div>
            <dt>Départ</dt>
            <dd>{punch.actualOut || "—"}</dd>
          </div>
          <div>
            <dt>Durée</dt>
            <dd>{workedHours(punch)}</dd>
          </div>
        </dl>

        {nextAction ? (
          nextAction.id === "in" || nextAction.id === "out" ? (
            <button
              type="button"
              className={`agent-home__next agent-home__next--${nextAction.id}`}
              disabled={busy}
              onClick={nextAction.id === "in" ? onPunchIn : onPunchOut}
            >
              <IconClock size={22} />
              <span>
                <strong>{busy ? busyLabel : nextAction.label}</strong>
                <small>{nextAction.hint}</small>
              </span>
            </button>
          ) : (
            <Link
              href="/admin/operations?tab=terrain"
              className="agent-home__next agent-home__next--photo"
            >
              <IconVisit size={22} />
              <span>
                <strong>Prendre la {nextAction.label.toLowerCase()}</strong>
                <small>{nextAction.hint}</small>
              </span>
            </Link>
          )
        ) : (
          <p className="agent-home__done">
            <IconCheck size={18} /> Journée de pointage complète. Merci !
          </p>
        )}

        <div className="agent-home__secondary">
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            disabled={busy || Boolean(punch.actualIn)}
            onClick={onPunchIn}
          >
            {punch.actualIn ? `Arrivée ${punch.actualIn}` : "Pointer l’arrivée"}
          </button>
          <button
            type="button"
            className="btn-admin btn-admin--ghost"
            disabled={busy || !punch.actualIn || Boolean(punch.actualOut)}
            onClick={onPunchOut}
          >
            {punch.actualOut ? `Départ ${punch.actualOut}` : "Pointer le départ"}
          </button>
        </div>
        {geoRequired && !punch.actualOut ? (
          <p className="agent-home__geo-note">
            Votre position est enregistrée uniquement au moment du pointage.
          </p>
        ) : null}
      </section>

      <section className="agent-home__journey panel-card" aria-label="Étapes de la journée">
        <div className="agent-home__section-head">
          <h2>Ma journée</h2>
          <span>
            {steps.filter((s) => s.done).length}/{steps.length} étapes
          </span>
        </div>
        <ol className="agent-home__steps">
          {steps.map((s, i) => (
            <li
              key={s.id}
              className={`agent-home__step${s.done ? " is-done" : ""}${s.active ? " is-active" : ""}`}
            >
              <span className="agent-home__step-num" aria-hidden>
                {s.done ? <IconCheck size={14} /> : i + 1}
              </span>
              <div>
                <strong>{s.label}</strong>
                <small>{s.hint}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <nav className="agent-home__links" aria-label="Raccourcis">
        <Link href="/admin/operations?tab=pointage" className="agent-home__link">
          <IconClock size={20} />
          <span>
            <strong>Mon pointage</strong>
            <small>Historique du jour</small>
          </span>
        </Link>
        <Link href="/admin/operations?tab=terrain" className="agent-home__link">
          <IconVisit size={20} />
          <span>
            <strong>Photos</strong>
            <small>Arrivée &amp; départ</small>
          </span>
        </Link>
        <Link href="/admin/operations?tab=missions" className="agent-home__link">
          <IconCalendar size={20} />
          <span>
            <strong>Missions</strong>
            <small>Ordres de travail</small>
          </span>
        </Link>
        <Link href="/admin/documents-signatures" className="agent-home__link">
          <IconChecklist size={20} />
          <span>
            <strong>Documents</strong>
            <small>À signer</small>
          </span>
        </Link>
      </nav>
    </div>
  );
}
