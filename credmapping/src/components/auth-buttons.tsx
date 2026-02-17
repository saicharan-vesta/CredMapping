"use client";

import { useTransition } from "react";

import { createClient } from "~/utils/supabase/client";

export function SignInButton() {
  const [isPending, startTransition] = useTransition();

  const handleSignIn = () => {
    startTransition(async () => {
      const supabase = createClient();

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
    >
      {isPending ? "Redirecting..." : "Sign in with Google"}
    </button>
  );
}

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
