import type { ColumnType, Generated } from "kysely";

export interface ConversationsTable {
  id: Generated<string>;
  title: string;
  created_at: Generated<ColumnType<Date, string | undefined, never>>;
}

export interface MessagesTable {
  id: Generated<string>;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: Generated<ColumnType<Date, string | undefined, never>>;
}

export interface DocumentsTable {
  id: Generated<string>;
  filename: string;
  created_at: Generated<ColumnType<Date, string | undefined, never>>;
}

export interface DocumentChunksTable {
  id: Generated<string>;
  document_id: string;
  content: string;
  embedding: string; // pgvector literal, e.g. "[0.1,0.2,...]"
  created_at: Generated<ColumnType<Date, string | undefined, never>>;
}

export interface Database {
  conversations: ConversationsTable;
  messages: MessagesTable;
  documents: DocumentsTable;
  document_chunks: DocumentChunksTable;
}
