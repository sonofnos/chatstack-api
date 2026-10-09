import { describe, expect, it } from "vitest";
import { chunkText } from "../src/rag/chunking.js";

describe("chunkText", () => {
  it("splits long text into multiple chunks respecting the max size", () => {
    const text = Array.from({ length: 50 }, (_, i) => `This is sentence number ${i}.`).join(" ");
    const chunks = chunkText(text, 200, 50);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(260); // allow a little slack for one over-length sentence
    }
  });

  it("never loops forever on a single very long sentence (regression: overlap back-walk could stall)", () => {
    const longSentence = "word ".repeat(500) + ".";
    const chunks = chunkText(longSentence, 50, 20);

    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it("returns an empty array for empty input", () => {
    expect(chunkText("")).toEqual([]);
  });

  it("produces consecutive chunks that overlap, not duplicate from the same start", () => {
    const text = Array.from({ length: 10 }, (_, i) => `Sentence ${i} here.`).join(" ");
    const chunks = chunkText(text, 60, 30);

    expect(new Set(chunks).size).toBe(chunks.length); // no exact duplicates
  });
});
