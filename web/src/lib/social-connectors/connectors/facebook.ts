import {
  appIsConfigured,
  getFacebookLeadConfigPublic,
  injectFacebookTestLead,
  syncFacebookLeads,
} from "@/lib/facebook-leads";
import { FACEBOOK_REQUIRED_PERMISSIONS } from "@/lib/facebook-leads-shared";
import type { SocialConnectorDefinition } from "@/lib/social-connectors/types";

export const facebookConnector: SocialConnectorDefinition = {
  id: "facebook",
  label: "Facebook Lead Ads",
  description:
    "Récupération des leads via Graph API / webhook leadgen (Meta officiel).",
  status: "live",
  capabilities: ["leads", "webhook", "sync", "test_inject"],
  permissions: [...FACEBOOK_REQUIRED_PERMISSIONS],
  rateLimits: [
    {
      label: "Graph API",
      detail:
        "Limites App/Page Meta (bucket standard ~200 appels/heure/utilisateur).",
    },
    {
      label: "Webhook",
      detail: "Réponse < 20 s ; retries Meta en cas d’échec HTTP.",
    },
  ],
  docsUrl: "https://developers.facebook.com/docs/marketing-api/guides/lead-ads",
  brandColor: "#1877f2",
  manageHref: "/admin/demandes?tab=integrations&feature=facebook",
  crmSource: "facebook",
  crmMedium: "lead_ad",
  isConfigured: async () => {
    if (!appIsConfigured()) return false;
    const cfg = await getFacebookLeadConfigPublic();
    return cfg.tokenPresent && !cfg.tokenExpired;
  },
  sync: async () => syncFacebookLeads({ limitPerForm: 25 }),
  injectTest: async (input) => {
    const r = await injectFacebookTestLead(input);
    return {
      externalId: `fb-test-${r.leadId}`,
      email: r.email,
      created: r.created,
      leadId: r.leadId,
    };
  },
};
