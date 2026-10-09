import type { Kysely } from "kysely";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { FakeEmbeddingClient } from "../src/ai/FakeClients.js";
import type { Database } from "../src/db/types.js";
import { ingestDocument, retrieveRelevantChunks } from "../src/rag/service.js";
import { setupTestDb } from "./setup.js";

describe("RAG ingestion and retrieval", () => {
  let db: Kysely<Database>;
  const embeddings = new FakeEmbeddingClient();

  beforeEach(async () => {
    db = await setupTestDb();
  });

  afterAll(async () => {
    await db?.destroy();
  });

  it("ingests a document into chunks and retrieves the most relevant one for a query", async () => {
    const { documentId, chunkCount } = await ingestDocument(
      db,
      embeddings,
      "policy.txt",
      "Refunds are accepted within 30 days of purchase. Shipping takes 3 to 5 business days to arrive.",
    );

    expect(documentId).toBeTruthy();
    expect(chunkCount).toBeGreaterThan(0);

    const results = await retrieveRelevantChunks(db, embeddings, "How long until my order ships?", 1);

    expect(results).toHaveLength(1);
    expect(results[0].documentFilename).toBe("policy.txt");
  });

  it("orders results by distance, closest first", async () => {
    await ingestDocument(db, embeddings, "doc.txt", "Apples are red fruit. Cars are made of metal and plastic.");

    const results = await retrieveRelevantChunks(db, embeddings, "Apples are red fruit.", 2);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].distance).toBeLessThanOrEqual(results[results.length - 1].distance);
  });
});
