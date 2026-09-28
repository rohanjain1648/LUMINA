import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryAsset {
  public_id: string;
  secure_url: string;
  tags?: string[];
  context?: { custom?: Record<string, string> };
}

export async function fetchAsset(publicId: string): Promise<CloudinaryAsset> {
  return cloudinary.api.resource(publicId, { context: true });
}

export async function updateAssetContext(
  publicId: string,
  context: Record<string, string>
): Promise<void> {
  const contextString = Object.entries(context)
    .map(([key, value]) => `${key}=${value}`)
    .join("|");
  await cloudinary.uploader.add_context(contextString, [publicId]);
}

/**
 * Returns a Cloudinary-transformed (resized) version of a secure URL for
 * sending to Groq's vision API, which caps image size (~20MB / ~33MP).
 * Full-resolution field photos can exceed that, so we downscale to a
 * reasonable width before sending.
 */
export function toVisionUrl(secureUrl: string): string {
  return secureUrl.replace("/upload/", "/upload/w_1600,c_limit/");
}

export async function listAssetsByTag(tag: string): Promise<CloudinaryAsset[]> {
  const result = await cloudinary.api.resources_by_tag(tag, {
    context: true,
    max_results: 100,
  });
  return result.resources;
}

export async function searchAssets(filters: {
  projectId?: string;
  location?: string;
  from?: string;
  to?: string;
}): Promise<CloudinaryAsset[]> {
  const clauses: string[] = ["resource_type:image"];
  if (filters.projectId) clauses.push(`context.project_id="${filters.projectId}"`);
  if (filters.location) clauses.push(`context.location="${filters.location}"`);
  if (filters.from) clauses.push(`context.captured_at>="${filters.from}"`);
  if (filters.to) clauses.push(`context.captured_at<="${filters.to}"`);

  const result = await cloudinary.search
    .expression(clauses.join(" AND "))
    .with_field("context")
    .max_results(100)
    .execute();

  return result.resources;
}

export function verifyWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  apiSecret: string
): boolean {
  const expected = crypto
    .createHash("sha1")
    .update(rawBody + timestamp + apiSecret)
    .digest("hex");
  return expected === signature;
}
