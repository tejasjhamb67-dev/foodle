"use client";
import { useState } from "react";
import { SOCIAL_ENABLED } from "@/lib/config";
import { supabase, useSession } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import Link from "next/link";

export function SignInPage() {
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const redirectTo = typeof window !== "undefined" ? `${location.origin}/auth/callback` : undefined;

  if (!SOCIAL_ENABLED) {
    return (
      <main id="main" className="page">
        <div className="content">
          <h1 className="t-title">Sign in</h1>
          <p className="muted">Accounts aren&rsquo;t switched on for this site yet. Your games and streaks are saved on this device.</p>
        </div>
      </main>
    );
  }

  const oauth = async (provider: "google" | "apple") => {
    track("signin", { method: provider });
    const { error } = await (await supabase())!.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setError(error.message);
  };

  return (
    <main id="main" className="page">
      <div className="content" style={{ maxWidth: 420 }}>
        <h1 className="t-title">Sign in</h1>
        {session ? (
          <p>
            You&rsquo;re signed in as {session.user.email}. <Link href="/">Play today&rsquo;s Foodle</Link>
          </p>
        ) : sent ? (
          <p>Check your inbox. We sent a sign-in link to {email}.</p>
        ) : (
          <>
            <p className="muted">Keep your streak on every device and join friends&rsquo; leaderboards. Playing never needs an account.</p>
            <div style={{ display: "grid", gap: 10, margin: "20px 0" }}>
              <button className="btn secondary block" onClick={() => oauth("google")}>
                Continue with Google
              </button>
              <button className="btn secondary block" onClick={() => oauth("apple")}>
                Continue with Apple
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                track("signin", { method: "email" });
                const { error } = await (await supabase())!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
                if (error) setError(error.message);
                else setSent(true);
              }}
            >
              <div className="field">
                <label htmlFor="email" style={{ fontWeight: 600 }}>
                  Or get a magic link by email
                </label>
                <input id="email" type="email" required className="text-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <button className="btn primary block">Email me a link</button>
            </form>
            {error && (
              <p role="alert" style={{ color: "var(--color-text)" }} className="banner">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
