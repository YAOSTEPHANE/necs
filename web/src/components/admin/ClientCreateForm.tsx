"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AdminFormWizard,
  FwPanel,
  FwPanelHead,
  FwGrid,
  FwField,
  FwBlock,
  FwChips,
  FwChip,
  FwReview,
  FwReviewCard,
  FwWarn,
  FwOk,
} from "@/components/admin/form-wizard";
import { toast } from "@/lib/toast";
import { safeRouterPush } from "@/lib/safe-navigate";

export type ClientFormSeed = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  siteType?: string;
  surface?: string;
  source?: string;
  campaign?: string;
  formType?: "devis" | "visite" | "contact" | "autre";
  subject?: string;
  message?: string;
  consent?: boolean;
};

type Draft = {
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  siteType: string;
  surface: string;
  source: string;
  campaign: string;
  formType: "devis" | "visite" | "contact" | "autre";
  subject: string;
  message: string;
  consent: boolean;
  submitRequest: boolean;
};

const SITE_TYPES = [
  { value: "Bureaux", hint: "Open space, salles" },
  { value: "Industriel / entrepôt", hint: "Usines, stockage" },
  { value: "Commerce / retail", hint: "Magasins, galeries" },
  { value: "Résidentiel", hint: "Appartements, villas" },
  { value: "Établissement public", hint: "Administrations" },
  { value: "Autre", hint: "Hors standard" },
] as const;

const SOURCES = [
  { value: "saisie_interne", label: "Saisie interne", hint: "Saisie bureau" },
  { value: "telephone", label: "Appel téléphonique", hint: "Entrant / sortant" },
  { value: "whatsapp", label: "WhatsApp", hint: "Message direct" },
  { value: "visite_terrain", label: "Visite terrain", hint: "Sur site" },
  { value: "email", label: "E-mail reçu", hint: "Boîte pro" },
  { value: "site_web", label: "Issu du site web", hint: "Formulaire public" },
  { value: "partenaire", label: "Partenaire", hint: "Apport externe" },
] as const;

const FORM_TYPES = [
  { value: "devis" as const, label: "Devis / travaux", hint: "Chiffrage" },
  { value: "visite" as const, label: "Visite technique", hint: "Diagnostic" },
  { value: "contact" as const, label: "Contact", hint: "Prise de contact" },
  { value: "autre" as const, label: "Autre", hint: "Demande libre" },
];

const STEPS = [
  { id: "identite", label: "Identité", hint: "Contact & société" },
  { id: "locaux", label: "Locaux", hint: "Site & canal" },
  { id: "demande", label: "Demande", hint: "Travaux & consentement" },
  { id: "revue", label: "Revue", hint: "Contrôle avant création" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

function toDraft(seed?: ClientFormSeed): Draft {
  return {
    name: seed?.name || "",
    company: seed?.company || "",
    email: seed?.email || "",
    phone: seed?.phone || "",
    city: seed?.city || "",
    address: seed?.address || "",
    siteType: seed?.siteType || "Bureaux",
    surface: seed?.surface || "",
    source: seed?.source || "saisie_interne",
    campaign: seed?.campaign || "",
    formType: seed?.formType || "devis",
    subject: seed?.subject || "Demande travaux locaux",
    message: seed?.message || "",
    consent: Boolean(seed?.consent),
    submitRequest: true,
  };
}

function sourceLabel(value: string) {
  return SOURCES.find((s) => s.value === value)?.label ?? value;
}

function formTypeLabel(value: Draft["formType"]) {
  return FORM_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function ClientCreateForm({
  seed,
  redirectTo = "/admin/clients",
  title = "Nouveau client",
  lead = "Créez la fiche client. Vous pouvez aussi soumettre une demande de travaux dans ses locaux.",
  embedded = false,
  formId = "necs-client-form",
  onSuccess,
  onCancel,
}: {
  seed?: ClientFormSeed;
  redirectTo?: string;
  title?: string;
  lead?: string;
  /** Formulaire dans l’overlay Clients (sans navigation). */
  embedded?: boolean;
  formId?: string;
  onSuccess?: (email: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => toDraft(seed));
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<StepId>("identite");
  const [shake, setShake] = useState(false);

  const identiteReady =
    Boolean(draft.name.trim()) &&
    Boolean(draft.email.trim()) &&
    draft.email.includes("@");

  const demandeReady =
    draft.consent &&
    (!draft.submitRequest || Boolean(draft.message.trim()));

  function pulseError() {
    setShake(true);
    window.setTimeout(() => setShake(false), 420);
  }

  function canEnterStep(id: string) {
    if (id === "identite") return true;
    if (!identiteReady) return false;
    if (id === "revue") return demandeReady;
    return true;
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    safeRouterPush(router, "/admin/clients");
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (!identiteReady) {
      setStep("identite");
      pulseError();
      return;
    }
    if (!draft.consent) {
      setStep("demande");
      toast.error("Confirmez le consentement client.");
      pulseError();
      return;
    }
    if (draft.submitRequest && !draft.message.trim()) {
      setStep("demande");
      toast.error("Décrivez le besoin / travaux dans les locaux.");
      pulseError();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          company: draft.company.trim(),
          email: draft.email.trim().toLowerCase(),
          phone: draft.phone.trim(),
          city: draft.city.trim(),
          address: draft.address.trim(),
          siteType: draft.siteType,
          surface: draft.surface.trim(),
          source: draft.source,
          campaign: draft.campaign.trim(),
          formType: draft.formType,
          subject: draft.subject.trim(),
          message: draft.message.trim(),
          consent: true,
          submitRequest: draft.submitRequest,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        created?: boolean;
        deduped?: boolean;
        requestSubmitted?: boolean;
      };
      if (!res.ok) {
        toast.error(data.error || "Enregistrement impossible.");
        return;
      }
      const label = draft.company || draft.name;
      const email = draft.email.trim().toLowerCase();
      if (data.requestSubmitted) {
        toast.success(
          data.deduped
            ? `${label} · mis à jour + demande soumise`
            : `${label} · client créé + demande soumise`,
        );
      } else {
        toast.success(
          data.deduped
            ? `${label} · fiche mise à jour`
            : `${label} · client créé`,
        );
      }
      if (onSuccess) {
        onSuccess(email);
        return;
      }
      safeRouterPush(router, `${redirectTo}?q=${encodeURIComponent(email)}`);
      router.refresh();
    } catch {
      toast.error("Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  const initials = (draft.company || draft.name || "C")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

  return (
    <AdminFormWizard
      open
      portal={embedded}
      onClose={handleCancel}
      titleId="client-wizard-title"
      eyebrow="Fiche client"
      title={title}
      lead={lead}
      avatar={initials || "C"}
      steps={[...STEPS]}
      stepId={step}
      onStepChange={(id) => setStep(id as StepId)}
      canEnterStep={canEnterStep}
      onStepBlocked={pulseError}
      shake={shake}
      formId={formId}
      onSubmit={(e) => void onSubmit(e)}
      submitLabel={
        draft.submitRequest
          ? "Créer le client et soumettre"
          : "Créer le client"
      }
      busy={submitting}
      canSubmit={identiteReady && demandeReady}
    >
      {step === "identite" ? (
        <FwPanel aria-label="Identité">
          <FwPanelHead
            title="Identité commerciale"
            description="Contact principal et coordonnées de déduplication."
          />
          <FwGrid>
            <FwField label="Nom contact *">
              <input
                required
                autoFocus
                value={draft.name}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="Ex. Jean Paul Talla"
              />
            </FwField>
            <FwField label="Société">
              <input
                value={draft.company}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, company: e.target.value }))
                }
                placeholder="Ex. Horizon SA"
              />
            </FwField>
            <FwField label="E-mail *">
              <input
                required
                type="email"
                value={draft.email}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, email: e.target.value }))
                }
                placeholder="contact@entreprise.cm"
              />
            </FwField>
            <FwField label="Téléphone">
              <input
                value={draft.phone}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, phone: e.target.value }))
                }
                placeholder="+237 6…"
              />
            </FwField>
          </FwGrid>
        </FwPanel>
      ) : null}

      {step === "locaux" ? (
        <FwPanel aria-label="Locaux">
          <FwPanelHead
            title="Locaux & canal"
            description="Site d’intervention et origine de la fiche."
          />
          <FwGrid>
            <FwField label="Ville">
              <input
                value={draft.city}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, city: e.target.value }))
                }
                placeholder="Douala, Yaoundé…"
              />
            </FwField>
            <FwField label="Adresse / locaux">
              <input
                value={draft.address}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, address: e.target.value }))
                }
                placeholder="Quartier, immeuble…"
              />
            </FwField>
            <FwField label="Surface (approx.)">
              <input
                value={draft.surface}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, surface: e.target.value }))
                }
                placeholder="Ex. 450 m²"
              />
            </FwField>
            <FwField label="Campagne (optionnel)">
              <input
                value={draft.campaign}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, campaign: e.target.value }))
                }
                placeholder="Ex. Outbound Q1"
              />
            </FwField>
          </FwGrid>

          <FwBlock>
            <FwPanelHead
              title="Type de site"
              description="Oriente la qualification opérationnelle."
            />
            <FwChips>
              {SITE_TYPES.map((t) => (
                <FwChip
                  key={t.value}
                  selected={draft.siteType === t.value}
                  title={t.value}
                  hint={t.hint}
                  onClick={() =>
                    setDraft((d) => ({ ...d, siteType: t.value }))
                  }
                />
              ))}
            </FwChips>
          </FwBlock>

          <FwBlock>
            <FwPanelHead
              title="Canal"
              description="Comment le client est entré dans le CRM."
            />
            <FwChips>
              {SOURCES.map((s) => (
                <FwChip
                  key={s.value}
                  selected={draft.source === s.value}
                  title={s.label}
                  hint={s.hint}
                  onClick={() =>
                    setDraft((d) => ({ ...d, source: s.value }))
                  }
                />
              ))}
            </FwChips>
          </FwBlock>
        </FwPanel>
      ) : null}

      {step === "demande" ? (
        <FwPanel aria-label="Demande">
          <FwPanelHead
            title="Demande de travaux"
            description="Optionnellement créez aussi une demande dans Demandes site."
          />

          <FwBlock>
            <FwChips>
              <FwChip
                selected={draft.submitRequest}
                title="Créer une demande"
                hint="Demandes site"
                onClick={() =>
                  setDraft((d) => ({ ...d, submitRequest: true }))
                }
              />
              <FwChip
                selected={!draft.submitRequest}
                title="Fiche seule"
                hint="Sans demande"
                onClick={() =>
                  setDraft((d) => ({ ...d, submitRequest: false }))
                }
              />
            </FwChips>
          </FwBlock>

          {draft.submitRequest ? (
            <>
              <FwBlock>
                <FwPanelHead
                  title="Type de demande"
                  description="Oriente le traitement commercial."
                />
                <FwChips>
                  {FORM_TYPES.map((t) => (
                    <FwChip
                      key={t.value}
                      selected={draft.formType === t.value}
                      title={t.label}
                      hint={t.hint}
                      onClick={() =>
                        setDraft((d) => ({ ...d, formType: t.value }))
                      }
                    />
                  ))}
                </FwChips>
              </FwBlock>
              <FwGrid>
                <FwField label="Objet" wide>
                  <input
                    value={draft.subject}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, subject: e.target.value }))
                    }
                  />
                </FwField>
                <FwField label="Besoin / travaux dans les locaux *" wide>
                  <textarea
                    required={draft.submitRequest}
                    rows={3}
                    value={draft.message}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, message: e.target.value }))
                    }
                    placeholder="Fréquence, horaires, contraintes d’accès, prestation souhaitée…"
                  />
                </FwField>
              </FwGrid>
            </>
          ) : (
            <FwOk>La fiche client sera créée sans demande associée.</FwOk>
          )}

          <FwBlock>
            <FwChips>
              <FwChip
                selected={draft.consent}
                title="Consentement obtenu *"
                hint="Traitement commercial"
                onClick={() =>
                  setDraft((d) => ({ ...d, consent: !d.consent }))
                }
              />
            </FwChips>
            {!draft.consent ? (
              <FwWarn>
                Le consentement client est obligatoire pour enregistrer la
                fiche.
              </FwWarn>
            ) : (
              <FwOk>Consentement confirmé pour le traitement commercial.</FwOk>
            )}
          </FwBlock>
        </FwPanel>
      ) : null}

      {step === "revue" ? (
        <FwPanel aria-label="Revue">
          <FwPanelHead
            title="Revue avant création"
            description="Vérifiez la fiche. La déduplication se fait sur l’e-mail."
          />
          <FwReview>
            <FwReviewCard
              title="Contact"
              rows={[
                { label: "Nom", value: draft.name || "—" },
                { label: "Société", value: draft.company || "—" },
                { label: "E-mail", value: draft.email || "—" },
                { label: "Téléphone", value: draft.phone || "—" },
              ]}
            />
            <FwReviewCard
              title="Locaux"
              rows={[
                { label: "Ville", value: draft.city || "—" },
                { label: "Adresse", value: draft.address || "—" },
                { label: "Type de site", value: draft.siteType || "—" },
                { label: "Surface", value: draft.surface || "—" },
                { label: "Canal", value: sourceLabel(draft.source) },
                { label: "Campagne", value: draft.campaign || "—" },
              ]}
            />
            <FwReviewCard
              title="Demande"
              rows={[
                {
                  label: "Soumettre",
                  value: draft.submitRequest ? "Oui" : "Non",
                },
                {
                  label: "Type",
                  value: draft.submitRequest
                    ? formTypeLabel(draft.formType)
                    : "—",
                },
                {
                  label: "Objet",
                  value: draft.submitRequest ? draft.subject || "—" : "—",
                },
                {
                  label: "Consentement",
                  value: draft.consent ? "Oui" : "Non",
                },
              ]}
            />
          </FwReview>
        </FwPanel>
      ) : null}
    </AdminFormWizard>
  );
}
