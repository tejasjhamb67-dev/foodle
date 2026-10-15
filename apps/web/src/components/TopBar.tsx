"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, BarChart3, CircleHelp, Menu, Settings, Trophy, Users, UtensilsCrossed, LogIn } from "lucide-react";
import { useStore } from "@/lib/store";
import { useUi } from "@/lib/ui";
import { SOCIAL_ENABLED } from "@/lib/config";
import { useSession } from "@/lib/supabase";
import { Wordmark } from "./Wordmark";

function playHref(last: { edition: string; mode: string } | null, edition: string) {
  return last ? `/${last.edition}/${last.mode}` : `/${edition}/dish`;
}

export function TopBar() {
  const path = usePathname();
  const open = useUi((s) => s.open);
  const setDrawer = useUi((s) => s.setDrawer);
  const last = useStore((s) => s.last);
  const edition = useStore((s) => s.settings.defaultEdition);
  const play = playHref(last, edition);
  const isPlay = /^\/(global|india)\//.test(path);
  const nav = [
    { href: play, label: "Play", current: isPlay },
    { href: "/archive", label: "Archive", current: path.startsWith("/archive") },
    { href: "/leaderboard", label: "Leaderboard", current: path.startsWith("/leaderboard") },
    { href: "/friends", label: "Friends", current: path.startsWith("/friends") || path.startsWith("/groups") },
  ];
  return (
    <header className="topbar">
      <div className="topbar-side">
        <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setDrawer(true)}>
          <Menu size={22} strokeWidth={2} />
        </button>
        <nav className="topnav" aria-label="Main">
          {nav.map((n) => (
            <Link key={n.label} href={n.href} aria-current={n.current ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <Wordmark size={26} href={play} />
      <div className="topbar-side right">
        <button className="icon-btn" aria-label="How to play" onClick={() => open("help")}>
          <CircleHelp size={22} strokeWidth={2} />
        </button>
        <button className="icon-btn" aria-label="Statistics" onClick={() => open("stats")}>
          <BarChart3 size={22} strokeWidth={2} />
        </button>
        <Link className="icon-btn" aria-label="Settings" href="/settings">
          <Settings size={22} strokeWidth={2} />
        </Link>
      </div>
    </header>
  );
}

export function Drawer() {
  const drawer = useUi((s) => s.drawer);
  const setDrawer = useUi((s) => s.setDrawer);
  const last = useStore((s) => s.last);
  const edition = useStore((s) => s.settings.defaultEdition);
  const { session } = useSession();
  if (!drawer) return null;
  const close = () => setDrawer(false);
  const links = [
    { href: playHref(last, edition), label: "Play today", icon: UtensilsCrossed },
    { href: "/archive", label: "Archive", icon: Archive },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/friends", label: "Friends and groups", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  if (SOCIAL_ENABLED && !session) links.push({ href: "/signin", label: "Sign in", icon: LogIn });
  return (
    <>
      <div className="drawer-scrim" onClick={close} />
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu" onKeyDown={(e) => e.key === "Escape" && close()}>
        <div style={{ padding: "8px 12px 16px" }}>
          <Wordmark size={24} href={null} />
        </div>
        <nav aria-label="Main">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={label} href={href} onClick={close}>
              <Icon size={20} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
