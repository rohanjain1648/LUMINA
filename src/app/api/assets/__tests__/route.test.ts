import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/cloudinary", () => ({
  searchAssets: vi.fn().mockResolvedValue([{ public_id: "a1", secure_url: "https://x/a1.jpg" }]),
}));

import { searchAssets } from "@/lib/cloudinary";
import { GET } from "../route";

describe("GET /api/assets", () => {
  it("passes query params through to searchAssets and returns the results", async () => {
    const req = new NextRequest("http://localhost/api/assets?project_id=flood-relief&location=riverside");
    const res = await GET(req);
    const body = await res.json();

    expect(searchAssets).toHaveBeenCalledWith({
      projectId: "flood-relief",
      location: "riverside",
      from: undefined,
      to: undefined,
    });
    expect(body.assets).toHaveLength(1);
  });
});
