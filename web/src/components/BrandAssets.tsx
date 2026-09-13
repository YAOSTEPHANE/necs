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

  useEffect(() => {
    const sync = () => {
      const s = loadSettings();
      setLogoUrl(s.branding.logoUrl || DEFAULT_LOGO);
      setFaviconUrl(s.branding.faviconUrl || DEFAULT_LOGO);
      setSocial(getActiveSocialLinks(s));
    };
    sync();
    window.addEventListener(NECS_SETTINGS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(NECS_SETTINGS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return { logoUrl, faviconUrl, social };
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
  size = 18,
}: {
  id: SocialNetworkId;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor" as const,
    "aria-hidden": true as const,
  };

  switch (id) {
    case "facebook":
      return (
        <svg {...common}>
          <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v7h3v-7h2.5l.5-3H14V9z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common}>
          <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm10 2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm-5 3.5A3.5 3.5 0 1 1 8.5 12 3.5 3.5 0 0 1 12 8.5zm0 2A1.5 1.5 0 1 0 13.5 12 1.5 1.5 0 0 0 12 10.5zM17.2 7.3a.9.9 0 1 1-.9-.9.9.9 0 0 1 .9.9z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common}>
          <path d="M6.5 9.5H4V20h2.5V9.5zM5.25 4A1.5 1.5 0 1 0 5.26 7a1.5 1.5 0 0 0-.01-3zM20 13.2c0-2.5-1.35-4.1-3.55-4.1a3.2 3.2 0 0 0-2.85 1.55V9.5H11V20h2.6v-5.35c0-1.4.55-2.35 1.8-2.35 1.1 0 1.6.8 1.6 2.35V20H20v-6.8z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path d="M22 12.2s0-3.3-.4-4.8a2.8 2.8 0 0 0-2-2C17.8 5 12 5 12 5s-5.8 0-7.6.4a2.8 2.8 0 0 0-2 2C2 8.9 2 12.2 2 12.2s0 3.3.4 4.8a2.8 2.8 0 0 0 2 2C6.2 19.4 12 19.4 12 19.4s5.8 0 7.6-.4a2.8 2.8 0 0 0 2-2c.4-1.5.4-4.8.4-4.8zM10 15.3V9.1l5.2 3.1L10 15.3z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M16.5 4c.5 1.7 1.7 3 3.5 3.4V10a7.4 7.4 0 0 1-3.5-1v6.1A5.6 5.6 0 1 1 10.8 9.6v2.5a3.1 3.1 0 1 0 2.2 3V4h3.5z" />
        </svg>
      );
    case "x":
      return (
        <svg {...common}>
          <path d="M4 4h4.2l4 5.6L16.8 4H20l-6.2 7.1L20.2 20h-4.2l-4.3-6-5 6H3.3l6.6-7.6L4 4zm3.1 1.7 9.7 12.6h1.5L8.6 5.7H7.1z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3zm0 1.7a7.3 7.3 0 0 1 6.2 11 7.3 7.3 0 0 1-8.4 1.7l-.5-.3-2.8.7.7-2.7-.3-.5A7.3 7.3 0 0 1 12 4.7zm4.1 9.5c-.2-.1-1.2-.6-1.4-.7s-.3-.1-.5.1-.5.7-.7.8-.4.2-.6 0a5.7 5.7 0 0 1-1.7-1 6.4 6.4 0 0 1-1.2-1.5c-.1-.2 0-.4.1-.5l.4-.4.1-.3c0-.1 0-.3-.1-.4s-.5-1.2-.7-1.6-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3a2 2 0 0 0-.6 1.5 3.5 3.5 0 0 0 .7 1.8 8 8 0 0 0 3.1 3 7 7 0 0 0 2 .8 2.4 2.4 0 0 0 1.3-.1 2 2 0 0 0 1.3-1.1 1.6 1.6 0 0 0 .1-1c0-.1-.2-.2-.4-.3z" />
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
              aria-label={s.label}
              title={s.label}
            >
              <SocialIcon id={s.id} size={20} />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
