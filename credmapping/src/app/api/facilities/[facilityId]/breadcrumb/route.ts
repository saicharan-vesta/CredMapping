import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireRequestAuthContext } from "~/server/auth/request-context";
import { withUserDb } from "~/server/db";
import { facilities } from "~/server/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ facilityId: string }> },
) {
  const { facilityId } = await params;
  const { user } = await requireRequestAuthContext();

  const facility = await withUserDb({
    user,
    run: async (db) => {
      const [row] = await db
        .select({ name: facilities.name })
        .from(facilities)
        .where(eq(facilities.id, facilityId))
        .limit(1);

      return row ?? null;
    },
  });
  const facilityName = facility?.name?.trim();
  const normalizedFacilityName = facilityName === "" ? undefined : facilityName;

  return NextResponse.json({
    label: normalizedFacilityName ?? "Facility Profile",
  });
}
