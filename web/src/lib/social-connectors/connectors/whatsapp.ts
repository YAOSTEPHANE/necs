import type { SocialConnectorDefinition } from "@/lib/social-connectors/types";
import { makeStubTestInject } from "@/lib/social-connectors/connectors/_test-inject";

const base = {
  id: "whatsapp",
  label: "WhatsApp Business",
  crmSource: "whatsapp",
  crmMedium: "messaging",
} as const;

export const whatsappConnector: SocialConnectorDefinition = {
  ...base,
  description:
    "Cloud API Meta WhatsApp — capture opt-in / formulaires conversationnels.",
  status: "planned",
  capabilities: ["leads", "webhook", "test_inject"],
  permissions: [
    {
      scope: "whatsapp_business_messaging",
      why: "Recevoir et envoyer des messages business",
    },
    {
      scope: "whatsapp_business_management",
      why: "Gérer le compte WABA et les webhooks",
    },
  ],
  rateLimits: [
    {
      label: "Cloud API",
      detail: "Limites de messaging par niveau qualité du numéro.",
    },
  ],
  docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
  brandColor: "#25d366",
  manageHref: null,
  isConfigured: () =>
    Boolean(
      process.env.WHATSAPP_TOKEN?.trim() &&
        process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
    ),
  injectTest: makeStubTestInject(base),
};
