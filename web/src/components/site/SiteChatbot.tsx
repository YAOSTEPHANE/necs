"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  CHAT_TOPIC_RAIL,
  createUserMessage,
  formatChatTime,
  matchChatIntent,
  replyDelayMs,
  welcomeMessage,
  type ChatMessage,
  type ChatQuickAction,
} from "@/lib/site-chatbot";

const OPEN_KEY = "necs_chat_open";
const SEEN_KEY = "necs_chat_seen";

function ChatIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75v7.5a2.25 2.25 0 0 1-2.25 2.25H9l-3.75 3v-3H6.75A2.25 2.25 0 0 1 4.5 14.25v-7.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M8.25 9.75h7.5M8.25 12.75h5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 12h11.5M12.5 6.5 18.5 12l-6 5.5"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ActionButtons({
  actions,
  onAction,
}: {
  actions: ChatQuickAction[];
  onAction: (action: ChatQuickAction) => void;
}) {
  return (
    <div className="site-chat__actions">
      {actions.map((action) => {
        const key = `${action.type}-${action.label}`;
        if (action.type === "link") {
          return (
            <Link key={key} href={action.href} className="site-chat__chip">
              {action.label}
            </Link>
          );
        }
        if (action.type === "tel" || action.type === "email") {
          return (
            <a key={key} href={action.href} className="site-chat__chip">
              {action.label}
            </a>
          );
        }
        const primary = action.type === "quote";
        return (
          <button
            key={key}
            type="button"
            className={`site-chat__chip${primary ? " site-chat__chip--primary" : ""}`}
            onClick={() => onAction(action)}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

type SiteChatbotProps = {
  onQuoteRequest?: (subject?: string) => void;
};

export function SiteChatbot({ onQuoteRequest }: SiteChatbotProps) {
  const titleId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    welcomeMessage(),
  ]);
  const [cookieUp, setCookieUp] = useState(false);
  const [attention, setAttention] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(OPEN_KEY) === "1") setOpen(true);
      if (sessionStorage.getItem(SEEN_KEY) !== "1") setAttention(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const syncCookie = () => {
      setCookieUp(
        Boolean(
          document.querySelector(".cookie-banner") ||
            document.querySelector(".cookie-panel"),
        ),
      );
    };
    syncCookie();
    const mo = new MutationObserver(syncCookie);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(OPEN_KEY, open ? "1" : "0");
      if (open) {
        sessionStorage.setItem(SEEN_KEY, "1");
        setAttention(false);
      }
    } catch {
      /* ignore */
    }
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  const pushBot = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: `b-${Date.now()}-${prev.length}`, at: Date.now() },
    ]);
  }, []);

  const handleUserText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setBusy(true);
      setMessages((prev) => [...prev, createUserMessage(trimmed)]);
      setInput("");
      const reply = matchChatIntent(trimmed);
      window.setTimeout(() => {
        pushBot(reply);
        setBusy(false);
      }, replyDelayMs(reply.text));
    },
    [busy, pushBot],
  );

  const onAction = (action: ChatQuickAction) => {
    if (action.type === "reply") {
      handleUserText(action.text);
      return;
    }
    if (action.type === "quote") {
      onQuoteRequest?.(action.subject ?? "Devis via chatbot");
      setOpen(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleUserText(input);
  };

  const showRail = messages.length <= 1 && !busy;

  if (!mounted) {
    return (
      <div className={`site-chat${cookieUp ? " is-cookie-up" : ""}`}>
        <button
          type="button"
          className="site-chat__launcher"
          aria-expanded={false}
          aria-label="Ouvrir l’assistant NECS"
          onClick={() => setOpen(true)}
        >
          <ChatIcon size={22} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`site-chat${open ? " is-open" : ""}${cookieUp ? " is-cookie-up" : ""}${attention && !open ? " is-attention" : ""}`}
    >
      {open ? (
        <section
          className="site-chat__panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <header className="site-chat__head">
            <div className="site-chat__identity">
              <span className="site-chat__avatar" aria-hidden>
                <span className="site-chat__avatar-mark">N</span>
              </span>
              <div className="site-chat__titles">
                <p className="site-chat__kicker">NECS Cameroun</p>
                <h2 id={titleId}>Assistant concierge</h2>
                <p className="site-chat__status">
                  <i className="site-chat__live" aria-hidden />
                  En ligne · Yaoundé & Douala
                </p>
              </div>
            </div>
            <button
              type="button"
              className="site-chat__icon-btn"
              aria-label="Fermer le chat"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </header>

          {showRail ? (
            <div className="site-chat__rail" aria-label="Sujets rapides">
              {CHAT_TOPIC_RAIL.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className="site-chat__rail-chip"
                  onClick={() => onAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="site-chat__messages" ref={listRef}>
            {messages.map((msg, index) => {
              const time = formatChatTime(msg.at);
              return (
                <div
                  key={msg.id}
                  className={`site-chat__row site-chat__row--${msg.role}`}
                  style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
                >
                  {msg.role === "bot" ? (
                    <span className="site-chat__mini-avatar" aria-hidden>
                      N
                    </span>
                  ) : null}
                  <div
                    className={`site-chat__bubble site-chat__bubble--${msg.role}`}
                  >
                    <p className="site-chat__text">{msg.text}</p>
                    {msg.role === "bot" && msg.actions?.length ? (
                      <ActionButtons actions={msg.actions} onAction={onAction} />
                    ) : null}
                    {time ? (
                      <time className="site-chat__time" dateTime={new Date(msg.at).toISOString()}>
                        {time}
                      </time>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {busy ? (
              <div className="site-chat__row site-chat__row--bot">
                <span className="site-chat__mini-avatar" aria-hidden>
                  N
                </span>
                <div
                  className="site-chat__bubble site-chat__bubble--bot site-chat__bubble--typing"
                  aria-label="L’assistant écrit"
                >
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            ) : null}
          </div>

          <form className="site-chat__form" onSubmit={onSubmit}>
            <label className="site-chat__sr" htmlFor="site-chat-input">
              Votre message
            </label>
            <div className="site-chat__composer">
              <input
                ref={inputRef}
                id="site-chat-input"
                type="text"
                className="site-chat__input"
                placeholder="Votre question…"
                value={input}
                maxLength={400}
                autoComplete="off"
                onChange={(e) => setInput(e.target.value)}
              />
              <button
                type="submit"
                className="site-chat__send"
                disabled={busy || !input.trim()}
                aria-label="Envoyer"
              >
                <SendIcon />
              </button>
            </div>
            <p className="site-chat__trust">
              Réponses locales · Devis sous 24 h · {SITE_PHONE_HINT}
            </p>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        className="site-chat__launcher"
        aria-expanded={open}
        aria-label={open ? "Fermer l’assistant NECS" : "Ouvrir l’assistant NECS"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="site-chat__launcher-ring" aria-hidden />
        {open ? <CloseIcon size={22} /> : <ChatIcon size={22} />}
      </button>
    </div>
  );
}

const SITE_PHONE_HINT = "Yaoundé & Douala";
