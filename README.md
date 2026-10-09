# chatstack-api

A Node.js/TypeScript chatbot backend: Express REST API, Socket.IO streaming, PostgreSQL with pgvector for retrieval-augmented generation. Built around the exact combination a target job posting named (Node.js + OpenAI integration + WebSockets + conversation history + RAG), not a generic "hello world" chatbot.

Live: [chatstack-api-f3dg.onrender.com](https://chatstack-api-f3dg.onrender.com/healthz) (REST + WebSocket, running on the deterministic fake AI backend since no API key is configured on the free deployment)

## What it does

- **Streaming chat over WebSocket.** `send-message` saves the user's message, retrieves relevant document chunks, streams the model's response token by token over `token` events, then persists the full response and emits `message-complete`.
- **Grounded answers.** Retrieved chunks go into a system message that explicitly tells the model to say so rather than guess when the context doesn't contain the answer.
- **Swappable AI backend.** `src/ai/di.ts` tries a local Ollama instance first, falls back to a hosted OpenAI-compatible API if `OPENAI_API_KEY` is set, and falls back to deterministic fakes otherwise, which is also what keeps tests hermetic and free. The active backend is visible on `/healthz`.
- **REST endpoints** for creating conversations, reading history, and ingesting documents for RAG, alongside the WebSocket chat path.

## Stack

- Node.js, TypeScript, Express 5
- Socket.IO for streaming
- PostgreSQL + pgvector via Kysely (typed SQL, not an ORM that hides the query)
- OpenAI SDK, used against either OpenAI's real API or any OpenAI-compatible endpoint (Ollama's `/v1` shim included) since the SDK only cares about `baseURL` and `apiKey`
- Vitest, 12 tests against a real `pgvector/pgvector:pg16` container, not sqlite or mocks
- GitHub Actions CI

## Running it

```bash
cp .env.example .env   # set DATABASE_URL; OPENAI_API_KEY is optional
docker compose up -d   # Postgres + pgvector
npm install
npm run dev
npm test
```

## Real issues found while building this

**A cross-file test-isolation race.** Each test file's `beforeEach` truncates the shared tables for a clean slate. Vitest runs test files in parallel by default, so one file's `TRUNCATE` could fire while another file's in-flight test was still using rows it had just inserted, a foreign-key violation (`messages_conversation_id_fkey`) that only showed up running the full suite together, not any file in isolation. Fixed with `fileParallelism: false` in `vitest.config.ts`, the honest fix rather than papering over it with retries.

**The chunking function's overlap back-walk could stall.** Early versions of `chunkText` walked backward from the end of a chunk to build the next one's overlap, with no floor on how far back it could go. A single sentence longer than the max chunk size left nothing to walk back from, risking a start index that never advances. Fixed by flooring the walk-back at `startIdx + 1`, with a regression test (`never loops forever on a single very long sentence`) specifically for it, rather than trusting the happy-path tests to catch it.

## What's not here

No authentication on the API (every endpoint is open; this is a focused backend demo, not a deployable product), no message-platform integrations (WhatsApp/Messenger/Slack), no rate limiting beyond what a real deployment would need to add.
