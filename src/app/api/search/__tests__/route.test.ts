import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/embeddings", () => ({ embedText: vi.fn() }));
vi.mock("@/lib/pineconeClient", () => ({ queryByEmbedding: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({ listAssetsByTag: vi.fn() }));

import { embedText } from "@/lib/embeddings";
import { queryByEmbedding } from "@/lib/pineconeClient";
import { listAssetsByTag } from "@/lib/cloudinary";
import { POST } from "../route";

function makeRequest(query: string) {
  return new NextRequest("http://localhost/api/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

describe("POST /api/search", () => {
  it("returns Pinecone results when embedding + query succeed", async () => {
    vi.mocked(embedText).mockResolvedValue([0.1]);
    vi.mocked(queryByEmbedding).mockResolvedValue(["a1", "a2"]);

    const res = await POST(makeRequest("flood damage near river"));
    const body = await res.json();

    expect(body).toEqual({ publicIds: ["a1", "a2"], source: "pinecone" });
  });

  it("falls back to Cloudinary tag search when embedding fails", async () => {
    vi.mocked(embedText).mockRejectedValue(new Error("embedding provider down"));
    vi.mocked(listAssetsByTag).mockResolvedValue([{ public_id: "a3", secure_url: "https://x/a3.jpg" }]);

    const res = await POST(makeRequest("flood damage"));
    const body = await res.json();

    expect(body).toEqual({ publicIds: ["a3"], source: "cloudinary-fallback" });
    expect(listAssetsByTag).toHaveBeenCalledWith("flood");
  });

  it("returns 400 when query is missing", async () => {
    const res = await POST(makeRequest(""));
    expect(res.status).toBe(400);
  });
});
