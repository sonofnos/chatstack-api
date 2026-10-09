import { sql, type Kysely } from "kysely";
import type { EmbeddingClient } from "../ai/LlmClient.js";
import type { Database } from "../db/types.js";
import { chunkText } from "./chunking.js";

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function ingestDocument(
  db: Kysely<Database>,
  embeddings: EmbeddingClient,
  filename: string,
  text: string,
): Promise<{ documentId: string; chunkCount: number }> {
  const document = await db
    .insertInto("documents")
    .values({ filename })
    .returning(["id"])
    .executeTakeFirstOrThrow();

  const chunks = chunkText(text);

  for (const chunk of chunks) {
    const vector = await embeddings.embed(chunk);
    await db
      .insertInto("document_chunks")
      .values({
        document_id: document.id,
        content: chunk,
        embedding: toVectorLiteral(vector),
      })
      .execute();
  }

  return { documentId: document.id, chunkCount: chunks.length };
}

export interface RetrievedChunk {
  content: string;
  documentFilename: string;
  distance: number;
}

/** Nearest-neighbor retrieval by cosine distance, smallest distance first. */
export async function retrieveRelevantChunks(
  db: Kysely<Database>,
  embeddings: EmbeddingClient,
  query: string,
  limit = 3,
): Promise<RetrievedChunk[]> {
  const queryVector = toVectorLiteral(await embeddings.embed(query));

  const rows = await db
    .selectFrom("document_chunks as dc")
    .innerJoin("documents as d", "d.id", "dc.document_id")
    .select((eb) => [
      "dc.content",
      "d.filename as documentFilename",
      sql<number>`dc.embedding <=> ${queryVector}::vector`.as("distance"),
    ])
    .orderBy(sql`dc.embedding <=> ${queryVector}::vector`)
    .limit(limit)
    .execute();

  return rows;
}
