import { randomBytes } from "crypto";
import { ingestSocialLead } from "@/lib/social-connectors/ingest";
import type { SocialConnectorDefinition } from "@/lib/social-connectors/types";

/** Test de recette partagé — n’importe quel connecteur sans toucher au CRM. */
export function makeStubTestInject(
  def: Pick<
    SocialConnectorDefinition,
    "id" | "crmSource" | "crmMedium" | "label"
  >,
) {
  return async (input?: { name?: string; email?: string; phone?: string }) => {
    const externalId = `TEST-${def.id}-${Date.now()}-${randomBytes(2).toString("hex")}`;
    const email =
      input?.email?.trim().toLowerCase() ||
      `${def.id}.test.${Date.now()}@example.com`;
    const r = await ingestSocialLead({
      connectorId: def.id,
      crmSource: def.crmSource,
      crmMedium: def.crmMedium,
      origin: "test",
      lead: {
        externalId,
        name: input?.name || `Lead ${def.label} Test`,
        email,
        phone: input?.phone || "+237600000000",
        company: "NECS Demo",
        formName: `Formulaire test ${def.label}`,
        campaign: `test_${def.id}`,
        message: `Lead de recette — connecteur ${def.id} (sans modification du cœur CRM).`,
        consent: true,
      },
    });
    return {
      externalId,
      email: r.email,
      created: r.created,
      leadId: r.leadId,
    };
  };
}
