import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { prisma } from "./config/db.js";
import { isSupabaseSyncEnabled } from "./integrations/supabase-sync.js";

const server = app.listen(env.PORT, () => {
  logger.info(`Backend listening on port ${env.PORT}`);
  logger.info(
    `Supabase sync ${isSupabaseSyncEnabled() ? "enabled" : "disabled"}`
  );
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
