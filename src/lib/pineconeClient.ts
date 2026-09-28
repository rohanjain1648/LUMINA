import { Pinecone, type Index } from "@pinecone-database/pinecone";

let cachedIndex: Index | undefined;

function getDefaultIndex(): Index {
  if (!cachedIndex) {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
    cachedIndex = pinecone.index(process.env.PINECONE_INDEX_NAME as string);
  }
  return cachedIndex;
}

export async function upsertAssetEmbedding(
  publicId: string,
  vector: number[],
  metadata: Record<string, string>,
  index?: Index
): Promise<void> {
  const idx = index ?? getDefaultIndex();
  await idx.upsert([{ id: publicId, values: vector, metadata }]);
}

export async function queryByEmbedding(
  vector: number[],
  topK = 10,
  index?: Index
): Promise<string[]> {
  const idx = index ?? getDefaultIndex();
  const result = await idx.query({ vector, topK, includeMetadata: false });
  return result.matches?.map((m) => m.id) ?? [];
}
