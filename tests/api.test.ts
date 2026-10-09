import type { Kysely } from "kysely";
import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createAiBackend } from "../src/ai/di.js";
import { createApp } from "../src/app.js";
import type { Database } from "../src/db/types.js";
import { setupTestDb } from "./setup.js";

describe("API", () => {
  let db: Kysely<Database>;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    db = await setupTestDb();
    const ai = await createAiBackend(); // no OLLAMA/OPENAI_API_KEY set in test env -> fake backend
    app = createApp(db, ai);
  });

  afterAll(async () => {
    await db?.destroy();
  });

  it("creates a conversation and returns its id", async () => {
    const response = await request(app).post("/api/conversations").send({ title: "Support chat" });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeTruthy();
  });

  it("returns an empty message history for a fresh conversation", async () => {
    const created = await request(app).post("/api/conversations").send({});
    const response = await request(app).get(`/api/conversations/${created.body.id}/messages`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("ingests a document via the API", async () => {
    const response = await request(app)
      .post("/api/documents")
      .send({ filename: "faq.txt", text: "We ship worldwide. Returns are free within 14 days." });

    expect(response.status).toBe(201);
    expect(response.body.chunkCount).toBeGreaterThan(0);
  });

  it("rejects a document upload missing required fields", async () => {
    const response = await request(app).post("/api/documents").send({ filename: "faq.txt" });

    expect(response.status).toBe(400);
  });

  it("reports which AI backend is active on the health check", async () => {
    const response = await request(app).get("/healthz");

    expect(response.status).toBe(200);
    expect(response.body.aiBackend).toBe("fake");
  });
});
