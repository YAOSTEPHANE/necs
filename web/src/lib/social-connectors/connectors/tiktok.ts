import type { SocialConnectorDefinition } from "@/lib/social-connectors/types";
import { makeStubTestInject } from "@/lib/social-connectors/connectors/_test-inject";

const base = {
  id: "tiktok",
  label: "TikTok",
  crmSource: "tiktok",
  crmMedium: "lead_ad",
} as const;

export const tiktokConnector: SocialConnectorDefinition = {
  ...base,
  description:
    "TikTok Lead Generation API — formulaires Instant Form + webhook.",
  status: "planned",
  capabilities: ["leads", "oauth", "webhook", "test_inject"],
  permissions: [
    {
      scope: "lead.read",
      why: "Lire les leads Instant Form",
    },
    {
      scope: "ad.read",
      why: "Lier lead ↔ campagne / ad group",
    },
  ],
  rateLimits: [
    {
      label: "Business API",
      detail: "QPS et quotas journaliers TikTok Ads — respecter Retry-After.",
    },
  ],
  docsUrl: "https://business-api.tiktok.com/portal/docs",
  brandColor: "#010101",
  manageHref: null,
  isConfigured: () =>
    Boolean(
      process.env.TIKTOK_APP_ID?.trim() &&
        process.env.TIKTOK_APP_SECRET?.trim(),
    ),
  injectTest: makeStubTestInject(base),
};
