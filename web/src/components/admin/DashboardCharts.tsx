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
import { OPPORTUNITY_STAGE_LABELS } from "@/lib/need-qualification-shared";

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

const FALLBACK_PIPELINE: PipelineDashboard = {
  openCount: 28,
  wonCount: 11,
  lostCount: 5,
  totalValue: 186_000_000,
  weightedValue: 74_400_000,
  overdueCount: 4,
  dueSoonCount: 7,
  byStage: [
    {
      stage: "qualification",
      label: OPPORTUNITY_STAGE_LABELS.qualification,
      count: 9,
      value: 22e6,
      weighted: 4.4e6,
    },
    {
      stage: "etude",
      label: OPPORTUNITY_STAGE_LABELS.etude,
      count: 7,
      value: 31e6,
      weighted: 12.4e6,
    },
    {
      stage: "proposition",
      label: OPPORTUNITY_STAGE_LABELS.proposition,
      count: 6,
      value: 48e6,
      weighted: 28.8e6,
    },
    {
      stage: "negociation",
      label: OPPORTUNITY_STAGE_LABELS.negociation,
      count: 6,
      value: 41e6,
      weighted: 28.7e6,
    },
    {
      stage: "gagne",
      label: OPPORTUNITY_STAGE_LABELS.gagne,
      count: 11,
      value: 92e6,
      weighted: 92e6,
    },
    {
      stage: "perdu",
      label: OPPORTUNITY_STAGE_LABELS.perdu,
      count: 5,
      value: 18e6,
      weighted: 0,
    },
  ],
  alerts: [],
  topOpportunities: [],
};

const FALLBACK_PLANNING: PlanningSnap = {
  slotCount: 86,
  conflictCount: 5,
  understaffedCount: 9,
  absenceCount: 4,
  activeSites: 24,
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

/** Série démo 8 semaines — prestations / satisfaction / anomalies. */
function buildTrendSeries(period: "mensuel" | "hebdo", sat: number) {
  const base = period === "hebdo" ? 168 : 620;
  const weeks = [
    { prestations: 0.82, satisfaction: -4, anomalies: 11 },
    { prestations: 0.88, satisfaction: -2, anomalies: 9 },
    { prestations: 0.91, satisfaction: -1, anomalies: 8 },
    { prestations: 0.94, satisfaction: 0, anomalies: 7 },
    { prestations: 0.97, satisfaction: 1, anomalies: 6 },
    { prestations: 1.02, satisfaction: 2, anomalies: 5 },
    { prestations: 1.06, satisfaction: 2, anomalies: 4 },
    { prestations: 1.1, satisfaction: 3, anomalies: 3 },
  ];
  return weeks.map((w, i) => ({
    semaine: `S${i + 1}`,
    prestations: Math.round(base * w.prestations),
    satisfaction: Math.min(100, Math.round(sat + w.satisfaction)),
    anomalies: w.anomalies,
  }));
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
        const from = period === "hebdo" ? "2026-09-14" : "2026-09-01";
        const to = period === "hebdo" ? "2026-09-20" : "2026-09-30";
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
        if (!cancelled && planningHasData(snap)) {
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

  const pipe = pipeline ?? FALLBACK_PIPELINE;
  const sat = satisfactionRate ?? 92;
  const plan = planning ?? FALLBACK_PLANNING;
  const usingDemo = pipeline == null;

  const missionStatusPie = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of missions) {
      map.set(m.status, (map.get(m.status) ?? 0) + 1);
    }
    if (map.size === 0) {
      return [
        { name: "Confirmé", value: 5 },
        { name: "Planifié", value: 2 },
        { name: "Anomalie", value: 1 },
      ];
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [missions]);

  const missionsByDay = useMemo(() => {
    const days =
      period === "hebdo"
        ? [14, 15, 16, 17, 18, 19, 20]
        : [14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
    return days.map((day) => {
      const dayMissions = missions.filter((m) => m.day === day);
      return {
        day: String(day),
        ok: dayMissions.filter((m) => m.tone === "ok").length,
        danger: dayMissions.filter((m) => m.tone === "danger").length,
        info: dayMissions.filter((m) => m.tone === "info").length,
      };
    });
  }, [missions, period]);

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
    const rows = Object.entries(sectors)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value }));
    return rows.length
      ? rows
      : [
          { name: "Bureaux", value: 8 },
          { name: "Industrie", value: 4 },
          { name: "Commerce", value: 3 },
          { name: "Santé", value: 2 },
        ];
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

  const qualityRadar = useMemo(
    () => [
      { axis: "Satisfaction", score: sat },
      { axis: "Ponctualité", score: Math.min(100, sat + 2) },
      { axis: "Propreté", score: Math.min(100, sat - 3) },
      { axis: "Sécurité", score: Math.min(100, sat + 1) },
      { axis: "Réactivité", score: Math.min(100, sat - 5) },
      { axis: "Relation", score: Math.min(100, sat - 1) },
    ],
    [sat],
  );

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
    () => buildTrendSeries(period, sat),
    [period, sat],
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
          value: `${Math.round(sat)} %`,
          tone: sat >= 85 ? "ok" : "warn",
        },
        {
          label: "Niveau",
          value: sat >= 90 ? "A+" : sat >= 85 ? "A" : "B",
          tone: sat >= 85 ? "ok" : "warn",
        },
        {
          label: "Horizon",
          value: "8 sem.",
          tone: "info",
        },
        {
          label: "Axes",
          value: "6",
          tone: "info",
        },
      ],
    }),
    [pipe, missions, plan, sat],
  );

  return (
    <section className="dash-charts dash-charts--premium" aria-label="Pilotage graphique">
      <div className="dash-charts__glow" aria-hidden />

      <header className="dash-charts__intro">
        <div className="dash-charts__title-block">
          <p className="dash-charts__eyebrow">
            Intelligence visuelle
            {usingDemo ? <span className="dash-charts__demo"> · Démo</span> : null}
          </p>
          <h2>Pilotage graphique</h2>
          <p>
            Lecture executive —{" "}
            {period === "mensuel" ? "période mensuelle" : "période hebdomadaire"}
            {usingDemo
              ? " · jeu de données illustratif (pipeline CRM vide)."
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
                  <XAxis dataKey="day" tick={axisTick()} axisLine={false} tickLine={false} />
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
                        value: sat,
                        fill: sat >= 85 ? C.teal : C.gold,
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
                    {Math.round(sat)}
                    <small>%</small>
                  </strong>
                  <span>{sat >= 85 ? "Excellence" : "À surveiller"}</span>
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
