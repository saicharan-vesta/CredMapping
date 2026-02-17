import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "~/env";
import { isAllowedEmail } from "~/server/auth/domain";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export const updateSession = async (request: NextRequest) => {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          for (const cookie of cookiesToSet) {
            request.cookies.set(cookie.name, cookie.value);
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !isAllowedEmail(user.email)) {
    await supabase.auth.signOut();

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("error", "domain_not_allowed");

    const redirectResponse = NextResponse.redirect(redirectUrl);

    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }

    return redirectResponse;
  }

  return response;
};
