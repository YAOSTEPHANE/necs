"use client";

import { useEffect, useRef, useState } from "react";

function parseStat(raw: string): { target: number; suffix: string } {
  const match = raw.trim().match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (!match) return { target: 0, suffix: raw };
  const num = Number(match[1].replace(",", "."));
  return {
    target: Number.isFinite(num) ? num : 0,
    suffix: match[2] ?? "",
  };
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function CountUpStat({
  value,
  label,
  durationMs = 1600,
}: {
  value: string;
  label: string;
  durationMs?: number;
}) {
  const { target, suffix } = parseStat(value);
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;

    if (reducedMotion.current) {
      setDisplay(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(Math.round(easeOutCubic(t) * target));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [started, target, durationMs]);

  return (
    <div className="stat" ref={ref}>
      <strong>
        {display}
        {suffix}
      </strong>
      <span>{label}</span>
    </div>
  );
}
