import type { SocialConnectorDefinition } from "@/lib/social-connectors/types";
import { makeStubTestInject } from "@/lib/social-connectors/connectors/_test-inject";

const base = {
  id: "linkedin",
  label: "LinkedIn",
  crmSource: "linkedin",
  crmMedium: "lead_gen",
} as const;

export const linkedinConnector: SocialConnectorDefinition = {
  ...base,
  description:
    "Lead Gen Forms LinkedIn Marketing API — OAuth 2.0 + webhooks Lead Sync.",
  status: "ready",
  capabilities: ["leads", "oauth", "webhook", "test_inject"],
  permissions: [
    {
      scope: "r_ads",
      why: "Lire les campagnes publicitaires",
    },
    {
      scope: "r_marketing_leadgen_automation",
      why: "Récupérer les réponses Lead Gen Forms",
    },
    {
      scope: "rw_organization_admin",
      why: "Accès organisation / pages entreprise (selon app)",
    },
  ],
  rateLimits: [
    {
      label: "Marketing API",
      detail: "Quotas journaliers LinkedIn par application (throttle 429).",
    },
  ],
  docsUrl:
    "https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync",
  brandColor: "#0a66c2",
  manageHref: null,
  isConfigured: () =>
    Boolean(
      process.env.LINKEDIN_CLIENT_ID?.trim() &&
        process.env.LINKEDIN_CLIENT_SECRET?.trim(),
    ),
  injectTest: makeStubTestInject(base),
};
