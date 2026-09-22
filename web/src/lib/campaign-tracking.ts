import { getDb } from "@/lib/mongo";
import type { DbClient } from "@/lib/clients-crm";
import type { DbLead, LeadStatus } from "@/lib/leads-crm";
import {
  DEFAULT_CAMPAIGN_TRACKING_CONFIG,
  rate,
  resolveChannelId,
  type CampaignAnalyticsSnapshot,
  type CampaignPerformanceRow,
  type CampaignPeriod,
  type CampaignTrackingConfig,
  type ChannelPerformanceRow,
  type SourcePerformanceRow,
  type TrackingParamConfig,
} from "@/lib/campaign-tracking-shared";

const CONFIG_ID = "default";

type ConfigDoc = CampaignTrackingConfig & { id: string };

async function configCol() {
  const db = await getDb();
  return db.collection<ConfigDoc>("campaign_tracking_config");
}

export async function getCampaignTrackingConfig(): Promise<CampaignTrackingConfig> {
  const col = await configCol();
  const doc = await col.findOne({ id: CONFIG_ID });
  if (!doc) return { ...DEFAULT_CAMPAIGN_TRACKING_CONFIG };
  return {
    params: {
      ...DEFAULT_CAMPAIGN_TRACKING_CONFIG.params,
      ...doc.params,
      sourceParams:
        doc.params?.sourceParams?.length
          ? doc.params.sourceParams
          : DEFAULT_CAMPAIGN_TRACKING_CONFIG.params.sourceParams,
      campaignParams:
        doc.params?.campaignParams?.length
          ? doc.params.campaignParams
          : DEFAULT_CAMPAIGN_TRACKING_CONFIG.params.campaignParams,
      mediumParams:
        doc.params?.mediumParams?.length
          ? doc.params.mediumParams
          : DEFAULT_CAMPAIGN_TRACKING_CONFIG.params.mediumParams,
      extraParams:
        doc.params?.extraParams ??
        DEFAULT_CAMPAIGN_TRACKING_CONFIG.params.extraParams,
    },
    channels:
      doc.channels?.length > 0
        ? doc.channels
        : DEFAULT_CAMPAIGN_TRACKING_CONFIG.channels,
    conversionLeadStatuses:
      doc.conversionLeadStatuses?.length > 0
        ? doc.conversionLeadStatuses
        : DEFAULT_CAMPAIGN_TRACKING_CONFIG.conversionLeadStatuses,
    countClientAsWon:
      doc.countClientAsWon ?? DEFAULT_CAMPAIGN_TRACKING_CONFIG.countClientAsWon,
    updatedAt: doc.updatedAt ?? null,
    updatedByName: doc.updatedByName ?? "",
  };
}

export async function saveCampaignTrackingConfig(
  input: {
    params?: Partial<TrackingParamConfig>;
    channels?: CampaignTrackingConfig["channels"];
    conversionLeadStatuses?: CampaignTrackingConfig["conversionLeadStatuses"];
    countClientAsWon?: boolean;
  },
  actor: { userId: string; name: string },
): Promise<CampaignTrackingConfig> {
  const current = await getCampaignTrackingConfig();
  const next: ConfigDoc = {
    id: CONFIG_ID,
    params: {
      sourceParams:
        input.params?.sourceParams?.filter(Boolean).map((s) => s.trim()) ||
        current.params.sourceParams,
      campaignParams:
        input.params?.campaignParams?.filter(Boolean).map((s) => s.trim()) ||
        current.params.campaignParams,
      mediumParams:
        input.params?.mediumParams?.filter(Boolean).map((s) => s.trim()) ||
        current.params.mediumParams,
      extraParams:
        input.params?.extraParams?.map((s) => s.trim()).filter(Boolean) ??
        current.params.extraParams,
    },
    channels:
      input.channels && input.channels.length > 0
        ? input.channels.map((c) => ({
            id: c.id.trim().slice(0, 40) || "channel",
            label: c.label.trim().slice(0, 80) || c.id,
            sources: (c.sources || []).map((s) => s.trim().toLowerCase()).filter(Boolean),
            color: c.color?.trim() || "#64748b",
          }))
        : current.channels,
    conversionLeadStatuses:
      input.conversionLeadStatuses && input.conversionLeadStatuses.length > 0
        ? input.conversionLeadStatuses
        : current.conversionLeadStatuses,
    countClientAsWon:
      typeof input.countClientAsWon === "boolean"
        ? input.countClientAsWon
        : current.countClientAsWon,
    updatedAt: new Date().toISOString(),
    updatedByName: actor.name,
  };

  if (!next.params.sourceParams.length) {
    throw new Error("Au moins un paramètre source est requis.");
  }
  if (!next.params.campaignParams.length) {
    throw new Error("Au moins un paramètre campagne est requis.");
  }

  const col = await configCol();
  await col.replaceOne({ id: CONFIG_ID }, next, { upsert: true });
  const { id: _, ...publicCfg } = next;
  return publicCfg;
}

function periodStart(period: CampaignPeriod): number | null {
  if (period === "all") return null;
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function leadCreatedMs(lead: DbLead): number {
  if (typeof lead.createdAt === "number" && lead.createdAt > 0) {
    return lead.createdAt;
  }
  const t = Date.parse(lead.firstAt || lead.at || "");
  return Number.isNaN(t) ? 0 : t;
}

function isConverted(
  status: LeadStatus | string,
  statuses: CampaignTrackingConfig["conversionLeadStatuses"],
): boolean {
  return statuses.includes(status as "traite" | "en_cours");
}

export async function buildCampaignAnalytics(
  period: CampaignPeriod = "30d",
): Promise<CampaignAnalyticsSnapshot> {
  const config = await getCampaignTrackingConfig();
  const db = await getDb();
  const leads = (await db
    .collection<DbLead>("leads")
    .find({})
    .limit(5000)
    .toArray()) as DbLead[];

  const start = periodStart(period);
  const filtered = leads.filter((l) => {
    if (start == null) return true;
    return leadCreatedMs(l) >= start;
  });

  const emails = filtered.map((l) => l.email.toLowerCase());
  const clientEmails = new Set<string>();
  if (config.countClientAsWon && emails.length > 0) {
    const clients = await db
      .collection<DbClient>("clients")
      .find({
        email: { $in: [...new Set(emails)] },
        status: { $in: ["actif", "prospect"] },
      })
      .project({ email: 1 })
      .limit(5000)
      .toArray();
    for (const c of clients) {
      if (c.email) clientEmails.add(String(c.email).toLowerCase());
    }
  }

  const channelMap = new Map<string, ChannelPerformanceRow>();
  for (const ch of config.channels) {
    channelMap.set(ch.id, {
      channelId: ch.id,
      channelLabel: ch.label,
      color: ch.color,
      leads: 0,
      nouveau: 0,
      enCours: 0,
      traite: 0,
      wonClients: 0,
      conversionRate: 0,
      wonRate: 0,
      sources: [...ch.sources],
    });
  }
  if (!channelMap.has("other")) {
    channelMap.set("other", {
      channelId: "other",
      channelLabel: "Autres",
      color: "#64748b",
      leads: 0,
      nouveau: 0,
      enCours: 0,
      traite: 0,
      wonClients: 0,
      conversionRate: 0,
      wonRate: 0,
      sources: [],
    });
  }

  const campaignMap = new Map<string, CampaignPerformanceRow>();
  const sourceMap = new Map<string, SourcePerformanceRow>();

  let totalNouveau = 0;
  let totalEnCours = 0;
  let totalTraite = 0;
  let totalWon = 0;

  for (const lead of filtered) {
    const firstSource = (lead.firstSource || lead.source || "site_web").trim();
    const firstCampaign = (
      lead.firstCampaign ||
      lead.campaign ||
      "(sans campagne)"
    ).trim();
    const channelId = resolveChannelId(firstSource, config.channels);
    const channel =
      channelMap.get(channelId) || channelMap.get("other")!;
    const chMeta =
      config.channels.find((c) => c.id === channel.channelId) ||
      config.channels.find((c) => c.id === "other");

    channel.leads += 1;
    const status = (lead.status || "nouveau") as LeadStatus;
    if (status === "nouveau") {
      channel.nouveau += 1;
      totalNouveau += 1;
    } else if (status === "en_cours") {
      channel.enCours += 1;
      totalEnCours += 1;
    } else if (status === "traite") {
      channel.traite += 1;
      totalTraite += 1;
    }

    const converted = isConverted(status, config.conversionLeadStatuses);
    const won =
      config.countClientAsWon && clientEmails.has(lead.email.toLowerCase());
    if (won) {
      channel.wonClients += 1;
      totalWon += 1;
    }

    // Collect sources seen under "other"
    if (
      channel.channelId === "other" &&
      firstSource &&
      !channel.sources.includes(firstSource.toLowerCase())
    ) {
      channel.sources.push(firstSource.toLowerCase());
    }

    const campKey = `${channel.channelId}::${firstCampaign}::${firstSource}`;
    const campRow =
      campaignMap.get(campKey) ||
      ({
        campaign: firstCampaign,
        channelId: channel.channelId,
        channelLabel: chMeta?.label || channel.channelLabel,
        firstSource,
        leads: 0,
        traite: 0,
        wonClients: 0,
        conversionRate: 0,
        wonRate: 0,
      } satisfies CampaignPerformanceRow);
    campRow.leads += 1;
    if (converted || status === "traite") campRow.traite += 1;
    if (won) campRow.wonClients += 1;
    campaignMap.set(campKey, campRow);

    const srcKey = firstSource.toLowerCase() || "site_web";
    const srcRow =
      sourceMap.get(srcKey) ||
      ({
        source: firstSource || "site_web",
        channelId: channel.channelId,
        channelLabel: chMeta?.label || channel.channelLabel,
        leads: 0,
        traite: 0,
        wonClients: 0,
        conversionRate: 0,
        wonRate: 0,
      } satisfies SourcePerformanceRow);
    srcRow.leads += 1;
    if (status === "traite" || converted) srcRow.traite += 1;
    if (won) srcRow.wonClients += 1;
    sourceMap.set(srcKey, srcRow);
  }

  const byChannel = [...channelMap.values()]
    .map((row) => {
      const converted =
        config.conversionLeadStatuses.includes("traite") &&
        config.conversionLeadStatuses.includes("en_cours")
          ? row.traite + row.enCours
          : config.conversionLeadStatuses.includes("en_cours")
            ? row.enCours
            : row.traite;
      return {
        ...row,
        conversionRate: rate(converted, row.leads),
        wonRate: rate(row.wonClients, row.leads),
      };
    })
    .filter((r) => r.leads > 0 || r.channelId !== "other" || filtered.length === 0)
    .sort((a, b) => b.leads - a.leads);

  const byCampaign = [...campaignMap.values()]
    .map((row) => ({
      ...row,
      conversionRate: rate(row.traite, row.leads),
      wonRate: rate(row.wonClients, row.leads),
    }))
    .sort((a, b) => b.leads - a.leads)
    .slice(0, 50);

  const bySource = [...sourceMap.values()]
    .map((row) => ({
      ...row,
      conversionRate: rate(row.traite, row.leads),
      wonRate: rate(row.wonClients, row.leads),
    }))
    .sort((a, b) => b.leads - a.leads);

  const totalLeads = filtered.length;

  return {
    period,
    fromIso: start ? new Date(start).toISOString() : null,
    toIso: new Date().toISOString(),
    totals: {
      leads: totalLeads,
      nouveau: totalNouveau,
      enCours: totalEnCours,
      traite: totalTraite,
      wonClients: totalWon,
      conversionRate: rate(totalTraite, totalLeads),
      wonRate: rate(totalWon, totalLeads),
    },
    byChannel,
    byCampaign,
    bySource,
    attributionNote:
      "Attribution first-touch : firstSource / firstCampaign figés à la capture. Les leads sont rattachés à un canal via le mapping sources → canal. Ce n’est pas un outil de création de campagnes — uniquement mesure de conversion et performance.",
  };
}
