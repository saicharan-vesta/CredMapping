import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { providers } from "~/server/db/schema";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(providers).values({
        firstName: input.name,
      });
    }),

  getLatest: publicProcedure.query(async ({ ctx }) => {
    const provider = await ctx.db.query.providers.findFirst({
      orderBy: (provider, { desc }) => [desc(provider.createdAt)],
    });

    if (!provider) {
      return null;
    }

    return {
      id: provider.id,
      name: [provider.firstName, provider.lastName].filter(Boolean).join(" "),
    };
  }),
});
