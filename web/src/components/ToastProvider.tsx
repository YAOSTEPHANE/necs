"use client";

import { useEffect, useState } from "react";
import {
  dismissToast,
  subscribeToasts,
  type ToastItem,
  type ToastTone,
} from "@/lib/toast";

const TONE_LABEL: Record<ToastTone, string> = {
  info: "Information",
  ok: "Succès",
  warn: "Attention",
  danger: "Erreur",
};

export function ToastProvider() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div
      className="necs-toast-viewport"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={`necs-toast necs-toast--${item.tone}`}
          role="status"
        >
          <span className="necs-toast__label">{TONE_LABEL[item.tone]}</span>
          <p className="necs-toast__message">{item.message}</p>
          <button
            type="button"
            className="necs-toast__close"
            aria-label="Fermer la notification"
            onClick={() => dismissToast(item.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
