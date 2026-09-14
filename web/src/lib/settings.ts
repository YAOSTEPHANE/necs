export const NECS_SETTINGS_KEY = "necs_admin_settings_v1";
export const NECS_SETTINGS_EVENT = "necs-settings-updated";

export const DEFAULT_LOGO = "/images/logo-necs.png?v=3";

export type UserRole =
  | "admin"
  | "commercial"
  | "ops"
  | "rh"
  | "finance"
  | "qualite"
  | "nettoyeur";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  password: string;
  active: boolean;
  lastLogin: string;
  /** Lien vers l’employé pointage (espace agent). */
  employeeId?: string;
};

export type SocialNetworkId =
  | "facebook"
  | "instagram"
  | "linkedin"
  | "youtube"
  | "tiktok"
  | "x"
  | "whatsapp";

export type SocialLink = {
  id: SocialNetworkId;
  label: string;
  url: string;
  enabled: boolean;
};

export type AdminSettings = {
  branding: {
    /** Data URL ou chemin public du logo principal */
    logoUrl: string;
    /** Data URL ou chemin public du favicon (onglet navigateur) */
    faviconUrl: string;
  };
  social: SocialLink[];
  company: {
    legalName: string;
    tradeName: string;
    rccm: string;
    nif: string;
    phone: string;
    email: string;
    whatsapp: string;
    address: string;
    city: string;
    country: string;
    currency: string;
    timezone: string;
    hours: string;
  };
  documents: {
    quotePrefix: string;
    invoicePrefix: string;
    contractPrefix: string;
    missionPrefix: string;
    defaultValidityDays: number;
    defaultPaymentTerms: string;
    vatRate: number;
    pdfFooter: string;
    autoNumbering: boolean;
  };
  notifications: {
    emailNewLead: boolean;
    emailMissionAlert: boolean;
    emailQualityNc: boolean;
    emailInvoiceDue: boolean;
    emailAbsence: boolean;
    digestDaily: boolean;
    digestWeekly: boolean;
  };
  security: {
    sessionMinutes: number;
    require2fa: boolean;
    passwordMinLength: number;
    auditLog: boolean;
    ipRestriction: boolean;
  };
  users: AdminUser[];
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrateur",
  commercial: "Commercial / CRM",
  ops: "Opérations",
  rh: "Ressources humaines",
  finance: "Finance",
  qualite: "Qualité",
  nettoyeur: "Nettoyeur / Agent terrain",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: "Accès complet : paramètres, utilisateurs et tous les modules.",
  commercial: "Offres, devis, commandes, contrats clients et relances.",
  ops: "Ordres de travail, prestations, pointage et suivi terrain.",
  rh: "Recrutement, contrats agents, congés et dossiers RH.",
  finance: "Préfactures, factures, avoirs et suivi des règlements.",
  qualite: "Contrôles qualité, rapports et non-conformités.",
  nettoyeur: "Espace agent : pointage et photos après nettoyage sur site.",
};

export const USER_ROLES = Object.keys(ROLE_LABELS) as UserRole[];

export function nextUserId(users: AdminUser[]): string {
  let max = 0;
  for (const u of users) {
    const m = /^USR-(\d+)$/i.exec(u.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `USR-${String(max + 1).padStart(3, "0")}`;
}

export const DEFAULT_SOCIAL: SocialLink[] = [
  {
    id: "facebook",
    label: "Facebook",
    url: "https://facebook.com/",
    enabled: false,
  },
  {
    id: "instagram",
    label: "Instagram",
    url: "https://instagram.com/",
    enabled: false,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    url: "https://linkedin.com/company/",
    enabled: false,
  },
  {
    id: "youtube",
    label: "YouTube",
    url: "https://youtube.com/@",
    enabled: false,
  },
  {
    id: "tiktok",
    label: "TikTok",
    url: "https://tiktok.com/@",
    enabled: false,
  },
  {
    id: "x",
    label: "X (Twitter)",
    url: "https://x.com/",
    enabled: false,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    url: "https://wa.me/2376",
    enabled: false,
  },
];

export const DEFAULT_SETTINGS: AdminSettings = {
  branding: {
    logoUrl: DEFAULT_LOGO,
    faviconUrl: DEFAULT_LOGO,
  },
  social: structuredClone(DEFAULT_SOCIAL),
  company: {
    legalName: "NECLEANING & SERVICES SARL",
    tradeName: "NECS",
    rccm: "RC/DLA/XXXX/B/XXXX",
    nif: "MXXXXXXXXXXXXX",
    phone: "+237 6XX XX XX XX",
    email: "direction@necs.cm",
    whatsapp: "+237 6XX XX XX XX",
    address: "Bonanjo — Douala",
    city: "Douala",
    country: "Cameroun",
    currency: "XAF (FCFA)",
    timezone: "Africa/Douala (GMT+1)",
    hours: "Lun – Ven · 08h00 – 17h30",
  },
  documents: {
    quotePrefix: "DEV",
    invoicePrefix: "FAC",
    contractPrefix: "CTR",
    missionPrefix: "MIS",
    defaultValidityDays: 30,
    defaultPaymentTerms: "Virement — 30 jours",
    vatRate: 19.25,
    pdfFooter: "NECS SARL — Propreté · Rigueur · Confiance — Cameroun",
    autoNumbering: true,
  },
  notifications: {
    emailNewLead: true,
    emailMissionAlert: true,
    emailQualityNc: true,
    emailInvoiceDue: true,
    emailAbsence: true,
    digestDaily: false,
    digestWeekly: true,
  },
  security: {
    sessionMinutes: 480,
    require2fa: false,
    passwordMinLength: 8,
    auditLog: true,
    ipRestriction: false,
  },
  users: [
    {
      id: "USR-001",
      name: "Direction NECS",
      email: "direction@necs.cm",
      role: "admin",
      phone: "+237 6XX XX XX XX",
      password: "",
      active: true,
      lastLogin: "—",
    },
    {
      id: "USR-002",
      name: "Amina Moussa",
      email: "commercial@necs.cm",
      role: "commercial",
      phone: "+237 6XX XX XX XX",
      password: "",
      active: true,
      lastLogin: "—",
    },
    {
      id: "USR-003",
      name: "Jean Okala",
      email: "ops@necs.cm",
      role: "ops",
      phone: "+237 6XX XX XX XX",
      password: "",
      active: true,
      lastLogin: "—",
    },
    {
      id: "USR-004",
      name: "Paul Kouam",
      email: "rh@necs.cm",
      role: "rh",
      phone: "+237 6XX XX XX XX",
      password: "",
      active: true,
      lastLogin: "—",
    },
    {
      id: "USR-007",
      name: "Claire Mbarga",
      email: "finance@necs.cm",
      role: "finance",
      phone: "+237 6XX XX XX XX",
      password: "",
      active: true,
      lastLogin: "—",
    },
    {
      id: "USR-008",
      name: "Serge Ndjock",
      email: "qualite@necs.cm",
      role: "qualite",
      phone: "+237 6XX XX XX XX",
      password: "",
      active: true,
      lastLogin: "—",
    },
    {
      id: "USR-005",
      name: "Amina Kouam",
      email: "amina.kouam@necs.cm",
      role: "nettoyeur",
      phone: "+237 6XX XX XX XX",
      password: "",
      active: true,
      lastLogin: "—",
      employeeId: "EMP-001",
    },
    {
      id: "USR-006",
      name: "Marc Ngo",
      email: "marc.ngo@necs.cm",
      role: "nettoyeur",
      phone: "+237 6XX XX XX XX",
      password: "",
      active: true,
      lastLogin: "—",
      employeeId: "EMP-002",
    },
  ],
};

function mergeSocial(parsed?: SocialLink[]): SocialLink[] {
  if (!parsed?.length) return structuredClone(DEFAULT_SOCIAL);
  return DEFAULT_SOCIAL.map((def) => {
    const found = parsed.find((p) => p.id === def.id);
    return found
      ? {
          ...def,
          ...found,
          label: def.label,
        }
      : def;
  });
}

/** Anciens chemins JPG/PNG par défaut → asset transparent. Conserve les uploads data:image/. */
function normalizeBrandAssetUrl(url?: string): string {
  if (!url) return DEFAULT_LOGO;
  if (
    url.includes("logo-necs.jpg") ||
    url === "/images/logo-necs.png" ||
    url.startsWith("/images/logo-necs.png?")
  ) {
    return DEFAULT_LOGO;
  }
  return url;
}

export function loadSettings(): AdminSettings {
  if (typeof window === "undefined") return structuredClone(DEFAULT_SETTINGS);
  try {
    const raw = localStorage.getItem(NECS_SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw) as Partial<AdminSettings>;
    const logoUrl = normalizeBrandAssetUrl(parsed.branding?.logoUrl);
    const faviconUrl = normalizeBrandAssetUrl(parsed.branding?.faviconUrl);
    const settings: AdminSettings = {
      ...structuredClone(DEFAULT_SETTINGS),
      ...parsed,
      branding: {
        ...DEFAULT_SETTINGS.branding,
        ...(parsed.branding ?? {}),
        logoUrl,
        faviconUrl,
      },
      social: mergeSocial(parsed.social),
      company: { ...DEFAULT_SETTINGS.company, ...(parsed.company ?? {}) },
      documents: { ...DEFAULT_SETTINGS.documents, ...(parsed.documents ?? {}) },
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(parsed.notifications ?? {}),
      },
      security: { ...DEFAULT_SETTINGS.security, ...(parsed.security ?? {}) },
      users: ensureAgentAccounts(
        (parsed.users?.length
          ? parsed.users
          : structuredClone(DEFAULT_SETTINGS.users)
        ).map(normalizeAdminUser),
      ),
    };

    // Persister la migration logo transparent (évite le fond blanc en cache local)
    const prevLogo = parsed.branding?.logoUrl;
    const prevFav = parsed.branding?.faviconUrl;
    if (prevLogo !== logoUrl || prevFav !== faviconUrl) {
      try {
        localStorage.setItem(NECS_SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        /* quota — ignore */
      }
    }

    return settings;
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

/** Mot de passe manquant / fallback erroné (anciennes données sans champ password). */
function resolveUserPassword(u: AdminUser): AdminUser {
  // Les mots de passe ne sont plus stockés en clair côté client.
  // L’auth réelle passe par MongoDB + hash bcrypt.
  return { ...u, password: "" };
}

function normalizeAdminUser(u: AdminUser): AdminUser {
  const base = resolveUserPassword(u);
  const role: UserRole = USER_ROLES.includes(base.role)
    ? base.role
    : "commercial";
  const employeeId =
    base.employeeId?.trim() ||
    (role === "nettoyeur"
      ? DEFAULT_SETTINGS.users.find(
          (d) =>
            d.id === base.id ||
            d.email.trim().toLowerCase() === base.email.trim().toLowerCase(),
        )?.employeeId
      : undefined);
  return {
    ...base,
    role,
    ...(employeeId ? { employeeId } : {}),
  };
}

/** Ajoute les comptes démo manquants (agents + finance/qualité). */
function ensureAgentAccounts(users: AdminUser[]): AdminUser[] {
  const next = [...users];
  let changed = false;
  const demos = DEFAULT_SETTINGS.users.filter(
    (u) =>
      u.role === "nettoyeur" ||
      u.role === "finance" ||
      u.role === "qualite",
  );
  for (const demo of demos) {
    const email = demo.email.trim().toLowerCase();
    const exists = next.some(
      (u) =>
        u.id === demo.id || u.email.trim().toLowerCase() === email,
    );
    if (!exists) {
      next.push(structuredClone(demo));
      changed = true;
    }
  }
  if (changed) {
    try {
      const raw = localStorage.getItem(NECS_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AdminSettings;
        localStorage.setItem(
          NECS_SETTINGS_KEY,
          JSON.stringify({ ...parsed, users: next }),
        );
      }
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function saveSettings(data: AdminSettings): void {
  localStorage.setItem(NECS_SETTINGS_KEY, JSON.stringify(data));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NECS_SETTINGS_EVENT));
  }
}

export function resetSettings(): void {
  localStorage.removeItem(NECS_SETTINGS_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NECS_SETTINGS_EVENT));
  }
}

/** Redimensionne une image avant stockage (limite localStorage). */
export function fileToOptimizedDataUrl(
  file: File,
  maxSize: number,
  opts?: { forceJpeg?: boolean; quality?: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Fichier non image"));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      reject(new Error("Image trop lourde (max 4 Mo)"));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Image invalide"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas indisponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const mime = opts?.forceJpeg
          ? "image/jpeg"
          : file.type === "image/png" || file.type === "image/webp"
            ? file.type
            : "image/jpeg";
        resolve(canvas.toDataURL(mime, opts?.quality ?? 0.88));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function getActiveSocialLinks(settings?: AdminSettings): SocialLink[] {
  const s = settings ?? (typeof window !== "undefined" ? loadSettings() : DEFAULT_SETTINGS);
  return s.social.filter((l) => l.enabled && l.url.trim().length > 8);
}
