"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { EDITION_LABEL, EDITIONS } from "@foodle/game";
import { api } from "@/lib/api";
import { SOCIAL_ENABLED } from "@/lib/config";
import { useStore, type Settings } from "@/lib/store";
import { supabase, useSession } from "@/lib/supabase";
import { useUi } from "@/lib/ui";

function Toggle({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="toggle-row">
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        {sub && <div className="t-meta">{sub}</div>}
      </div>
      <button className="switch" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} />
    </div>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="toggle-row">
      <div style={{ fontWeight: 600 }}>{label}</div>
      <div className="segmented" role="radiogroup" aria-label={label} style={{ minWidth: 220 }}>
        {options.map(([v, l]) => (
          <button key={v} role="radio" aria-checked={v === value} aria-selected={v === value} onClick={() => onChange(v)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Account() {
  const { session, ready } = useSession();
  const toast = useUi((s) => s.toast);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState("");
  useEffect(() => {
    if (!session) return;
    api.get<{ display_name: string }>("/api/me").then((p) => {
      setName(p.display_name);
      setSaved(p.display_name);
    });
  }, [session]);
  if (!SOCIAL_ENABLED) {
    return <p className="t-meta">Accounts aren&rsquo;t switched on for this site yet. Your games are saved on this device.</p>;
  }
  if (!ready) return null;
  if (!session) {
    return (
      <div className="toggle-row">
        <div>
          <div style={{ fontWeight: 600 }}>Save your streak</div>
          <div className="t-meta">Sign in to keep it on every device. Playing never needs an account.</div>
        </div>
        <Link className="btn secondary sm" href="/signin">
          Sign in
        </Link>
      </div>
    );
  }
  return (
    <>
      <form
        className="field"
        style={{ marginTop: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const p = await api.patch<{ display_name: string }>("/api/me", { display_name: name });
            setSaved(p.display_name);
            toast("Name saved");
          } catch (err) {
            toast((err as Error).message);
          }
        }}
      >
        <label htmlFor="dn" style={{ fontWeight: 600 }}>
          Display name
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="dn" className="text-input" style={{ flex: 1 }} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} />
          <button className="btn primary sm" disabled={name === saved || name.trim().length < 2}>
            Save
          </button>
        </div>
        <span className="t-meta">Signed in as {session.user.email}</span>
      </form>
      <button className="btn secondary sm" onClick={async () => (await supabase())?.auth.signOut()}>
        Sign out
      </button>
    </>
  );
}

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const set = (p: Partial<Settings>) => useStore.getState().setSettings(p);
  return (
    <main id="main" className="page">
      <div className="content">
        <h1 className="t-title">Settings</h1>
        <Choice
          label="Theme"
          value={settings.theme}
          options={[
            ["system", "System"],
            ["light", "Light"],
            ["dark", "Dark"],
          ]}
          onChange={(theme) => set({ theme })}
        />
        <Toggle
          label="High contrast"
          sub="Orange and blue instead of green and yellow"
          checked={settings.highContrast}
          onChange={(highContrast) => set({ highContrast })}
        />
        <Choice
          label="Motion"
          value={settings.motion}
          options={[
            ["system", "System"],
            ["reduced", "Reduced"],
            ["full", "Full"],
          ]}
          onChange={(motion) => set({ motion })}
        />
        <Choice
          label="Default edition"
          value={settings.defaultEdition}
          options={EDITIONS.map((e) => [e, EDITION_LABEL[e]] as [typeof e, string])}
          onChange={(defaultEdition) => set({ defaultEdition })}
        />
        <h2 className="t-headline" style={{ marginTop: 28 }}>
          Account
        </h2>
        <Account />
        <h2 className="t-headline" style={{ marginTop: 28 }}>
          About
        </h2>
        <p className="t-meta">
          Content is a draft awaiting an editorial check. Country data: mledoze/countries (ODbL 1.0). Icons: Lucide (ISC). Fonts: Inter
          and Lora (SIL OFL).
        </p>
      </div>
    </main>
  );
}
