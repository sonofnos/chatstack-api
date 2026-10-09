import type { Kysely } from "kysely";
import type { AiBackend } from "../ai/di.js";
import type { ChatMessage } from "../ai/LlmClient.js";
import type { Database } from "../db/types.js";
import { retrieveRelevantChunks } from "../rag/service.js";

export async function createConversation(db: Kysely<Database>, title?: string): Promise<{ id: string }> {
  return db
    .insertInto("conversations")
    .values({ title: title ?? "New conversation" })
    .returning(["id"])
    .executeTakeFirstOrThrow();
}

export async function getHistory(db: Kysely<Database>, conversationId: string): Promise<ChatMessage[]> {
  const rows = await db
    .selectFrom("messages")
    .select(["role", "content"])
    .where("conversation_id", "=", conversationId)
    .orderBy("created_at", "asc")
    .execute();

  return rows as ChatMessage[];
}

export async function saveMessage(
  db: Kysely<Database>,
  conversationId: string,
  role: ChatMessage["role"],
  content: string,
): Promise<void> {
  await db.insertInto("messages").values({ conversation_id: conversationId, role, content }).execute();
}

/**
 * Builds the prompt sent to the LLM: retrieved document chunks go in a system
 * message that explicitly tells the model not to answer from chunks it
 * wasn't given, which is what makes this grounding rather than just stuffing context in and hoping.
 */
export async function buildGroundedMessages(
  db: Kysely<Database>,
  ai: AiBackend,
  conversationId: string,
  userMessage: string,
): Promise<ChatMessage[]> {
  const history = await getHistory(db, conversationId);
  const relevantChunks = await retrieveRelevantChunks(db, ai.embeddings, userMessage);

  const messages: ChatMessage[] = [];

  if (relevantChunks.length > 0) {
    const context = relevantChunks
      .map((c, i) => `[${i + 1}] (from ${c.documentFilename}): ${c.content}`)
      .join("\n\n");
    messages.push({
      role: "system",
      content:
        `Answer using only the context below when it's relevant. ` +
        `If the context doesn't contain the answer, say so rather than guessing.\n\n${context}`,
    });
  }

  messages.push(...history, { role: "user", content: userMessage });
  return messages;
}
