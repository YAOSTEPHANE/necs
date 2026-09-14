export type ToastTone = "info" | "ok" | "warn" | "danger";

export type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
  duration: number;
};

type Listener = (items: ToastItem[]) => void;

let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) {
    listener([...items]);
  }
}

function push(message: string, tone: ToastTone, duration: number) {
  if (typeof window === "undefined") return;
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  items = [...items, { id, message, tone, duration }];
  emit();
  window.setTimeout(() => dismissToast(id), duration);
}

export function dismissToast(id: string) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener) {
  listeners.add(listener);
  listener([...items]);
  return () => {
    listeners.delete(listener);
  };
}

export const toast = {
  show(message: string, opts?: { tone?: ToastTone; duration?: number }) {
    push(message, opts?.tone ?? "info", opts?.duration ?? 4000);
  },
  success(message: string, duration = 3500) {
    push(message, "ok", duration);
  },
  error(message: string, duration = 5200) {
    push(message, "danger", duration);
  },
  warning(message: string, duration = 4500) {
    push(message, "warn", duration);
  },
  info(message: string, duration = 4000) {
    push(message, "info", duration);
  },
};
