import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { queryByEmbedding } from "@/lib/pineconeClient";
import { listAssetsByTag } from "@/lib/cloudinary";

export async function POST(request: NextRequest) {
  const { query } = await request.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const vector = await embedText(query);
    const publicIds = await queryByEmbedding(vector);
    return NextResponse.json({ publicIds, source: "pinecone" });
  } catch {
    const fallbackTag = query.trim().toLowerCase().split(/\s+/)[0];
    const assets = await listAssetsByTag(fallbackTag);
    return NextResponse.json({
      publicIds: assets.map((a) => a.public_id),
      source: "cloudinary-fallback",
    });
  }
}
