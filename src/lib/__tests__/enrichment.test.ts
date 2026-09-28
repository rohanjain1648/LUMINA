import { describe, it, expect, vi } from "vitest";
import { enrichAsset } from "../enrichment";

describe("enrichAsset", () => {
  it("tags, embeds, and writes context on success", async () => {
    const deps = {
      fetchAsset: vi.fn().mockResolvedValue({ public_id: "a1", secure_url: "https://x/a1.jpg", tags: ["water"] }),
      tagImage: vi.fn().mockResolvedValue({ aiTags: ["flood damage"], caption: "Flooded field" }),
      embedText: vi.fn().mockResolvedValue([0.1, 0.2]),
      upsertAssetEmbedding: vi.fn().mockResolvedValue(undefined),
      updateAssetContext: vi.fn().mockResolvedValue(undefined),
    };

    await enrichAsset("a1", "flood-relief", deps);

    expect(deps.updateAssetContext).toHaveBeenCalledWith("a1", {
      ai_tags: "flood damage",
      caption: "Flooded field",
    });
    expect(deps.upsertAssetEmbedding).toHaveBeenCalledWith("a1", [0.1, 0.2], { caption: "Flooded field" });
  });

  it("still writes empty context when Groq tagging fails, and does not throw", async () => {
    const deps = {
      fetchAsset: vi.fn().mockResolvedValue({ public_id: "a2", secure_url: "https://x/a2.jpg", tags: [] }),
      tagImage: vi.fn().mockRejectedValue(new Error("timeout")),
      embedText: vi.fn().mockResolvedValue([0.3]),
      upsertAssetEmbedding: vi.fn().mockResolvedValue(undefined),
      updateAssetContext: vi.fn().mockResolvedValue(undefined),
    };

    await expect(enrichAsset("a2", "flood-relief", deps)).resolves.not.toThrow();
    expect(deps.updateAssetContext).toHaveBeenCalledWith("a2", { ai_tags: "", caption: "" });
  });

  it("does not throw when embedding/Pinecone fails", async () => {
    const deps = {
      fetchAsset: vi.fn().mockResolvedValue({ public_id: "a3", secure_url: "https://x/a3.jpg", tags: [] }),
      tagImage: vi.fn().mockResolvedValue({ aiTags: [], caption: "caption" }),
      embedText: vi.fn().mockRejectedValue(new Error("pinecone down")),
      upsertAssetEmbedding: vi.fn(),
      updateAssetContext: vi.fn().mockResolvedValue(undefined),
    };

    await expect(enrichAsset("a3", "flood-relief", deps)).resolves.not.toThrow();
  });
});
