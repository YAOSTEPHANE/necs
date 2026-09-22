"use client";

import { useMemo } from "react";
import {
  FREQUENCY_LABELS,
  NEED_FREQUENCIES,
  NEED_FIELD_LABELS,
  PRESTATION_KINDS,
  PRESTATION_LABELS,
  REQUIRED_FIELDS_BY_PRESTATION,
  SERVICE_LEVEL_LABELS,
  SERVICE_LEVELS,
  isPrestationKind,
  requiredFieldsForNeed,
  validateCleaningNeed,
  type CleaningNeed,
  type NeedFieldKey,
  type NeedFrequency,
  type PrestationKind,
  type ServiceLevel,
} from "@/lib/need-qualification-shared";

type Props = {
  value: CleaningNeed;
  onChange: (next: CleaningNeed) => void;
  /** Affiche l’aide « champs obligatoires selon prestation ». */
  showHints?: boolean;
  idPrefix?: string;
};

export function CleaningNeedFields({
  value,
  onChange,
  showHints = true,
  idPrefix = "need",
}: Props) {
  const required = useMemo(() => requiredFieldsForNeed(value), [value]);
  const validation = useMemo(() => validateCleaningNeed(value), [value]);

  function isRequired(field: NeedFieldKey) {
    return required.includes(field);
  }

  function mark(field: NeedFieldKey) {
    return isRequired(field) ? " *" : "";
  }

  const patch = (partial: Partial<CleaningNeed>) =>
    onChange({ ...value, ...partial });

  const requiredHint =
    value.prestation && isPrestationKind(value.prestation)
      ? REQUIRED_FIELDS_BY_PRESTATION[value.prestation]
          .map((f) => NEED_FIELD_LABELS[f])
          .join(", ")
      : "Sélectionnez d’abord le type de prestation";

  return (
    <fieldset className="need-qual__fieldset">
      <legend>Qualification du besoin</legend>
      {showHints ? (
        <p className="need-qual__hint">
          Structurer le besoin : surface, type de locaux, fréquence, horaires,
          contraintes et niveau de service. Obligatoires selon prestation :{" "}
          {requiredHint}.
          {!validation.ok ? (
            <>
              {" "}
              <em className="need-qual__missing">
                Manque :{" "}
                {validation.missing.map((f) => NEED_FIELD_LABELS[f]).join(", ")}
              </em>
            </>
          ) : (
            <em className="need-qual__ok"> — complet (étude possible)</em>
          )}
        </p>
      ) : null}

      <div className="need-qual__grid">
        <label htmlFor={`${idPrefix}-prestation`}>
          Prestation{mark("prestation")}
          <select
            id={`${idPrefix}-prestation`}
            value={value.prestation}
            onChange={(e) =>
              patch({ prestation: e.target.value as PrestationKind | "" })
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

        <label htmlFor={`${idPrefix}-surface`}>
          Surface m²{mark("surfaceM2")}
          <input
            id={`${idPrefix}-surface`}
            type="number"
            min={0}
            step={1}
            value={value.surfaceM2 ?? ""}
            onChange={(e) =>
              patch({
                surfaceM2: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </label>

        <label htmlFor={`${idPrefix}-local`}>
          Type de locaux{mark("localType")}
          <input
            id={`${idPrefix}-local`}
            value={value.localType}
            onChange={(e) => patch({ localType: e.target.value })}
            placeholder="ex. open space, halls, sanitaires…"
          />
        </label>

        <label htmlFor={`${idPrefix}-freq`}>
          Fréquence{mark("frequency")}
          <select
            id={`${idPrefix}-freq`}
            value={value.frequency}
            onChange={(e) =>
              patch({ frequency: e.target.value as NeedFrequency | "" })
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

        <label htmlFor={`${idPrefix}-schedule`}>
          Horaires{mark("schedule")}
          <input
            id={`${idPrefix}-schedule`}
            value={value.schedule}
            onChange={(e) => patch({ schedule: e.target.value })}
            placeholder="ex. 18h–22h, week-end…"
          />
        </label>

        <label htmlFor={`${idPrefix}-level`}>
          Niveau de service{mark("serviceLevel")}
          <select
            id={`${idPrefix}-level`}
            value={value.serviceLevel}
            onChange={(e) =>
              patch({ serviceLevel: e.target.value as ServiceLevel | "" })
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

        <label className="need-qual__full" htmlFor={`${idPrefix}-zones`}>
          Zones{mark("zones")}
          <input
            id={`${idPrefix}-zones`}
            value={value.zones}
            onChange={(e) => patch({ zones: e.target.value })}
            placeholder="ex. RDC, étages 1–3, parking…"
          />
        </label>

        <label className="need-qual__full" htmlFor={`${idPrefix}-constraints`}>
          Contraintes{mark("constraints")}
          <textarea
            id={`${idPrefix}-constraints`}
            rows={2}
            value={value.constraints}
            onChange={(e) => patch({ constraints: e.target.value })}
            placeholder="horaires sensibles, accès badges, produits agréés…"
          />
        </label>

        <label className="need-qual__full" htmlFor={`${idPrefix}-access`}>
          Accès / consignes{mark("accessNotes")}
          <textarea
            id={`${idPrefix}-access`}
            rows={2}
            value={value.accessNotes}
            onChange={(e) => patch({ accessNotes: e.target.value })}
            placeholder="clés, alarmes, contacts site…"
          />
        </label>

        <label htmlFor={`${idPrefix}-staff`}>
          Effectif estimé{mark("staffEstimate")}
          <input
            id={`${idPrefix}-staff`}
            type="number"
            min={0}
            step={1}
            value={value.staffEstimate ?? ""}
            onChange={(e) =>
              patch({
                staffEstimate: e.target.value
                  ? Number(e.target.value)
                  : null,
              })
            }
          />
        </label>
      </div>
    </fieldset>
  );
}
