import { desc, ilike, or } from "drizzle-orm";

import { db } from "~/server/db";
import { facilities } from "~/server/db/schema";

export default async function FacilitiesPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const rawSearch = searchParams?.search;
  const search = typeof rawSearch === "string" ? rawSearch.trim() : "";
  const hasSearch = search.length >= 2;

  const facilityRows = await db
    .select()
    .from(facilities)
    .where(
      hasSearch
        ? or(
            ilike(facilities.name, `%${search}%`),
            ilike(facilities.state, `%${search}%`),
            ilike(facilities.email, `%${search}%`),
            ilike(facilities.address, `%${search}%`),
            ilike(facilities.proxy, `%${search}%`),
          )
        : undefined,
    )
    .orderBy(desc(facilities.updatedAt), desc(facilities.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      {facilityRows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
          No facilities found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {facilityRows.map((facility) => (
            <article key={facility.id} className="rounded-lg border bg-card p-4">
              <h2 className="text-base font-semibold">{facility.name?.trim() ?? "Unnamed Facility"}</h2>
              <dl className="mt-3 space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between gap-2">
                  <dt>State</dt>
                  <dd>{facility.state ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Email</dt>
                  <dd className="truncate">{facility.email ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Proxy</dt>
                  <dd>{facility.proxy ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Address</dt>
                  <dd className="text-foreground">{facility.address ?? "—"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
