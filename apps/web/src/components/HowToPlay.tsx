"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { track } from "@/lib/analytics";

function Legend() {
  const items = [
    ["correct", "✓", "Green", "Exact match with the answer"],
    ["present", "~", "Yellow", "Close: same continent, zone or family, or some ingredients shared"],
    ["absent", "×", "Grey", "No match"],
  ] as const;
  return (
    <div style={{ display: "grid", gap: 10, margin: "12px 0" }}>
      {items.map(([s, g, name, text]) => (
        <div key={s} style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 12, alignItems: "center" }}>
          <div className={`tile ${s}`}>
            <span className="glyph">{g}</span>
            {name}
          </div>
          <span style={{ fontSize: 14 }}>{text}</span>
        </div>
      ))}
    </div>
  );
}

function ClueDemo() {
  const clues = ["garlic", "ginger", "cream"];
  return (
    <div className="chips" style={{ margin: "12px 0" }}>
      {clues.map((c, i) => (
        <span key={c} className="chip new" style={{ ["--chip-delay" as string]: `${i * 350}ms` }}>
          <span className="n">{i + 1}</span>
          {c}
        </span>
      ))}
      {[4, 5, 6, 7].map((n) => (
        <span key={n} className="chip locked">
          <span className="n">{n}</span>
        </span>
      ))}
    </div>
  );
}

/** Help content. With `onboarding`, it shows as three cards (spec 5.2 / 10.1). */
export function HowToPlay({ onboarding, onDone }: { onboarding?: boolean; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const setSettings = useStore((s) => s.setSettings);
  const setOnboarded = useStore((s) => s.setOnboarded);
  const router = useRouter();

  const finish = (edition?: "global" | "india", skipped = false) => {
    setOnboarded();
    track("onboarding_step", { step: step + 1, skipped });
    if (edition) {
      setSettings({ defaultEdition: edition });
      router.push(`/${edition}/dish`);
    }
    onDone();
  };

  if (!onboarding) {
    return (
      <div>
        <p className="t-headline">Guess the dish in six tries</p>
        <p>
          Every day there is one hidden dish, one drink and one cuisine, in a Global and an India edition. Pick your guess from
          the list. Each tile tells you how close you were:
        </p>
        <Legend />
        <p className="t-headline">Each miss reveals a clue</p>
        <p>Clues are mostly ingredients, from the least telling to the most telling.</p>
        <ClueDemo />
        <p className="t-headline">What the tiles compare</p>
        <ul style={{ paddingLeft: 18, fontSize: 14 }}>
          <li><strong>Country</strong>: yellow for the same continent, with the direction and distance to the answer.</li>
          <li><strong>Region / Zone / State</strong>: green when they match.</li>
          <li><strong>Course</strong>: yellow for the same family (mains, light bites, sweets, breads &amp; condiments).</li>
          <li><strong>Diet</strong>: yellow when both are meat-free.</li>
          <li><strong>Type</strong>: yellow for the same family (mixed, spirits, brewed).</li>
          <li><strong>Shared</strong>: how many ingredients your guess shares with the answer.</li>
          <li><strong>Cuisine mode</strong>: guess the country (or Indian state) from one dish&rsquo;s clues.</li>
        </ul>
        <p className="t-meta">A new Foodle unlocks at midnight, your time.</p>
      </div>
    );
  }

  const cards = [
    {
      title: "Guess the dish in six tries",
      body: (
        <>
          <p>Everyone gets the same dish each day. Pick a guess from the list and the tiles show how close you are.</p>
          <Legend />
        </>
      ),
    },
    {
      title: "Each miss reveals a clue",
      body: (
        <>
          <p>Clues are mostly ingredients, from the least telling to the most telling.</p>
          <ClueDemo />
        </>
      ),
    },
    {
      title: "Pick your edition",
      body: (
        <>
          <p>Global covers dishes and drinks from 96 countries. India goes state by state.</p>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <button className="btn primary block" onClick={() => finish("global")}>
              Global
            </button>
            <button className="btn secondary block" onClick={() => finish("india")}>
              India
            </button>
          </div>
        </>
      ),
    },
  ];
  const c = cards[step];
  return (
    <div>
      <p className="t-meta">
        {step + 1} of {cards.length}
      </p>
      <h3 className="t-display" style={{ margin: "4px 0 8px" }}>
        {c.title}
      </h3>
      {c.body}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <button className="btn ghost" onClick={() => finish(undefined, true)}>
          Skip
        </button>
        {step < cards.length - 1 && (
          <button
            className="btn primary"
            onClick={() => {
              track("onboarding_step", { step: step + 1, skipped: false });
              setStep(step + 1);
            }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
