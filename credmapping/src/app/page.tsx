import { SignInButton, SignOutButton } from "~/components/auth-buttons";
import { getAppRole } from "~/server/auth/domain";
import { createClient } from "~/utils/supabase/server";

const errorMessages: Record<string, string> = {
  domain_not_allowed:
    "Access is restricted to @vestasolutions.com and @vestatelemed.com accounts.",
  oauth_callback_failed: "Google sign-in failed. Please try again.",
};

export default async function Home(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const errorParam = searchParams?.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appRole = getAppRole({
    email: user?.email,
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <section className="mx-auto w-full max-w-2xl space-y-6 px-6 py-20 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          CredMapping
        </h1>

        {error ? (
          <p className="rounded-md border border-rose-700 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">
            {errorMessages[error] ?? "Authentication error."}
          </p>
        ) : null}

        {!user ? (
          <>
            <p className="text-base text-slate-300 sm:text-lg">
              Sign in with your company Google account to access the app.
            </p>
            <div className="flex justify-center">
              <SignInButton />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 rounded-md border border-slate-800 bg-slate-900/40 p-6 text-left">
              <p>
                <span className="font-medium text-slate-300">Signed in as:</span>{" "}
                {user.email}
              </p>
              <p>
                <span className="font-medium text-slate-300">App role:</span>{" "}
                {appRole}
              </p>
            </div>
            <div className="flex justify-center">
              <SignOutButton />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
