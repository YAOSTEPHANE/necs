"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LOGO,
  NECS_SETTINGS_EVENT,
  loadSettings,
  type SocialLink,
  type SocialNetworkId,
  getActiveSocialLinks,
} from "@/lib/settings";

export function useBrandAssets() {
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [faviconUrl, setFaviconUrl] = useState(DEFAULT_LOGO);
  const [social, setSocial] = useState<SocialLink[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    const sync = () => {
      const s = loadSettings();
      setLogoUrl(s.branding.logoUrl || DEFAULT_LOGO);
      setFaviconUrl(s.branding.faviconUrl || DEFAULT_LOGO);
      setSocial(getActiveSocialLinks(s));
      setPhone(s.company.phone || "");
      setEmail(s.company.email || "");
      setWhatsapp(s.company.whatsapp || s.company.phone || "");
    };
    sync();
    window.addEventListener(NECS_SETTINGS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(NECS_SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { logoUrl, faviconUrl, social, phone, email, whatsapp };
}

/** Met à jour le favicon de l’onglet navigateur. */
export function BrandFavicon() {
  const { faviconUrl } = useBrandAssets();

  useEffect(() => {
    if (!faviconUrl) return;

    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.type = faviconUrl.startsWith("data:image/png")
      ? "image/png"
      : faviconUrl.startsWith("data:image/webp")
        ? "image/webp"
        : faviconUrl.startsWith("data:image/svg")
          ? "image/svg+xml"
          : "image/jpeg";
    link.href = faviconUrl;

    let apple = document.querySelector<HTMLLinkElement>(
      "link[rel='apple-touch-icon']",
    );
    if (!apple) {
      apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      document.head.appendChild(apple);
    }
    apple.href = faviconUrl;
  }, [faviconUrl]);

  return null;
}

export function BrandLogo({
  alt = "NECS",
  width,
  height,
  className,
}: {
  alt?: string;
  width: number;
  height: number;
  className?: string;
}) {
  const { logoUrl } = useBrandAssets();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={alt}
      width={width}
      height={height}
      className={["brand-logo", className].filter(Boolean).join(" ")}
      style={{
        objectFit: "contain",
        width,
        height,
        background: "transparent",
      }}
    />
  );
}

function SocialIcon({
  id,
  size = 40,
}: {
  id: SocialNetworkId;
  size?: number;
}) {
  const gid = `social-${id}`;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    className: "footer-social__icon",
  };

  switch (id) {
    case "facebook":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="12" fill="#1877F2" />
          <path
            fill="#fff"
            d="M13.35 22.5v-7.85h2.64l.4-3.1h-3.04V9.55c0-.9.25-1.51 1.54-1.51h1.64V5.26A21.9 21.9 0 0 0 13.7 5c-2.5 0-4.21 1.53-4.21 4.33v2.42H6.75v3.1h2.74V22.5h3.86z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={`${gid}-bg`} cx="30%" cy="107%" r="150%">
              <stop offset="0%" stopColor="#fdf497" />
              <stop offset="45%" stopColor="#fd5949" />
              <stop offset="60%" stopColor="#d6249f" />
              <stop offset="90%" stopColor="#285AEB" />
            </radialGradient>
          </defs>
          <circle cx="12" cy="12" r="12" fill={`url(#${gid}-bg)`} />
          <rect
            x="6.2"
            y="6.2"
            width="11.6"
            height="11.6"
            rx="3.4"
            fill="none"
            stroke="#fff"
            strokeWidth="1.55"
          />
          <circle
            cx="12"
            cy="12"
            r="2.85"
            fill="none"
            stroke="#fff"
            strokeWidth="1.55"
          />
          <circle cx="16.15" cy="7.95" r="0.95" fill="#fff" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="12" fill="#0A66C2" />
          <path
            fill="#fff"
            d="M8.35 9.85H5.9V18.1h2.45V9.85zM7.12 5.4a1.42 1.42 0 1 0 0 2.84 1.42 1.42 0 0 0 0-2.84zM18.1 12.7c0-2.35-1.25-3.86-3.35-3.86a2.95 2.95 0 0 0-2.65 1.45v-1.24H9.7c.03.55 0 8.05 0 8.05h2.4v-4.5c0-1.2.55-1.95 1.6-1.95.95 0 1.45.7 1.45 1.95v4.5H18.1v-5.4z"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="12" fill="#FF0000" />
          <path
            fill="#fff"
            d="M9.4 8.35c0-.4.35-.55.7-.35l6.05 3.5c.35.2.35.5 0 .7l-6.05 3.5c-.35.2-.7.05-.7-.35V8.35z"
          />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="12" fill="#010101" />
          <g transform="translate(1.2 1.1) scale(0.9)">
            <path
              fill="#25F4EE"
              d="M16.6 5.2c.35 1.35 1.25 2.45 2.55 2.95v2.05a5.9 5.9 0 0 1-2.55-.7v5.35a4.85 4.85 0 1 1-4.85-4.85c.2 0 .4.02.6.05v2.2a2.7 2.7 0 1 0 1.9 2.55V4.5h2.35z"
              transform="translate(0.45 0.45)"
            />
            <path
              fill="#FE2C55"
              d="M16.6 5.2c.35 1.35 1.25 2.45 2.55 2.95v2.05a5.9 5.9 0 0 1-2.55-.7v5.35a4.85 4.85 0 1 1-4.85-4.85c.2 0 .4.02.6.05v2.2a2.7 2.7 0 1 0 1.9 2.55V4.5h2.35z"
              transform="translate(-0.45 -0.45)"
            />
            <path
              fill="#fff"
              d="M16.6 5.2c.35 1.35 1.25 2.45 2.55 2.95v2.05a5.9 5.9 0 0 1-2.55-.7v5.35a4.85 4.85 0 1 1-4.85-4.85c.2 0 .4.02.6.05v2.2a2.7 2.7 0 1 0 1.9 2.55V4.5h2.35z"
            />
          </g>
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="12" fill="#000" />
          <path
            fill="#fff"
            d="M16.6 6.2h1.9L13.9 11.3 19 17.8h-4.1l-3.2-4.2-3.7 4.2H6.1l4.8-5.5L6 6.2h4.2l2.9 3.9 3.5-3.9zm-.7 10.5h1.05L8.2 7.25H7.05L15.9 16.7z"
          />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="12" fill="#25D366" />
          <path
            fill="#fff"
            fillRule="evenodd"
            d="M12 4.6A7.35 7.35 0 0 0 5.7 15.55L4.85 19.1l3.65-.95A7.35 7.35 0 1 0 12 4.6zm0 1.35a6 6 0 0 1 5.1 9.05 6 6 0 0 1-6.9 1.4l-.4-.22-2.3.6.58-2.25-.24-.42A6 6 0 0 1 12 5.95zm3.35 7.85c-.15-.08-.9-.45-1.04-.5-.14-.05-.24-.08-.34.08s-.39.5-.48.6c-.09.1-.18.11-.33.04a4.7 4.7 0 0 1-1.4-.86 5.2 5.2 0 0 1-.98-1.22c-.09-.16 0-.31.07-.4l.28-.34.1-.24a.35.35 0 0 0-.05-.34c-.05-.08-.34-.82-.47-1.12-.12-.3-.25-.25-.34-.25h-.28c-.1 0-.26.04-.4.19-.13.15-.51.5-.51 1.22s.52 1.41.6 1.51c.07.1 1.02 1.56 2.48 2.19 1.46.63 1.46.42 1.72.4.26-.03.87-.36 1-.7.12-.35.12-.65.08-.71-.04-.06-.13-.1-.28-.17z"
          />
        </svg>
      );
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function SocialLinks({
  className = "footer-social",
  title,
}: {
  className?: string;
  title?: string;
}) {
  const { social } = useBrandAssets();
  if (social.length === 0) return null;

  return (
    <div className="footer-social-block">
      {title ? <h4>{title}</h4> : null}
      <ul className={className}>
        {social.map((s) => (
          <li key={s.id}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`footer-social__link footer-social__link--${s.id}`}
              aria-label={`${s.label} (nouvel onglet)`}
              title={s.label}
            >
              <SocialIcon id={s.id} size={44} />
              <span className="footer-social__tip" aria-hidden>
                {s.label}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
