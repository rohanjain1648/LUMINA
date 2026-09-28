import { describe, it, expect, vi } from "vitest";
import { embedText } from "../embeddings";

describe("embedText", () => {
  it("returns the embedding vector from the OpenAI response", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
    });
    const result = await embedText("reforestation photo", fakeFetch as unknown as typeof fetch);
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("throws when the request fails", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(embedText("x", fakeFetch as unknown as typeof fetch)).rejects.toThrow();
  });
});
