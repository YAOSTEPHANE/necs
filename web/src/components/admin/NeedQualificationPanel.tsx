"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  FREQUENCY_LABELS,
  NEED_FREQUENCIES,
  NEED_FIELD_LABELS,
  OPPORTUNITY_STAGE_LABELS,
  PRESTATION_KINDS,
  PRESTATION_LABELS,
  REQUIRED_FIELDS_BY_PRESTATION,
  SERVICE_LEVEL_LABELS,
  SERVICE_LEVELS,
  emptyCleaningNeed,
  isPrestationKind,
  requiredFieldsForNeed,
  validateCleaningNeed,
  type CleaningNeed,
  type CrmOpportunity,
  type NeedFieldKey,
  type NeedFrequency,
  type PrestationKind,
  type ServiceLevel,
} from "@/lib/need-qualification-shared";
import { toast } from "@/lib/toast";

type Props = {
  prospectId: string;
  company?: string;
  embedded?: boolean;
  onChanged?: () => void;
};

function formatWhen(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NeedQualificationPanel({
  prospectId,
  company,
  embedded = true,
  onChanged,
}: Props) {
  const [opp, setOpp] = useState<CrmOpportunity | null>(null);
  const [need, setNeed] = useState<CleaningNeed>(emptyCleaningNeed());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyLock = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/need-qualification?prospectId=${encodeURIComponent(prospectId)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as {
        item?: CrmOpportunity | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Chargement impossible");
      setOpp(data.item ?? null);
      setNeed(data.item?.need ?? emptyCleaningNeed());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [prospectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const required = useMemo(() => requiredFieldsForNeed(need), [need]);
  const validation = useMemo(() => validateCleaningNeed(need), [need]);

  function isRequired(field: NeedFieldKey) {
    return required.includes(field);
  }

  function mark(field: NeedFieldKey) {
    return isRequired(field) ? " *" : "";
  }

  async function saveNeed(e?: FormEvent) {
    e?.preventDefault();
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/need-qualification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-need",
          prospectId,
          need,
        }),
      });
      const data = (await res.json()) as {
        item?: CrmOpportunity;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
      if (data.item) {
        setOpp(data.item);
        setNeed(data.item.need);
        toast.success(
          data.item.needComplete
            ? "Besoin complet — prêt pour l’étude"
            : "Besoin enregistré (champs manquants)",
        );
        onChanged?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  async function advanceToStudy() {
    if (!opp) {
      toast.error("Enregistrez d’abord le besoin");
      return;
    }
    if (busy) return;
    if (busyLock.current) return;
    busyLock.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/need-qualification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance-study", id: opp.id }),
      });
      const data = (await res.json()) as {
        item?: CrmOpportunity;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Passage à l’étude refusé");
      if (data.item) {
        setOpp(data.item);
        toast.success("Opportunité passée à l’étude");
        onChanged?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      busyLock.current = false;
      setBusy(false);
    }
  }

  const requiredHint =
    need.prestation && isPrestationKind(need.prestation)
      ? REQUIRED_FIELDS_BY_PRESTATION[need.prestation]
          .map((f) => NEED_FIELD_LABELS[f])
          .join(", ")
      : "Sélectionnez d’abord le type de prestation";

  return (
    <section
      className={`need-qual${embedded ? " need-qual--embedded" : ""}`}
      aria-label="Qualification du besoin"
    >
      <header className="need-qual__head">
        <div>
          <p className="dig-feature__eyebrow">Qualification du besoin</p>
          <h3>Besoin de nettoyage{company ? ` — ${company}` : ""}</h3>
          <p>
            Surface, locaux, fréquence, horaires, contraintes et niveau de
            service. Champs obligatoires selon la prestation.
          </p>
        </div>
        <div className="need-qual__badge">
          {opp ? (
            <>
              <span>{opp.id}</span>
              <strong>{OPPORTUNITY_STAGE_LABELS[opp.stage]}</strong>
            </>
          ) : (
            <strong>Pas encore d’opportunité</strong>
          )}
        </div>
      </header>

      {loading ? (
        <p className="dig-feature__empty">Chargement…</p>
      ) : (
        <form className="need-qual__form" onSubmit={(e) => void saveNeed(e)}>
          <div className="need-qual__grid">
            <label>
              Prestation{mark("prestation")}
              <select
                value={need.prestation}
                onChange={(e) =>
                  setNeed((n) => ({
                    ...n,
                    prestation: e.target.value as PrestationKind | "",
                  }))
                }
              >
                <option value="">— Choisir —</option>
                {PRESTATION_KINDS.map((p) => (
                  <option key={p} value={p}>
                    {PRESTATION_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Surface m²{mark("surfaceM2")}
              <input
                type="number"
                min={0}
                step={1}
                value={need.surfaceM2 ?? ""}
                onChange={(e) =>
                  setNeed((n) => ({
                    ...n,
                    surfaceM2: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
              />
            </label>

            <label>
              Type de locaux{mark("localType")}
              <input
                value={need.localType}
                onChange={(e) =>
                  setNeed((n) => ({ ...n, localType: e.target.value }))
                }
                placeholder="ex. open space, halls, sanitaires…"
              />
            </label>

            <label>
              Fréquence{mark("frequency")}
              <select
                value={need.frequency}
                onChange={(e) =>
                  setNeed((n) => ({
                    ...n,
                    frequency: e.target.value as NeedFrequency | "",
                  }))
                }
              >
                <option value="">— Choisir —</option>
                {NEED_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABELS[f]}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Horaires{mark("schedule")}
              <input
                value={need.schedule}
                onChange={(e) =>
                  setNeed((n) => ({ ...n, schedule: e.target.value }))
                }
                placeholder="ex. 18h–22h, week-end…"
              />
            </label>

            <label>
              Niveau de service{mark("serviceLevel")}
              <select
                value={need.serviceLevel}
                onChange={(e) =>
                  setNeed((n) => ({
                    ...n,
                    serviceLevel: e.target.value as ServiceLevel | "",
                  }))
                }
              >
                <option value="">— Choisir —</option>
                {SERVICE_LEVELS.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_LEVEL_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>

            <label className="need-qual__full">
              Zones{mark("zones")}
              <input
                value={need.zones}
                onChange={(e) =>
                  setNeed((n) => ({ ...n, zones: e.target.value }))
                }
                placeholder="ex. RDC, étages 1–3, parking…"
              />
            </label>

            <label>
              Effectif estimé{mark("staffEstimate")}
              <input
                type="number"
                min={0}
                value={need.staffEstimate ?? ""}
                onChange={(e) =>
                  setNeed((n) => ({
                    ...n,
                    staffEstimate: e.target.value
                      ? Number(e.target.value)
                      : null,
                  }))
                }
              />
            </label>

            <label className="need-qual__full">
              Contraintes{mark("constraints")}
              <textarea
                rows={2}
                value={need.constraints}
                onChange={(e) =>
                  setNeed((n) => ({ ...n, constraints: e.target.value }))
                }
                placeholder="Sécurité, produits, horaires fermés, HQE…"
              />
            </label>

            <label className="need-qual__full">
              Accès / consignes{mark("accessNotes")}
              <textarea
                rows={2}
                value={need.accessNotes}
                onChange={(e) =>
                  setNeed((n) => ({ ...n, accessNotes: e.target.value }))
                }
                placeholder="Badges, clés, interlocuteur site…"
              />
            </label>
          </div>

          <div
            className={`need-qual__validation${
              validation.ok ? " is-ok" : " is-warn"
            }`}
          >
            {validation.ok ? (
              <p>
                Besoin complet pour la prestation sélectionnée. Passage à
                l’étude autorisé.
              </p>
            ) : (
              <p>
                Obligatoires : {requiredHint}
                {validation.missing.length > 0 ? (
                  <>
                    {" "}
                    · Manque :{" "}
                    <strong>
                      {validation.missing
                        .map((f) => NEED_FIELD_LABELS[f])
                        .join(", ")}
                    </strong>
                  </>
                ) : null}
              </p>
            )}
          </div>

          <div className="need-qual__actions">
            <button
              type="submit"
              className="btn-admin btn-admin--primary"
              disabled={busy}
            >
              Enregistrer le besoin
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              disabled={busy || !opp || !validation.ok || opp.stage === "etude"}
              onClick={() => void advanceToStudy()}
              title={
                !validation.ok
                  ? opp?.studyBlockedReason || "Complétez les champs obligatoires"
                  : undefined
              }
            >
              {opp?.stage === "etude"
                ? "Déjà en étude"
                : "Passer à l’étude"}
            </button>
            {opp?.stage === "etude" ? (
              <>
                <Link
                  href={`/admin/commercial?tab=audit-visite&prospectId=${encodeURIComponent(prospectId)}`}
                  className="btn-admin btn-admin--ghost"
                >
                  Visite technique
                </Link>
                <Link
                  href={`/admin/commercial?tab=chiffrage&prospectId=${encodeURIComponent(prospectId)}`}
                  className="btn-admin btn-admin--ghost"
                >
                  Chiffrage
                </Link>
              </>
            ) : null}
          </div>

          {opp?.history?.length ? (
            <ol className="need-qual__history">
              {opp.history.slice(0, 6).map((h) => (
                <li key={h.id}>
                  <time>{formatWhen(h.at)}</time>
                  <span>
                    {h.byName} — {h.detail}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </form>
      )}
    </section>
  );
}
