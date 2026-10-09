import express, { type Express } from "express";
import type { Kysely } from "kysely";
import type { AiBackend } from "./ai/di.js";
import { createConversation, getHistory } from "./conversations/service.js";
import type { Database } from "./db/types.js";
import { ingestDocument } from "./rag/service.js";

export function createApp(db: Kysely<Database>, ai: AiBackend): Express {
  const app = express();
  app.use(express.json({ limit: "5mb" }));

  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok", aiBackend: ai.backendName });
  });

  app.post("/api/conversations", async (req, res) => {
    const conversation = await createConversation(db, req.body?.title);
    res.status(201).json(conversation);
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const history = await getHistory(db, req.params.id);
    res.json(history);
  });

  app.post("/api/documents", async (req, res) => {
    const { filename, text } = req.body ?? {};
    if (!filename || !text) {
      res.status(400).json({ message: "filename and text are required." });
      return;
    }
    const result = await ingestDocument(db, ai.embeddings, filename, text);
    res.status(201).json(result);
  });

  return app;
}
