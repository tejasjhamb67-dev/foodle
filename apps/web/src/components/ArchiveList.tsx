"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { dateForNumber, EDITION_LABEL, EDITIONS, MODE_LABEL, MODES, type Edition, type Mode } from "@foodle/game";
import { LAUNCH_DATE } from "@/lib/config";
import { gameKey, useHydrated, useStore } from "@/lib/store";
import { useToday } from "@/lib/today";

export function ArchiveList() {
  const sp = useSearchParams();
  const router = useRouter();
  const edition = (EDITIONS.find((e) => e === sp.get("edition")) ?? "global") as Edition;
  const mode = (MODES.find((m) => m === sp.get("mode")) ?? "dish") as Mode;
  const today = useToday();
  const hydrated = useHydrated();
  const games = useStore((s) => s.games);
  const go = (e: Edition, m: Mode) => router.replace(`/archive?edition=${e}&mode=${m}`, { scroll: false });

  if (today == null || !hydrated) return null;
  const numbers = Array.from({ length: Math.max(0, today) }, (_, i) => today - i);
  const byMonth = new Map<string, number[]>();
  for (const n of numbers) {
    const d = new Date(dateForNumber(n, LAUNCH_DATE) + "T12:00:00");
    const k = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    byMonth.set(k, [...(byMonth.get(k) ?? []), n]);
  }
  return (
    <>
      <div className="switches">
        <div className="segmented modes" role="tablist" aria-label="Mode">
          {MODES.map((m) => (
            <button key={m} role="tab" aria-selected={m === mode} onClick={() => go(edition, m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="segmented editions" role="tablist" aria-label="Edition">
          {EDITIONS.map((e) => (
            <button key={e} role="tab" aria-selected={e === edition} onClick={() => go(e, mode)}>
              {EDITION_LABEL[e]}
            </button>
          ))}
        </div>
      </div>
      <p className="t-meta" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
        <span><span className="pill correct">Won</span></span>
        <span><span className="pill absent">Lost</span></span>
        <span><span className="pill present">In progress</span></span>
        <span><span className="pill">Unplayed</span></span>
      </p>
      {[...byMonth.entries()].map(([month, ns]) => (
        <section key={month} style={{ marginTop: 20 }}>
          <h2 className="t-headline" style={{ marginBottom: 10 }}>
            {month}
          </h2>
          <div className="archive-grid">
            {ns.map((n) => {
              const g = games[gameKey(edition, mode, n)];
              const cls = !g || !g.rows.length ? "" : !g.finished ? "progress" : g.won ? "won" : "lost";
              const state = !cls ? "unplayed" : cls === "progress" ? "in progress" : cls;
              const href = n === today ? `/${edition}/${mode}` : `/archive/${edition}/${mode}/${n}`;
              return (
                <Link key={n} href={href} className={`archive-cell ${cls}`} aria-label={`No. ${n}, ${state}`}>
                  {n}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {numbers.length === 0 && <p className="muted">Foodle hasn&rsquo;t launched yet.</p>}
    </>
  );
}
