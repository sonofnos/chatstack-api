import OpenAI from "openai";
import type { ChatMessage, EmbeddingClient, LlmClient } from "./LlmClient.js";

/**
 * Works against OpenAI's real API or any OpenAI-compatible endpoint (Ollama's
 * /v1 shim included), since the SDK only cares about baseURL + apiKey.
 */
export class OpenAiCompatibleClient implements LlmClient, EmbeddingClient {
  private client: OpenAI;

  constructor(
    private readonly model: string,
    private readonly embeddingModel: string,
    baseURL?: string,
    apiKey?: string,
  ) {
    this.client = new OpenAI({ baseURL, apiKey: apiKey || "unused" });
  }

  async *streamChat(messages: ChatMessage[]): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content;
      if (token) yield token;
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });
    return response.data[0].embedding;
  }
}
