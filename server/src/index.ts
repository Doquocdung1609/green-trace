import { app } from "./app.js";
import { env } from "./config.js";
import { prisma } from "./db/prisma.js";
import { ensureStorage } from "./services/storageService.js";

await ensureStorage();
const server = app.listen(env.PORT, () =>
  console.log(`GreenTrace API listening on port ${env.PORT}`),
);
async function shutdown() {
  server.close();
  await prisma.$disconnect();
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
