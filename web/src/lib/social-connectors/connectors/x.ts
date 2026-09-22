import type { SocialConnectorDefinition } from "@/lib/social-connectors/types";
import { makeStubTestInject } from "@/lib/social-connectors/connectors/_test-inject";

const base = {
  id: "x",
  label: "X (Twitter)",
  crmSource: "x",
  crmMedium: "social",
} as const;

export const xConnector: SocialConnectorDefinition = {
  ...base,
  description:
    "Capture leads / DM cards via X API v2 — OAuth 2.0 avec scopes granulaires.",
  status: "planned",
  capabilities: ["leads", "oauth", "test_inject"],
  permissions: [
    {
      scope: "tweet.read",
      why: "Lire les publications liées aux campagnes",
    },
    {
      scope: "dm.read",
      why: "Lire les messages directs (cartes lead)",
    },
    {
      scope: "users.read",
      why: "Profil utilisateur pour enrichissement",
    },
  ],
  rateLimits: [
    {
      label: "X API v2",
      detail: "Rate limits par endpoint (ex. 15 min windows) — backoff obligatoire.",
    },
  ],
  docsUrl: "https://developer.x.com/en/docs/x-api",
  brandColor: "#111111",
  manageHref: null,
  isConfigured: () =>
    Boolean(
      process.env.X_API_KEY?.trim() && process.env.X_API_SECRET?.trim(),
    ),
  injectTest: makeStubTestInject(base),
};
