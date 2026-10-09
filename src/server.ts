import "dotenv/config";
import { createServer } from "node:http";
import { createApp } from "./app.js";
import { createAiBackend } from "./ai/di.js";
import { createDb, runMigrations } from "./db/connection.js";
import { attachSocketServer } from "./ws/socket.js";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");

  const db = createDb(databaseUrl);
  await runMigrations(db);

  const ai = await createAiBackend();
  console.log(`AI backend: ${ai.backendName}`);

  const app = createApp(db, ai);
  const httpServer = createServer(app);
  attachSocketServer(httpServer, db, ai);

  const port = Number(process.env.PORT) || 8300;
  httpServer.listen(port, () => console.log(`chatstack-api listening on :${port}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
