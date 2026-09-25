"use client";

import { FormEvent, useEffect, useState } from "react";
import { saveLead, type NecsContent } from "@/lib/content";
import {
  inferFormTypeFromSubject,
  readLeadAttribution,
} from "@/lib/lead-attribution";
import { toast } from "@/lib/toast";
import { BrandLogo, useBrandAssets } from "@/components/BrandAssets";
import { ContactQuickActions } from "@/components/site/ContactQuickActions";
import {
  SlotCalendar,
  type SlotSelection,
} from "@/components/site/SlotCalendar";

export interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: NecsContent;
  initialSubject?: string;
}

export function ContactModal({
  isOpen,
  onClose,
  content,
  initialSubject = "Demande de devis",
}: ContactModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [slot, setSlot] = useState<SlotSelection>(null);

  useEffect(() => {
    if (initialSubject) {
      setSubject(initialSubject);
    }
  }, [initialSubject]);

  useEffect(() => {
    if (!isOpen) {
      setSubmitted(false);
      setSending(false);
      setSlot(null);
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function onContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || submitted) return;
    const fd = new FormData(e.currentTarget);
    if (!fd.get("consent")) {
      toast.error("Veuillez accepter le traitement de vos données.");
      return;
    }
    const subjectValue = String(fd.get("subject") || subject);
    const city = String(fd.get("city") || "");
    const surface = String(fd.get("surface") || "").trim();
    const baseMessage = String(fd.get("message") || "");
    const attribution = readLeadAttribution({ defaultSource: "site_web" });
    const payload = {
      name: String(fd.get("name") || ""),
      company: String(fd.get("company") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      subject: subjectValue,
      message: [
        baseMessage,
        surface ? `Surface approximative : ${surface} m²` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      formType: inferFormTypeFromSubject(subjectValue),
      consent: true,
      preferredSlotAt: slot?.at,
      preferredSlotLabel: slot?.label,
      city,
      ...attribution,
    };
    setSending(true);
    void (async () => {
      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          toast.error(data.error || "Envoi impossible.");
          return;
        }
        saveLead(payload);
        toast.success(
          slot
            ? "Demande envoyée ; créneau bien noté."
            : "Demande envoyée ; nous vous recontactons sous 24 h.",
        );
        setSubmitted(true);
      } catch {
        toast.error("Impossible d’envoyer la demande.");
      } finally {
        setSending(false);
      }
    })();
  }

  return (
    <div
      className="necs-overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="necs-modal-card">
        <button
          type="button"
          className="necs-modal-close"
          onClick={onClose}
          aria-label="Fermer la fenêtre"
        >
          ✕
        </button>

        {submitted ? (
          <div className="necs-modal-success">
            <div className="necs-modal-success__icon">✓</div>
            <h3>Demande bien reçue !</h3>
            <p>
              Merci pour votre démarche. Notre équipe commerciale et technique
              étudie vos besoins
              {slot ? (
                <>
                  {" "}
                  et a noté votre créneau : <strong>{slot.label}</strong>
                </>
              ) : (
                <>
                  {" "}
                  et vous recontactera sous <strong>24 heures ouvrées</strong>
                </>
              )}
              .
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setSubmitted(false);
                setSlot(null);
                onClose();
              }}
            >
              Fermer cette fenêtre
            </button>
          </div>
        ) : (
          <>
            <div className="necs-modal-header">
              <div className="necs-modal-brand">
                <BrandLogo alt="NECS" width={30} height={30} />
                <div>
                  <span className="necs-modal-badge">Réponse sous 24h</span>
                </div>
              </div>
              <h2 id="contact-modal-title">Demande de devis</h2>
              <p className="necs-modal-lead">
                Décrivez votre besoin et réservez un créneau si besoin.
              </p>
            </div>

            <form className="necs-modal-form necs-devis-form" onSubmit={onContact}>
              <div className="necs-modal-form__scroll">
                <section className="necs-devis-section" aria-labelledby="devis-coords">
                  <h3 id="devis-coords" className="necs-devis-section__title">
                    Vos coordonnées
                  </h3>
                  <div className="necs-devis-grid">
                    <div className="field">
                      <label htmlFor="modal-name">Nom complet *</label>
                      <input
                        id="modal-name"
                        name="name"
                        placeholder="Ex. Jean Paul Talla"
                        required
                        autoComplete="name"
                        autoFocus
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="modal-company">Entreprise / Organisation *</label>
                      <input
                        id="modal-company"
                        name="company"
                        placeholder="Ex. Cabinet ABC, Douala"
                        required
                        autoComplete="organization"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="modal-email">Email professionnel *</label>
                      <input
                        id="modal-email"
                        name="email"
                        type="email"
                        placeholder="contact@entreprise.cm"
                        required
                        autoComplete="email"
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="modal-phone">Téléphone / WhatsApp *</label>
                      <input
                        id="modal-phone"
                        name="phone"
                        type="tel"
                        placeholder="+237 6…"
                        required
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                </section>

                <section className="necs-devis-section" aria-labelledby="devis-need">
                  <h3 id="devis-need" className="necs-devis-section__title">
                    Votre besoin
                  </h3>
                  <div className="field">
                    <label htmlFor="modal-subject">Objet de votre demande</label>
                    <select
                      id="modal-subject"
                      name="subject"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        e.currentTarget.blur();
                      }}
                    >
                      <option value="Demande de devis">
                        Demande de devis personnalisé
                      </option>
                      <option value="Nettoyage de bureaux">
                        Entretien régulier de bureaux
                      </option>
                      <option value="Nettoyage industriel">
                        Nettoyage industriel & entrepôt
                      </option>
                      <option value="Visite technique">
                        Demande de visite technique sur site
                      </option>
                      <option value="Facility management">
                        Facility services & conciergerie
                      </option>
                      <option value="Partenariat">
                        Partenariat & sous-traitance
                      </option>
                      <option value="Autre demande">Autre demande</option>
                    </select>
                  </div>
                  <div className="necs-devis-grid necs-devis-grid--city">
                    <div className="field">
                      <label htmlFor="modal-city">Ville *</label>
                      <select id="modal-city" name="city" required defaultValue="">
                        <option value="" disabled>
                          Choisir…
                        </option>
                        <option value="Yaoundé">Yaoundé</option>
                        <option value="Douala">Douala</option>
                        <option value="Autre">Autre / environs</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="modal-surface">Surface approx. (m²)</label>
                      <input
                        id="modal-surface"
                        name="surface"
                        type="text"
                        inputMode="numeric"
                        placeholder="Ex. 450"
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="modal-message">
                      Détail (fréquence, contraintes, adresse…) *
                    </label>
                    <textarea
                      id="modal-message"
                      name="message"
                      rows={2}
                      placeholder="Ex. Nettoyage quotidien de bureaux à Bonanjo, 5j/7…"
                      required
                    />
                  </div>
                </section>

                <section className="necs-devis-section" aria-label="Créneau">
                  <SlotCalendar
                    value={slot}
                    onChange={setSlot}
                    idPrefix="modal-slot"
                    compact
                  />
                </section>

                <label className="field field--consent">
                  <input type="checkbox" name="consent" value="1" required />
                  <span>
                    J’accepte que NECS traite mes données pour répondre à cette
                    demande (devis / contact). *
                  </span>
                </label>
              </div>

              <div className="necs-modal-actions">
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={sending || submitted}
                >
                  {sending ? "Envoi…" : "Envoyer"}
                  <span aria-hidden className="btn__chev">
                    →
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-ghost on-light"
                  onClick={onClose}
                >
                  Annuler
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Composant de présentation pour les sections de contact (sur la page d'accueil ou la page /contact)
 * avec panneau d'informations et déclencheur d'overlay.
 */
export function ContactForm({
  content,
  onOpenModal,
}: {
  content: NecsContent;
  note?: string;
  onOpenModal?: () => void;
}) {
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const { email, phone } = useBrandAssets();
  const displayEmail = (email || content.contactEmail).trim();
  const displayPhone = phone || content.contactPhone;

  const handleOpen = () => {
    if (onOpenModal) {
      onOpenModal();
    } else {
      setInternalModalOpen(true);
    }
  };

  return (
    <>
      <div className="container contact-wrap">
        <aside className="contact-panel reveal">
          <h2>{content.contactTitle}</h2>
          <p>{content.contactLead}</p>
          <ul>
            <li>
              <strong>Téléphone</strong>
              <span>{displayPhone}</span>
            </li>
            <li>
              <strong>Email</strong>
              <span>{displayEmail}</span>
            </li>
            <li>
              <strong>Adresse</strong>
              <span>{content.contactAddress}</span>
            </li>
            <li>
              <strong>Horaires</strong>
              <span>{content.contactHours}</span>
            </li>
          </ul>
          <ContactQuickActions
            className="contact-panel__actions"
            fallbackPhone={displayPhone}
            fallbackEmail={displayEmail}
            onFormClick={handleOpen}
          />
        </aside>

        <div className="contact-card-cta reveal reveal-delay-1">
          <div className="contact-card-cta__badge">Devis sur mesure</div>
          <h3>Parlons de vos locaux</h3>
          <p>
            Superficie, fréquence, contraintes site ; nous construisons une
            proposition nette, sans jargon.
          </p>
          <ul className="contact-card-cta__points">
            <li>Devis gratuit, sans engagement</li>
            <li>Visite technique Douala & Yaoundé</li>
            <li>Équipes formées, reporting digital</li>
          </ul>
          <button
            type="button"
            className="btn btn-primary contact-card-cta__btn"
            onClick={handleOpen}
          >
            Ouvrir le formulaire
            <span aria-hidden className="btn__chev">
              →
            </span>
          </button>
          <span className="contact-card-cta__hint">
            Réponse sous 24 heures ouvrées
          </span>
        </div>
      </div>

      {!onOpenModal ? (
        <ContactModal
          isOpen={internalModalOpen}
          onClose={() => setInternalModalOpen(false)}
          content={content}
        />
      ) : null}
    </>
  );
}
