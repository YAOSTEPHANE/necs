import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconFile(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </Svg>
  );
}

export function IconOffer(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5.1L12 14.8 7.5 16.8l.9-5.1L4.8 8.2l5-.7L12 3z" />
    </Svg>
  );
}

export function IconQuote(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h12a2 2 0 0 1 2 2v7H8l-4 3V9a2 2 0 0 1 2-2z" />
      <path d="M8 11h6M8 14h4" />
    </Svg>
  );
}

export function IconCart(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
      <path d="M3 4h2l2.4 11h10.2l2-7H7" />
    </Svg>
  );
}

export function IconTruck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h4l3 3v4h-7" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </Svg>
  );
}

export function IconContract(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 3h8a2 2 0 0 1 2 2v14l-6-3-6 3V5a2 2 0 0 1 2-2z" />
      <path d="M9 8h6M9 11h6M9 14h3" />
    </Svg>
  );
}

export function IconAmend(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </Svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </Svg>
  );
}

export function IconBriefcase(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </Svg>
  );
}

export function IconInterview(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

export function IconChecklist(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Svg>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </Svg>
  );
}

export function IconQuality(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  );
}

export function IconReport(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16V10" />
      <path d="M12 16V7" />
      <path d="M16 16v-5" />
    </Svg>
  );
}

export function IconPurchase(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6h15l-1.5 9h-12z" />
      <path d="M6 6L5 3H2" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
    </Svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </Svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

export function IconInvoice(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3h10v18l-2-1.5L13 21l-2-1.5L9 21l-2-1.5V3z" />
      <path d="M10 8h4M10 12h4M10 16h2" />
    </Svg>
  );
}

export function IconCredit(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </Svg>
  );
}

export function IconStatement(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </Svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 7 9-7" />
    </Svg>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3z" />
      <path d="M9 8h6M9 12h6" />
    </Svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15l3-4 3 2 4-6" />
    </Svg>
  );
}

export function IconVisit(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}

export function IconContact(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 7H3s3 0 3-7" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </Svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  );
}

export function IconArrow(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12l5 5L20 7" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </Svg>
  );
}

const BY_SLUG: Record<string, (props: IconProps) => ReactNode> = {
  "tmp-01": IconOffer,
  "tmp-02": IconQuote,
  "tmp-03": IconCart,
  "tmp-04": IconTruck,
  "tmp-05": IconContract,
  "tmp-06": IconAmend,
  "tmp-07": IconUser,
  "tmp-08": IconBriefcase,
  "tmp-09": IconFolder,
  "tmp-10": IconInterview,
  "tmp-11": IconChecklist,
  "tmp-12": IconClipboard,
  "tmp-13": IconQuality,
  "tmp-14": IconReport,
  "tmp-15": IconPurchase,
  "tmp-16": IconCalendar,
  "tmp-17": IconClock,
  "tmp-18": IconInvoice,
  "tmp-19": IconInvoice,
  "tmp-20": IconCredit,
  "tmp-21": IconStatement,
  "tmp-22": IconMail,
  "tmp-23": IconReceipt,
  "tmp-24": IconChart,
  "tmp-25": IconVisit,
  "dig-01": IconQuote,
  "dig-02": IconContact,
  "dig-03": IconVisit,
};

/** Couleurs vives par module (lisibles sur sidebar sombre et cards claires). */
export const DOC_ICON_COLORS: Record<string, string> = {
  "tmp-01": "#38bdf8", // offre — cyan
  "tmp-02": "#22d3ee", // devis — cyan clair
  "tmp-03": "#60a5fa", // BC — bleu
  "tmp-04": "#34d399", // BL — vert menthe
  "tmp-05": "#818cf8", // contrat — indigo
  "tmp-06": "#a78bfa", // avenant — violet
  "tmp-07": "#4ade80", // contrat agent — vert
  "tmp-08": "#fbbf24", // fiche poste — ambre
  "tmp-09": "#fb923c", // embauche — orange
  "tmp-10": "#f472b6", // entretien — rose
  "tmp-11": "#2dd4bf", // onboarding — teal
  "tmp-12": "#4ade80", // OT — vert
  "tmp-13": "#a3e635", // qualité — lime
  "tmp-14": "#38bdf8", // rapport — cyan
  "tmp-15": "#f59e0b", // achat — ambre
  "tmp-16": "#c084fc", // congé — violet
  "tmp-17": "#22d3ee", // pointage — cyan
  "tmp-18": "#60a5fa", // préfacture — bleu
  "tmp-19": "#3b82f6", // facture — bleu vif
  "tmp-20": "#34d399", // avoir — vert
  "tmp-21": "#94a3b8", // relevé — gris bleuté
  "tmp-22": "#f97316", // relance — orange
  "tmp-23": "#4ade80", // AR — vert
  "tmp-24": "#818cf8", // rapport mensuel — indigo
  "tmp-25": "#fbbf24", // visite — ambre
  "dig-01": "#22d3ee", // devis web
  "dig-02": "#4ade80", // contact
  "dig-03": "#fbbf24", // visite web
};

export function docIconTone(slug: string): string {
  return DOC_ICON_COLORS[slug.toLowerCase()] ?? "#38bdf8";
}

export function DocIcon({
  slug,
  style,
  ...props
}: IconProps & { slug: string }) {
  const Comp = BY_SLUG[slug.toLowerCase()] ?? IconFile;
  const color = docIconTone(slug);
  return (
    <Comp
      {...props}
      style={{ color, stroke: color, ...style }}
      color={color}
    />
  );
}
