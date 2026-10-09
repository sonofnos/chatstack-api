import type { Server as HttpServer } from "node:http";
import type { Kysely } from "kysely";
import { Server as SocketIoServer } from "socket.io";
import type { AiBackend } from "../ai/di.js";
import { buildGroundedMessages, saveMessage } from "../conversations/service.js";
import type { Database } from "../db/types.js";

export function attachSocketServer(httpServer: HttpServer, db: Kysely<Database>, ai: AiBackend): SocketIoServer {
  const io = new SocketIoServer(httpServer, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    socket.on("join-conversation", (conversationId: string) => {
      socket.join(conversationId);
    });

    socket.on("send-message", async (payload: { conversationId: string; content: string }) => {
      const { conversationId, content } = payload;

      await saveMessage(db, conversationId, "user", content);
      io.to(conversationId).emit("message-received", { role: "user", content });

      const messages = await buildGroundedMessages(db, ai, conversationId, content);

      let fullResponse = "";
      for await (const token of ai.llm.streamChat(messages)) {
        fullResponse += token;
        io.to(conversationId).emit("token", { token });
      }

      await saveMessage(db, conversationId, "assistant", fullResponse);
      io.to(conversationId).emit("message-complete", { role: "assistant", content: fullResponse });
    });
  });

  return io;
}
