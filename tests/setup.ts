import { sql, type Kysely } from "kysely";
import { createDb, runMigrations } from "../src/db/connection.js";
import type { Database } from "../src/db/types.js";

export async function setupTestDb(): Promise<Kysely<Database>> {
  const url = process.env.DATABASE_URL || "postgres://chatstack:chatstack@localhost:5436/chatstack";
  const db = createDb(url);
  await runMigrations(db);
  // Clean slate between test files; cheap since these tables are small in tests.
  await sql`TRUNCATE document_chunks, documents, messages, conversations CASCADE`.execute(db);
  return db;
}
