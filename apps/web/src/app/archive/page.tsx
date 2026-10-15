import { Suspense } from "react";
import { ArchiveList } from "@/components/ArchiveList";

export const metadata = { title: "Archive" };

export default function ArchivePage() {
  return (
    <main id="main" className="page">
      <div className="content">
        <h1 className="t-title">Archive</h1>
        <p className="muted">Replay any past puzzle. Archive plays don&rsquo;t change your stats, streaks or leaderboards.</p>
        <Suspense>
          <ArchiveList />
        </Suspense>
      </div>
    </main>
  );
}
