/**
 * Splits text into overlapping chunks on sentence boundaries where possible.
 * The overlap-back-walk is floored at startIdx + 1 so a chunk holding exactly
 * one (very long) sentence can't send the window backwards forever.
 */
export function chunkText(text: string, maxChunkChars = 800, overlapChars = 150): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  let startIdx = 0;

  while (startIdx < sentences.length) {
    let chunk = "";
    let endIdx = startIdx;

    while (endIdx < sentences.length && chunk.length + sentences[endIdx].length <= maxChunkChars) {
      chunk += (chunk ? " " : "") + sentences[endIdx];
      endIdx++;
    }

    if (chunk === "") {
      // A single sentence longer than maxChunkChars: take it whole rather than loop forever.
      chunk = sentences[startIdx];
      endIdx = startIdx + 1;
    }

    chunks.push(chunk);

    // Walk back from endIdx to build the next chunk's overlap, floored so
    // this can never produce a start index <= the current one.
    let overlapStart = endIdx;
    let overlapLen = 0;
    while (overlapStart > startIdx + 1 && overlapLen < overlapChars) {
      overlapStart--;
      overlapLen += sentences[overlapStart].length;
    }

    startIdx = Math.max(overlapStart, startIdx + 1);
  }

  return chunks;
}
