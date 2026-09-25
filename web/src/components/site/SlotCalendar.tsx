"use client";

import { useMemo, useState } from "react";
import {
  BOOKING_TIMEZONE,
  groupSlotsByDate,
  listAvailableSlots,
  type BookingSlot,
} from "@/lib/booking-slots";

export type SlotSelection = {
  at: string;
  label: string;
} | null;

type SlotCalendarProps = {
  value: SlotSelection;
  onChange: (next: SlotSelection) => void;
  idPrefix?: string;
  /** Affichage compact (modal). */
  compact?: boolean;
};

const DAYS_PER_PAGE = 5;

export function SlotCalendar({
  value,
  onChange,
  idPrefix = "slot",
  compact = false,
}: SlotCalendarProps) {
  const allSlots = useMemo(() => listAvailableSlots(), []);
  const days = useMemo(() => groupSlotsByDate(allSlots), [allSlots]);

  const initialDateKey = useMemo(() => {
    if (value?.at) {
      return (
        allSlots.find((s) => s.at === value.at)?.dateKey ??
        days[0]?.dateKey ??
        ""
      );
    }
    return days[0]?.dateKey ?? "";
  }, [value?.at, allSlots, days]);

  const [dateKey, setDateKey] = useState(initialDateKey);
  const [page, setPage] = useState(() => {
    const idx = days.findIndex((d) => d.dateKey === initialDateKey);
    return idx >= 0 ? Math.floor(idx / DAYS_PER_PAGE) : 0;
  });

  const pageCount = Math.max(1, Math.ceil(days.length / DAYS_PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const visibleDays = days.slice(
    safePage * DAYS_PER_PAGE,
    safePage * DAYS_PER_PAGE + DAYS_PER_PAGE,
  );

  const selectedDay =
    days.find((d) => d.dateKey === dateKey) ?? days[0] ?? null;
  const daySlots = selectedDay?.slots ?? [];

  function pickDay(key: string) {
    setDateKey(key);
    const day = days.find((d) => d.dateKey === key);
    if (!day) return;
    const stillValid = day.slots.some((s) => s.at === value?.at);
    if (!stillValid) onChange(null);
  }

  function pickSlot(slot: BookingSlot) {
    onChange({ at: slot.at, label: slot.label });
  }

  function goPage(next: number) {
    const clamped = Math.max(0, Math.min(pageCount - 1, next));
    setPage(clamped);
    const first = days[clamped * DAYS_PER_PAGE];
    if (first) {
      setDateKey(first.dateKey);
      const stillValid = first.slots.some((s) => s.at === value?.at);
      if (!stillValid) onChange(null);
    }
  }

  if (!days.length) {
    return (
      <div className={`slot-cal${compact ? " slot-cal--compact" : ""}`}>
        <p className="slot-cal__empty">
          Aucun créneau disponible pour le moment. Laissez votre message — nous
          vous rappelons.
        </p>
      </div>
    );
  }

  const weekLabel =
    visibleDays.length > 1
      ? `${visibleDays[0]?.dayShort ?? ""} → ${visibleDays[visibleDays.length - 1]?.dayShort ?? ""}`
      : (visibleDays[0]?.dayShort ?? "");

  return (
    <div
      className={`slot-cal${compact ? " slot-cal--compact" : ""}`}
      role="group"
      aria-labelledby={`${idPrefix}-title`}
    >
      <div className="slot-cal__head">
        <div>
          <p className="slot-cal__kicker">Agenda NECS</p>
          <h3 id={`${idPrefix}-title`}>Choisissez un créneau</h3>
          <p className="slot-cal__hint">
            Visite technique ou rappel · lun–ven ·{" "}
            {BOOKING_TIMEZONE.replace("_", "/")}
          </p>
        </div>
        {value ? (
          <button
            type="button"
            className="slot-cal__clear"
            onClick={() => onChange(null)}
          >
            Effacer
          </button>
        ) : null}
      </div>

      <div className="slot-cal__week-nav">
        <button
          type="button"
          className="slot-cal__week-btn"
          aria-label="Semaine précédente"
          disabled={safePage <= 0}
          onClick={() => goPage(safePage - 1)}
        >
          ‹
        </button>
        <p className="slot-cal__week-label">{weekLabel}</p>
        <button
          type="button"
          className="slot-cal__week-btn"
          aria-label="Semaine suivante"
          disabled={safePage >= pageCount - 1}
          onClick={() => goPage(safePage + 1)}
        >
          ›
        </button>
      </div>

      <div className="slot-cal__days" role="listbox" aria-label="Jours disponibles">
        {visibleDays.map((day) => {
          const active = day.dateKey === (selectedDay?.dateKey ?? "");
          return (
            <button
              key={day.dateKey}
              type="button"
              role="option"
              aria-selected={active}
              className={`slot-cal__day${active ? " is-active" : ""}`}
              onClick={() => pickDay(day.dateKey)}
            >
              <span className="slot-cal__day-short">{day.dayShort}</span>
              <span className="slot-cal__day-count">
                {day.slots.length} crén.
              </span>
            </button>
          );
        })}
      </div>

      {selectedDay ? (
        <p className="slot-cal__day-label">{selectedDay.dayLong}</p>
      ) : null}

      <div className="slot-cal__times" role="listbox" aria-label="Horaires">
        {daySlots.map((slot) => {
          const active = value?.at === slot.at;
          return (
            <button
              key={slot.at}
              type="button"
              role="option"
              aria-selected={active}
              className={`slot-cal__time${active ? " is-active" : ""}`}
              onClick={() => pickSlot(slot)}
            >
              {slot.timeLabel.replace(":", "h")}
            </button>
          );
        })}
      </div>

      {value ? (
        <p className="slot-cal__selected" role="status">
          Créneau retenu : <strong>{value.label}</strong>
        </p>
      ) : (
        <p className="slot-cal__optional">
          Facultatif — sans créneau, rappel sous 24 h.
        </p>
      )}
    </div>
  );
}
