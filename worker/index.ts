import { app } from './app';
import { cleanupExpired } from './services/cleanupService';
import type { Env } from './types';
export default {
  fetch: app.fetch,
  scheduled: async (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    ctx.waitUntil(cleanupExpired(env.DB, env.PHOTOS));
  },
} satisfies ExportedHandler<Env>;
