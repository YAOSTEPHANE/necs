"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ModuleHeader } from "@/components/admin/Ui";
import { IconInterview } from "@/components/admin/Icons";
import { RecruitmentWorkspace } from "@/components/admin/RecruitmentWorkspace";
import { HiringDossierWorkspace } from "@/components/admin/HiringDossierWorkspace";
import { DocumentsSignaturesWorkspace } from "@/components/admin/DocumentsSignaturesWorkspace";
import { ExpressionBesoinWorkspace } from "@/components/admin/ExpressionBesoinWorkspace";
import { OnboardingWorkspace } from "@/components/admin/OnboardingWorkspace";
import { FormationsCompetencesWorkspace } from "@/components/admin/FormationsCompetencesWorkspace";
import { JobDescriptionWorkspace } from "@/components/admin/JobDescriptionWorkspace";
import { LeaveRequestWorkspace } from "@/components/admin/LeaveRequestWorkspace";
import { PointageWorkspace } from "@/components/admin/PointageWorkspace";
import { PayrollWorkspace } from "@/components/admin/PayrollWorkspace";
import { safeRouterReplace } from "@/lib/safe-navigate";

export type RhTab =
  | "besoin"
  | "recrutement"
  | "embauche"
  | "signatures"
  | "fiches-poste"
  | "onboarding"
  | "conges"
  | "pointage"
  | "paie"
  | "competences";

const TABS: {
  id: RhTab;
  label: string;
  hint: string;
}[] = [
  { id: "besoin", label: "Besoin", hint: "Effectifs" },
  { id: "recrutement", label: "Recrutement", hint: "Entretiens" },
  { id: "embauche", label: "Embauche", hint: "Dossiers" },
  { id: "signatures", label: "Contrats", hint: "Signatures" },
  { id: "onboarding", label: "Intégration", hint: "Parcours" },
  { id: "competences", label: "Compétences", hint: "Formations" },
  { id: "fiches-poste", label: "Postes", hint: "Fiches" },
  { id: "conges", label: "Congés", hint: "Absences" },
  { id: "pointage", label: "Pointage", hint: "Présence" },
  { id: "paie", label: "Paie", hint: "Bulletins" },
];

function parseTab(raw: string | null): RhTab {
  if (
    raw === "besoin" ||
    raw === "expression" ||
    raw === "expression-besoin" ||
    raw === "rh-01"
  ) {
    return "besoin";
  }
  if (raw === "embauche" || raw === "dossier" || raw === "rh-03" || raw === "tmp-09") {
    return "embauche";
  }
  if (
    raw === "signatures" ||
    raw === "documents" ||
    raw === "contrat" ||
    raw === "contrats" ||
    raw === "tmp-07" ||
    raw === "rh-04"
  ) {
    return "signatures";
  }
  if (
    raw === "onboarding" ||
    raw === "integration" ||
    raw === "intégration" ||
    raw === "tmp-11" ||
    raw === "rh-05"
  ) {
    return "onboarding";
  }
  if (
    raw === "competences" ||
    raw === "compétences" ||
    raw === "formations" ||
    raw === "formation" ||
    raw === "rh-06"
  ) {
    return "competences";
  }
  if (
    raw === "fiches-poste" ||
    raw === "fiche-poste" ||
    raw === "postes" ||
    raw === "tmp-08" ||
    raw === "rh-07"
  ) {
    return "fiches-poste";
  }
  if (
    raw === "conges" ||
    raw === "congés" ||
    raw === "absences" ||
    raw === "tmp-16" ||
    raw === "rh-08"
  ) {
    return "conges";
  }
  if (raw === "pointage" || raw === "tmp-17" || raw === "rh-09") {
    return "pointage";
  }
  if (
    raw === "paie" ||
    raw === "payroll" ||
    raw === "bulletins" ||
    raw === "rh-10"
  ) {
    return "paie";
  }
  if (
    raw === "recrutement" ||
    raw === "entretien" ||
    raw === "tmp-10" ||
    raw === "rh-02"
  ) {
    return "recrutement";
  }
  return "besoin";
}

export function RhHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));
  const tabIndex = Math.max(
    0,
    TABS.findIndex((t) => t.id === tab),
  );

  const setTab = useCallback(
    (next: RhTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", next);
      safeRouterReplace(router, `${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const current = useMemo(
    () => TABS.find((t) => t.id === tab) ?? TABS[0]!,
    [tab],
  );

  return (
    <div className="rh-hub leads-page">
      <div className="rh-hub__glow" aria-hidden />

      <ModuleHeader
        tone="#0a3a72"
        badge="RH"
        icon={<IconInterview size={20} />}
        title="Ressources humaines"
        meta={
          <>
            <span>
              Parcours{" "}
              <strong>
                besoin → recrutement → embauche → signatures → intégration
              </strong>
            </span>
            <span>
              Étape courante · <strong>{current.label}</strong>
            </span>
          </>
        }
      />

      <nav className="rh-hub__journey" aria-label="Parcours RH">
        <p className="rh-hub__journey-label">Parcours collaborateur</p>
        <ol className="rh-hub__steps">
          {TABS.map((t, i) => {
            const state =
              i < tabIndex ? "is-done" : i === tabIndex ? "is-active" : "";
            return (
              <li key={t.id} className={state || undefined}>
                <button
                  type="button"
                  className={`rh-hub__step${state ? ` ${state}` : ""}`}
                  aria-current={i === tabIndex ? "step" : undefined}
                  onClick={() => setTab(t.id)}
                >
                  <span className="rh-hub__step-label">{t.label}</span>
                  <em className="rh-hub__step-hint">{t.hint}</em>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="rh-hub__panel" key={tab} role="tabpanel">
        {tab === "besoin" ? <ExpressionBesoinWorkspace embedded /> : null}
        {tab === "recrutement" ? <RecruitmentWorkspace embedded /> : null}
        {tab === "embauche" ? <HiringDossierWorkspace embedded /> : null}
        {tab === "signatures" ? (
          <DocumentsSignaturesWorkspace embedded />
        ) : null}
        {tab === "fiches-poste" ? <JobDescriptionWorkspace embedded /> : null}
        {tab === "onboarding" ? <OnboardingWorkspace embedded /> : null}
        {tab === "conges" ? <LeaveRequestWorkspace embedded /> : null}
        {tab === "pointage" ? <PointageWorkspace embedded /> : null}
        {tab === "paie" ? <PayrollWorkspace embedded /> : null}
        {tab === "competences" ? (
          <FormationsCompetencesWorkspace embedded />
        ) : null}
      </div>
    </div>
  );
}
