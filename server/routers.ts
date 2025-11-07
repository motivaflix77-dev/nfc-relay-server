import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { relayManager } from "./relayManager";
import { getRelaySession, getSessionLogs } from "./db";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  relay: router({
    // Obter informações de uma sessão específica
    getSession: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        const sessionInfo = relayManager.getSessionInfo(input.sessionId);
        const dbSession = await getRelaySession(input.sessionId);
        
        return {
          ...sessionInfo,
          dbInfo: dbSession,
        };
      }),

    // Listar todas as sessões ativas
    listSessions: publicProcedure
      .query(() => {
        return relayManager.getAllSessions();
      }),

    // Obter logs de comunicação de uma sessão
    getSessionLogs: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await getSessionLogs(input.sessionId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
