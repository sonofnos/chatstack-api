import { FakeEmbeddingClient, FakeLlmClient } from "./FakeClients.js";
import type { EmbeddingClient, LlmClient } from "./LlmClient.js";
import { OpenAiCompatibleClient } from "./OpenAiCompatibleClient.js";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || "llama3.2:1b";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

async function ollamaIsReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 500);
    const res = await fetch(OLLAMA_BASE_URL.replace(/\/v1$/, "/api/tags"), {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export interface AiBackend {
  llm: LlmClient;
  embeddings: EmbeddingClient;
  backendName: "ollama" | "hosted" | "fake";
}

/**
 * Tries a local Ollama instance first, falls back to a hosted OpenAI-compatible
 * API if OPENAI_API_KEY is set, and falls back to deterministic fakes if
 * neither is available. The fallback is also what keeps tests hermetic and free.
 */
export async function createAiBackend(): Promise<AiBackend> {
  if (await ollamaIsReachable()) {
    const client = new OpenAiCompatibleClient(OLLAMA_CHAT_MODEL, OLLAMA_EMBED_MODEL, OLLAMA_BASE_URL);
    return { llm: client, embeddings: client, backendName: "ollama" };
  }

  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAiCompatibleClient(
      process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
      process.env.OPENAI_BASE_URL,
      process.env.OPENAI_API_KEY,
    );
    return { llm: client, embeddings: client, backendName: "hosted" };
  }

  return { llm: new FakeLlmClient(), embeddings: new FakeEmbeddingClient(), backendName: "fake" };
}
