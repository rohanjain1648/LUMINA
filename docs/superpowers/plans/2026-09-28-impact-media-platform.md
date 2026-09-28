# Impact & Sustainability Media Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the working vertical slice of the hackathon platform — Cloudinary ingestion + AI enrichment (Claude vision + Pinecone embeddings) + REST API (assets, search, compare, reports) + a TypeScript Next.js frontend for the library, before/after workspace.

**Architecture:** Next.js (App Router, TypeScript) hosts both the frontend and the REST API routes. Cloudinary is the system of record for assets and metadata; a webhook-triggered enrichment pipeline calls Claude (vision) for tagging/captioning and Pinecone for semantic-search embeddings. Every module is dependency-injectable so it can be unit tested with mocked SDK clients — no live network calls in tests.

**Tech Stack:** Next.js 15 (App Router) + TypeScript, `cloudinary` SDK, `@anthropic-ai/sdk`, `@pinecone-database/pinecone`, Voyage AI embeddings via REST, Vitest + Testing Library for tests.

**Spec:** `docs/superpowers/specs/2026-09-28-media-intelligence-platform-design.md`

## Global Constraints

- Frontend is TypeScript (Next.js App Router).
- Backend is REST only — no GraphQL.
- Cloudinary is the source of truth for assets and metadata; originals are never overwritten, only enriched via Context/Structured Metadata.
- Pinecone is a derived, rebuildable index — never authoritative.
- Claude is the reasoning layer only — enrichment failures must never block an asset from being usable via Cloudinary's own auto-tags.
- Search falls back to Cloudinary tag search if the embedding call or Pinecone query fails.

## Review Focus

- Cloudinary webhook called with a missing/invalid signature — must be rejected with 401, not processed.
- Claude vision call fails/times out during enrichment — asset must still get Cloudinary context written (empty `ai_tags`/`caption`), not crash the webhook handler.
- Pinecone or the embedding call fails during search — must fall back to Cloudinary tag search and still return results, not a 500.
- `/api/compare` called with two assets from different `series_id`/locations (manual pairing) — must still return a comparison, not reject based on series mismatch.
- `/api/reports` called for a project/date range with zero matching assets — must return an empty-state report, not throw.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/app/layout.tsx`
- Test: `src/lib/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: a working `npm test` (Vitest) and `npm run dev`/`npm run build` (Next.js) setup that every later task relies on.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "impact-media-platform",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "cloudinary": "^2.5.0",
    "@anthropic-ai/sdk": "^0.32.0",
    "@pinecone-database/pinecone": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.6.0",
    "jsdom": "^25.0.0",
    "@types/react": "^18.3.0",
    "@types/node": "^22.7.0"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "vitest.config.ts"]
}
```

- [ ] **Step 3: Write `next.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`**

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Write `src/app/layout.tsx`**

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: installs without error.

- [ ] **Step 6: Write the smoke test**

```ts
// src/lib/__tests__/smoke.test.ts
import { describe, it, expect } from "vitest";

describe("project scaffold", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 7: Run tests to verify the scaffold works**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json next.config.mjs vitest.config.ts vitest.setup.ts src/app/layout.tsx src/lib/__tests__/smoke.test.ts
git commit -m "chore: scaffold Next.js + TypeScript + Vitest project"
```

---

### Task 2: Shared types + Cloudinary client

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/cloudinary.ts`
- Test: `src/lib/__tests__/cloudinary.test.ts`

**Interfaces:**
- Produces: `AssetMetadata`, `CompareResult`, `ReportData` types; `CloudinaryAsset` type; `fetchAsset(publicId: string): Promise<CloudinaryAsset>`; `updateAssetContext(publicId: string, context: Record<string,string>): Promise<void>`; `searchAssets(filters: { projectId?: string; location?: string; from?: string; to?: string }): Promise<CloudinaryAsset[]>`; `listAssetsByTag(tag: string): Promise<CloudinaryAsset[]>`; `verifyWebhookSignature(rawBody: string, timestamp: string, signature: string, apiSecret: string): boolean`.

- [ ] **Step 1: Write `src/lib/types.ts`**

```ts
export interface AssetMetadata {
  publicId: string;
  projectId: string;
  location: { name: string; lat?: number; lng?: number };
  capturedAt: string;
  uploader: string;
  activityTags: string[];
  aiTags: string[];
  caption: string;
  seriesId: string;
  sourceRef: string;
  secureUrl: string;
}

export interface CompareResult {
  changeSummary: string;
  confidence: number;
  visualHighlights: string[];
}

export interface ReportData {
  id: string;
  projectId: string;
  from: string;
  to: string;
  summary: string;
  assets: AssetMetadata[];
  createdAt: string;
}
```

- [ ] **Step 2: Write the failing test for `verifyWebhookSignature`**

```ts
// src/lib/__tests__/cloudinary.test.ts
import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { verifyWebhookSignature } from "../cloudinary";

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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- cloudinary.test.ts`
Expected: FAIL — `src/lib/cloudinary.ts` does not exist yet.

- [ ] **Step 4: Write `src/lib/cloudinary.ts`**

```ts
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
  await cloudinary.uploader.add_context(context, [publicId]);
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- cloudinary.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/cloudinary.ts src/lib/__tests__/cloudinary.test.ts
git commit -m "feat: add shared types and Cloudinary client"
```

---

### Task 3: Claude client (tagging, comparison, report drafting)

**Files:**
- Create: `src/lib/claudeClient.ts`
- Test: `src/lib/__tests__/claudeClient.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `tagImage(imageUrl: string, projectHint: string, client?): Promise<{ aiTags: string[]; caption: string }>`; `compareImages(urlA: string, urlB: string, client?): Promise<CompareResult>`; `draftReportSummary(assets: { caption: string; aiTags: string[] }[], client?): Promise<string>`. Each accepts an optional injected Anthropic client for testability.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/claudeClient.test.ts
import { describe, it, expect, vi } from "vitest";
import { tagImage, compareImages, draftReportSummary } from "../claudeClient";

function fakeClient(text: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({ content: [{ type: "text", text }] }),
    },
  } as any;
}

describe("claudeClient", () => {
  it("tagImage parses the JSON response", async () => {
    const client = fakeClient('{"aiTags":["reforestation"],"caption":"New saplings planted"}');
    const result = await tagImage("https://example.com/a.jpg", "reforestation project", client);
    expect(result).toEqual({ aiTags: ["reforestation"], caption: "New saplings planted" });
  });

  it("compareImages parses the JSON response", async () => {
    const client = fakeClient(
      '{"changeSummary":"Canopy coverage increased","confidence":0.8,"visualHighlights":["denser foliage"]}'
    );
    const result = await compareImages("https://example.com/a.jpg", "https://example.com/b.jpg", client);
    expect(result.confidence).toBe(0.8);
    expect(result.changeSummary).toContain("Canopy");
  });

  it("draftReportSummary returns the raw text response", async () => {
    const client = fakeClient("This project shows strong visible progress.");
    const summary = await draftReportSummary([{ caption: "Trees planted", aiTags: ["reforestation"] }], client);
    expect(summary).toBe("This project shows strong visible progress.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- claudeClient.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `src/lib/claudeClient.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";
import type { CompareResult } from "./types";

const defaultClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractText(response: Anthropic.Message): string {
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "{}";
}

export async function tagImage(
  imageUrl: string,
  projectHint: string,
  client: Anthropic = defaultClient
): Promise<{ aiTags: string[]; caption: string }> {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: imageUrl } },
          {
            type: "text",
            text: `This photo is from a sustainability/field project. Project hint: "${projectHint}". Return strict JSON only: {"aiTags": string[], "caption": string}. Tags should describe sustainability-relevant activities/signals (e.g. reforestation, flood damage, solar install).`,
          },
        ],
      },
    ],
  });
  return JSON.parse(extractText(response));
}

export async function compareImages(
  urlA: string,
  urlB: string,
  client: Anthropic = defaultClient
): Promise<CompareResult> {
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "url", url: urlA } },
          { type: "image", source: { type: "url", url: urlB } },
          {
            type: "text",
            text: `These two photos were taken at the same location at different times (first is "before", second is "after"). Describe what changed, quantify where possible, and rate your confidence from 0 to 1. Return strict JSON only: {"changeSummary": string, "confidence": number, "visualHighlights": string[]}.`,
          },
        ],
      },
    ],
  });
  return JSON.parse(extractText(response));
}

export async function draftReportSummary(
  assets: { caption: string; aiTags: string[] }[],
  client: Anthropic = defaultClient
): Promise<string> {
  const context = assets.map((a) => `- ${a.caption} [${a.aiTags.join(", ")}]`).join("\n");
  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `Draft a short impact report (3-4 paragraphs) summarizing this field evidence for a sustainability project:\n${context}`,
      },
    ],
  });
  return extractText(response);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- claudeClient.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/claudeClient.ts src/lib/__tests__/claudeClient.test.ts
git commit -m "feat: add Claude client for tagging, comparison, and report drafting"
```

---

### Task 4: Embeddings + Pinecone client

**Files:**
- Create: `src/lib/embeddings.ts`
- Create: `src/lib/pineconeClient.ts`
- Test: `src/lib/__tests__/embeddings.test.ts`
- Test: `src/lib/__tests__/pineconeClient.test.ts`

**Interfaces:**
- Produces: `embedText(text: string, fetchImpl?: typeof fetch): Promise<number[]>`; `upsertAssetEmbedding(publicId: string, vector: number[], metadata: Record<string,string>, index?): Promise<void>`; `queryByEmbedding(vector: number[], topK?: number, index?): Promise<string[]>`.

- [ ] **Step 1: Write the failing test for embeddings**

```ts
// src/lib/__tests__/embeddings.test.ts
import { describe, it, expect, vi } from "vitest";
import { embedText } from "../embeddings";

describe("embedText", () => {
  it("returns the embedding vector from the Voyage response", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ embedding: [0.1, 0.2, 0.3] }] }),
    });
    const result = await embedText("reforestation photo", fakeFetch as unknown as typeof fetch);
    expect(result).toEqual([0.1, 0.2, 0.3]);
  });

  it("throws when the request fails", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(embedText("x", fakeFetch as unknown as typeof fetch)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- embeddings.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `src/lib/embeddings.ts`**

```ts
export async function embedText(text: string, fetchImpl: typeof fetch = fetch): Promise<number[]> {
  const response = await fetchImpl("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: [text], model: "voyage-3" }),
  });
  if (!response.ok) {
    throw new Error(`Voyage embedding request failed: ${response.status}`);
  }
  const data = await response.json();
  return data.data[0].embedding as number[];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- embeddings.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for the Pinecone client**

```ts
// src/lib/__tests__/pineconeClient.test.ts
import { describe, it, expect, vi } from "vitest";
import { upsertAssetEmbedding, queryByEmbedding } from "../pineconeClient";

function fakeIndex() {
  return {
    upsert: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue({ matches: [{ id: "asset_1" }, { id: "asset_2" }] }),
  } as any;
}

describe("pineconeClient", () => {
  it("upsertAssetEmbedding calls index.upsert with the right shape", async () => {
    const index = fakeIndex();
    await upsertAssetEmbedding("asset_1", [0.1, 0.2], { caption: "trees" }, index);
    expect(index.upsert).toHaveBeenCalledWith([
      { id: "asset_1", values: [0.1, 0.2], metadata: { caption: "trees" } },
    ]);
  });

  it("queryByEmbedding returns matched ids", async () => {
    const index = fakeIndex();
    const ids = await queryByEmbedding([0.1, 0.2], 10, index);
    expect(ids).toEqual(["asset_1", "asset_2"]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- pineconeClient.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 7: Write `src/lib/pineconeClient.ts`**

```ts
import { Pinecone, type Index } from "@pinecone-database/pinecone";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
const defaultIndex = pinecone.index(process.env.PINECONE_INDEX_NAME as string);

export async function upsertAssetEmbedding(
  publicId: string,
  vector: number[],
  metadata: Record<string, string>,
  index: Index = defaultIndex
): Promise<void> {
  await index.upsert([{ id: publicId, values: vector, metadata }]);
}

export async function queryByEmbedding(
  vector: number[],
  topK = 10,
  index: Index = defaultIndex
): Promise<string[]> {
  const result = await index.query({ vector, topK, includeMetadata: false });
  return result.matches?.map((m) => m.id) ?? [];
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- pineconeClient.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/embeddings.ts src/lib/pineconeClient.ts src/lib/__tests__/embeddings.test.ts src/lib/__tests__/pineconeClient.test.ts
git commit -m "feat: add Voyage embeddings and Pinecone client"
```

---

### Task 5: Enrichment pipeline

**Files:**
- Create: `src/lib/enrichment.ts`
- Test: `src/lib/__tests__/enrichment.test.ts`

**Interfaces:**
- Consumes: `fetchAsset`, `updateAssetContext` (Task 2); `tagImage` (Task 3); `embedText` (Task 4); `upsertAssetEmbedding` (Task 4).
- Produces: `enrichAsset(publicId: string, projectHint: string, deps?: EnrichmentDeps): Promise<void>`, where `EnrichmentDeps` names each of the five functions above — later tasks (webhook route) call `enrichAsset` with no deps override in production.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/enrichment.test.ts
import { describe, it, expect, vi } from "vitest";
import { enrichAsset } from "../enrichment";

describe("enrichAsset", () => {
  it("tags, embeds, and writes context on success", async () => {
    const deps = {
      fetchAsset: vi.fn().mockResolvedValue({ public_id: "a1", secure_url: "https://x/a1.jpg", tags: ["water"] }),
      tagImage: vi.fn().mockResolvedValue({ aiTags: ["flood damage"], caption: "Flooded field" }),
      embedText: vi.fn().mockResolvedValue([0.1, 0.2]),
      upsertAssetEmbedding: vi.fn().mockResolvedValue(undefined),
      updateAssetContext: vi.fn().mockResolvedValue(undefined),
    };

    await enrichAsset("a1", "flood-relief", deps);

    expect(deps.updateAssetContext).toHaveBeenCalledWith("a1", {
      ai_tags: "flood damage",
      caption: "Flooded field",
    });
    expect(deps.upsertAssetEmbedding).toHaveBeenCalledWith("a1", [0.1, 0.2], { caption: "Flooded field" });
  });

  it("still writes empty context when Claude tagging fails, and does not throw", async () => {
    const deps = {
      fetchAsset: vi.fn().mockResolvedValue({ public_id: "a2", secure_url: "https://x/a2.jpg", tags: [] }),
      tagImage: vi.fn().mockRejectedValue(new Error("timeout")),
      embedText: vi.fn().mockResolvedValue([0.3]),
      upsertAssetEmbedding: vi.fn().mockResolvedValue(undefined),
      updateAssetContext: vi.fn().mockResolvedValue(undefined),
    };

    await expect(enrichAsset("a2", "flood-relief", deps)).resolves.not.toThrow();
    expect(deps.updateAssetContext).toHaveBeenCalledWith("a2", { ai_tags: "", caption: "" });
  });

  it("does not throw when embedding/Pinecone fails", async () => {
    const deps = {
      fetchAsset: vi.fn().mockResolvedValue({ public_id: "a3", secure_url: "https://x/a3.jpg", tags: [] }),
      tagImage: vi.fn().mockResolvedValue({ aiTags: [], caption: "caption" }),
      embedText: vi.fn().mockRejectedValue(new Error("pinecone down")),
      upsertAssetEmbedding: vi.fn(),
      updateAssetContext: vi.fn().mockResolvedValue(undefined),
    };

    await expect(enrichAsset("a3", "flood-relief", deps)).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- enrichment.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `src/lib/enrichment.ts`**

```ts
import { fetchAsset, updateAssetContext } from "./cloudinary";
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
    const tagged = await deps.tagImage(asset.secure_url, projectHint);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- enrichment.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/enrichment.ts src/lib/__tests__/enrichment.test.ts
git commit -m "feat: add enrichment pipeline (tag, embed, upsert)"
```

---

### Task 6: Cloudinary webhook route

**Files:**
- Create: `src/app/api/assets/webhook/route.ts`
- Test: `src/app/api/assets/webhook/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `verifyWebhookSignature` (Task 2), `enrichAsset` (Task 5).
- Produces: `POST` handler at `/api/assets/webhook`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/assets/webhook/__tests__/route.test.ts
import { describe, it, expect, vi } from "vitest";
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/assets/webhook`
Expected: FAIL — route module does not exist.

- [ ] **Step 3: Write `src/app/api/assets/webhook/route.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/assets/webhook`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/assets/webhook/route.ts src/app/api/assets/webhook/__tests__/route.test.ts
git commit -m "feat: add Cloudinary upload webhook route"
```

---

### Task 7: Assets list route

**Files:**
- Create: `src/app/api/assets/route.ts`
- Test: `src/app/api/assets/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `searchAssets` (Task 2).
- Produces: `GET` handler at `/api/assets` returning `{ assets: CloudinaryAsset[] }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/assets/__tests__/route.test.ts
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/cloudinary", () => ({
  searchAssets: vi.fn().mockResolvedValue([{ public_id: "a1", secure_url: "https://x/a1.jpg" }]),
}));

import { searchAssets } from "@/lib/cloudinary";
import { GET } from "../route";

describe("GET /api/assets", () => {
  it("passes query params through to searchAssets and returns the results", async () => {
    const req = new NextRequest("http://localhost/api/assets?project_id=flood-relief&location=riverside");
    const res = await GET(req);
    const body = await res.json();

    expect(searchAssets).toHaveBeenCalledWith({
      projectId: "flood-relief",
      location: "riverside",
      from: undefined,
      to: undefined,
    });
    expect(body.assets).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/assets/__tests__`
Expected: FAIL — route module does not exist.

- [ ] **Step 3: Write `src/app/api/assets/route.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/assets/__tests__`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/assets/route.ts src/app/api/assets/__tests__/route.test.ts
git commit -m "feat: add GET /api/assets list/filter route"
```

---

### Task 8: Search route with Cloudinary fallback

**Files:**
- Create: `src/app/api/search/route.ts`
- Test: `src/app/api/search/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `embedText` (Task 4), `queryByEmbedding` (Task 4), `listAssetsByTag` (Task 2).
- Produces: `POST` handler at `/api/search` returning `{ publicIds: string[]; source: "pinecone" | "cloudinary-fallback" }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/search/__tests__/route.test.ts
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/embeddings", () => ({ embedText: vi.fn() }));
vi.mock("@/lib/pineconeClient", () => ({ queryByEmbedding: vi.fn() }));
vi.mock("@/lib/cloudinary", () => ({ listAssetsByTag: vi.fn() }));

import { embedText } from "@/lib/embeddings";
import { queryByEmbedding } from "@/lib/pineconeClient";
import { listAssetsByTag } from "@/lib/cloudinary";
import { POST } from "../route";

function makeRequest(query: string) {
  return new NextRequest("http://localhost/api/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

describe("POST /api/search", () => {
  it("returns Pinecone results when embedding + query succeed", async () => {
    vi.mocked(embedText).mockResolvedValue([0.1]);
    vi.mocked(queryByEmbedding).mockResolvedValue(["a1", "a2"]);

    const res = await POST(makeRequest("flood damage near river"));
    const body = await res.json();

    expect(body).toEqual({ publicIds: ["a1", "a2"], source: "pinecone" });
  });

  it("falls back to Cloudinary tag search when embedding fails", async () => {
    vi.mocked(embedText).mockRejectedValue(new Error("voyage down"));
    vi.mocked(listAssetsByTag).mockResolvedValue([{ public_id: "a3", secure_url: "https://x/a3.jpg" }]);

    const res = await POST(makeRequest("flood damage"));
    const body = await res.json();

    expect(body).toEqual({ publicIds: ["a3"], source: "cloudinary-fallback" });
    expect(listAssetsByTag).toHaveBeenCalledWith("flood");
  });

  it("returns 400 when query is missing", async () => {
    const res = await POST(makeRequest(""));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/search`
Expected: FAIL — route module does not exist.

- [ ] **Step 3: Write `src/app/api/search/route.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/search`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/search/route.ts src/app/api/search/__tests__/route.test.ts
git commit -m "feat: add semantic search route with Cloudinary fallback"
```

---

### Task 9: Compare (before/after) route

**Files:**
- Create: `src/app/api/compare/route.ts`
- Test: `src/app/api/compare/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `fetchAsset` (Task 2), `compareImages` (Task 3).
- Produces: `POST` handler at `/api/compare` returning a `CompareResult`.

- [ ] **Step 1: Write the failing test**

```ts
// src/app/api/compare/__tests__/route.test.ts
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/cloudinary", () => ({ fetchAsset: vi.fn() }));
vi.mock("@/lib/claudeClient", () => ({ compareImages: vi.fn() }));

import { fetchAsset } from "@/lib/cloudinary";
import { compareImages } from "@/lib/claudeClient";
import { POST } from "../route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/compare", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/compare", () => {
  it("returns 400 when assetA or assetB is missing", async () => {
    const res = await POST(makeRequest({ assetA: "a1" }));
    expect(res.status).toBe(400);
  });

  it("compares two assets from different series without rejecting the pair", async () => {
    vi.mocked(fetchAsset).mockImplementation(async (id: string) => ({
      public_id: id,
      secure_url: `https://x/${id}.jpg`,
      context: { custom: { series_id: id === "a1" ? "series-north" : "series-south" } },
    }));
    vi.mocked(compareImages).mockResolvedValue({
      changeSummary: "Visible new construction",
      confidence: 0.6,
      visualHighlights: ["new rooftop"],
    });

    const res = await POST(makeRequest({ assetA: "a1", assetB: "a2" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.changeSummary).toBe("Visible new construction");
    expect(compareImages).toHaveBeenCalledWith("https://x/a1.jpg", "https://x/a2.jpg");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/app/api/compare`
Expected: FAIL — route module does not exist.

- [ ] **Step 3: Write `src/app/api/compare/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchAsset } from "@/lib/cloudinary";
import { compareImages } from "@/lib/claudeClient";

export async function POST(request: NextRequest) {
  const { assetA, assetB } = await request.json();
  if (!assetA || !assetB) {
    return NextResponse.json({ error: "assetA and assetB are required" }, { status: 400 });
  }

  const [a, b] = await Promise.all([fetchAsset(assetA), fetchAsset(assetB)]);
  const result = await compareImages(a.secure_url, b.secure_url);

  return NextResponse.json(result);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/app/api/compare`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/compare/route.ts src/app/api/compare/__tests__/route.test.ts
git commit -m "feat: add before/after compare route"
```

---

### Task 10: Report routes + in-memory store

**Files:**
- Create: `src/lib/reportStore.ts`
- Create: `src/app/api/reports/route.ts`
- Create: `src/app/api/reports/[id]/route.ts`
- Test: `src/lib/__tests__/reportStore.test.ts`
- Test: `src/app/api/reports/__tests__/route.test.ts`
- Test: `src/app/api/reports/[id]/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `searchAssets` (Task 2), `draftReportSummary` (Task 3), `ReportData`/`AssetMetadata` (Task 2).
- Produces: `saveReport(report: ReportData): void`; `getReport(id: string): ReportData | undefined`; `POST /api/reports`; `GET /api/reports/:id`.

- [ ] **Step 1: Write the failing test for the store**

```ts
// src/lib/__tests__/reportStore.test.ts
import { describe, it, expect } from "vitest";
import { saveReport, getReport } from "../reportStore";

describe("reportStore", () => {
  it("returns a saved report by id", () => {
    saveReport({
      id: "r1",
      projectId: "flood-relief",
      from: "2026-01-01",
      to: "2026-02-01",
      summary: "summary",
      assets: [],
      createdAt: "2026-02-01T00:00:00.000Z",
    });
    expect(getReport("r1")?.summary).toBe("summary");
  });

  it("returns undefined for an unknown id", () => {
    expect(getReport("does-not-exist")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reportStore.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Write `src/lib/reportStore.ts`**

```ts
import type { ReportData } from "./types";

const reports = new Map<string, ReportData>();

export function saveReport(report: ReportData): void {
  reports.set(report.id, report);
}

export function getReport(id: string): ReportData | undefined {
  return reports.get(id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reportStore.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for `POST /api/reports`**

```ts
// src/app/api/reports/__tests__/route.test.ts
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/cloudinary", () => ({ searchAssets: vi.fn() }));
vi.mock("@/lib/claudeClient", () => ({ draftReportSummary: vi.fn() }));

import { searchAssets } from "@/lib/cloudinary";
import { draftReportSummary } from "@/lib/claudeClient";
import { POST } from "../route";

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/reports", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/reports", () => {
  it("returns 400 when projectId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns an empty-state report when no assets match", async () => {
    vi.mocked(searchAssets).mockResolvedValue([]);
    const res = await POST(makeRequest({ projectId: "flood-relief", from: "2026-01-01", to: "2026-02-01" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.assets).toEqual([]);
    expect(body.summary).toBe("No assets found for this project and date range.");
    expect(draftReportSummary).not.toHaveBeenCalled();
  });

  it("drafts a summary and returns the assembled report when assets match", async () => {
    vi.mocked(searchAssets).mockResolvedValue([
      {
        public_id: "a1",
        secure_url: "https://x/a1.jpg",
        tags: ["water"],
        context: { custom: { caption: "Flooded field", ai_tags: "flood damage", location: "riverside" } },
      },
    ]);
    vi.mocked(draftReportSummary).mockResolvedValue("Strong visible progress.");

    const res = await POST(makeRequest({ projectId: "flood-relief" }));
    const body = await res.json();

    expect(body.summary).toBe("Strong visible progress.");
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0].aiTags).toEqual(["flood damage"]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- src/app/api/reports/__tests__`
Expected: FAIL — route module does not exist.

- [ ] **Step 7: Write `src/app/api/reports/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { searchAssets } from "@/lib/cloudinary";
import { draftReportSummary } from "@/lib/claudeClient";
import { saveReport } from "@/lib/reportStore";
import type { ReportData, AssetMetadata } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { projectId, from, to } = await request.json();
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const cloudinaryAssets = await searchAssets({ projectId, from, to });

  if (cloudinaryAssets.length === 0) {
    const empty: ReportData = {
      id: randomUUID(),
      projectId,
      from: from ?? "",
      to: to ?? "",
      summary: "No assets found for this project and date range.",
      assets: [],
      createdAt: new Date().toISOString(),
    };
    saveReport(empty);
    return NextResponse.json(empty);
  }

  const assets: AssetMetadata[] = cloudinaryAssets.map((a) => ({
    publicId: a.public_id,
    projectId,
    location: { name: a.context?.custom?.location ?? "" },
    capturedAt: a.context?.custom?.captured_at ?? "",
    uploader: a.context?.custom?.uploader ?? "",
    activityTags: a.tags ?? [],
    aiTags: (a.context?.custom?.ai_tags ?? "").split("|").filter(Boolean),
    caption: a.context?.custom?.caption ?? "",
    seriesId: a.context?.custom?.series_id ?? "",
    sourceRef: a.context?.custom?.source_ref ?? "",
    secureUrl: a.secure_url,
  }));

  const summary = await draftReportSummary(assets.map((a) => ({ caption: a.caption, aiTags: a.aiTags })));

  const report: ReportData = {
    id: randomUUID(),
    projectId,
    from: from ?? "",
    to: to ?? "",
    summary,
    assets,
    createdAt: new Date().toISOString(),
  };
  saveReport(report);
  return NextResponse.json(report);
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- src/app/api/reports/__tests__`
Expected: PASS (3 tests).

- [ ] **Step 9: Write the failing test for `GET /api/reports/:id`**

```ts
// src/app/api/reports/[id]/__tests__/route.test.ts
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
      params: { id: "missing" },
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
    const res = await GET(new NextRequest("http://localhost/api/reports/r1"), { params: { id: "r1" } });
    const body = await res.json();
    expect(body.id).toBe("r1");
  });
});
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npm test -- "src/app/api/reports/[id]"`
Expected: FAIL — route module does not exist.

- [ ] **Step 11: Write `src/app/api/reports/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getReport } from "@/lib/reportStore";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const report = getReport(params.id);
  if (!report) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(report);
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npm test -- "src/app/api/reports/[id]"`
Expected: PASS (2 tests).

- [ ] **Step 13: Commit**

```bash
git add src/lib/reportStore.ts src/app/api/reports src/lib/__tests__/reportStore.test.ts
git commit -m "feat: add report generation and retrieval routes"
```

---

### Task 11: Frontend library page

**Files:**
- Create: `src/components/AssetGrid.tsx`
- Create: `src/app/page.tsx`
- Test: `src/components/__tests__/AssetGrid.test.tsx`

**Interfaces:**
- Consumes: `GET /api/assets` (Task 7) via `fetch`.
- Produces: `AssetGrid` component rendered on the root page.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/__tests__/AssetGrid.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AssetGrid } from "../AssetGrid";

afterEach(() => vi.unstubAllGlobals());

describe("AssetGrid", () => {
  it("renders assets returned by /api/assets", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          assets: [
            { public_id: "a1", secure_url: "https://x/a1.jpg", context: { custom: { caption: "Flooded field" } } },
          ],
        }),
      })
    );

    render(<AssetGrid />);

    await waitFor(() => expect(screen.getByTestId("asset-grid")).toBeInTheDocument());
    expect(screen.getByText("Flooded field")).toBeInTheDocument();
  });

  it("shows an empty state when there are no assets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ json: async () => ({ assets: [] }) }));

    render(<AssetGrid />);

    await waitFor(() => expect(screen.getByText("No assets found.")).toBeInTheDocument());
  });

  it("shows an error message when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

    render(<AssetGrid />);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Failed to load assets"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AssetGrid.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write `src/components/AssetGrid.tsx`**

```tsx
"use client";
import { useEffect, useState } from "react";

interface Asset {
  public_id: string;
  secure_url: string;
  context?: { custom?: Record<string, string> };
}

export function AssetGrid({ projectId }: { projectId?: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (projectId) params.set("project_id", projectId);
    fetch(`/api/assets?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => setAssets(data.assets ?? []))
      .catch(() => setError("Failed to load assets"));
  }, [projectId]);

  if (error) return <p role="alert">{error}</p>;
  if (assets.length === 0) return <p>No assets found.</p>;

  return (
    <ul data-testid="asset-grid">
      {assets.map((asset) => (
        <li key={asset.public_id}>
          <img src={asset.secure_url} alt={asset.context?.custom?.caption ?? asset.public_id} />
          <span>{asset.context?.custom?.caption}</span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- AssetGrid.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write `src/app/page.tsx`**

```tsx
import { AssetGrid } from "@/components/AssetGrid";

export default function LibraryPage() {
  return (
    <main>
      <h1>Media Library</h1>
      <AssetGrid />
    </main>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/AssetGrid.tsx src/app/page.tsx src/components/__tests__/AssetGrid.test.tsx
git commit -m "feat: add media library page"
```

---

### Task 12: Frontend before/after compare page

**Files:**
- Create: `src/components/CompareView.tsx`
- Create: `src/app/compare/page.tsx`
- Test: `src/components/__tests__/CompareView.test.tsx`

**Interfaces:**
- Consumes: `POST /api/compare` (Task 9) via `fetch`.
- Produces: `CompareView` component rendered on `/compare`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/__tests__/CompareView.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompareView } from "../CompareView";

afterEach(() => vi.unstubAllGlobals());

describe("CompareView", () => {
  it("shows the comparison result after a successful compare", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          changeSummary: "Canopy coverage increased",
          confidence: 0.8,
          visualHighlights: ["denser foliage"],
        }),
      })
    );

    const user = userEvent.setup();
    render(<CompareView />);

    await user.type(screen.getByLabelText("Before asset"), "a1");
    await user.type(screen.getByLabelText("After asset"), "a2");
    await user.click(screen.getByRole("button", { name: "Compare" }));

    await waitFor(() => expect(screen.getByTestId("compare-result")).toBeInTheDocument());
    expect(screen.getByText("Canopy coverage increased")).toBeInTheDocument();
  });

  it("shows an error when the compare request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const user = userEvent.setup();
    render(<CompareView />);

    await user.click(screen.getByRole("button", { name: "Compare" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Comparison failed"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CompareView.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Write `src/components/CompareView.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { CompareResult } from "@/lib/types";

export function CompareView() {
  const [assetA, setAssetA] = useState("");
  const [assetB, setAssetB] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runCompare() {
    setError(null);
    setResult(null);
    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetA, assetB }),
    });
    if (!res.ok) {
      setError("Comparison failed");
      return;
    }
    setResult(await res.json());
  }

  return (
    <div>
      <input aria-label="Before asset" value={assetA} onChange={(e) => setAssetA(e.target.value)} />
      <input aria-label="After asset" value={assetB} onChange={(e) => setAssetB(e.target.value)} />
      <button onClick={runCompare}>Compare</button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div data-testid="compare-result">
          <p>{result.changeSummary}</p>
          <p>Confidence: {result.confidence}</p>
          <ul>
            {result.visualHighlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CompareView.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `src/app/compare/page.tsx`**

```tsx
import { CompareView } from "@/components/CompareView";

export default function ComparePage() {
  return (
    <main>
      <h1>Before / After</h1>
      <CompareView />
    </main>
  );
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS (all tests across all 12 tasks).

- [ ] **Step 7: Commit**

```bash
git add src/components/CompareView.tsx src/app/compare/page.tsx src/components/__tests__/CompareView.test.tsx
git commit -m "feat: add before/after compare page"
```
