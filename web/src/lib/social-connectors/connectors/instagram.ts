import type { SocialConnectorDefinition } from "@/lib/social-connectors/types";
import { makeStubTestInject } from "@/lib/social-connectors/connectors/_test-inject";

const base = {
  id: "instagram",
  label: "Instagram",
  crmSource: "instagram",
  crmMedium: "lead_ad",
} as const;

export const instagramConnector: SocialConnectorDefinition = {
  ...base,
  description:
    "Lead forms / messaging Meta (Instagram) — même famille Graph API que Facebook.",
  status: "ready",
  capabilities: ["leads", "webhook", "test_inject"],
  permissions: [
    {
      scope: "instagram_basic",
      why: "Identité compte Instagram professionnel",
    },
    {
      scope: "leads_retrieval",
      why: "Récupérer les leads des formulaires liés",
    },
    {
      scope: "pages_manage_metadata",
      why: "Abonnement webhook Page / IG",
    },
  ],
  rateLimits: [
    {
      label: "Graph API",
      detail: "Même bucket Meta que Facebook ; respecter App Rate Limiting.",
    },
  ],
  docsUrl: "https://developers.facebook.com/docs/instagram-api",
  brandColor: "#e1306c",
  manageHref: null,
  isConfigured: () =>
    Boolean(
      process.env.FACEBOOK_APP_ID?.trim() &&
        process.env.FACEBOOK_APP_SECRET?.trim(),
    ),
  injectTest: makeStubTestInject(base),
};
