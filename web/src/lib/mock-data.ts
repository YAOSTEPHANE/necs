export type StatusTone = "ok" | "warn" | "danger" | "info" | "neutral";

export const dashboardKpis = [
  { label: "CA mensuel (FCFA)", value: "48,2 M", delta: "+12%", tone: "ok" as StatusTone, source: "FIN / BI-01" },
  { label: "Pipeline commercial", value: "23,7 M", delta: "14 opportunités", tone: "info" as StatusTone, source: "CRM-05" },
  { label: "Contrats actifs", value: "86", delta: "+3 ce mois", tone: "ok" as StatusTone, source: "CRM-06" },
  { label: "Effectif terrain", value: "214", delta: "12 en recrutement", tone: "warn" as StatusTone, source: "RH / BI-04" },
  { label: "Score qualité moyen", value: "91/100", delta: "Seuil 85", tone: "ok" as StatusTone, source: "Q-01" },
  { label: "Créances > 30 j", value: "6,4 M", delta: "11 dossiers", tone: "danger" as StatusTone, source: "FIN-05" },
];

export const digitalLeads = [
  { id: "LEAD-2401", source: "Site web — Devis", campaign: "SEO Local Douala", name: "Société Horizon SA", status: "Nouveau", sla: "2h", consent: "Oui" },
  { id: "LEAD-2402", source: "Facebook Lead Ads", campaign: "Nettoyage bureaux Q1", name: "Boutique Klaris", status: "Qualifié", sla: "OK", consent: "Oui" },
  { id: "LEAD-2403", source: "Contact web", campaign: "Organic", name: "Clinique Les Palmiers", status: "À rappeler", sla: "Retard", consent: "Oui" },
  { id: "LEAD-2404", source: "Visite technique", campaign: "Outbound Commercial", name: "LogiTrans Cameroun", status: "Visite planifiée", sla: "OK", consent: "Oui" },
];

export const crmPipeline = [
  { id: "OPP-87", client: "Société Exemple SA", stage: "Devis envoyé", value: "897 000", probability: "60%", next: "Relance J+3", owner: "A. Mbarga" },
  { id: "OPP-91", client: "Groupe Atlas", stage: "Visite technique", value: "1 450 000", probability: "40%", next: "Rapport VT", owner: "P. Ngo" },
  { id: "OPP-94", client: "Mall Riviera", stage: "Qualification", value: "2 100 000", probability: "25%", next: "Compléter surface", owner: "A. Mbarga" },
  { id: "OPP-96", client: "Banque Centrale Agence", stage: "Négociation", value: "3 200 000", probability: "70%", next: "Validation direction", owner: "Direction" },
];

export const crmContracts = [
  { id: "NECS-CTR-2026-0034", client: "Société Exemple SA", site: "Immeuble Horizon", sla: "Premium", start: "01/04/2026", status: "Actif" },
  { id: "NECS-CTR-2026-0028", client: "Groupe Atlas", site: "Usine Bassa", sla: "Standard", start: "15/01/2026", status: "Actif" },
  { id: "NECS-CTR-2025-0112", client: "Mall Riviera", site: "Centre commercial", sla: "Critique", start: "01/09/2025", status: "À renouveler" },
];

export const operationsMissions = [
  { id: "OT-1440", site: "Immeuble Horizon", mission: "Entretien quotidien", slot: "06:00–14:00", team: "4 agents", status: "En cours" },
  { id: "OT-1441", site: "Usine Bassa", mission: "Nettoyage atelier", slot: "14:00–22:00", team: "6 agents", status: "Planifié" },
  { id: "OT-1442", site: "Mall Riviera", mission: "Vitrerie + sols", slot: "22:00–06:00", team: "8 agents", status: "Anomalie pointage" },
];

export const pointages = [
  { agent: "A. Kouam", site: "Immeuble Horizon", in: "06:02", out: "14:05", anomaly: "Aucune", mode: "Mobile" },
  { agent: "M. Ngo", site: "Immeuble Horizon", in: "06:18", out: "—", anomaly: "Retard", mode: "Mobile" },
  { agent: "S. Talla", site: "Usine Bassa", in: "13:58", out: "—", anomaly: "Aucune", mode: "Terminal" },
];

export const qualityChecks = [
  { id: "QA-278", site: "Immeuble Horizon", score: 92, threshold: 85, nc: 0, date: "09/09/2026", status: "Conforme" },
  { id: "QA-279", site: "Mall Riviera", score: 78, threshold: 85, nc: 2, date: "09/09/2026", status: "Non conforme" },
  { id: "QA-280", site: "Usine Bassa", score: 88, threshold: 85, nc: 1, date: "08/09/2026", status: "Actions en cours" },
];

export const claims = [
  { id: "REC-041", client: "Mall Riviera", priority: "Haute", sla: "48h", subject: "Odeur sanitaires niveau 2", status: "Ouverte" },
  { id: "REC-040", client: "Société Exemple SA", priority: "Normale", sla: "72h", subject: "Demande passage vitrerie extra", status: "En traitement" },
];

export const rhNeeds = [
  { id: "BES-019", site: "Immeuble Horizon", role: "Agent d’entretien", qty: 2, status: "Validé budget", source: "Planning" },
  { id: "BES-020", site: "Mall Riviera", role: "Chef d’équipe nuit", qty: 1, status: "En validation", source: "Contrat" },
];

export const rhCandidates = [
  { id: "CAND-102", name: "Grace Embolo", role: "Agent d’entretien", stage: "Entretien", score: "4/5", decision: "À décider" },
  { id: "CAND-103", name: "Boris Manga", role: "Chef d’équipe", stage: "Présélection", score: "—", decision: "En cours" },
  { id: "CAND-104", name: "Linda Fouda", role: "Agent d’entretien", stage: "Dossier embauche", score: "5/5", decision: "Retenue" },
];

export const financeInvoices = [
  { id: "FAC-0450", client: "Société Exemple SA", period: "Mars 2026", amount: "847 000", due: "30/04/2026", status: "Émise" },
  { id: "FAC-0448", client: "Groupe Atlas", period: "Mars 2026", amount: "1 320 000", due: "15/04/2026", status: "Payée partiellement" },
  { id: "FAC-0441", client: "Mall Riviera", period: "Fév 2026", amount: "2 050 000", due: "05/03/2026", status: "En recouvrement" },
];

export const financePrefactures = [
  { id: "PF-0112", contrat: "CTR-0034", period: "Mars 2026", ecarts: "1 jour", amount: "847 000", status: "Validée" },
  { id: "PF-0113", contrat: "CTR-0028", period: "Mars 2026", ecarts: "0", amount: "1 320 000", status: "En contrôle" },
];

export const templatesCatalog = [
  { id: "prop", name: "Proposition de services", module: "CRM", status: "Validé maquette" },
  { id: "devis", name: "Devis", module: "CRM / Finance", status: "Validé maquette" },
  { id: "contrat", name: "Contrat de prestation", module: "CRM / Juridique", status: "Validé maquette" },
  { id: "ot", name: "Ordre de travail", module: "Opérations", status: "Maquette" },
  { id: "qa", name: "Contrôle qualité", module: "Qualité", status: "Maquette" },
  { id: "facture", name: "Facture", module: "Finance", status: "Validé maquette" },
  { id: "embauche", name: "Dossier d’embauche", module: "RH", status: "Maquette" },
  { id: "relance", name: "Relance client", module: "Recouvrement", status: "Maquette" },
];

export const securityUsers = [
  { name: "Admin NECS", role: "Administrateur", scope: "Global", status: "Actif", mfa: "Activé" },
  { name: "A. Mbarga", role: "Commercial", scope: "CRM + Digital", status: "Actif", mfa: "Activé" },
  { name: "S. Ndjock", role: "Superviseur", scope: "Ops + Qualité (sites affectés)", status: "Actif", mfa: "Non" },
  { name: "Finance Desk", role: "Finance", scope: "FIN + Templates", status: "Actif", mfa: "Activé" },
];

export const auditLogs = [
  { at: "10/09/2026 09:12", user: "Finance Desk", action: "Émission facture FAC-0450", level: "Sensible" },
  { at: "10/09/2026 08:44", user: "A. Mbarga", action: "Création devis DEV-0142", level: "Normal" },
  { at: "09/09/2026 17:02", user: "Admin NECS", action: "Modification rôle Superviseur", level: "Sensible" },
];
