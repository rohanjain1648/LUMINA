import { describe, it, expect, vi } from "vitest";
import { upsertAssetEmbedding, queryByEmbedding } from "../pineconeClient";

function fakeIndex() {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ matches: [{ id: "asset_1" }, { id: "asset_2" }] }),
  } as any;
}

describe("pineconeClient", () => {
  it("upsertAssetEmbedding calls index.upsert with the right shape", async () => {
    const index = fakeIndex();
    await upsertAssetEmbedding("asset_1", [0.1, 0.2], { caption: "trees" }, index);
    expect(index.upsert).toHaveBeenCalledWith([
      { id: "asset_1", values: [0.1, 0.2], metadata: { caption: "trees" } },
    ]);
  });

  it("queryByEmbedding returns matched ids", async () => {
    const index = fakeIndex();
    const ids = await queryByEmbedding([0.1, 0.2], 10, index);
    expect(ids).toEqual(["asset_1", "asset_2"]);
  });
});
