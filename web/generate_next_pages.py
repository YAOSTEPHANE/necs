# -*- coding: utf-8 -*-
"""Génère les pages Next.js manquantes (site + admin CDC)."""
from pathlib import Path

ROOT = Path(r"C:\Users\UTILISATEUR\Desktop\erp cameroun\web\src")

(ROOT / "app" / "layout.tsx").write_text("""import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "NECS SARL — Propreté, Rigueur, Confiance",
  description:
    "NECLEANING & SERVICES SARL — Site public et back-office de digitalisation.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${outfit.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "layout.tsx").write_text("""import { AdminShell } from "@/components/admin/AdminShell";
import "./admin.css";

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <AdminShell>{children}</AdminShell>;
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "page.tsx").write_text("""import {
  DataTable,
  GhostButton,
  KpiGrid,
  PageHeader,
  Panel,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/Ui";
import { crmPipeline, dashboardKpis, operationsMissions, qualityChecks } from "@/lib/mock-data";

export default function AdminDashboardPage() {
  return (
    <>
      <PageHeader
        code="BI-01 → BI-05"
        title="Pilotage direction"
        description="Consolidation CA, pipeline, contrats, effectifs, qualité et créances — selon le cahier des charges."
        actions={
          <>
            <GhostButton>Exporter BI</GhostButton>
            <PrimaryButton>Actualiser KPI</PrimaryButton>
          </>
        }
      />

      <KpiGrid items={dashboardKpis} />

      <div className="grid-2">
        <Panel title="Pipeline commercial (CRM-05)">
          <DataTable
            headers={["Opportunité", "Client", "Étape", "Valeur", "Proba.", "Prochaine action"]}
            rows={crmPipeline.map((o) => [
              o.id,
              o.client,
              o.stage,
              `${o.value} FCFA`,
              o.probability,
              o.next,
            ])}
          />
        </Panel>

        <Panel title="Exigences couvertes">
          <ul className="req-list">
            <li><code>BI-01</code><div><strong>Dashboard direction</strong><span>CA, pipeline, contrats, effectifs, qualité, créances</span></div></li>
            <li><code>BI-02</code><div><strong>Marketing / commercial</strong><span>Leads web/social, conversion, CA par source</span></div></li>
            <li><code>BI-03</code><div><strong>Opérations</strong><span>Planning, pointages, prestations, incidents</span></div></li>
            <li><code>BI-04</code><div><strong>RH</strong><span>Effectifs, recrutement, turnover, formations</span></div></li>
            <li><code>BI-05</code><div><strong>Exports</strong><span>Rapports selon droits utilisateurs</span></div></li>
          </ul>
        </Panel>
      </div>

      <Panel title="Ops du jour (OPS-03 / OPS-04)">
        <DataTable
          headers={["OT", "Site", "Mission", "Créneau", "Équipe", "Statut"]}
          rows={operationsMissions.map((m) => [
            m.id,
            m.site,
            m.mission,
            m.slot,
            m.team,
            <StatusBadge key={m.id} tone={m.status.includes("Anomalie") ? "danger" : m.status === "En cours" ? "info" : "neutral"}>{m.status}</StatusBadge>,
          ])}
        />
      </Panel>

      <Panel title="Qualité récente (Q-01)">
        <DataTable
          headers={["Contrôle", "Site", "Score", "Seuil", "NC", "Statut"]}
          rows={qualityChecks.map((q) => [
            q.id,
            q.site,
            String(q.score),
            String(q.threshold),
            String(q.nc),
            <StatusBadge key={q.id} tone={q.status === "Conforme" ? "ok" : q.status.includes("Non") ? "danger" : "warn"}>{q.status}</StatusBadge>,
          ])}
        />
      </Panel>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "digital" / "page.tsx").write_text("""import {
  DataTable,
  GhostButton,
  PageHeader,
  Panel,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/Ui";
import { digitalLeads } from "@/lib/mock-data";

export default function DigitalPage() {
  return (
    <>
      <PageHeader
        code="DIG-01 → DIG-06"
        title="Marketing digital"
        description="Capture des leads site/Facebook, suivi campagnes, demandes digitales et consentements."
        actions={
          <>
            <GhostButton>Connecteurs sociaux</GhostButton>
            <PrimaryButton>Nouveau lead</PrimaryButton>
          </>
        }
      />
      <Panel title="Leads entrants (DIG-01 / DIG-02 / DIG-05)">
        <DataTable
          headers={["ID", "Source", "Campagne", "Prospect", "Statut", "SLA", "Consentement"]}
          rows={digitalLeads.map((l) => [
            l.id,
            l.source,
            l.campaign,
            l.name,
            <StatusBadge key={l.id} tone={l.status === "Nouveau" ? "info" : l.sla === "Retard" ? "danger" : "ok"}>{l.status}</StatusBadge>,
            l.sla,
            l.consent,
          ])}
        />
        <p className="note">Règles CDC : déduplication, conservation source/campagne, notification commercial, consentement tracé.</p>
      </Panel>
      <Panel title="Exigences module">
        <ul className="req-list">
          <li><code>DIG-01</code><div><strong>Formulaires site → CRM</strong><span>Devis, contact, visite sans ressaisie</span></div></li>
          <li><code>DIG-02</code><div><strong>Intégration Facebook/Meta</strong><span>Lead Ads via API officielles</span></div></li>
          <li><code>DIG-04</code><div><strong>Suivi campagnes</strong><span>Attribution source / canal / conversion</span></div></li>
          <li><code>DIG-06</code><div><strong>Consentements</strong><span>Préférences, retraits, traçabilité</span></div></li>
        </ul>
      </Panel>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "crm" / "page.tsx").write_text("""import {
  DataTable,
  GhostButton,
  PageHeader,
  Panel,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/Ui";
import { crmContracts, crmPipeline } from "@/lib/mock-data";

export default function CrmPage() {
  return (
    <>
      <PageHeader
        code="CRM-01 → CRM-06"
        title="CRM & Commercial"
        description="Prospects, qualification besoin, visite technique, chiffrage, pipeline et contrats."
        actions={
          <>
            <GhostButton>Nouvelle visite technique</GhostButton>
            <PrimaryButton>Créer devis (TMP-02)</PrimaryButton>
          </>
        }
      />
      <Panel title="Pipeline & relances (CRM-05)">
        <DataTable
          headers={["Affaire", "Client", "Étape", "Valeur HT", "Probabilité", "Commercial", "Next"]}
          rows={crmPipeline.map((o) => [o.id, o.client, o.stage, `${o.value} FCFA`, o.probability, o.owner, o.next])}
        />
      </Panel>
      <Panel title="Contrats (CRM-06)">
        <DataTable
          headers={["Contrat", "Client", "Site", "SLA", "Effet", "Statut"]}
          rows={crmContracts.map((c) => [
            c.id,
            c.client,
            c.site,
            c.sla,
            c.start,
            <StatusBadge key={c.id} tone={c.status === "Actif" ? "ok" : "warn"}>{c.status}</StatusBadge>,
          ])}
        />
        <p className="note">Transformation affaire gagnée → contrat exploitable Ops/Finance sans ressaisie.</p>
      </Panel>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "operations" / "page.tsx").write_text("""import {
  DataTable,
  GhostButton,
  PageHeader,
  Panel,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/Ui";
import { operationsMissions, pointages } from "@/lib/mock-data";

export default function OperationsPage() {
  return (
    <>
      <PageHeader
        code="OPS-01 → OPS-06"
        title="Opérations de nettoyage"
        description="Référentiel clients/sites, planning, ordres de travail, pointage mobile, offline et stocks."
        actions={
          <>
            <GhostButton>Détecter conflits planning</GhostButton>
            <PrimaryButton>Nouvel ordre de travail</PrimaryButton>
          </>
        }
      />
      <Panel title="Ordres de travail (OPS-03)">
        <DataTable
          headers={["OT", "Site", "Mission", "Horaires", "Agents", "Statut"]}
          rows={operationsMissions.map((m) => [
            m.id,
            m.site,
            m.mission,
            m.slot,
            m.team,
            <StatusBadge key={m.id} tone={m.status.includes("Anomalie") ? "danger" : "info"}>{m.status}</StatusBadge>,
          ])}
        />
      </Panel>
      <Panel title="Pointage du jour (OPS-04)">
        <DataTable
          headers={["Agent", "Site", "Arrivée", "Départ", "Mode", "Anomalie"]}
          rows={pointages.map((p) => [
            p.agent,
            p.site,
            p.in,
            p.out,
            p.mode,
            <StatusBadge key={p.agent} tone={p.anomaly === "Aucune" ? "ok" : "warn"}>{p.anomaly}</StatusBadge>,
          ])}
        />
        <p className="note">Anti-double-pointage, rapprochement planning, pics simultanés, mode offline (OPS-05) à confirmer.</p>
      </Panel>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "qualite" / "page.tsx").write_text("""import {
  DataTable,
  GhostButton,
  PageHeader,
  Panel,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/Ui";
import { claims, qualityChecks } from "@/lib/mock-data";

export default function QualitePage() {
  return (
    <>
      <PageHeader
        code="Q-01 → Q-04"
        title="Qualité & relation client"
        description="Checklists digitales, non-conformités, réclamations SLA et satisfaction."
        actions={
          <>
            <GhostButton>Nouvelle NC</GhostButton>
            <PrimaryButton>Lancer contrôle qualité</PrimaryButton>
          </>
        }
      />
      <Panel title="Contrôles qualité (Q-01 / TMP-13)">
        <DataTable
          headers={["ID", "Site", "Score", "Seuil", "NC", "Date", "Statut"]}
          rows={qualityChecks.map((q) => [
            q.id,
            q.site,
            String(q.score),
            String(q.threshold),
            String(q.nc),
            q.date,
            <StatusBadge key={q.id} tone={q.status === "Conforme" ? "ok" : q.status.includes("Non") ? "danger" : "warn"}>{q.status}</StatusBadge>,
          ])}
        />
      </Panel>
      <Panel title="Réclamations (Q-03)">
        <DataTable
          headers={["Ticket", "Client", "Priorité", "SLA", "Sujet", "Statut"]}
          rows={claims.map((c) => [
            c.id,
            c.client,
            c.priority,
            c.sla,
            c.subject,
            <StatusBadge key={c.id} tone={c.status === "Ouverte" ? "danger" : "info"}>{c.status}</StatusBadge>,
          ])}
        />
      </Panel>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "rh" / "page.tsx").write_text("""import {
  DataTable,
  GhostButton,
  PageHeader,
  Panel,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/Ui";
import { rhCandidates, rhNeeds } from "@/lib/mock-data";

export default function RhPage() {
  return (
    <>
      <PageHeader
        code="RH-01 → RH-08"
        title="Ressources humaines"
        description="Besoins agents, recrutement, dossier d’embauche, signatures, onboarding, affectations et sortie."
        actions={
          <>
            <GhostButton>Checklist embauche</GhostButton>
            <PrimaryButton>Nouveau besoin RH</PrimaryButton>
          </>
        }
      />
      <Panel title="Expression du besoin (RH-01)">
        <DataTable
          headers={["Demande", "Site", "Poste", "Qté", "Source", "Statut"]}
          rows={rhNeeds.map((n) => [
            n.id,
            n.site,
            n.role,
            String(n.qty),
            n.source,
            <StatusBadge key={n.id} tone={n.status.includes("Validé") ? "ok" : "warn"}>{n.status}</StatusBadge>,
          ])}
        />
      </Panel>
      <Panel title="Recrutement (RH-02 / TMP-10)">
        <DataTable
          headers={["Candidat", "Nom", "Poste", "Étape", "Score", "Décision"]}
          rows={rhCandidates.map((c) => [c.id, c.name, c.role, c.stage, c.score, c.decision])}
        />
        <p className="note">Parcours historisé : candidature → entretien → dossier → signature → onboarding → affectation.</p>
      </Panel>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "finance" / "page.tsx").write_text("""import {
  DataTable,
  GhostButton,
  PageHeader,
  Panel,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/Ui";
import { financeInvoices, financePrefactures } from "@/lib/mock-data";

export default function FinancePage() {
  return (
    <>
      <PageHeader
        code="FIN-01 → FIN-06"
        title="Finance, facturation & recouvrement"
        description="Tarification, préfacturation, factures, encaissements, relances et rentabilité."
        actions={
          <>
            <GhostButton>Lancer relance (TMP-22)</GhostButton>
            <PrimaryButton>Générer facture</PrimaryButton>
          </>
        }
      />
      <Panel title="Préfacturation (FIN-02 / TMP-18)">
        <DataTable
          headers={["Préfacture", "Contrat", "Période", "Écarts", "Montant", "Statut"]}
          rows={financePrefactures.map((p) => [
            p.id,
            p.contrat,
            p.period,
            p.ecarts,
            `${p.amount} FCFA`,
            <StatusBadge key={p.id} tone={p.status === "Validée" ? "ok" : "warn"}>{p.status}</StatusBadge>,
          ])}
        />
      </Panel>
      <Panel title="Factures & recouvrement (FIN-03 / FIN-05)">
        <DataTable
          headers={["Facture", "Client", "Période", "Montant", "Échéance", "Statut"]}
          rows={financeInvoices.map((f) => [
            f.id,
            f.client,
            f.period,
            `${f.amount} FCFA`,
            f.due,
            <StatusBadge key={f.id} tone={f.status === "Émise" ? "info" : f.status.includes("recouvrement") ? "danger" : "warn"}>{f.status}</StatusBadge>,
          ])}
        />
      </Panel>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "templates" / "page.tsx").write_text("""import {
  DataTable,
  GhostButton,
  PageHeader,
  Panel,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/Ui";
import { templatesCatalog } from "@/lib/mock-data";

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        code="TMP-01 → TMP-25"
        title="Templates & documents métier"
        description="Bibliothèque documentaire NECS : identité visuelle, préremplissage, versions, PDF et signatures."
        actions={
          <>
            <GhostButton>Ouvrir dossier documents/</GhostButton>
            <PrimaryButton>Nouveau modèle</PrimaryButton>
          </>
        }
      />
      <Panel title="Catalogue templates">
        <DataTable
          headers={["ID", "Template", "Module source", "Statut"]}
          rows={templatesCatalog.map((t) => [
            t.id,
            t.name,
            t.module,
            <StatusBadge key={t.id} tone={t.status.includes("Validé") ? "ok" : "neutral"}>{t.status}</StatusBadge>,
          ])}
        />
        <p className="note">Les fichiers Word/PDF validés restent dans le dossier documents/ du projet. Plus de maquettes HTML.</p>
      </Panel>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "securite" / "page.tsx").write_text("""import {
  DataTable,
  GhostButton,
  PageHeader,
  Panel,
  PrimaryButton,
  StatusBadge,
} from "@/components/admin/Ui";
import { auditLogs, securityUsers } from "@/lib/mock-data";

export default function SecuritePage() {
  return (
    <>
      <PageHeader
        code="SEC-01 → SEC-04"
        title="Administration, sécurité & gouvernance"
        description="Utilisateurs, rôles, workflows d’approbation, audit des actions sensibles et documents."
        actions={
          <>
            <GhostButton>Configurer workflow</GhostButton>
            <PrimaryButton>Nouvel utilisateur</PrimaryButton>
          </>
        }
      />
      <Panel title="Utilisateurs & rôles (SEC-01)">
        <DataTable
          headers={["Utilisateur", "Rôle", "Périmètre", "MFA", "Statut"]}
          rows={securityUsers.map((u) => [
            u.name,
            u.role,
            u.scope,
            u.mfa,
            <StatusBadge key={u.name} tone="ok">{u.status}</StatusBadge>,
          ])}
        />
      </Panel>
      <Panel title="Journal d’audit (SEC-03)">
        <DataTable
          headers={["Horodatage", "Utilisateur", "Action", "Niveau"]}
          rows={auditLogs.map((a) => [
            a.at,
            a.user,
            a.action,
            <StatusBadge key={a.at} tone={a.level === "Sensible" ? "danger" : "neutral"}>{a.level}</StatusBadge>,
          ])}
        />
      </Panel>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "admin" / "site" / "page.tsx").write_text("""\"use client\";

import { useEffect, useState } from "react";
import {
  GhostButton,
  PageHeader,
  Panel,
  PrimaryButton,
} from "@/components/admin/Ui";
import {
  DEFAULT_CONTENT,
  loadContent,
  resetContent,
  saveContent,
  type NecsContent,
} from "@/lib/content";

export default function SiteAdminPage() {
  const [data, setData] = useState<NecsContent>(DEFAULT_CONTENT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadContent());
    setReady(true);
  }, []);

  if (!ready) return <p className="note">Chargement…</p>;

  const set = (key: keyof NecsContent, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <PageHeader
        code="WEB"
        title="Site public NECS"
        description="Gestion des contenus de la vitrine ( DIG-01 ). Les leads du formulaire contact alimentent le module Digital."
        actions={
          <>
            <GhostButton>
              <a href="/" target="_blank" rel="noreferrer">Prévisualiser</a>
            </GhostButton>
            <button
              type="button"
              className="btn-admin btn-admin--ghost"
              onClick={() => {
                resetContent();
                setData(loadContent());
                alert("Contenu réinitialisé");
              }}
            >
              Réinitialiser
            </button>
            <button
              type="button"
              className="btn-admin btn-admin--primary"
              onClick={() => {
                saveContent(data);
                alert("Contenu publié");
              }}
            >
              Publier
            </button>
          </>
        }
      />

      <Panel title="Hero">
        <div className="form-grid">
          <div className="field-a"><label>Titre</label><input value={data.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} /></div>
          <div className="field-a"><label>Accroche</label><input value={data.heroEyebrow} onChange={(e) => set("heroEyebrow", e.target.value)} /></div>
          <div className="field-a full"><label>Texte</label><textarea value={data.heroLead} onChange={(e) => set("heroLead", e.target.value)} /></div>
        </div>
      </Panel>

      <Panel title="À propos">
        <div className="form-grid">
          <div className="field-a full"><label>Titre</label><input value={data.aboutTitle} onChange={(e) => set("aboutTitle", e.target.value)} /></div>
          <div className="field-a full"><label>Texte</label><textarea value={data.aboutText} onChange={(e) => set("aboutText", e.target.value)} /></div>
        </div>
      </Panel>

      <Panel title="Contact">
        <div className="form-grid">
          <div className="field-a"><label>Téléphone</label><input value={data.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} /></div>
          <div className="field-a"><label>Email</label><input value={data.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} /></div>
          <div className="field-a full"><label>Adresse</label><input value={data.contactAddress} onChange={(e) => set("contactAddress", e.target.value)} /></div>
        </div>
        <p className="note">Les autres sections (pourquoi nous, activités, blog…) restent éditables via les mêmes clés de contenu.</p>
      </Panel>
    </>
  );
}
""", encoding="utf-8")

# Public site page - client component
(ROOT / "components" / "site" / "HomePage.tsx").write_text("""\"use client\";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  DEFAULT_CONTENT,
  formatHeroTitle,
  loadContent,
  saveLead,
  type NecsContent,
} from "@/lib/content";

function Media3D({
  src,
  alt,
  variant = "card",
}: {
  src: string;
  alt: string;
  variant?: "card" | "tall" | "wide";
}) {
  return (
    <div className={`media-3d media-3d--${variant}`}>
      <div className="media-3d__inner">
        <Image src={src} alt={alt} fill sizes="(max-width:900px) 100vw, 50vw" style={{ objectFit: "cover" }} />
      </div>
      <div className="bevel-glow" />
    </div>
  );
}

export function HomePage() {
  const [content, setContent] = useState<NecsContent>(DEFAULT_CONTENT);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setContent(loadContent());
    const header = document.querySelector(".site-header");
    const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hero = formatHeroTitle(content.heroTitle);

  const onContact = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveLead({
      name: String(fd.get("name") || ""),
      company: String(fd.get("company") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      subject: String(fd.get("subject") || ""),
      message: String(fd.get("message") || ""),
    });
    e.currentTarget.reset();
    alert("Merci ! Votre demande a été enregistrée.");
  };

  return (
    <>
      <header className="site-header" id="top">
        <div className={`container nav${navOpen ? " is-open" : ""}`}>
          <Link className="brand" href="#top">
            <Image src="/images/logo-necs.jpg" alt="NECS" width={52} height={52} />
            <div>
              <strong>{content.brandName}</strong>
              <span>{content.brandTagline}</span>
            </div>
          </Link>
          <button className="nav-toggle" type="button" aria-label="Menu" onClick={() => setNavOpen((v) => !v)}>
            <span /><span /><span />
          </button>
          <ul className="nav-links">
            {[
              ["#pourquoi", "Pourquoi nous"],
              ["#apropos", "À propos"],
              ["#realisations", "Réalisations"],
              ["#objectif", "Objectif"],
              ["#activites", "Activités"],
              ["#temoignages", "Témoignages"],
              ["#blog", "Blog"],
              ["#contact", "Contact"],
            ].map(([href, label]) => (
              <li key={href}><a href={href} onClick={() => setNavOpen(false)}>{label}</a></li>
            ))}
          </ul>
          <a className="nav-cta" href="#contact">Demander un devis</a>
        </div>
      </header>

      <section className="hero">
        <div className="hero__media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={content.images.hero} alt="Équipe NECS" />
        </div>
        <div className="hero__overlay" />
        <div className="container hero__content">
          <div className="hero__brand">
            <Image src="/images/logo-necs.jpg" alt="NECS" width={72} height={72} />
            <div>
              <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", letterSpacing: ".08em" }}>NECS SARL</strong>
              <div style={{ opacity: 0.85, fontSize: ".9rem" }}>{content.heroEyebrow}</div>
            </div>
          </div>
          <h1>
            {hero.before}
            {hero.accent ? <>, <em>{hero.accent}</em></> : null}
          </h1>
          <p className="lead">{content.heroLead}</p>
          <div className="hero__actions">
            <a className="btn btn-primary" href="#contact">Contactez-nous</a>
            <a className="btn btn-ghost" href="#apropos">Découvrir NECS</a>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="pourquoi">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Pourquoi nous</div>
            <h2>{content.whyTitle}</h2>
            <p>{content.whyLead}</p>
          </div>
          <div className="why-grid">
            {[
              ["01", content.why1Title, content.why1Text],
              ["02", content.why2Title, content.why2Text],
              ["03", content.why3Title, content.why3Text],
            ].map(([num, title, text]) => (
              <article className="why-item" key={num}>
                <div className="num">{num}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="apropos">
        <div className="container split">
          <div className="split__media" style={{ position: "relative" }}>
            <Media3D src={content.images.about} alt="À propos NECS" variant="tall" />
          </div>
          <div>
            <div className="eyebrow">À propos de nous</div>
            <h2>{content.aboutTitle}</h2>
            <p>{content.aboutText}</p>
            <ul className="feature-list">
              {[
                [content.aboutF1Title, content.aboutF1Text],
                [content.aboutF2Title, content.aboutF2Text],
                [content.aboutF3Title, content.aboutF3Text],
              ].map(([t, d]) => (
                <li key={t}>
                  <span className="ico">✓</span>
                  <div><strong>{t}</strong><span>{d}</span></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="realisations">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Nos réalisations</div>
            <h2>{content.achTitle}</h2>
            <p>{content.achLead}</p>
          </div>
          <div className="gallery">
            <div className="g1" style={{ position: "relative", minHeight: 420 }}>
              <Media3D src={content.images.achMain} alt="Réalisations" variant="wide" />
            </div>
            <div style={{ position: "relative" }}><Media3D src={content.images.actOffice} alt="Bureaux" /></div>
            <div style={{ position: "relative" }}><Media3D src={content.images.actCommerce} alt="Commerce" /></div>
          </div>
          <div className="stats">
            {[
              [content.stat1Value, content.stat1Label],
              [content.stat2Value, content.stat2Label],
              [content.stat3Value, content.stat3Label],
              [content.stat4Value, content.stat4Label],
            ].map(([v, l]) => (
              <div className="stat" key={l}><strong>{v}</strong><span>{l}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="objectif">
        <div className="container">
          <div className="objectif">
            <div className="objectif__bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={content.images.objectif} alt="Objectif NECS" />
            </div>
            <div className="objectif__veil" />
            <div className="objectif__content">
              <div className="eyebrow" style={{ color: "#a8d83a" }}>Notre objectif</div>
              <h2>{content.objTitle}</h2>
              <p>{content.objText}</p>
              <a className="btn btn-primary" href="#contact">Parler à un conseiller</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt" id="activites">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Nos activités</div>
            <h2>{content.actTitle}</h2>
            <p>{content.actLead}</p>
          </div>
          <div className="activities">
            {[
              [content.images.actOffice, content.act1Title, content.act1Text],
              [content.images.actIndustry, content.act2Title, content.act2Text],
              [content.images.actCommerce, content.act3Title, content.act3Text],
            ].map(([img, title, text]) => (
              <article className="activity" key={title}>
                <div style={{ position: "relative" }}><Media3D src={img} alt={title} /></div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="temoignages">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Témoignages</div>
            <h2>{content.testTitle}</h2>
            <p>{content.testLead}</p>
          </div>
          <div className="testimonials">
            {[
              [content.t1Text, content.t1Name, content.t1Role, "JO"],
              [content.t2Text, content.t2Name, content.t2Role, "AM"],
              [content.t3Text, content.t3Name, content.t3Role, "PK"],
            ].map(([text, name, role, av]) => (
              <article className="quote" key={name}>
                <p>{text}</p>
                <footer>
                  <div className="avatar">{av}</div>
                  <div><strong>{name}</strong><span>{role}</span></div>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-alt" id="blog">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">Blog</div>
            <h2>{content.blogTitle}</h2>
            <p>{content.blogLead}</p>
          </div>
          <div className="blog-grid">
            {[
              [content.images.blog1, content.b1Meta, content.b1Title, content.b1Text],
              [content.images.blog2, content.b2Meta, content.b2Title, content.b2Text],
              [content.images.achMain, content.b3Meta, content.b3Title, content.b3Text],
            ].map(([img, meta, title, text]) => (
              <article className="blog-card" key={title}>
                <div style={{ position: "relative" }}><Media3D src={img} alt={title} /></div>
                <div className="meta">{meta}</div>
                <h3>{title}</h3>
                <p>{text}</p>
                <a className="more" href="#contact">Lire la suite →</a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="contact">
        <div className="container contact-wrap">
          <aside className="contact-panel">
            <h2>{content.contactTitle}</h2>
            <p>{content.contactLead}</p>
            <ul>
              <li><strong>Téléphone</strong><span>{content.contactPhone}</span></li>
              <li><strong>Email</strong><span>{content.contactEmail}</span></li>
              <li><strong>Adresse</strong><span>{content.contactAddress}</span></li>
              <li><strong>Horaires</strong><span>{content.contactHours}</span></li>
            </ul>
          </aside>
          <form className="contact-form" onSubmit={onContact}>
            <div className="form-row">
              <div className="field"><label htmlFor="cName">Nom</label><input id="cName" name="name" required /></div>
              <div className="field"><label htmlFor="cCompany">Entreprise</label><input id="cCompany" name="company" required /></div>
            </div>
            <div className="form-row">
              <div className="field"><label htmlFor="cEmail">Email</label><input id="cEmail" name="email" type="email" required /></div>
              <div className="field"><label htmlFor="cPhone">Téléphone</label><input id="cPhone" name="phone" required /></div>
            </div>
            <div className="field">
              <label htmlFor="cSubject">Sujet</label>
              <select id="cSubject" name="subject">
                <option>Demande de devis</option>
                <option>Visite technique</option>
                <option>Partenariat</option>
                <option>Autre</option>
              </select>
            </div>
            <div className="field"><label htmlFor="cMessage">Message</label><textarea id="cMessage" name="message" required /></div>
            <button className="btn btn-primary" type="submit">Envoyer ma demande</button>
            <p className="form-note">Le lead sera visible dans Admin → Marketing digital.</p>
          </form>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand">
                <Image src="/images/logo-necs.jpg" alt="NECS" width={56} height={56} />
                <div><strong>NECS</strong><span>NECLEANING & SERVICES SARL</span></div>
              </div>
              <p>{content.footerAbout}</p>
            </div>
            <div>
              <h4>Navigation</h4>
              <ul>
                <li><a href="#pourquoi">Pourquoi nous</a></li>
                <li><a href="#apropos">À propos</a></li>
                <li><a href="#activites">Activités</a></li>
                <li><a href="#blog">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4>Services</h4>
              <ul>
                <li><a href="#activites">Bureaux</a></li>
                <li><a href="#activites">Industrie</a></li>
                <li><a href="#contact">Devis</a></li>
              </ul>
            </div>
            <div>
              <h4>Back-office</h4>
              <ul>
                <li><Link href="/admin">Administration CDC</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} NECS / NECLEANING & SERVICES SARL</span>
            <span>Next.js · Sans pages HTML</span>
          </div>
        </div>
      </footer>
    </>
  );
}
""", encoding="utf-8")

(ROOT / "app" / "page.tsx").write_text("""import { HomePage } from "@/components/site/HomePage";

export default function Page() {
  return <HomePage />;
}
""", encoding="utf-8")

# Fix globals.css font vars for next/font
css = (ROOT / "app" / "globals.css").read_text(encoding="utf-8")
css = css.replace("--font-d: 'Outfit', system-ui, sans-serif;", "--font-d: var(--font-display), 'Outfit', system-ui, sans-serif;")
css = css.replace("--font-b: 'DM Sans', system-ui, sans-serif;", "--font-b: var(--font-body), 'DM Sans', system-ui, sans-serif;")
# media-3d inner needs position relative for next/image fill
if ".media-3d__inner {" in css and "position: relative" not in css[css.find(".media-3d__inner {"):css.find(".media-3d__inner {")+200]:
    css = css.replace(
        ".media-3d__inner {\n  position: relative;",
        ".media-3d__inner {\n  position: relative;",
    )
(ROOT / "app" / "globals.css").write_text(css, encoding="utf-8")

# next.config images
cfg = Path(r"C:\Users\UTILISATEUR\Desktop\erp cameroun\web\next.config.ts")
cfg.write_text("""import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
""", encoding="utf-8")

# Remove unused page.module.css usage - delete file ok
pmod = ROOT / "app" / "page.module.css"
if pmod.exists():
    pmod.unlink()

print("OK pages Next.js générées")
