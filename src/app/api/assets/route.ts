import { NextRequest, NextResponse } from "next/server";
import { searchAssets } from "@/lib/cloudinary";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const assets = await searchAssets({
    projectId: searchParams.get("project_id") ?? undefined,
    location: searchParams.get("location") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });
  return NextResponse.json({ assets });
}
