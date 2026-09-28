import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature, toVisionUrl } from "../cloudinary";

describe("verifyWebhookSignature", () => {
  it("accepts a signature computed the same way Cloudinary computes it", () => {
    const rawBody = '{"public_id":"abc"}';
    const timestamp = "1700000000";
    const apiSecret = "test-secret";
    const signature = crypto
      .createHash("sha1")
      .update(rawBody + timestamp + apiSecret)
      .digest("hex");

    expect(verifyWebhookSignature(rawBody, timestamp, signature, apiSecret)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    expect(verifyWebhookSignature("{}", "1700000000", "wrong", "test-secret")).toBe(false);
  });
});

describe("toVisionUrl", () => {
  it("inserts a resize transformation after /upload/", () => {
    expect(toVisionUrl("https://res.cloudinary.com/demo/image/upload/v1/a.jpg")).toBe(
      "https://res.cloudinary.com/demo/image/upload/w_1600,c_limit/v1/a.jpg"
    );
  });
});
