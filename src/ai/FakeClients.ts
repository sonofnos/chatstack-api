import type { ChatMessage, EmbeddingClient, LlmClient } from "./LlmClient.js";

/** Deterministic, no network: used in tests and whenever no real backend is configured. */
export class FakeLlmClient implements LlmClient {
  async *streamChat(messages: ChatMessage[]): AsyncIterable<string> {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const reply = `Fake response to: ${lastUser?.content ?? ""}`;
    for (const word of reply.split(" ")) {
      yield word + " ";
    }
  }
}

/** Deterministic embeddings: a fixed-length hash of the text, not a real model. */
export class FakeEmbeddingClient implements EmbeddingClient {
  constructor(private readonly dimensions = 8) {}

  async embed(text: string): Promise<number[]> {
    const vector = new Array(this.dimensions).fill(0);
    for (let i = 0; i < text.length; i++) {
      vector[i % this.dimensions] += text.charCodeAt(i);
    }
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map((v) => v / magnitude);
  }
}
