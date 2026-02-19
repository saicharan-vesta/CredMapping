import { ilike, or, sql } from "drizzle-orm";
import { z } from "zod";

import { facilities, providers } from "~/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { withRls } from "~/server/db";

const trimAndNormalize = (value: string) => value.trim().replace(/\s+/g, " ");

const buildProviderName = (provider: {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  degree: string | null;
}) => {
  const fullName = [provider.firstName, provider.middleName, provider.lastName]
    .filter(Boolean)
    .join(" ");

  if (!fullName) {
    return "Unnamed Provider";
  }

  return provider.degree ? `${fullName}, ${provider.degree}` : fullName;
};

export const searchRouter = createTRPCRouter({
  global: protectedProcedure
    .input(
      z.object({
        query: z.string().trim().min(2).max(100),
        limitPerType: z.number().int().min(1).max(20).default(8),
      }),
    )
    .query(async ({ ctx, input }) => {
      const query = trimAndNormalize(input.query);
      const likeQuery = `%${query}%`;

      const [providerRows, facilityRows] = await withRls({
        jwtClaims: {
          sub: ctx.user.id,
          email: ctx.user.email?.toLowerCase() ?? "",
          role: "authenticated",
        },
        run: async (tx) => {
          const providersPromise = tx
            .select({
              id: providers.id,
              firstName: providers.firstName,
              middleName: providers.middleName,
              lastName: providers.lastName,
              degree: providers.degree,
              email: providers.email,
            })
            .from(providers)
            .where(
              or(
                ilike(providers.firstName, likeQuery),
                ilike(providers.middleName, likeQuery),
                ilike(providers.lastName, likeQuery),
                ilike(providers.email, likeQuery),
                ilike(providers.notes, likeQuery),
                sql`concat_ws(' ', ${providers.firstName}, ${providers.middleName}, ${providers.lastName}) ilike ${likeQuery}`,
              ),
            )
            .limit(input.limitPerType);

          const facilitiesPromise = tx
            .select({
              id: facilities.id,
              name: facilities.name,
              state: facilities.state,
              email: facilities.email,
            })
            .from(facilities)
            .where(
              or(
                ilike(facilities.name, likeQuery),
                ilike(facilities.state, likeQuery),
                ilike(facilities.email, likeQuery),
                ilike(facilities.address, likeQuery),
                ilike(facilities.proxy, likeQuery),
              ),
            )
            .limit(input.limitPerType);

          return Promise.all([providersPromise, facilitiesPromise]);
        },
      });

      return {
        query,
        providers: providerRows.map((provider) => ({
          id: provider.id,
          name: buildProviderName(provider),
          subtitle: provider.email,
          href: `/providers?search=${encodeURIComponent(query)}`,
        })),
        facilities: facilityRows.map((facility) => ({
          id: facility.id,
          name: facility.name?.trim() ?? "Unnamed Facility",
          subtitle: [facility.state, facility.email].filter(Boolean).join(" • ") || null,
          href: `/facilities?search=${encodeURIComponent(query)}`,
        })),
      };
    }),
});
