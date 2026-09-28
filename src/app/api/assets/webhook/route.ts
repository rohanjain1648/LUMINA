import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/cloudinary";
import { enrichAsset } from "@/lib/enrichment";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-cld-signature") ?? "";
  const timestamp = request.headers.get("x-cld-timestamp") ?? "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET as string;

  if (!verifyWebhookSignature(rawBody, timestamp, signature, apiSecret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  if (payload.notification_type !== "upload") {
    return NextResponse.json({ ok: true });
  }

  const projectHint = payload.context?.custom?.project_id ?? "unknown";
  await enrichAsset(payload.public_id, projectHint);

  return NextResponse.json({ ok: true });
}
