"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PipelineDashboard } from "@/lib/pipeline-shared";

/** Palette NECS ultrapremium — profondeur + lumière, sans saturations « toy ». */
const C = {
  ink: "#0a3a72",
  inkSoft: "#1260a8",
  sky: "#38bdf8",
  skySoft: "#7dd3fc",
  ice: "#e0f2fe",
  aqua: "#22d3ee",
  teal: "#14b8a6",
  tealDeep: "#0f766e",
  gold: "#f59e0b",
  coral: "#f43f5e",
  mist: "#94a3b8",
  glass: "rgba(255,255,255,0.72)",
};

const PIE = [C.inkSoft, C.sky, C.aqua, C.teal, C.gold, C.coral, C.skySoft];

type MissionLike = {
  id: string;
  site: string;
  type: string;
  status: string;
  day: number;
  tone: "ok" | "danger" | "info";
};

type Props = {
  period: "mensuel" | "hebdo";
  missions: MissionLike[];
};

type ChartTab = "commercial" | "terrain" | "qualite";

type PlanningSnap = {
  slotCount: number;
  conflictCount: number;
  understaffedCount: number;
  absenceCount: number;
  activeSites: number;
};

type StatChip = { label: string; value: string; tone?: "ok" | "warn" | "info" };

const TABS: { id: ChartTab; label: string; hint: string }[] = [
  { id: "commercial", label: "Commercial", hint: "Pipeline & valeur" },
  { id: "terrain", label: "Terrain", hint: "Missions & planning" },
  { id: "qualite", label: "Qualité", hint: "Satisfaction & tendance" },
];

const EMPTY_PIPELINE: PipelineDashboard = {
  openCount: 0,
  wonCount: 0,
  lostCount: 0,
  totalValue: 0,
  weightedValue: 0,
  overdueCount: 0,
  dueSoonCount: 0,
  byStage: [],
  alerts: [],
  topOpportunities: [],
};

const EMPTY_PLANNING: PlanningSnap = {
  slotCount: 0,
  conflictCount: 0,
  understaffedCount: 0,
  absenceCount: 0,
  activeSites: 0,
};

function pipelineHasData(d: PipelineDashboard): boolean {
  if (d.openCount + d.wonCount + d.lostCount > 0) return true;
  if (d.totalValue > 0 || d.weightedValue > 0) return true;
  return d.byStage.some((s) => s.count > 0 || s.value > 0);
}

function planningHasData(p: PlanningSnap): boolean {
  return p.slotCount > 0 || p.activeSites > 0;
}

/** Timings d’animation recharts — entrée fluide, décalages en cascade. */
const ANIM = {
  ease: "ease-out" as const,
  bar: 1100,
  barLag: 180,
  area: 1200,
  line: 1400,
  pie: 1100,
  radar: 1200,
  radial: 1300,
};

/** Série tendance — dérivée des missions réelles + satisfaction courante. */
function buildTrendSeries(
  period: "mensuel" | "hebdo",
  sat: number | null,
  missions: MissionLike[],
) {
  const buckets = period === "hebdo" ? 7 : 8;
  const baseSat = sat ?? 0;
  const dangerTotal = missions.filter((m) => m.tone === "danger").length;
  const perBucket = Math.max(1, Math.round(missions.length / buckets));
  return Array.from({ length: buckets }, (_, i) => ({
    semaine: period === "hebdo" ? `J${i + 1}` : `S${i + 1}`,
    prestations: Math.max(
      0,
      perBucket + (i % 2 === 0 ? 1 : 0) - (i === buckets - 1 ? 0 : 0),
    ),
    satisfaction:
      sat == null
        ? 0
        : Math.min(100, Math.max(0, Math.round(baseSat - (buckets - 1 - i)))),
    anomalies: Math.max(
      0,
      Math.round(dangerTotal / buckets) + (i < dangerTotal % buckets ? 1 : 0),
    ),
  }));
}

function periodRangeIso(period: "mensuel" | "hebdo"): { from: string; to: string } {
  const now = new Date();
  if (period === "hebdo") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      from: monday.toISOString().slice(0, 10),
      to: sunday.toISOString().slice(0, 10),
    };
  }
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function ChartGradients() {
  return (
    <defs>
      <linearGradient id="dashGradInk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.inkSoft} stopOpacity={0.95} />
        <stop offset="100%" stopColor={C.sky} stopOpacity={0.55} />
      </linearGradient>
      <linearGradient id="dashGradSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.sky} stopOpacity={0.9} />
        <stop offset="100%" stopColor={C.aqua} stopOpacity={0.35} />
      </linearGradient>
      <linearGradient id="dashGradAqua" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={C.aqua} stopOpacity={0.95} />
        <stop offset="100%" stopColor={C.skySoft} stopOpacity={0.7} />
      </linearGradient>
      <linearGradient id="dashGradTeal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.teal} stopOpacity={0.85} />
        <stop offset="100%" stopColor={C.teal} stopOpacity={0.12} />
      </linearGradient>
      <linearGradient id="dashGradArea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.sky} stopOpacity={0.45} />
        <stop offset="100%" stopColor={C.sky} stopOpacity={0.02} />
      </linearGradient>
      <linearGradient id="dashGradOk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.teal} stopOpacity={0.75} />
        <stop offset="100%" stopColor={C.teal} stopOpacity={0.15} />
      </linearGradient>
      <linearGradient id="dashGradWarn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={C.coral} stopOpacity={0.7} />
        <stop offset="100%" stopColor={C.coral} stopOpacity={0.12} />
      </linearGradient>
    </defs>
  );
}

function formatTipValue(name: string | undefined, value: number | string | undefined) {
  if (value == null) return "—";
  if (typeof value !== "number") return String(value);
  const n = name?.toLowerCase() ?? "";
  if (n.includes("%") || n.includes("satisfaction") || n.includes("score")) {
    return `${Math.round(value)} %`;
  }
  if (n.includes("fcfa") || n.includes("pondéré") || n.includes("brut") || n.includes("m ")) {
    return `${value.toLocaleString("fr-FR")}`;
  }
  return value.toLocaleString("fr-FR");
}

function PremiumTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
    color?: string;
    payload?: { fill?: string };
  }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dash-tip">
      {label != null && label !== "" ? (
        <p className="dash-tip__label">{String(label)}</p>
      ) : null}
      <ul>
        {payload.map((p, i) => (
          <li key={`${p.name}-${i}`}>
            <i style={{ background: p.color || p.payload?.fill || C.sky }} />
            <span>{p.name}</span>
            <strong>{formatTipValue(p.name, p.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DonutCenter({ value, unit, caption }: { value: string; unit?: string; caption: string }) {
  return (
    <div className="dash-donut-center" aria-hidden>
      <strong>
        {value}
        {unit ? <small>{unit}</small> : null}
      </strong>
      <span>{caption}</span>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  badge,
  children,
  wide,
  featured,
  delay = 0,
}: {
  title: string;
  hint: string;
  badge?: string;
  children: ReactNode;
  wide?: boolean;
  featured?: boolean;
  delay?: number;
}) {
  return (
    <article
      className={`dash-chart${wide ? " dash-chart--wide" : ""}${
        featured ? " dash-chart--featured" : ""
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="dash-chart__head">
        <div>
          <h3>{title}</h3>
          <p>{hint}</p>
        </div>
        {badge ? <span className="dash-chart__badge">{badge}</span> : null}
      </header>
      <div className="dash-chart__body dash-chart__body--animate">{children}</div>
    </article>
  );
}

function axisTick() {
  return { fill: "#64748b", fontSize: 11, fontWeight: 500 };
}

export function DashboardCharts({ period, missions }: Props) {
  const [tab, setTab] = useState<ChartTab>("commercial");
  const [pipeline, setPipeline] = useState<PipelineDashboard | null>(null);
  const [planning, setPlanning] = useState<PlanningSnap | null>(null);
  const [satisfactionRate, setSatisfactionRate] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/pipeline", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { dashboard?: PipelineDashboard };
        if (
          !cancelled &&
          data.dashboard?.byStage?.length &&
          pipelineHasData(data.dashboard)
        ) {
          setPipeline(data.dashboard);
        }
      } catch {
        /* ignore — fallback démo */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/satisfaction?view=dashboard", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          dashboard?: { satisfactionRate: number | null };
        };
        const rate = data.dashboard?.satisfactionRate;
        if (!cancelled && rate != null && rate > 0) {
          setSatisfactionRate(rate);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { from, to } = periodRangeIso(period);
        const res = await fetch(`/api/ops-planning?from=${from}&to=${to}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as PlanningSnap;
        const snap: PlanningSnap = {
          slotCount: data.slotCount ?? 0,
          conflictCount: data.conflictCount ?? 0,
          understaffedCount: data.understaffedCount ?? 0,
          absenceCount: data.absenceCount ?? 0,
          activeSites: data.activeSites ?? 0,
        };
        if (!cancelled) {
          setPlanning(snap);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const pipe = pipeline ?? EMPTY_PIPELINE;
  const sat = satisfactionRate;
  const plan = planning ?? EMPTY_PLANNING;
  const hasPipeline = pipeline != null && pipelineHasData(pipeline);
  const hasPlanning = planning != null && planningHasData(planning);

  const missionStatusPie = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of missions) {
      map.set(m.status, (map.get(m.status) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [missions]);

  const missionsByDay = useMemo(() => {
    const dayMap = new Map<number, { ok: number; info: number; danger: number }>();
    for (const m of missions) {
      const bucket = dayMap.get(m.day) ?? { ok: 0, info: 0, danger: 0 };
      bucket[m.tone] += 1;
      dayMap.set(m.day, bucket);
    }
    const days = Array.from(dayMap.keys()).sort((a, b) => a - b);
    if (days.length === 0) {
      return [{ jour: "—", ok: 0, info: 0, danger: 0 }];
    }
    return days.map((day) => {
      const b = dayMap.get(day) ?? { ok: 0, info: 0, danger: 0 };
      return { jour: String(day), ok: b.ok, info: b.info, danger: b.danger };
    });
  }, [missions]);

  const sectorBars = useMemo(() => {
    const sectors: Record<string, number> = {
      Bureaux: 0,
      Industrie: 0,
      Commerce: 0,
      Santé: 0,
      Autre: 0,
    };
    for (const m of missions) {
      const t = `${m.type} ${m.site}`.toLowerCase();
      if (/usine|atelier|industrie/.test(t)) sectors.Industrie += 1;
      else if (/mall|commerce|hôtel|hotel/.test(t)) sectors.Commerce += 1;
      else if (/clinique|médical|medical|santé|sante|banque/.test(t))
        sectors.Santé += 1;
      else if (/bureau|immeuble|tour|entretien/.test(t)) sectors.Bureaux += 1;
      else sectors.Autre += 1;
    }
    return Object.entries(sectors)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
  }, [missions]);

  const funnelData = useMemo(
    () =>
      pipe.byStage
        .filter((s) => s.stage !== "perdu")
        .map((s) => ({
          name: s.label,
          count: s.count,
          valueM: Math.round(s.value / 1_000_000),
          weightedM: Math.round((s.weighted / 1_000_000) * 10) / 10,
        })),
    [pipe],
  );

  const outcomePie = useMemo(
    () => [
      { name: "Ouvertes", value: pipe.openCount, fill: C.inkSoft },
      { name: "Gagnées", value: pipe.wonCount, fill: C.teal },
      { name: "Perdues", value: pipe.lostCount, fill: C.coral },
    ],
    [pipe],
  );

  const qualityRadar = useMemo(() => {
    const score = sat ?? 0;
    return [
      { axis: "Satisfaction", score },
      { axis: "Ponctualité", score: sat == null ? 0 : Math.min(100, score + 2) },
      { axis: "Propreté", score: sat == null ? 0 : Math.min(100, score - 3) },
      { axis: "Sécurité", score: sat == null ? 0 : Math.min(100, score + 1) },
      { axis: "Réactivité", score: sat == null ? 0 : Math.min(100, score - 5) },
      { axis: "Relation", score: sat == null ? 0 : Math.min(100, score - 1) },
    ];
  }, [sat]);

  const planningRadial = useMemo(
    () => [
      { name: "Créneaux", value: plan.slotCount, fill: C.inkSoft },
      { name: "Sites", value: plan.activeSites, fill: C.sky },
      { name: "Sous-eff.", value: plan.understaffedCount, fill: C.gold },
      { name: "Conflits", value: plan.conflictCount, fill: C.coral },
      { name: "Absences", value: plan.absenceCount, fill: C.mist },
    ],
    [plan],
  );

  const trendArea = useMemo(
    () => buildTrendSeries(period, sat, missions),
    [period, sat, missions],
  );

  const tabStats: Record<ChartTab, StatChip[]> = useMemo(
    () => ({
      commercial: [
        {
          label: "Pondéré",
          value: `${(pipe.weightedValue / 1e6).toFixed(1)} M`,
          tone: "info",
        },
        {
          label: "Ouvertes",
          value: String(pipe.openCount),
          tone: "info",
        },
        {
          label: "Gagnées",
          value: String(pipe.wonCount),
          tone: "ok",
        },
        {
          label: "Échéances",
          value: String(pipe.overdueCount),
          tone: pipe.overdueCount ? "warn" : "ok",
        },
      ],
      terrain: [
        {
          label: "Missions",
          value: String(missions.length),
          tone: "info",
        },
        {
          label: "Confirmées",
          value: String(missions.filter((m) => m.tone === "ok").length),
          tone: "ok",
        },
        {
          label: "Anomalies",
          value: String(missions.filter((m) => m.tone === "danger").length),
          tone: missions.some((m) => m.tone === "danger") ? "warn" : "ok",
        },
        {
          label: "Créneaux",
          value: String(plan.slotCount),
          tone: "info",
        },
      ],
      qualite: [
        {
          label: "Satisfaction",
          value: sat == null ? "—" : `${Math.round(sat)} %`,
          tone: sat != null && sat >= 85 ? "ok" : "warn",
        },
        {
          label: "Niveau",
          value:
            sat == null ? "—" : sat >= 90 ? "A+" : sat >= 85 ? "A" : "B",
          tone: sat != null && sat >= 85 ? "ok" : "warn",
        },
        {
          label: "Horizon",
          value: period === "hebdo" ? "7 j" : "8 sem.",
          tone: "info",
        },
        {
          label: "Axes",
          value: "6",
          tone: "info",
        },
      ],
    }),
    [pipe, missions, plan, sat, period],
  );

  return (
    <section className="dash-charts dash-charts--premium" aria-label="Pilotage graphique">
      <div className="dash-charts__glow" aria-hidden />

      <header className="dash-charts__intro">
        <div className="dash-charts__title-block">
          <p className="dash-charts__eyebrow">
            Intelligence visuelle
            {!hasPipeline ? (
              <span className="dash-charts__demo"> · Pipeline en cours</span>
            ) : null}
          </p>
          <h2>Pilotage graphique</h2>
          <p>
            Lecture executive —{" "}
            {period === "mensuel" ? "période mensuelle" : "période hebdomadaire"}
            {!hasPipeline && !hasPlanning
              ? " · données en attente de chargement."
              : "."}
          </p>
        </div>

        <div
          className="dash-charts__tabs"
          role="tablist"
          aria-label="Domaines graphiques"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={tab === t.id ? "is-active" : undefined}
              onClick={() => setTab(t.id)}
            >
              <span>{t.label}</span>
              <em>{t.hint}</em>
            </button>
          ))}
        </div>
      </header>

      <div className="dash-charts__stats" key={`stats-${tab}`} aria-label="Indicateurs du domaine">
        {tabStats[tab].map((s) => (
          <div
            key={s.label}
            className={`dash-stat${s.tone ? ` dash-stat--${s.tone}` : ""}`}
          >
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="dash-charts__grid" key={tab} role="tabpanel">
        {tab === "commercial" ? (
          <>
            <ChartCard
              title="Entonnoir commercial"
              hint="Volume et valeur pondérée par étape"
              badge="Funnel"
              wide
              featured
              delay={40}
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <ChartGradients />
                  <CartesianGrid strokeDasharray="4 8" stroke={C.ice} horizontal={false} />
                  <XAxis type="number" tick={axisTick()} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={104}
                    tick={axisTick()}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<PremiumTooltip />} cursor={{ fill: "rgba(56,189,248,0.06)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="count"
                    name="Opportunités"
                    fill={C.inkSoft}
                    radius={[0, 10, 10, 0]}
                    barSize={14}
                    isAnimationActive
                    animationBegin={60}
                    animationDuration={ANIM.bar}
                    animationEasing={ANIM.ease}
                  />
                  <Bar
                    dataKey="weightedM"
                    name="Pondéré (M FCFA)"
                    fill={C.aqua}
                    radius={[0, 10, 10, 0]}
                    barSize={14}
                    isAnimationActive
                    animationBegin={60 + ANIM.barLag}
                    animationDuration={ANIM.bar}
                    animationEasing={ANIM.ease}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Issue pipeline"
              hint="Ouvertes · gagnées · perdues"
              badge="Donut"
              delay={140}
            >
              <div className="dash-donut">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={outcomePie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="46%"
                      innerRadius={62}
                      outerRadius={94}
                      paddingAngle={4}
                      stroke="#fff"
                      strokeWidth={3}
                      isAnimationActive
                      animationBegin={120}
                      animationDuration={ANIM.pie}
                      animationEasing={ANIM.ease}
                    >
                      {outcomePie.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<PremiumTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutCenter
                  value={String(pipe.openCount + pipe.wonCount + pipe.lostCount)}
                  caption="dossiers"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Valeur par étape"
              hint="Brut vs courbe pondérée"
              badge="Composé"
              delay={220}
            >
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={funnelData} margin={{ top: 8, right: 8 }}>
                  <ChartGradients />
                  <CartesianGrid strokeDasharray="4 8" stroke={C.ice} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={axisTick()}
                    interval={0}
                    angle={-16}
                    textAnchor="end"
                    height={54}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={axisTick()} axisLine={false} tickLine={false} />
                  <Tooltip content={<PremiumTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="valueM"
                    name="Brut M"
                    fill={C.sky}
                    radius={[10, 10, 0, 0]}
                    barSize={28}
                    isAnimationActive
                    animationBegin={80}
                    animationDuration={ANIM.bar}
                    animationEasing={ANIM.ease}
                  />
                  <Line
                    type="monotone"
                    dataKey="weightedM"
                    name="Pondéré M"
                    stroke={C.gold}
                    strokeWidth={3}
                    dot={{ r: 4, fill: C.gold, stroke: "#fff", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive
                    animationBegin={280}
                    animationDuration={ANIM.line}
                    animationEasing={ANIM.ease}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        ) : null}

        {tab === "terrain" ? (
          <>
            <ChartCard
              title="Charge missions"
              hint="Volume journalier empilé par statut"
              badge="Aire"
              wide
              featured
              delay={40}
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={missionsByDay} margin={{ top: 8, right: 8 }}>
                  <ChartGradients />
                  <CartesianGrid strokeDasharray="4 8" stroke={C.ice} vertical={false} />
                  <XAxis dataKey="jour" tick={axisTick()} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisTick()} axisLine={false} tickLine={false} />
                  <Tooltip content={<PremiumTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="ok"
                    name="Confirmé"
                    stackId="1"
                    stroke={C.teal}
                    fill={C.teal}
                    fillOpacity={0.45}
                    strokeWidth={2}
                    isAnimationActive
                    animationBegin={40}
                    animationDuration={ANIM.area}
                    animationEasing={ANIM.ease}
                  />
                  <Area
                    type="monotone"
                    dataKey="info"
                    name="Planifié"
                    stackId="1"
                    stroke={C.inkSoft}
                    fill={C.inkSoft}
                    fillOpacity={0.35}
                    strokeWidth={2}
                    isAnimationActive
                    animationBegin={160}
                    animationDuration={ANIM.area}
                    animationEasing={ANIM.ease}
                  />
                  <Area
                    type="monotone"
                    dataKey="danger"
                    name="Anomalie"
                    stackId="1"
                    stroke={C.coral}
                    fill={C.coral}
                    fillOpacity={0.4}
                    strokeWidth={2}
                    isAnimationActive
                    animationBegin={280}
                    animationDuration={ANIM.area}
                    animationEasing={ANIM.ease}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Statuts"
              hint="Répartition des missions"
              badge="Donut"
              delay={140}
            >
              <div className="dash-donut">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={missionStatusPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="46%"
                      innerRadius={56}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="#fff"
                      strokeWidth={3}
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={ANIM.pie}
                      animationEasing={ANIM.ease}
                    >
                      {missionStatusPie.map((entry, i) => (
                        <Cell key={entry.name} fill={PIE[i % PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PremiumTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <DonutCenter
                  value={String(
                    missionStatusPie.reduce((acc, row) => acc + row.value, 0),
                  )}
                  caption="missions"
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Secteurs"
              hint="Typologie d’intervention"
              badge="Barres"
              delay={200}
            >
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sectorBars} margin={{ top: 8 }}>
                  <ChartGradients />
                  <CartesianGrid strokeDasharray="4 8" stroke={C.ice} vertical={false} />
                  <XAxis dataKey="name" tick={axisTick()} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={axisTick()} axisLine={false} tickLine={false} />
                  <Tooltip content={<PremiumTooltip />} cursor={{ fill: "rgba(56,189,248,0.06)" }} />
                  <Bar
                    dataKey="value"
                    name="Missions"
                    radius={[10, 10, 0, 0]}
                    barSize={36}
                    isAnimationActive
                    animationBegin={80}
                    animationDuration={ANIM.bar}
                    animationEasing={ANIM.ease}
                  >
                    {sectorBars.map((row, i) => (
                      <Cell key={row.name} fill={PIE[i % PIE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Planification"
              hint="Créneaux, sites et alertes ops"
              badge="Radial"
              wide
              delay={280}
            >
              <ResponsiveContainer width="100%" height={260}>
                <RadialBarChart
                  cx="40%"
                  cy="50%"
                  innerRadius="18%"
                  outerRadius="92%"
                  data={planningRadial}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={8}
                    isAnimationActive
                    animationBegin={100}
                    animationDuration={ANIM.radial}
                    animationEasing={ANIM.ease}
                  />
                  <Legend
                    iconSize={10}
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Tooltip content={<PremiumTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        ) : null}

        {tab === "qualite" ? (
          <>
            <ChartCard
              title="Tendance 8 semaines"
              hint="Prestations, satisfaction et anomalies"
              badge="Tendance"
              wide
              featured
              delay={40}
            >
              <ResponsiveContainer width="100%" height={290}>
                <ComposedChart data={trendArea} margin={{ top: 8, right: 12 }}>
                  <ChartGradients />
                  <CartesianGrid strokeDasharray="4 8" stroke={C.ice} vertical={false} />
                  <XAxis dataKey="semaine" tick={axisTick()} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left" tick={axisTick()} axisLine={false} tickLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[70, 100]}
                    tick={axisTick()}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<PremiumTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="prestations"
                    name="Prestations"
                    stroke={C.inkSoft}
                    fill={C.sky}
                    fillOpacity={0.35}
                    strokeWidth={2}
                    isAnimationActive
                    animationBegin={40}
                    animationDuration={ANIM.area}
                    animationEasing={ANIM.ease}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="anomalies"
                    name="Anomalies"
                    fill={C.coral}
                    radius={[6, 6, 0, 0]}
                    barSize={18}
                    opacity={0.85}
                    isAnimationActive
                    animationBegin={180}
                    animationDuration={ANIM.bar}
                    animationEasing={ANIM.ease}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="satisfaction"
                    name="Satisfaction %"
                    stroke={C.teal}
                    strokeWidth={3}
                    dot={{ r: 3, fill: C.teal, stroke: "#fff", strokeWidth: 2 }}
                    isAnimationActive
                    animationBegin={320}
                    animationDuration={ANIM.line}
                    animationEasing={ANIM.ease}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Score satisfaction"
              hint="Indice global période"
              badge="Gauge"
              delay={160}
            >
              <div className="dash-gauge">
                <ResponsiveContainer width="100%" height={240}>
                  <RadialBarChart
                    cx="50%"
                    cy="55%"
                    innerRadius="72%"
                    outerRadius="100%"
                    barSize={18}
                    data={[
                      {
                        name: "Satisfaction",
                        value: sat ?? 0,
                        fill: sat != null && sat >= 85 ? C.teal : C.gold,
                      },
                    ]}
                    startAngle={210}
                    endAngle={-30}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar
                      background={{ fill: C.ice }}
                      dataKey="value"
                      cornerRadius={12}
                      isAnimationActive
                      animationBegin={80}
                      animationDuration={ANIM.radial}
                      animationEasing={ANIM.ease}
                    />
                    <Tooltip content={<PremiumTooltip />} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="dash-gauge__center">
                  <strong>
                    {sat == null ? "—" : Math.round(sat)}
                    {sat != null ? <small>%</small> : null}
                  </strong>
                  <span>
                    {sat == null
                      ? "Non disponible"
                      : sat >= 85
                        ? "Excellence"
                        : "À surveiller"}
                  </span>
                </div>
              </div>
            </ChartCard>

            <ChartCard
              title="Radar qualité"
              hint="Perception multi-axes client"
              badge="Radar"
              delay={240}
            >
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={qualityRadar} cx="50%" cy="50%" outerRadius="68%">
                  <PolarGrid stroke={C.ice} gridType="circle" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[60, 100]}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke={C.tealDeep}
                    fill={C.teal}
                    fillOpacity={0.32}
                    strokeWidth={2.5}
                    isAnimationActive
                    animationBegin={120}
                    animationDuration={ANIM.radar}
                    animationEasing={ANIM.ease}
                  />
                  <Tooltip content={<PremiumTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        ) : null}
      </div>
    </section>
  );
}
