"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { EDITIONS, MODES, type Edition, type Mode } from "@foodle/game";
import { useHydrated, useStore } from "@/lib/store";
import { useToday } from "@/lib/today";
import { useUi } from "@/lib/ui";
import { track } from "@/lib/analytics";
import { HowToPlay } from "./HowToPlay";
import { Sheet } from "./Sheet";
import { StatsView } from "./StatsView";

export function Modals() {
  const modal = useUi((s) => s.modal);
  const open = useUi((s) => s.open);
  const path = usePathname();
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.onboarded);
  const last = useStore((s) => s.last);
  const defaultEdition = useStore((s) => s.settings.defaultEdition);
  const today = useToday();

  useEffect(() => {
    if (!hydrated) return;
    track("app_open", { platform: "web", edition_default: defaultEdition });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const parts = path.split("/").filter(Boolean);
  const offset = parts[0] === "archive" ? 1 : 0;
  const routeEdition = EDITIONS.find((e) => e === parts[offset]);
  const routeMode = MODES.find((m) => m === parts[offset + 1]);
  const edition: Edition = routeEdition ?? last?.edition ?? defaultEdition;
  const mode: Mode = routeMode ?? last?.mode ?? "dish";

  const firstRun = hydrated && !onboarded && !path.startsWith("/invite") && !path.startsWith("/auth");
  const close = () => open(null);

  if (firstRun) {
    return (
      <Sheet title="Welcome to Foodle" onClose={() => useStore.getState().setOnboarded()}>
        <HowToPlay onboarding onDone={close} />
      </Sheet>
    );
  }
  if (modal === "help") {
    return (
      <Sheet title="How to play" onClose={close}>
        <HowToPlay onDone={close} />
      </Sheet>
    );
  }
  if (modal === "stats" && today != null) {
    return (
      <Sheet title="Statistics" onClose={close}>
        <StatsView edition={edition} mode={mode} today={today} />
      </Sheet>
    );
  }
  return null;
}
