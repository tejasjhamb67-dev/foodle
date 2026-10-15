"use client";
import { useRouter } from "next/navigation";
import { HowToPlay } from "../HowToPlay";

export function HelpPage() {
  const router = useRouter();
  return (
    <main id="main" className="page">
      <div className="content">
        <h1 className="t-title">How to play</h1>
        <HowToPlay onDone={() => router.push("/")} />
      </div>
    </main>
  );
}
