"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHydrated, useStore } from "@/lib/store";

export function RootRedirect() {
  const router = useRouter();
  const hydrated = useHydrated();
  useEffect(() => {
    if (!hydrated) return;
    const s = useStore.getState();
    const to = s.last ? `/${s.last.edition}/${s.last.mode}` : `/${s.settings.defaultEdition}/dish`;
    router.replace(to);
  }, [hydrated, router]);
  return <main id="main" className="page" style={{ minHeight: "60vh" }} aria-busy="true" />;
}
