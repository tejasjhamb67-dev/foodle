"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/today";
import { useUi } from "@/lib/ui";
import { shareInvite } from "./FriendsPage";
import { LeaderboardRows } from "./LeaderboardPage";
import { Avatar, RequireSignIn } from "./Social";

interface Group {
  id: string;
  name: string;
  code: string;
  isOwner: boolean;
  members: { user_id: string; name: string; isOwner: boolean }[];
}

function Inner({ id }: { id: string }) {
  const router = useRouter();
  const toast = useUi((s) => s.toast);
  const today = useToday();
  const last = useStore((s) => s.last);
  const [g, setG] = useState<Group | null>(null);
  const [week, setWeek] = useState<Parameters<typeof LeaderboardRows>[0]["rows"] | null>(null);
  const [error, setError] = useState("");
  const mode = last?.mode ?? "dish";
  const edition = last?.edition ?? "global";

  const load = useCallback(() => {
    api.get<Group>(`/api/groups/${id}`).then(setG).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    if (today == null) return;
    api
      .get<{ rows: Parameters<typeof LeaderboardRows>[0]["rows"] }>(
        `/api/leaderboard?scope=group&group=${id}&period=week&mode=${mode}&edition=${edition}&number=${today}`,
      )
      .then((r) => setWeek(r.rows))
      .catch(() => setWeek([]));
  }, [id, today, mode, edition]);

  if (error) return <p className="banner">{error}</p>;
  if (!g) return <p className="muted">Loading…</p>;
  const link = `${location.origin}/invite/${g.code}?k=g`;
  return (
    <>
      <h2 className="t-headline">{g.name}</h2>
      <p className="t-meta">
        Join code <strong style={{ letterSpacing: 2 }}>{g.code}</strong> · {g.members.length} of 50 members
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0 24px" }}>
        <button className="btn primary sm" onClick={() => shareInvite(link, `Join "${g.name}" on Foodle.`, toast, "group")}>
          <Share2 size={18} /> Invite
        </button>
        {g.isOwner && (
          <button
            className="btn secondary sm"
            onClick={async () => {
              await api.post(`/api/groups/${id}/code`, {});
              toast("New code made");
              load();
            }}
          >
            Reset code
          </button>
        )}
        <button
          className="btn ghost sm"
          onClick={async () => {
            if (!confirm(g.isOwner ? "Leaving deletes the group for everyone. Continue?" : "Leave this group?")) return;
            await api.del(`/api/groups/${id}`, {});
            router.push("/friends");
          }}
        >
          {g.isOwner ? "Delete group" : "Leave group"}
        </button>
      </div>
      <h3 className="t-label">This week · {mode} · {edition}</h3>
      {week ? <LeaderboardRows rows={week} weekly /> : <p className="muted">Loading…</p>}
      <p className="t-meta">Points: 6 for a first-guess win down to 1 for a sixth-guess win; 0 for a miss.</p>
      <h3 className="t-label" style={{ marginTop: 24 }}>
        Members
      </h3>
      <ul className="list">
        {g.members.map((m) => (
          <li key={m.user_id} className="lb-row" style={{ gridTemplateColumns: "34px 1fr auto" }}>
            <Avatar name={m.name} />
            <span style={{ fontWeight: 700 }}>
              {m.name}
              {m.isOwner ? <span className="t-meta"> · owner</span> : null}
            </span>
            {g.isOwner && !m.isOwner ? (
              <button
                className="btn ghost sm"
                onClick={async () => {
                  await api.del(`/api/groups/${id}`, { user_id: m.user_id });
                  load();
                }}
              >
                Remove
              </button>
            ) : (
              <span />
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export function GroupPage({ id }: { id: string }) {
  return (
    <RequireSignIn title="Group" next={`/groups/${id}`}>
      <Inner id={id} />
    </RequireSignIn>
  );
}
