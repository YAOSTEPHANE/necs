"use client";

import { ModuleHeader } from "@/components/admin/Ui";
import { IconContract } from "@/components/admin/Icons";
import { ServiceContractsWorkspace } from "@/components/admin/ServiceContractsWorkspace";

/** Module Juridique / Direction — contrat de prestation client uniquement. */
export function LegalHub() {
  return (
    <div className="dig-hub legal-hub leads-page">
      <div className="rh-hub__glow" aria-hidden />
      <ModuleHeader
        tone="#5b21b6"
        badge="Juridique"
        icon={<IconContract size={20} />}
        title="Contrat de prestation client"
        meta={
          <>
            <span>
              Acte juridique <strong>client</strong>
            </span>
            <span>Parties · SLA · signatures · versions</span>
          </>
        }
      />

      <div className="dig-hub__panel">
        <ServiceContractsWorkspace embedded />
      </div>
    </div>
  );
}
