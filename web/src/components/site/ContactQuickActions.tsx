"use client";

import { useBrandAssets } from "@/components/BrandAssets";

function digitsForWhatsApp(raw: string): string | null {
  const digits = raw.replace(/[Xx×]/g, "").replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits;
}

function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#fff" />
      <circle cx="12" cy="12" r="8.2" fill="#25D366" />
      <path
        fill="#fff"
        d="M12.05 5.8a6.2 6.2 0 0 0-5.35 9.4L5.6 18.2l3.2-.85A6.2 6.2 0 1 0 12.05 5.8zm3.55 8.9c-.14-.07-.82-.4-.95-.45-.13-.05-.22-.07-.31.07s-.36.45-.44.54c-.08.09-.16.1-.3.03a4 4 0 0 1-1.22-.77 4.4 4.4 0 0 1-.86-1.07c-.07-.14 0-.27.06-.35l.24-.3.09-.21a.3.3 0 0 0-.04-.3c-.04-.07-.3-.72-.42-1-.11-.25-.22-.22-.3-.22h-.25c-.09 0-.23.04-.34.16-.12.14-.45.44-.45 1.07s.46 1.23.52 1.32c.06.09.89 1.36 2.16 1.9 1.27.55 1.27.37 1.5.34.23-.03.76-.32.87-.62.11-.3.11-.56.07-.62-.04-.05-.12-.09-.25-.14z"
      />
    </svg>
  );
}

function EmailIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#fff" />
      <rect x="5" y="7.5" width="14" height="9.5" rx="1.8" fill="#0A3A72" />
      <path
        d="M5.6 8.5 12 12.8l6.4-4.3"
        fill="none"
        stroke="#8FD14A"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FormIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#fff" />
      <rect x="6" y="4.5" width="12" height="15" rx="2" fill="#0A3A72" />
      <path d="M14 4.5v4.2h4" fill="#1570B8" />
      <path
        d="M8.5 12h7M8.5 14.8h7M8.5 17.6h4.5"
        stroke="#8FD14A"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16.6" cy="17.4" r="2.4" fill="#E67A18" />
      <path
        d="M16.6 16.2v2.4M15.4 17.4h2.4"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** WhatsApp + e-mail + formulaire sur la page contact. */
export function ContactQuickActions({
  fallbackPhone = "",
  fallbackEmail = "",
  title,
  onFormClick,
  className = "",
}: {
  fallbackPhone?: string;
  fallbackEmail?: string;
  title?: string;
  onFormClick?: () => void;
  className?: string;
}) {
  const { email, whatsapp, phone } = useBrandAssets();
  const waSource = whatsapp || phone || fallbackPhone;
  const waDigits = digitsForWhatsApp(waSource);
  const mail = (email || fallbackEmail).trim();
  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(
        "Bonjour NECS, je souhaite un renseignement.",
      )}`
    : null;
  const mailHref = mail.includes("@") ? `mailto:${mail}` : null;

  return (
    <div className={`contact-quick-actions ${className}`.trim()}>
      {title ? <p className="contact-quick-actions__title">{title}</p> : null}
      <ul className="contact-quick-actions__list">
        <li>
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-quick-actions__btn contact-quick-actions__btn--whatsapp"
              aria-label="WhatsApp"
              title="Écrire sur WhatsApp"
            >
              <WhatsAppIcon />
              <span>WhatsApp</span>
            </a>
          ) : (
            <span
              className="contact-quick-actions__btn contact-quick-actions__btn--whatsapp contact-quick-actions__btn--disabled"
              title="Numéro WhatsApp à configurer dans Paramètres"
              aria-label="WhatsApp (non configuré)"
            >
              <WhatsAppIcon />
              <span>WhatsApp</span>
            </span>
          )}
        </li>
        <li>
          {mailHref ? (
            <a
              href={mailHref}
              className="contact-quick-actions__btn contact-quick-actions__btn--email"
              aria-label="E-mail"
              title={`Écrire à ${mail}`}
            >
              <EmailIcon />
              <span>E-mail</span>
            </a>
          ) : (
            <span
              className="contact-quick-actions__btn contact-quick-actions__btn--email contact-quick-actions__btn--disabled"
              title="E-mail à configurer"
              aria-label="E-mail (non configuré)"
            >
              <EmailIcon />
              <span>E-mail</span>
            </span>
          )}
        </li>
        <li>
          {onFormClick ? (
            <button
              type="button"
              className="contact-quick-actions__btn contact-quick-actions__btn--form"
              aria-label="Formulaire de contact"
              title="Remplir le formulaire de contact"
              onClick={onFormClick}
            >
              <FormIcon />
              <span>Formulaire</span>
            </button>
          ) : (
            <a
              href="/contact#contact-form"
              className="contact-quick-actions__btn contact-quick-actions__btn--form"
              aria-label="Formulaire de contact"
              title="Remplir le formulaire de contact"
            >
              <FormIcon />
              <span>Formulaire</span>
            </a>
          )}
        </li>
      </ul>
    </div>
  );
}
