"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { api } from "@/lib/api";
import { useUi } from "@/lib/ui";
import { track } from "@/lib/analytics";
import { Avatar, RequireSignIn } from "./Social";

interface Person {
  user_id: string;
  name: string;
}
interface Group {
  id: string;
  name: string;
  members: number;
  isOwner: boolean;
}

export async function shareInvite(link: string, text: string, toast: (t: string) => void, kind: "friend" | "group") {
  track("invite_sent", { kind });
  if (navigator.share) {
    try {
      await navigator.share({ text, url: link });
      return;
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
  }
  await navigator.clipboard.writeText(link);
  toast("Copied to clipboard");
}

function FriendsInner() {
  const toast = useUi((s) => s.toast);
  const [data, setData] = useState<{ friends: Person[]; incoming: Person[]; outgoing: Person[] } | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [invite, setInvite] = useState<{ code: string; link: string } | null>(null);
  const [code, setCode] = useState("");
  const [gname, setGname] = useState("");
  const [gcode, setGcode] = useState("");

  const load = useCallback(() => {
    api.get<typeof data>("/api/friends").then(setData);
    api.get<{ groups: Group[] }>("/api/groups").then((g) => setGroups(g.groups));
  }, []);
  useEffect(() => {
    load();
    api.post<{ code: string; link: string }>("/api/invite", { kind: "friend" }).then(setInvite);
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast(ok);
      load();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  return (
    <>
      <section className="card" style={{ marginBottom: 24 }}>
        <h2 className="t-headline">Your invite code</h2>
        <p className="t-stat" style={{ letterSpacing: 4, margin: "8px 0" }}>
          {invite?.code ?? "······"}
        </p>
        <button
          className="btn primary"
          disabled={!invite}
          onClick={() => invite && shareInvite(invite.link, "Play Foodle with me — the daily food guessing game.", toast, "friend")}
        >
          <Share2 size={20} /> Share invite link
        </button>
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const r = await api.post<{ status: string; name: string }>("/api/friends", { code });
            setCode("");
            toast(r.status === "accepted" ? `You and ${r.name} are friends` : `Request sent to ${r.name}`);
          });
        }}
        className="field"
      >
        <label htmlFor="fc" style={{ fontWeight: 600 }}>
          Add a friend by code
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="fc" className="text-input" style={{ flex: 1, textTransform: "uppercase" }} maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn primary sm" disabled={code.trim().length !== 6}>
            Add
          </button>
        </div>
      </form>

      {data && data.incoming.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h2 className="t-label">Requests</h2>
          <ul className="list">
            {data.incoming.map((p) => (
              <li key={p.user_id} className="lb-row" style={{ gridTemplateColumns: "34px 1fr auto" }}>
                <Avatar name={p.name} />
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn primary sm" onClick={() => run(() => api.post("/api/friends/respond", { user_id: p.user_id, accept: true }).then(() => track("invite_accepted", { kind: "friend" })), "Friend added")}>
                    Accept
                  </button>
                  <button className="btn ghost sm" onClick={() => run(() => api.post("/api/friends/respond", { user_id: p.user_id, accept: false }))}>
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section style={{ marginTop: 16 }}>
        <h2 className="t-label">Friends</h2>
        {!data ? (
          <p className="muted">Loading…</p>
        ) : data.friends.length === 0 ? (
          <p className="muted">Foodle is better with friends. Share your invite link.</p>
        ) : (
          <ul className="list">
            {data.friends.map((p) => (
              <li key={p.user_id} className="lb-row" style={{ gridTemplateColumns: "34px 1fr auto" }}>
                <Avatar name={p.name} />
                <span style={{ fontWeight: 700 }}>{p.name}</span>
                <button className="btn ghost sm" onClick={() => confirm(`Remove ${p.name}?`) && run(() => api.del("/api/friends", { user_id: p.user_id }))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {data && data.outgoing.length > 0 && (
          <p className="t-meta">Waiting for: {data.outgoing.map((p) => p.name).join(", ")}</p>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2 className="t-title">Groups</h2>
        {groups?.length ? (
          <ul className="list" style={{ marginTop: 8 }}>
            {groups.map((g) => (
              <li key={g.id}>
                <Link href={`/groups/${g.id}`} className="mode-card">
                  <span style={{ fontWeight: 700 }}>{g.name}</span>
                  <span className="t-meta">
                    {g.members} {g.members === 1 ? "member" : "members"}
                    {g.isOwner ? " · owner" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No groups yet. Start one for your family, office or class.</p>
        )}
        <form
          className="field"
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api.post("/api/groups", { name: gname }).then(() => setGname("")), "Group created");
          }}
        >
          <label htmlFor="gn" style={{ fontWeight: 600 }}>
            New group
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="gn" className="text-input" style={{ flex: 1 }} maxLength={30} value={gname} onChange={(e) => setGname(e.target.value)} placeholder="Group name" />
            <button className="btn primary sm" disabled={gname.trim().length < 2}>
              Create
            </button>
          </div>
        </form>
        <form
          className="field"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => api.post("/api/groups/join", { code: gcode }).then(() => setGcode("")), "Joined group");
          }}
        >
          <label htmlFor="gc" style={{ fontWeight: 600 }}>
            Join with a code
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="gc" className="text-input" style={{ flex: 1, textTransform: "uppercase" }} maxLength={6} value={gcode} onChange={(e) => setGcode(e.target.value)} />
            <button className="btn primary sm" disabled={gcode.trim().length !== 6}>
              Join
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

export function FriendsPage() {
  return (
    <RequireSignIn title="Friends" next="/friends">
      <FriendsInner />
    </RequireSignIn>
  );
}
