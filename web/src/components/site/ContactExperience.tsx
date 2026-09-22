"use client";

import Image from "next/image";
import { FormEvent, useId, useState } from "react";
import { useBrandAssets } from "@/components/BrandAssets";
import { saveLead, type NecsContent } from "@/lib/content";
import {
  inferFormTypeFromSubject,
  readLeadAttribution,
} from "@/lib/lead-attribution";
import { toast } from "@/lib/toast";

const SERVICE_OPTIONS = [
  "Nettoyage de bureaux",
  "Nettoyage industriel",
  "Fin de chantier",
  "Espaces publics",
  "Commerces & retail",
  "Particuliers / domicile",
  "Entretien régulier",
  "Prestation ponctuelle",
] as const;

function digitsForWhatsApp(raw: string): string | null {
  const digits = raw.replace(/[Xx×]/g, "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits;
}

function useContactChannels(content: NecsContent) {
  const { email, whatsapp, phone } = useBrandAssets();
  const waSource = whatsapp || phone || content.contactPhone;
  const waDigits = digitsForWhatsApp(waSource);
  const mail = (email || content.contactEmail).trim();
  const displayPhone = phone || content.contactPhone;
  return {
    waHref: waDigits
      ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
          "Bonjour NECS, je souhaite un devis.",
        )}`
      : null,
    mailHref: mail.includes("@") ? `mailto:${mail}` : null,
    mail,
    displayPhone,
    telHref: digitsForWhatsApp(displayPhone)
      ? `tel:+${digitsForWhatsApp(displayPhone)}`
      : null,
  };
}

function IconClock({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="#E8F4EC" />
      <circle cx="12" cy="12" r="8" fill="#2F8F3A" />
      <circle cx="12" cy="12" r="6.2" fill="#fff" />
      <path d="M12 7.2v5.1l3.4 2" fill="none" stroke="#0A3A72" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.2" fill="#E67A18" />
    </svg>
  );
}

function IconDoc({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2.5" fill="#0A3A72" />
      <path d="M14 3v5h5" fill="#1570B8" />
      <path d="M8.5 12h7M8.5 15h7M8.5 18h4.5" stroke="#8FD14A" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17.5" cy="18.5" r="3.2" fill="#E67A18" />
      <path d="M17.5 17v3M16 18.5h3" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function IconChat({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M5 5.5h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2H10l-4.2 3.1V17H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2z"
        fill="#1570B8"
      />
      <circle cx="9" cy="11.2" r="1.15" fill="#8FD14A" />
      <circle cx="12.5" cy="11.2" r="1.15" fill="#fff" />
      <circle cx="16" cy="11.2" r="1.15" fill="#E67A18" />
    </svg>
  );
}

function IconPhone({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#E8F8EC" />
      <path
        fill="#2F8F3A"
        d="M8.1 4.8c.45-.45 1.2-.55 1.75-.25l2 1.2c.55.35.75 1 .55 1.6l-.65 1.7c-.1.3 0 .7.3.95l2.2 1.65c.25.2.65.2.95.05l1.7-.65c.6-.25 1.25 0 1.6.55l1.2 2c.3.55.2 1.3-.25 1.75l-1 1c-.55.55-1.35.8-2.15.55-1.9-.5-4.1-1.95-6.25-4.1S5.9 10.3 5.4 8.4c-.25-.8 0-1.6.55-2.15l1.15-1.45z"
      />
    </svg>
  );
}

function IconWa({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#25D366" />
      <path
        fill="#fff"
        d="M12.05 5.2a6.85 6.85 0 0 0-5.9 10.35L5.3 18.9l3.55-.95A6.85 6.85 0 1 0 12.05 5.2zm3.9 9.8c-.15-.08-.9-.45-1.04-.5-.14-.05-.24-.08-.34.08s-.39.5-.48.6c-.09.1-.18.11-.33.04a4.4 4.4 0 0 1-1.35-.85 4.9 4.9 0 0 1-.95-1.18c-.08-.15 0-.3.07-.39l.27-.33.1-.23a.33.33 0 0 0-.05-.33c-.05-.08-.33-.8-.46-1.1-.12-.28-.25-.24-.34-.24h-.27c-.1 0-.25.04-.38.18-.13.15-.5.48-.5 1.18s.5 1.36.57 1.46c.07.1.98 1.5 2.38 2.1 1.4.61 1.4.4 1.65.38.25-.03.84-.35.96-.68.12-.33.12-.62.08-.68-.04-.06-.13-.1-.28-.16z"
      />
    </svg>
  );
}

function IconMail({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#E7F0FA" />
      <rect x="4.5" y="7" width="15" height="10.5" rx="2" fill="#0A3A72" />
      <path d="M5.2 8.2 12 12.8l6.8-4.6" fill="none" stroke="#8FD14A" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconPin({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#FFF4E8" />
      <path
        fill="#E67A18"
        d="M12 3.8a5.8 5.8 0 0 0-5.8 5.8c0 4.35 5.8 10.6 5.8 10.6s5.8-6.25 5.8-10.6A5.8 5.8 0 0 0 12 3.8z"
      />
      <circle cx="12" cy="9.5" r="2.2" fill="#fff" />
    </svg>
  );
}

function IconPeople({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="9" cy="8" r="3.2" fill="#2F8F3A" />
      <circle cx="16.2" cy="8.6" r="2.6" fill="#8FD14A" />
      <path d="M3.8 19.2c.4-3.4 2.8-5.2 5.2-5.2s4.8 1.8 5.2 5.2" fill="#0A3A72" />
      <path d="M12.6 19.2c.25-2.1 1.5-3.4 3.5-3.4 2.1 0 3.5 1.4 3.7 3.4" fill="#1570B8" />
    </svg>
  );
}

function IconGear({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        fill="#E67A18"
        d="M19.4 13.1c.05-.35.1-.7.1-1.1s-.05-.75-.1-1.1l2-1.55a.5.5 0 0 0 .12-.63l-1.9-3.3a.5.5 0 0 0-.6-.22l-2.35.95a7.4 7.4 0 0 0-1.9-1.1L14.5 2.6a.5.5 0 0 0-.5-.4h-3.8a.5.5 0 0 0-.5.4l-.37 2.48c-.68.27-1.32.63-1.9 1.1L5.08 5.2a.5.5 0 0 0-.6.22L2.58 8.7a.5.5 0 0 0 .12.63L4.7 10.9c-.05.35-.1.7-.1 1.1s.05.75.1 1.1L2.7 14.65a.5.5 0 0 0-.12.63l1.9 3.3a.5.5 0 0 0 .6.22l2.35-.95c.58.47 1.22.83 1.9 1.1l.37 2.48a.5.5 0 0 0 .5.4h3.8a.5.5 0 0 0 .5-.4l.37-2.48c.68-.27 1.32-.63 1.9-1.1l2.35.95a.5.5 0 0 0 .6-.22l1.9-3.3a.5.5 0 0 0-.12-.63L19.4 13.1z"
      />
      <circle cx="12" cy="12" r="3.4" fill="#fff" />
      <circle cx="12" cy="12" r="1.7" fill="#0A3A72" />
    </svg>
  );
}

function IconChart({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" fill="#E7F0FA" />
      <path d="M7 16V12" stroke="#0A3A72" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 16V8.5" stroke="#1570B8" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M17 16v-5" stroke="#2F8F3A" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6.5 9.2 11.2 6.8 16.8 9" fill="none" stroke="#E67A18" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconHandshake({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M3.5 11.2 8 7.2l3.2 2.4" fill="#2F8F3A" />
      <path d="M20.5 11.2 16 7.2l-3 2.2" fill="#0A3A72" />
      <path
        d="M8.2 9.8c1.4 1.2 2.7 2.1 3.8 2.1 1.2 0 2.2-.7 3.4-1.8l1.4 1.3c-1.5 1.4-3.1 2.5-4.8 2.5-1.8 0-3.5-1-5.2-2.5L8.2 9.8z"
        fill="#8FD14A"
      />
      <rect x="7.2" y="14.8" width="9.6" height="2.6" rx="1.1" fill="#E67A18" />
    </svg>
  );
}

function IconCheck({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#fff" />
      <path
        d="M7.2 12.4 10.4 15.6 16.8 8.6"
        fill="none"
        stroke="#2F8F3A"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconHome({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill="#fff" d="M4.5 11.2 12 4.8l7.5 6.4V20a1.2 1.2 0 0 1-1.2 1.2h-4.1v-5.2h-4.4v5.2H5.7A1.2 1.2 0 0 1 4.5 20v-8.8z" />
      <path fill="#8FD14A" d="M12 4.8 4.5 11.2H7V9.1l5-4.3 5 4.3v2.1h2.5L12 4.8z" />
    </svg>
  );
}

function IconSend({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path fill="#fff" d="M3.2 11.2 20.5 3.8 14.2 20.3l-2.7-6.1-6.1-2.1 3.5-2.4z" />
      <path fill="#8FD14A" d="M11.5 14.2 20.5 3.8 9.8 9.1l1.7 5.1z" />
    </svg>
  );
}

function IconLock({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2.2" fill="#0A3A72" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="#E67A18" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.5" fill="#8FD14A" />
    </svg>
  );
}

function IconArrow({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path
        d="M5 12h12M13 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ContactFlyerForm({ content }: { content: NecsContent }) {
  const formId = useId();
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clientType, setClientType] = useState<"pro" | "particulier">("pro");
  const [services, setServices] = useState<string[]>([]);

  function toggleService(label: string) {
    setServices((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || submitted) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (!fd.get("consent")) {
      toast.error("Veuillez accepter le traitement de vos données.");
      return;
    }
    const baseMessage = String(fd.get("message") || "");
    const city = String(fd.get("city") || "");
    const subject = "Demande de devis";
    const attribution = readLeadAttribution({ defaultSource: "site_web" });
    const payload = {
      name: String(fd.get("name") || ""),
      company: String(fd.get("company") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      subject,
      message: [
        baseMessage,
        "",
        `Profil : ${clientType === "pro" ? "Professionnel" : "Particulier"}`,
        city ? `Ville / localisation : ${city}` : "",
        services.length ? `Prestations : ${services.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      formType: inferFormTypeFromSubject(subject),
      consent: true,
      ...attribution,
    };

    setSending(true);
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
      toast.success("Demande envoyée ; nous vous recontactons sous 24 h.");
      setSubmitted(true);
      form.reset();
      setServices([]);
      setClientType("pro");
    } catch {
      toast.error("Impossible d’envoyer la demande.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="cxf-success" role="status">
        <div className="cxf-success__mark" aria-hidden>
          <IconCheck />
        </div>
        <h3>Demande bien reçue</h3>
        <p>
          Merci. Un conseiller NECS vous répond sous{" "}
          <strong>24 heures ouvrées</strong>.
        </p>
        <button
          type="button"
          className="cxf-btn cxf-btn--outline"
          onClick={() => setSubmitted(false)}
        >
          Nouvelle demande
        </button>
      </div>
    );
  }

  return (
    <form className="cxf-form" onSubmit={onSubmit}>
      <header className="cxf-form__head">
        <h2>Demandez votre devis</h2>
        <p>
          Remplissez ce formulaire ; nous construisons une proposition nette,
          adaptée à vos locaux.
        </p>
      </header>

      <div className="cxf-form__grid">
        <div className="cxf-field">
          <label htmlFor={`${formId}-name`}>Nom et prénom *</label>
          <input id={`${formId}-name`} name="name" required autoComplete="name" />
        </div>
        <div className="cxf-field">
          <label htmlFor={`${formId}-phone`}>Téléphone *</label>
          <input
            id={`${formId}-phone`}
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            placeholder="+237 6…"
          />
        </div>
        <div className="cxf-field">
          <label htmlFor={`${formId}-company`}>Entreprise (facultatif)</label>
          <input id={`${formId}-company`} name="company" autoComplete="organization" />
        </div>
        <div className="cxf-field">
          <label htmlFor={`${formId}-email`}>E-mail *</label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={content.contactEmail}
          />
        </div>
      </div>

      <fieldset className="cxf-fieldset">
        <legend>Vous êtes :</legend>
        <div className="cxf-radios">
          <label className={clientType === "pro" ? "is-active" : ""}>
            <input
              type="radio"
              name="clientType"
              checked={clientType === "pro"}
              onChange={() => setClientType("pro")}
            />
            Professionnel
          </label>
          <label className={clientType === "particulier" ? "is-active" : ""}>
            <input
              type="radio"
              name="clientType"
              checked={clientType === "particulier"}
              onChange={() => setClientType("particulier")}
            />
            Particulier
          </label>
        </div>
      </fieldset>

      <fieldset className="cxf-fieldset">
        <legend>Type de prestation :</legend>
        <div className="cxf-checks">
          {SERVICE_OPTIONS.map((opt) => (
            <label key={opt} className={services.includes(opt) ? "is-active" : ""}>
              <input
                type="checkbox"
                checked={services.includes(opt)}
                onChange={() => toggleService(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="cxf-field">
        <label htmlFor={`${formId}-city`}>Ville / Localisation *</label>
        <input
          id={`${formId}-city`}
          name="city"
          required
          placeholder="Douala, Yaoundé…"
        />
      </div>

      <div className="cxf-field">
        <label htmlFor={`${formId}-message`}>Décrivez votre besoin *</label>
        <textarea
          id={`${formId}-message`}
          name="message"
          rows={4}
          required
          placeholder="Surfaces, fréquence, horaires, contraintes d’accès…"
        />
      </div>

      <label className="cxf-consent">
        <input type="checkbox" name="consent" value="1" required />
        <span>
          J’accepte que NECS traite mes données pour répondre à cette demande
          de devis. *
        </span>
      </label>

      <button type="submit" className="cxf-btn cxf-btn--primary" disabled={sending}>
        <IconSend />
        {sending ? "Envoi…" : "Envoyer ma demande"}
        <span className="cxf-btn__arrow" aria-hidden>
          <IconArrow />
        </span>
      </button>
      <p className="cxf-form__lock">
        <IconLock />
        Vos informations restent confidentielles ; consentement requis pour
        l’envoi.
      </p>
    </form>
  );
}

export function ContactExperience({ content }: { content: NecsContent }) {
  const channels = useContactChannels(content);

  return (
    <div className="cxf">
      <section className="cxf-hero" aria-label="Contact NECS">
        <div className="container cxf-hero__grid">
          <div className="cxf-hero__copy">
            <p className="cxf-script cxf-hero__script">
              Un simple contact pour un environnement plus propre !
            </p>
            <div className="cxf-hero__panel">
              <p className="cxf-banner__eyebrow">Contact & devis</p>
              <h1>{content.contactTitle}</h1>
              <p className="cxf-banner__lead">{content.contactLead}</p>
              <ul className="cxf-benefits">
                <li>
                  <span className="cxf-benefits__icon">
                    <IconClock />
                  </span>
                  <span>Réponse sous 24 h ouvrées</span>
                </li>
                <li>
                  <span className="cxf-benefits__icon">
                    <IconDoc />
                  </span>
                  <span>Devis personnalisé</span>
                </li>
                <li>
                  <span className="cxf-benefits__icon">
                    <IconChat />
                  </span>
                  <span>Conseil sans engagement</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="cxf-hero__photo">
            <Image
              src={content.images.about}
              alt="Équipe NECS à votre écoute"
              fill
              sizes="(max-width:900px) 100vw, 46vw"
              unoptimized
              style={{ objectFit: "cover", objectPosition: "center 20%" }}
              priority
            />
            <div className="cxf-hero__photo-glow" aria-hidden />
          </div>
        </div>
      </section>

      <section className="cxf-main" id="contact-form">
        <div className="container cxf-main__grid">
          <ContactFlyerForm content={content} />

          <aside className="cxf-direct">
            <div className="cxf-direct__sticky">
              <h2>Parlons directement !</h2>
              <p className="cxf-direct__lead">
                Un interlocuteur dédié pour un échange rapide et clair.
              </p>

              <div className="cxf-direct__cards">
                {channels.telHref ? (
                  <a className="cxf-direct__card" href={channels.telHref}>
                    <span className="cxf-direct__icon cxf-direct__icon--green">
                      <IconPhone />
                    </span>
                    <div>
                      <strong>Appelez-nous</strong>
                      <span>{channels.displayPhone}</span>
                    </div>
                  </a>
                ) : (
                  <div className="cxf-direct__card cxf-direct__card--muted">
                    <span className="cxf-direct__icon cxf-direct__icon--green">
                      <IconPhone />
                    </span>
                    <div>
                      <strong>Appelez-nous</strong>
                      <span>{channels.displayPhone}</span>
                    </div>
                  </div>
                )}

                {channels.waHref ? (
                  <a
                    className="cxf-direct__card"
                    href={channels.waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="cxf-direct__icon cxf-direct__icon--wa">
                      <IconWa />
                    </span>
                    <div>
                      <strong>WhatsApp</strong>
                      <span>Réponse rapide et personnalisée</span>
                    </div>
                  </a>
                ) : (
                  <div className="cxf-direct__card cxf-direct__card--muted">
                    <span className="cxf-direct__icon cxf-direct__icon--wa">
                      <IconWa />
                    </span>
                    <div>
                      <strong>WhatsApp</strong>
                      <span>Numéro à configurer dans Paramètres</span>
                    </div>
                  </div>
                )}

                {channels.mailHref ? (
                  <a className="cxf-direct__card" href={channels.mailHref}>
                    <span className="cxf-direct__icon cxf-direct__icon--blue">
                      <IconMail />
                    </span>
                    <div>
                      <strong>E-mail</strong>
                      <span>{channels.mail}</span>
                    </div>
                  </a>
                ) : null}

                <div className="cxf-direct__card">
                  <span className="cxf-direct__icon cxf-direct__icon--green">
                    <IconPin />
                  </span>
                  <div>
                    <strong>Zones d’intervention</strong>
                    <span>Yaoundé, Douala et environs</span>
                  </div>
                </div>
              </div>

              <div className="cxf-direct__visual">
                <Image
                  src={content.images.actCommerce}
                  alt="Prestations NECS"
                  fill
                  sizes="360px"
                  unoptimized
                  style={{ objectFit: "cover" }}
                />
                <div className="cxf-badge">
                  <IconHome />
                  Ensemble pour des espaces qui comptent !
                </div>
              </div>
              <p className="cxf-script cxf-script--side">
                Proximité, Réactivité, Satisfaction !
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="cxf-why">
        <div className="container">
          <h2>Pourquoi contacter NECS ?</h2>
          <div className="cxf-why__grid">
            <article>
              <span className="cxf-why__icon cxf-why__icon--green" aria-hidden>
                <IconPeople />
              </span>
              <h3>Une solution sur-mesure</h3>
              <p>Offre adaptée à vos locaux, votre rythme et vos contraintes.</p>
            </article>
            <article>
              <span className="cxf-why__icon cxf-why__icon--orange" aria-hidden>
                <IconGear />
              </span>
              <h3>Des équipes encadrées</h3>
              <p>Agents formés, équipés et supervisés sur le terrain.</p>
            </article>
            <article>
              <span className="cxf-why__icon cxf-why__icon--blue" aria-hidden>
                <IconChart />
              </span>
              <h3>Le suivi de vos prestations</h3>
              <p>Contrôle qualité, reporting digital et photos de mission.</p>
            </article>
            <article>
              <span className="cxf-why__icon cxf-why__icon--green" aria-hidden>
                <IconHandshake />
              </span>
              <h3>Une relation durable</h3>
              <p>Satisfaction durable et espaces accueillants, au long cours.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="cxf-digital">
        <div className="container cxf-digital__grid">
          <div className="cxf-digital__copy">
            <h2>Votre prestation, suivie avec rigueur</h2>
            <p className="cxf-script cxf-script--green">
              Plus qu’un nettoyage, un partenaire de confiance !
            </p>
            <ul>
              <li>Planning</li>
              <li>Checklists</li>
              <li>Contrôle qualité</li>
              <li>Rapports</li>
              <li>Photos</li>
              <li>Traçabilité</li>
            </ul>
          </div>
          <div className="cxf-digital__media reveal reveal-media public-img-wrap">
            <Image
              src={content.images.objectif}
              alt="Pilotage digital NECS"
              fill
              sizes="(max-width:900px) 100vw, 48vw"
              unoptimized
              style={{ objectFit: "cover" }}
            />
          </div>
        </div>
      </section>

      <section className="cxf-values">
        <div className="container cxf-values__inner">
          <p>
            <span>Propreté</span>
            <span aria-hidden>|</span>
            <span>Rigueur</span>
            <span aria-hidden>|</span>
            <span>Confiance</span>
          </p>
          <a className="cxf-btn cxf-btn--orange" href="#contact-form">
            Demander un devis
            <IconArrow />
          </a>
        </div>
      </section>
    </div>
  );
}
