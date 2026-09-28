import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/cloudinary", () => ({
  fetchAsset: vi.fn(),
  toVisionUrl: (url: string) => url.replace("/upload/", "/upload/w_1600,c_limit/"),
}));
vi.mock("@/lib/claudeClient", () => ({ compareImages: vi.fn() }));

import { fetchAsset } from "@/lib/cloudinary";
import { compareImages } from "@/lib/claudeClient";
import { POST } from "../route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/compare", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/compare", () => {
  it("returns 400 when assetA or assetB is missing", async () => {
    const res = await POST(makeRequest({ assetA: "a1" }));
    expect(res.status).toBe(400);
  });

  it("compares two assets from different series without rejecting the pair", async () => {
    vi.mocked(fetchAsset).mockImplementation(async (id: string) => ({
      public_id: id,
      secure_url: `https://x/upload/${id}.jpg`,
      context: { custom: { series_id: id === "a1" ? "series-north" : "series-south" } },
    }));
    vi.mocked(compareImages).mockResolvedValue({
      changeSummary: "Visible new construction",
      confidence: 0.6,
      visualHighlights: ["new rooftop"],
    });

    const res = await POST(makeRequest({ assetA: "a1", assetB: "a2" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.changeSummary).toBe("Visible new construction");
    expect(compareImages).toHaveBeenCalledWith(
      "https://x/upload/w_1600,c_limit/a1.jpg",
      "https://x/upload/w_1600,c_limit/a2.jpg"
    );
  });

  it("returns 502 when compareImages fails", async () => {
    vi.mocked(fetchAsset).mockImplementation(async (id: string) => ({
      public_id: id,
      secure_url: `https://x/${id}.jpg`,
      context: { custom: { series_id: "series-a" } },
    }));
    vi.mocked(compareImages).mockRejectedValue(new Error("groq down"));

    const res = await POST(makeRequest({ assetA: "a1", assetB: "a2" }));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(body.error).toBe("comparison failed");
  });
});
