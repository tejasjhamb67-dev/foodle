"use client";
import { useEffect, useState } from "react";
import { formatCountdown, msUntilLocalMidnight } from "@foodle/game";

export function Countdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    setMs(msUntilLocalMidnight());
    const t = setInterval(() => setMs(msUntilLocalMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="countdown t-meta" aria-live="off">
      Next Foodle in <strong style={{ color: "var(--color-text)" }}>{ms == null ? "--:--:--" : formatCountdown(ms)}</strong>
    </p>
  );
}
