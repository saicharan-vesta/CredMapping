import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireRequestAuthContext } from "~/server/auth/request-context";
import { withUserDb } from "~/server/db";
import { providers } from "~/server/db/schema";

const formatProviderLabel = (provider: {
  degree: string | null;
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
}) => {
  const fullName = [provider.firstName, provider.middleName, provider.lastName]
    .filter(Boolean)
    .join(" ");

  if (!fullName) {
    return "Provider Profile";
  }

  return provider.degree ? `${fullName}, ${provider.degree}` : fullName;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ providerId: string }> },
) {
  const { providerId } = await params;
  const { user } = await requireRequestAuthContext();

  const provider = await withUserDb({
    user,
    run: async (db) => {
      const [row] = await db
        .select({
          degree: providers.degree,
          firstName: providers.firstName,
          lastName: providers.lastName,
          middleName: providers.middleName,
        })
        .from(providers)
        .where(eq(providers.id, providerId))
        .limit(1);

      return row ?? null;
    },
  });

  return NextResponse.json({
    label: provider ? formatProviderLabel(provider) : "Provider Profile",
  });
}
