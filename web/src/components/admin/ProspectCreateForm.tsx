"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AdminOverlayPortal } from "@/components/admin/AdminOverlayPortal";
import {
  PROSPECT_POTENTIAL_LABELS,
  PROSPECT_POTENTIALS,
  type ProspectPotential,
} from "@/lib/prospects-shared";
import {
  FREQUENCY_LABELS,
  NEED_FREQUENCIES,
  NEED_FIELD_LABELS,
  PRESTATION_KINDS,
  PRESTATION_LABELS,
  SERVICE_LEVEL_LABELS,
  SERVICE_LEVELS,
  emptyCleaningNeed,
  requiredFieldsForNeed,
  validateCleaningNeed,
  type CleaningNeed,
  type NeedFieldKey,
  type NeedFrequency,
  type PrestationKind,
  type ServiceLevel,
} from "@/lib/need-qualification-shared";
import styles from "./form-wizard/FormWizard.module.css";

export type ProspectDraft = {
  company: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  source: string;
  campaign: string;
  potential: ProspectPotential;
  potentialValue: string;
  note: string;
  need: CleaningNeed;
};

export const EMPTY_PROSPECT_DRAFT: ProspectDraft = {
  company: "",
  name: "",
  email: "",
  phone: "",
  city: "",
  source: "saisie_commerciale",
  campaign: "",
  potential: "moyen",
  potentialValue: "",
  note: "",
  need: emptyCleaningNeed(),
};

const SOURCE_OPTIONS = [
  { value: "saisie_commerciale", label: "Saisie commerciale" },
  { value: "site_web", label: "Site web" },
  { value: "facebook", label: "Facebook / Meta" },
  { value: "recommandation", label: "Recommandation" },
  { value: "appel_entrant", label: "Appel entrant" },
  { value: "salon", label: "Salon / événement" },
  { value: "autre", label: "Autre" },
] as const;

const STEPS = [
  { id: "dossier", label: "Dossier", hint: "Identité & contact" },
  { id: "besoin", label: "Besoin", hint: "Qualification nettoyage" },
  { id: "revue", label: "Revue", hint: "Contrôle avant création" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const PRESTATION_HINTS: Record<PrestationKind, string> = {
  bureaux: "Open space, salles, sanitaires",
  commerces: "Magasins, galeries, vitrines",
  industriel: "Usines, entrepôts, ateliers",
  medical: "Cliniques, cabinets, labs",
  residentiel: "Appartements, villas",
  copropriete: "Halls, cages, parkings",
  evenementiel: "Ponctuel & post-événement",
  autre: "Besoin hors standard",
};

const SERVICE_HINTS: Record<ServiceLevel, string> = {
  essentiel: "Socle opérationnel",
  standard: "Couverture régulière",
  renforce: "Exigence élevée",
  premium: "Excellence & image",
};

const POTENTIAL_HINTS: Record<ProspectPotential, string> = {
  faible: "Volume limité",
  moyen: "Pipeline standard",
  fort: "Priorité commerciale",
  strategique: "Compte clé",
};

type Props = {
  busy?: boolean;
  onClose: () => void;
  onSubmit: (draft: ProspectDraft) => void | Promise<void>;
};

export function ProspectCreateForm({ busy = false, onClose, onSubmit }: Props) {
  const [draft, setDraft] = useState<ProspectDraft>(EMPTY_PROSPECT_DRAFT);
  const [step, setStep] = useState<StepId>("dossier");
  const [shake, setShake] = useState(false);

  const needValidation = useMemo(
    () => validateCleaningNeed(draft.need),
    [draft.need],
  );
  const requiredNeed = useMemo(
    () => requiredFieldsForNeed(draft.need),
    [draft.need],
  );
  const needProgress = useMemo(() => {
    if (requiredNeed.length === 0) return 0;
    const filled = requiredNeed.filter((f) => {
      const v = draft.need[f];
      if (typeof v === "number") return v > 0;
      return Boolean(String(v ?? "").trim());
    }).length;
    return Math.round((filled / requiredNeed.length) * 100);
  }, [draft.need, requiredNeed]);

  const dossierReady =
    Boolean(draft.company.trim()) &&
    Boolean(draft.name.trim()) &&
    Boolean(draft.email.trim()) &&
    draft.email.includes("@");

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function patchNeed(partial: Partial<CleaningNeed>) {
    setDraft((d) => ({ ...d, need: { ...d.need, ...partial } }));
  }

  function isNeedRequired(field: NeedFieldKey) {
    return requiredNeed.includes(field);
  }

  function pulseError() {
    setShake(true);
    window.setTimeout(() => setShake(false), 420);
  }

  function goNext() {
    if (step === "dossier" && !dossierReady) {
      pulseError();
      return;
    }
    if (step === "dossier") setStep("besoin");
    else if (step === "besoin") setStep("revue");
  }

  function goBack() {
    if (step === "besoin") setStep("dossier");
    else if (step === "revue") setStep("besoin");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!dossierReady) {
      setStep("dossier");
      pulseError();
      return;
    }
    await onSubmit(draft);
  }

  const initials = (draft.company || draft.name || "N")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <AdminOverlayPortal>
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${styles.dialog}${shake ? ` ${styles.dialogShake}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prospect-premium-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden />
          <div className={styles.heroMain}>
            <div className={styles.avatar} aria-hidden>
              {initials || "N"}
            </div>
            <div>
              <p className={styles.eyebrow}>Nouveau dossier</p>
              <h2 id="prospect-premium-title" className={styles.title}>
                Nouveau prospect
              </h2>
              <p className={styles.lead}>
                Structurez le contact et le besoin de nettoyage — l’étude
                n’ouvre que si les données requises sont présentes.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.close}
            aria-label="Fermer"
            onClick={onClose}
          >
            ✕
          </button>
        </header>

        <nav className={styles.steps} aria-label="Étapes">
          {STEPS.map((s, i) => {
            const active = s.id === step;
            const done = i < stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                className={`${styles.step}${active || done ? ` ${styles.stepActive}` : ""}`}
                onClick={() => {
                  if (s.id === "besoin" || s.id === "revue") {
                    if (!dossierReady) {
                      pulseError();
                      return;
                    }
                  }
                  if (i <= stepIndex || dossierReady) setStep(s.id);
                }}
              >
                <span
                  className={`${styles.stepIdx}${active || done ? ` ${styles.stepIdxOn}` : ""}`}
                >
                  {i + 1}
                </span>
                <span className={styles.stepCopy}>
                  <strong>{s.label}</strong>
                  <em>{s.hint}</em>
                </span>
              </button>
            );
          })}
          <div className={styles.rail} aria-hidden>
            <span
              className={styles.railFill}
              style={{
                width: `${(stepIndex / (STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>
        </nav>

        <form
          id="necs-prospect-form"
          className={styles.body}
          onSubmit={(e) => void handleSubmit(e)}
        >
          {step === "dossier" ? (
            <section className={styles.panel} aria-label="Dossier">
              <div className={styles.panelHead}>
                <h3>Identité commerciale</h3>
                <p>Entreprise, contact et signaux de priorité.</p>
              </div>

              <div className={styles.grid}>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Entreprise *</span>
                  <input
                    required
                    autoFocus
                    value={draft.company}
                    placeholder="Raison sociale du site"
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, company: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Contact *</span>
                  <input
                    required
                    value={draft.name}
                    placeholder="Nom du décideur"
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, name: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>E-mail * · déduplication</span>
                  <input
                    type="email"
                    required
                    value={draft.email}
                    placeholder="contact@entreprise.cm"
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, email: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Téléphone</span>
                  <input
                    value={draft.phone}
                    placeholder="+237 6XX XX XX XX"
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, phone: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Ville</span>
                  <input
                    value={draft.city}
                    placeholder="Douala, Yaoundé…"
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, city: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Source</span>
                  <select
                    value={draft.source}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, source: e.target.value }))
                    }
                  >
                    {SOURCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Campagne</span>
                  <input
                    value={draft.campaign}
                    placeholder="Optionnel"
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, campaign: e.target.value }))
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Valeur potentielle (FCFA)</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.potentialValue}
                    placeholder="0"
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        potentialValue: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className={styles.block}>
                <div className={styles.blockHead}>
                  <h4>Potentiel</h4>
                  <p>Oriente le score et le suivi commercial.</p>
                </div>
                <div className={styles.chips} role="radiogroup">
                  {PROSPECT_POTENTIALS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={draft.potential === p}
                      className={`${styles.chip}${draft.potential === p ? ` ${styles.chipOn}` : ""}`}
                      onClick={() =>
                        setDraft((d) => ({ ...d, potential: p }))
                      }
                    >
                      <strong>{PROSPECT_POTENTIAL_LABELS[p]}</strong>
                      <span>{POTENTIAL_HINTS[p]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className={`${styles.field} ${styles.fieldNote}`}>
                <span>Note interne</span>
                <textarea
                  rows={3}
                  value={draft.note}
                  placeholder="Contexte, interlocuteurs, urgence…"
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, note: e.target.value }))
                  }
                />
              </label>
            </section>
          ) : null}

          {step === "besoin" ? (
            <section className={styles.panel} aria-label="Besoin">
              <div className={`${styles.panelHead} ${styles.panelHeadSplit}`}>
                <div>
                  <h3>Qualification du besoin</h3>
                  <p>
                    Surface, locaux, fréquence, horaires, contraintes, niveau de
                    service.
                  </p>
                </div>
                <div
                  className={`${styles.meter}${needValidation.ok ? ` ${styles.meterOk}` : ""}`}
                  aria-label={`Complétude ${needProgress}%`}
                >
                  <svg viewBox="0 0 36 36" aria-hidden>
                    <path
                      className={styles.meterBg}
                      d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 1 1 0-31"
                    />
                    <path
                      className={styles.meterFg}
                      strokeDasharray={`${needProgress}, 100`}
                      d="M18 2.5a15.5 15.5 0 1 1 0 31 15.5 15.5 0 1 1 0-31"
                    />
                  </svg>
                  <div>
                    <strong>{needProgress}%</strong>
                    <span>
                      {needValidation.ok ? "Prêt pour l’étude" : "À compléter"}
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.block}>
                <div className={styles.blockHead}>
                  <h4>Type de prestation *</h4>
                  <p>Détermine les champs obligatoires.</p>
                </div>
                <div className={styles.cards}>
                  {PRESTATION_KINDS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`${styles.card}${draft.need.prestation === p ? ` ${styles.cardOn}` : ""}`}
                      onClick={() => patchNeed({ prestation: p })}
                    >
                      <strong>{PRESTATION_LABELS[p]}</strong>
                      <span>{PRESTATION_HINTS[p]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>
                    Surface m²{isNeedRequired("surfaceM2") ? " *" : ""}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.need.surfaceM2 ?? ""}
                    placeholder="ex. 1200"
                    onChange={(e) =>
                      patchNeed({
                        surfaceM2: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>
                    Type de locaux{isNeedRequired("localType") ? " *" : ""}
                  </span>
                  <input
                    value={draft.need.localType}
                    placeholder="Open space, halls, sanitaires…"
                    onChange={(e) => patchNeed({ localType: e.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>
                    Fréquence{isNeedRequired("frequency") ? " *" : ""}
                  </span>
                  <select
                    value={draft.need.frequency}
                    onChange={(e) =>
                      patchNeed({
                        frequency: e.target.value as NeedFrequency | "",
                      })
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
                <label className={styles.field}>
                  <span>Horaires{isNeedRequired("schedule") ? " *" : ""}</span>
                  <input
                    value={draft.need.schedule}
                    placeholder="18h–22h, week-end…"
                    onChange={(e) => patchNeed({ schedule: e.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>
                    Effectif estimé
                    {isNeedRequired("staffEstimate") ? " *" : ""}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.need.staffEstimate ?? ""}
                    onChange={(e) =>
                      patchNeed({
                        staffEstimate: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>Zones{isNeedRequired("zones") ? " *" : ""}</span>
                  <input
                    value={draft.need.zones}
                    placeholder="RDC, étages 1–3, parking…"
                    onChange={(e) => patchNeed({ zones: e.target.value })}
                  />
                </label>
              </div>

              <div className={styles.block}>
                <div className={styles.blockHead}>
                  <h4>
                    Niveau de service
                    {isNeedRequired("serviceLevel") ? " *" : ""}
                  </h4>
                  <p>Attendus qualité & image site.</p>
                </div>
                <div className={styles.tiers}>
                  {SERVICE_LEVELS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`${styles.tier}${draft.need.serviceLevel === s ? ` ${styles.tierOn}` : ""}`}
                      onClick={() => patchNeed({ serviceLevel: s })}
                    >
                      <strong>{SERVICE_LEVEL_LABELS[s]}</strong>
                      <span>{SERVICE_HINTS[s]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.grid}>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>
                    Contraintes{isNeedRequired("constraints") ? " *" : ""}
                  </span>
                  <textarea
                    rows={2}
                    value={draft.need.constraints}
                    placeholder="Horaires sensibles, badges, produits agréés…"
                    onChange={(e) =>
                      patchNeed({ constraints: e.target.value })
                    }
                  />
                </label>
                <label className={`${styles.field} ${styles.fieldWide}`}>
                  <span>
                    Accès / consignes
                    {isNeedRequired("accessNotes") ? " *" : ""}
                  </span>
                  <textarea
                    rows={2}
                    value={draft.need.accessNotes}
                    placeholder="Clés, alarmes, contacts site…"
                    onChange={(e) =>
                      patchNeed({ accessNotes: e.target.value })
                    }
                  />
                </label>
              </div>

              {!needValidation.ok ? (
                <p className={styles.warn}>
                  Manque pour l’étude :{" "}
                  {needValidation.missing
                    .map((f) => NEED_FIELD_LABELS[f])
                    .join(", ")}
                  . Vous pouvez créer le dossier et compléter ensuite.
                </p>
              ) : (
                <p className={styles.ok}>
                  Besoin complet — l’opportunité pourra passer à l’étude.
                </p>
              )}
            </section>
          ) : null}

          {step === "revue" ? (
            <section className={styles.panel} aria-label="Revue">
              <div className={styles.panelHead}>
                <h3>Revue avant création</h3>
                <p>
                  Vérifiez le dossier. La déduplication se fait sur l’e-mail.
                </p>
              </div>

              <div className={styles.review}>
                <article>
                  <h4>Contact</h4>
                  <dl>
                    <div>
                      <dt>Entreprise</dt>
                      <dd>{draft.company || "—"}</dd>
                    </div>
                    <div>
                      <dt>Contact</dt>
                      <dd>{draft.name || "—"}</dd>
                    </div>
                    <div>
                      <dt>E-mail</dt>
                      <dd>{draft.email || "—"}</dd>
                    </div>
                    <div>
                      <dt>Téléphone</dt>
                      <dd>{draft.phone || "—"}</dd>
                    </div>
                    <div>
                      <dt>Ville</dt>
                      <dd>{draft.city || "—"}</dd>
                    </div>
                    <div>
                      <dt>Potentiel</dt>
                      <dd>{PROSPECT_POTENTIAL_LABELS[draft.potential]}</dd>
                    </div>
                  </dl>
                </article>
                <article>
                  <h4>Besoin</h4>
                  <dl>
                    <div>
                      <dt>Prestation</dt>
                      <dd>
                        {draft.need.prestation
                          ? PRESTATION_LABELS[draft.need.prestation]
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Surface</dt>
                      <dd>
                        {draft.need.surfaceM2 != null
                          ? `${draft.need.surfaceM2} m²`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Fréquence</dt>
                      <dd>
                        {draft.need.frequency
                          ? FREQUENCY_LABELS[draft.need.frequency]
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Horaires</dt>
                      <dd>{draft.need.schedule || "—"}</dd>
                    </div>
                    <div>
                      <dt>Niveau</dt>
                      <dd>
                        {draft.need.serviceLevel
                          ? SERVICE_LEVEL_LABELS[draft.need.serviceLevel]
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Étude</dt>
                      <dd>
                        {needValidation.ok ? (
                          <span className={styles.badgeOk}>Autorisée</span>
                        ) : (
                          <span className={styles.badgeWarn}>
                            Bloquée · {needProgress}%
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </article>
              </div>
            </section>
          ) : null}
        </form>

        <footer className={styles.foot}>
          <div className={styles.footMeta}>
            <span>
              Étape {stepIndex + 1}/{STEPS.length}
            </span>
            {step !== "dossier" ? (
              <span className={needValidation.ok ? styles.footMetaOk : undefined}>
                Besoin {needProgress}%
              </span>
            ) : null}
          </div>
          <div className={styles.footActions}>
            {step !== "dossier" ? (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={goBack}
              >
                Retour
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnGhost}
                onClick={onClose}
              >
                Annuler
              </button>
            )}
            {step !== "revue" ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={goNext}
              >
                Continuer
              </button>
            ) : (
              <button
                type="submit"
                form="necs-prospect-form"
                className={styles.btnPrimary}
                disabled={busy || !dossierReady}
              >
                {busy ? "Création…" : "Créer le dossier"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
    </AdminOverlayPortal>
  );
}
