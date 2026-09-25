/** Créneaux de rendez-vous / rappel commercial — fuseau Africa/Douala. */

export const BOOKING_TIMEZONE = "Africa/Douala";

/** Heures de créneaux (visite technique ou rappel). */
export const BOOKING_HOURS = [9, 10, 11, 14, 15, 16] as const;

/** Nombre de jours ouvrés proposés à l’avance. */
export const BOOKING_HORIZON_DAYS = 21;

export type BookingSlot = {
  /** ISO UTC du début de créneau. */
  at: string;
  /** Clé jour YYYY-MM-DD (calendrier Douala). */
  dateKey: string;
  /** Heure locale "09:00". */
  timeLabel: string;
  /** Libellé affiché "lun. 28 avr. · 09h00". */
  label: string;
  /** Jour affiché court "lun. 28". */
  dayShort: string;
  /** Jour affiché long "lundi 28 avril". */
  dayLong: string;
};

function doualaParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: BOOKING_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  const weekdayMap: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 0,
  };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

/** Instant UTC correspondant à une date/heure locale Douala. */
export function doualaLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  // Africa/Douala = UTC+1 toute l’année (pas d’heure d’été).
  const utcMs = Date.UTC(year, month - 1, day, hour - 1, minute, 0, 0);
  return new Date(utcMs);
}

export function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatSlotLabel(at: Date): {
  label: string;
  dayShort: string;
  dayLong: string;
  timeLabel: string;
} {
  const dayLong = new Intl.DateTimeFormat("fr-CM", {
    timeZone: BOOKING_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(at);
  const dayShort = new Intl.DateTimeFormat("fr-CM", {
    timeZone: BOOKING_TIMEZONE,
    weekday: "short",
    day: "numeric",
  }).format(at);
  const timeLabel = new Intl.DateTimeFormat("fr-CM", {
    timeZone: BOOKING_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
  const timeNice = timeLabel.replace(":", "h");
  return {
    dayLong,
    dayShort,
    timeLabel,
    label: `${dayLong} · ${timeNice}`,
  };
}

export function isWeekdayDouala(date: Date): boolean {
  const { weekday } = doualaParts(date);
  return weekday >= 1 && weekday <= 5;
}

/** Génère les créneaux disponibles à partir de maintenant. */
export function listAvailableSlots(now = new Date()): BookingSlot[] {
  const slots: BookingSlot[] = [];
  const start = doualaParts(now);

  for (let offset = 0; offset < BOOKING_HORIZON_DAYS + 14; offset++) {
    const probe = doualaLocalToUtc(
      start.year,
      start.month,
      start.day + offset,
      12,
      0,
    );
    const p = doualaParts(probe);
    if (p.weekday < 1 || p.weekday > 5) continue;

    for (const hour of BOOKING_HOURS) {
      const at = doualaLocalToUtc(p.year, p.month, p.day, hour, 0);
      if (at.getTime() <= now.getTime() + 60 * 60 * 1000) continue;
      const meta = formatSlotLabel(at);
      slots.push({
        at: at.toISOString(),
        dateKey: formatDateKey(p.year, p.month, p.day),
        timeLabel: meta.timeLabel,
        label: meta.label,
        dayShort: meta.dayShort,
        dayLong: meta.dayLong,
      });
    }

    const uniqueDays = new Set(slots.map((s) => s.dateKey));
    if (uniqueDays.size >= BOOKING_HORIZON_DAYS) break;
  }

  return slots;
}

export function groupSlotsByDate(slots: BookingSlot[]): Array<{
  dateKey: string;
  dayShort: string;
  dayLong: string;
  slots: BookingSlot[];
}> {
  const map = new Map<
    string,
    { dateKey: string; dayShort: string; dayLong: string; slots: BookingSlot[] }
  >();
  for (const slot of slots) {
    const existing = map.get(slot.dateKey);
    if (existing) {
      existing.slots.push(slot);
    } else {
      map.set(slot.dateKey, {
        dateKey: slot.dateKey,
        dayShort: slot.dayShort,
        dayLong: slot.dayLong,
        slots: [slot],
      });
    }
  }
  return [...map.values()];
}

export function findSlotByAt(
  at: string | null | undefined,
  slots = listAvailableSlots(),
): BookingSlot | null {
  if (!at) return null;
  return slots.find((s) => s.at === at) ?? null;
}

export function parsePreferredSlot(raw: unknown): {
  preferredSlotAt: string;
  preferredSlotLabel: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { at?: unknown; label?: unknown };
  const at = String(obj.at || "").trim();
  const label = String(obj.label || "").trim();
  if (!at || Number.isNaN(Date.parse(at))) return null;
  return {
    preferredSlotAt: at.slice(0, 40),
    preferredSlotLabel: (label || at).slice(0, 120),
  };
}
