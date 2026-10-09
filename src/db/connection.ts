import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import type { Database } from "./types.js";

const { Pool } = pg;

export function createDb(connectionString: string): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  });
}

export async function runMigrations(db: Kysely<Database>): Promise<void> {
  const schemaPath = fileURLToPath(new URL("schema.sql", import.meta.url));
  const schema = readFileSync(schemaPath, "utf-8");
  await sql.raw(schema).execute(db);
}
