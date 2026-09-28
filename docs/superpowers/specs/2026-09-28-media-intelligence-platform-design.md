# AI-Powered Impact & Sustainability Media Platform — Design Spec

Date: 2026-09-28
Context: Hackathon problem statement (Cloudinary), 48hr+ team build.

## 1. Problem

NGOs, governments, and sustainability orgs accumulate large volumes of field
photos/video (projects, environmental initiatives, infrastructure, community
programs). Organizing, verifying, and turning this into evidence/reports is
manual and doesn't scale.

## 2. Goal

Build a platform that:
- Analyzes and organizes large image/video collections automatically.
- Compares before/after media to show visible change over time.
- Makes media searchable via AI metadata, tagging, semantic discovery.
- Identifies projects, activities, locations, and visual signals from media.
- Generates visual reports, summaries, and campaign-ready content.
- Preserves traceability to original source assets and transformations.

## 3. Chosen approach (of 3 considered)

**Hybrid**: Cloudinary is the system of record for every asset, its metadata,
versions, and transformations (ingestion, storage, delivery, auto-tagging,
moderation, structured metadata). A thin intelligence layer sits on top:
Claude (vision-capable) does semantic tagging refinement, before/after change
narration, and report drafting; Pinecone holds embeddings for natural-language
semantic search. This keeps Cloudinary central (sponsor tech, judged
criterion), keeps custom build scope realistic for 48hrs+, and makes the
before/after feature demo-able with real reasoning rather than a bare pixel
diff.

Rejected alternatives:
- **Cloudinary-only** (no custom AI layer): fastest to build, but "AI-powered"
  story is thin — auto-tagging alone doesn't do before/after reasoning or
  semantic search well.
- **Custom-heavy** (own CLIP embeddings + CV change-detection pipeline,
  Cloudinary as dumb storage): most impressive AI depth, but too much build
  risk for the timebox and sidelines the sponsor tech.

## 4. Architecture & data flow

```
Field media (photos/videos)
   -> Upload widget (Next.js/TS) / bulk import
   -> Cloudinary (ingest, transform, store, deliver)
        -> Cloudinary AI add-ons: auto-tagging, moderation, quality checks
        -> Structured Metadata + Context (project, location, GPS/EXIF, timestamp, uploader)
   -> Enrichment worker (Node/TS REST service)
        -> Triggered by Cloudinary upload webhook (notification_url)
        -> Calls Claude (vision) for: scene description, activity/project
           classification, sustainability signal tagging
        -> Generates embedding -> upserts to Pinecone keyed by Cloudinary public_id
        -> Writes enriched tags back to Cloudinary structured metadata
   -> Next.js (TypeScript) app, backed by REST APIs:
        - Library/grid view grouped by project -> location -> timeline
        - Semantic search (natural language -> Pinecone -> Cloudinary render)
        - Before/After workspace (pick two assets -> diff + narrative)
        - Report builder (select assets/timeline -> generated report)
```

Cloudinary = source of truth for the asset and its lineage. Pinecone = derived,
rebuildable search index (never authoritative). Claude = reasoning layer only.

## 5. Stack

- **Frontend**: Next.js (App Router) + TypeScript, Tailwind for styling.
- **Backend**: REST API — a small Node/TypeScript service (can live as Next.js
  API routes for the CRUD/search endpoints, plus a standalone worker process
  for the async Cloudinary-webhook → Claude → Pinecone enrichment pipeline).
  All endpoints are plain REST (no GraphQL) so any team member can hit them
  with curl/Postman during parallel development.
- **Media**: Cloudinary (upload, transformations, structured metadata,
  auto-tagging, moderation, versioning).
- **Vector search**: Pinecone. The index must be created with dimension 1536
  to match the `text-embedding-3-small` vectors described below.
- **Embeddings**: OpenAI (`text-embedding-3-small`) for the vectors that back
  Pinecone search. This model returns 1536-dimension vectors, so the Pinecone
  index dimension must be set to 1536.
- **AI reasoning**: Groq (`meta-llama/llama-4-scout-17b-16e-instruct`, vision + text) for
  tagging refinement, before/after narration, and report drafting. (Originally
  scoped as Claude API; switched to Groq mid-build for speed/cost on the
  hackathon demo — the module boundary in `src/lib/claudeClient.ts` kept the
  same function names/signatures, so nothing else in the stack changed.)
- **Hosting**: Vercel (frontend + API routes); worker can run alongside or as
  a small separate Node process/serverless function.

## 6. Data model (Cloudinary Context / Structured Metadata per asset)

| Field | Source | Purpose |
|---|---|---|
| `project_id` | user input / inferred | groups assets by initiative |
| `location` (name + lat/lng) | EXIF GPS / user input | clustering, before/after pairing |
| `captured_at` | EXIF / upload time | timeline ordering |
| `uploader` | auth/session | attribution |
| `activity_tags[]` | Cloudinary auto-tag | baseline categorization |
| `ai_tags[]` | Claude vision | sustainability-domain tags (e.g. reforestation, flood damage, solar install) |
| `caption` | Claude vision | one-line human-readable description |
| `series_id` | enrichment worker | groups before/after pairs of same location over time |
| `source_ref` | original filename/device | traceability back to capture |

Cloudinary's native asset versioning + derived transformations already provide
lineage to the original — originals are never overwritten, only added to via
eager/derived transformations.

## 7. Module breakdown

### 7.1 Ingestion & auto-organization
Upload preset triggers Cloudinary auto-tagging + moderation. Webhook fires on
upload completion → enrichment worker calls Claude vision with the image plus
any user-supplied project hint and EXIF GPS as context (not asking Claude to
guess blind) to infer project/activity/location signal. Assets sharing GPS
proximity + project hint auto-cluster into a `series_id`, which is what makes
before/after pairing and timeline views possible without manual tagging.

### 7.2 Before/after change detection (demo centerpiece)
Given two assets in the same `series_id` (or a manually picked pair):
1. Fetch both via Cloudinary.
2. Optional cheap perceptual-hash/SSIM pass to check framing alignment.
3. Send both images to Claude vision with a structured prompt: compare the
   two field photos taken at the same location, months apart; describe what
   changed, quantify where possible (tree canopy coverage, erosion,
   construction progress), and state a confidence level.
4. Output is structured JSON (`change_summary`, `confidence`,
   `visual_highlights`) rendered as a side-by-side/slider UI — Cloudinary's
   image compare/overlay transformations render the slider; the narrative
   text is overlaid from the Claude output.

### 7.3 Semantic search
Natural-language query → embed with the same model used for assets → Pinecone
top-k query → resolve `public_id`s back to Cloudinary URLs for rendering.
Falls back to Cloudinary's own tag/context search API if Pinecone is
unavailable, so the demo has no single point of failure.

### 7.4 Report / campaign generation
User selects a project + date range → backend gathers assets plus their
`ai_tags`/captions/change narratives → Claude drafts a report (impact summary,
before/after highlights, key stats) → rendered as a shareable page embedding
live Cloudinary-transformed images (not static exports), preserving
traceability, with optional PDF export.

### 7.5 Traceability
Every derived artifact (report, search result, comparison) links back to the
originating Cloudinary `public_id` + version rather than duplicating the
binary — satisfied directly by Cloudinary's asset/version model.

## 8. REST API surface (indicative)

- `POST /api/assets/webhook` — Cloudinary upload notification receiver.
- `GET /api/assets?project_id=&location=&from=&to=` — list/filter assets.
- `GET /api/assets/:publicId` — single asset + metadata.
- `POST /api/search` — `{ query: string }` → semantic search results.
- `POST /api/compare` — `{ assetA, assetB }` → before/after narrative.
- `POST /api/reports` — `{ project_id, from, to }` → generated report.
- `GET /api/reports/:id` — fetch a generated report.

## 9. Team workstreams (48hr+, larger team)

1. Cloudinary ingestion + upload UI + metadata schema.
2. Enrichment worker (Claude vision tagging + embeddings + Pinecone).
3. Before/after workspace UI + comparison prompt tuning.
4. Search UI + report builder.
5. Demo data prep — a realistic seeded before/after dataset matters more than
   people expect for a convincing live demo.

## 10. Demo script (~4 minutes)

1. Upload a small seeded set of "before" field photos → show automatic
   organization by project/location.
2. Upload matching "after" photos → trigger the before/after view live,
   showing the AI-generated change narrative.
3. Run a semantic search query live (natural language).
4. Generate a one-click report from the same underlying data.

This sequence touches every bullet in the problem statement, in order.

## 11. Error handling / fallbacks

- Pinecone unavailable → fall back to Cloudinary tag/context search.
- Claude vision call fails/times out on enrichment → asset still gets
  Cloudinary's own auto-tags and is queued for retry; nothing blocks on the
  enrichment step.
- Before/after comparison on assets with no clear `series_id` match → UI
  allows manual pairing instead of relying solely on auto-clustering.

## 12. Testing

- Unit tests for the REST endpoints (asset listing/filtering, search, compare,
  report generation) using mocked Cloudinary/Pinecone/Claude clients.
- Manual end-to-end run through the demo script above before presenting.
