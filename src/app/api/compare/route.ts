import { NextRequest, NextResponse } from "next/server";
import { fetchAsset, toVisionUrl } from "@/lib/cloudinary";
import { compareImages } from "@/lib/claudeClient";

export async function POST(request: NextRequest) {
  const { assetA, assetB } = await request.json();
  if (!assetA || !assetB) {
    return NextResponse.json({ error: "assetA and assetB are required" }, { status: 400 });
  }

  try {
    const [a, b] = await Promise.all([fetchAsset(assetA), fetchAsset(assetB)]);
    const result = await compareImages(toVisionUrl(a.secure_url), toVisionUrl(b.secure_url));
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "comparison failed" }, { status: 502 });
  }
}
