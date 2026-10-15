"use client";
import Link from "next/link";
import { EDITION_LABEL, EDITIONS, MODE_LABEL, MODES, type Edition, type Mode } from "@foodle/game";

export function ModeSwitch({ edition, mode, base = "" }: { edition: Edition; mode: Mode; base?: string }) {
  return (
    <div className="switches">
      <nav className="segmented modes" aria-label="Mode">
        {MODES.map((m) => (
          <Link key={m} href={`${base}/${edition}/${m}`} aria-current={m === mode ? "page" : undefined} scroll={false}>
            {MODE_LABEL[m]}
          </Link>
        ))}
      </nav>
      <nav className="segmented editions" aria-label="Edition">
        {EDITIONS.map((e) => (
          <Link key={e} href={`${base}/${e}/${mode}`} aria-current={e === edition ? "page" : undefined} scroll={false}>
            {EDITION_LABEL[e]}
          </Link>
        ))}
      </nav>
    </div>
  );
}
