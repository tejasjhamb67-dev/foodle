"use client";
import { useStore, useHydrated } from "@/lib/store";
import { useToday } from "@/lib/today";
import { StatsView } from "../StatsView";

export function StatsPage() {
  const today = useToday();
  const hydrated = useHydrated();
  const last = useStore((s) => s.last);
  const edition = useStore((s) => s.settings.defaultEdition);
  return (
    <main id="main" className="page">
      <div className="content">
        <h1 className="t-title">Statistics</h1>
        {today != null && hydrated && <StatsView edition={last?.edition ?? edition} mode={last?.mode ?? "dish"} today={today} />}
      </div>
    </main>
  );
}
