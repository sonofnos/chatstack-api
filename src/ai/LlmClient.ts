export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmClient {
  /** Yields response text in chunks as they arrive, for streaming to the client over WebSocket. */
  streamChat(messages: ChatMessage[]): AsyncIterable<string>;
}

export interface EmbeddingClient {
  embed(text: string): Promise<number[]>;
}
