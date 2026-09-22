export type {
  SocialConnectorCapability,
  SocialConnectorDefinition,
  SocialConnectorPermission,
  SocialConnectorPublic,
  SocialConnectorRateLimit,
  SocialConnectorStatus,
  SocialConnectorSyncResult,
  SocialNormalizedLead,
} from "@/lib/social-connectors/types";

export {
  canAccessSocialConnectors,
  canManageSocialConnectors,
  SOCIAL_CONNECTOR_STATUS_LABELS,
} from "@/lib/social-connectors/types";

export {
  enableConnector,
  getConnectorDefinition,
  howToAddConnectorMarkdown,
  injectConnectorTest,
  listConnectorDefinitions,
  listConnectorsPublic,
  listRecentIngestions,
  syncConnector,
} from "@/lib/social-connectors/registry";

export { ingestSocialLead } from "@/lib/social-connectors/ingest";
