import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import type { Kysely } from "kysely";
import { type Socket as ClientSocket, io as ioClient } from "socket.io-client";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAiBackend } from "../src/ai/di.js";
import { createApp } from "../src/app.js";
import { createConversation, getHistory } from "../src/conversations/service.js";
import type { Database } from "../src/db/types.js";
import { attachSocketServer } from "../src/ws/socket.js";
import { setupTestDb } from "./setup.js";

describe("WebSocket chat", () => {
  let db: Kysely<Database>;
  let httpServer: ReturnType<typeof createServer>;
  let client: ClientSocket;
  let port: number;

  beforeEach(async () => {
    db = await setupTestDb();
    const ai = await createAiBackend();
    const app = createApp(db, ai);
    httpServer = createServer(app);
    attachSocketServer(httpServer, db, ai);

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    port = (httpServer.address() as AddressInfo).port;
  });

  afterEach(async () => {
    client?.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  afterAll(async () => {
    await db?.destroy();
  });

  it("streams tokens over the socket and persists both sides of the exchange", async () => {
    const { id: conversationId } = await createConversation(db, "WS test");
    client = ioClient(`http://localhost:${port}`);

    const tokens: string[] = [];
    const complete = new Promise<{ role: string; content: string }>((resolve) => {
      client.on("connect", () => {
        client.emit("join-conversation", conversationId);
        client.emit("send-message", { conversationId, content: "What is your return policy?" });
      });
      client.on("token", ({ token }: { token: string }) => tokens.push(token));
      client.on("message-complete", resolve);
    });

    const final = await complete;

    expect(tokens.length).toBeGreaterThan(0);
    expect(final.role).toBe("assistant");
    expect(final.content).toContain("What is your return policy?"); // fake backend echoes the prompt

    const history = await getHistory(db, conversationId);
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({ role: "user", content: "What is your return policy?" });
    expect(history[1].role).toBe("assistant");
  });
});
