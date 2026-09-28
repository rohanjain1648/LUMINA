import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/cloudinary", () => ({ searchAssets: vi.fn() }));
vi.mock("@/lib/claudeClient", () => ({ draftReportSummary: vi.fn() }));

import { searchAssets } from "@/lib/cloudinary";
import { draftReportSummary } from "@/lib/claudeClient";
import { POST } from "../route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/reports", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/reports", () => {
  it("returns 400 when projectId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns an empty-state report when no assets match", async () => {
    vi.mocked(searchAssets).mockResolvedValue([]);
    const res = await POST(makeRequest({ projectId: "flood-relief", from: "2026-01-01", to: "2026-02-01" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.assets).toEqual([]);
    expect(body.summary).toBe("No assets found for this project and date range.");
    expect(draftReportSummary).not.toHaveBeenCalled();
  });

  it("drafts a summary and returns the assembled report when assets match", async () => {
    vi.mocked(searchAssets).mockResolvedValue([
      {
        public_id: "a1",
        secure_url: "https://x/a1.jpg",
        tags: ["water"],
        context: { custom: { caption: "Flooded field", ai_tags: "flood damage", location: "riverside" } },
      },
    ]);
    vi.mocked(draftReportSummary).mockResolvedValue("Strong visible progress.");

    const res = await POST(makeRequest({ projectId: "flood-relief" }));
    const body = await res.json();

    expect(body.summary).toBe("Strong visible progress.");
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0].aiTags).toEqual(["flood damage"]);
  });

  it("falls back to a caption-based summary when draftReportSummary fails", async () => {
    vi.mocked(searchAssets).mockResolvedValue([
      {
        public_id: "a1",
        secure_url: "https://x/a1.jpg",
        tags: ["water"],
        context: { custom: { caption: "Flooded field", ai_tags: "flood damage", location: "riverside" } },
      },
    ]);
    vi.mocked(draftReportSummary).mockRejectedValue(new Error("groq down"));

    const res = await POST(makeRequest({ projectId: "flood-relief" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary).toContain("Flooded field");
  });
});
