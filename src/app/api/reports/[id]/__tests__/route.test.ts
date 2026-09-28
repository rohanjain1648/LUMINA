import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/reportStore", () => ({ getReport: vi.fn() }));

import { getReport } from "@/lib/reportStore";
import { GET } from "../route";

describe("GET /api/reports/:id", () => {
  beforeEach(() => vi.mocked(getReport).mockReset());

  it("returns 404 when the report does not exist", async () => {
    vi.mocked(getReport).mockReturnValue(undefined);
    const res = await GET(new NextRequest("http://localhost/api/reports/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns the report when found", async () => {
    vi.mocked(getReport).mockReturnValue({
      id: "r1",
      projectId: "p",
      from: "",
      to: "",
      summary: "s",
      assets: [],
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    const res = await GET(new NextRequest("http://localhost/api/reports/r1"), {
      params: Promise.resolve({ id: "r1" }),
    });
    const body = await res.json();
    expect(body.id).toBe("r1");
  });
});
