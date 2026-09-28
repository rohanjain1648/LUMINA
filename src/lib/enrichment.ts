import { fetchAsset, updateAssetContext, toVisionUrl } from "./cloudinary";
import { tagImage } from "./claudeClient";
import { embedText } from "./embeddings";
import { upsertAssetEmbedding } from "./pineconeClient";

export interface EnrichmentDeps {
  fetchAsset: typeof fetchAsset;
  tagImage: typeof tagImage;
  embedText: typeof embedText;
  upsertAssetEmbedding: typeof upsertAssetEmbedding;
  updateAssetContext: typeof updateAssetContext;
}

const defaultDeps: EnrichmentDeps = {
  fetchAsset,
  tagImage,
  embedText,
  upsertAssetEmbedding,
  updateAssetContext,
};

export async function enrichAsset(
  publicId: string,
  projectHint: string,
  deps: EnrichmentDeps = defaultDeps
): Promise<void> {
  const asset = await deps.fetchAsset(publicId);

  let aiTags: string[] = [];
  let caption = "";
  try {
    const tagged = await deps.tagImage(toVisionUrl(asset.secure_url), projectHint);
    aiTags = tagged.aiTags;
    caption = tagged.caption;
  } catch {
    // Enrichment failure must not block the asset — it still has
    // Cloudinary's own auto-tags (asset.tags) and stays queryable.
  }

  await deps.updateAssetContext(publicId, {
    ai_tags: aiTags.join("|"),
    caption,
  });

  try {
    const embedding = await deps.embedText([caption, ...aiTags, ...(asset.tags ?? [])].join(", "));
    await deps.upsertAssetEmbedding(publicId, embedding, { caption });
  } catch {
    // Semantic search falls back to Cloudinary tag search if this fails;
    // don't block asset enrichment on it.
  }
}
