import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/cloudinary", () => ({
  verifyWebhookSignature: vi.fn(),
}));
vi.mock("@/lib/enrichment", () => ({
  enrichAsset: vi.fn().mockResolvedValue(undefined),
}));

import { verifyWebhookSignature } from "@/lib/cloudinary";
import { enrichAsset } from "@/lib/enrichment";
import { POST } from "../route";

function makeRequest(body: string, headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/assets/webhook", {
    method: "POST",
    body,
    headers,
  });
}

describe("POST /api/assets/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the signature is invalid", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(false);
    const res = await POST(makeRequest("{}", { "x-cld-signature": "bad", "x-cld-timestamp": "1" }));
    expect(res.status).toBe(401);
    expect(enrichAsset).not.toHaveBeenCalled();
  });

  it("enriches the asset on a valid upload notification", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    const body = JSON.stringify({
      notification_type: "upload",
      public_id: "a1",
      context: { custom: { project_id: "flood-relief" } },
    });
    const res = await POST(makeRequest(body, { "x-cld-signature": "ok", "x-cld-timestamp": "1" }));
    expect(res.status).toBe(200);
    expect(enrichAsset).toHaveBeenCalledWith("a1", "flood-relief");
  });

  it("ignores non-upload notifications without erroring", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValue(true);
    const body = JSON.stringify({ notification_type: "delete", public_id: "a1" });
    const res = await POST(makeRequest(body, { "x-cld-signature": "ok", "x-cld-timestamp": "1" }));
    expect(res.status).toBe(200);
    expect(enrichAsset).not.toHaveBeenCalled();
  });
});
