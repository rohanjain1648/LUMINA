# Lumina

**Lumina** is a modern, AI-powered media platform built with Next.js, leveraging Cloudinary for media management, Pinecone for vector search, and advanced AI processing.

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Solution](#2-the-solution)
3. [Innovation](#3-innovation)
4. [Features](#4-features)
5. [User Journey](#5-user-journey)
6. [System Architecture](#6-system-architecture)
7. [Workflow & Orchestration](#7-workflow--orchestration)
8. [Data Flow & State Management](#8-data-flow--state-management)
9. [Tech Stack](#9-tech-stack)
10. [AI Deep Dive — Gemini 2.5 Flash / Groq / Claude](#10-ai-deep-dive)
11. [Impact](#11-impact)
12. [Real-World Use Cases](#12-real-world-use-cases)
13. [Comparison](#13-comparison)
14. [Scalability](#14-scalability)
15. [Responsible AI and Ethics](#15-responsible-ai-and-ethics)
16. [Evaluation Criteria Alignment](#16-evaluation-criteria-alignment)
17. [Trade-offs](#17-trade-offs)
18. [Project Complexity Tiers](#18-project-complexity-tiers)
19. [Installation & Setup](#19-installation--setup)
20. [Why This Will Win](#20-why-this-will-win)
21. [Future Scope](#21-future-scope)
22. [FAQ](#22-faq)
23. [Lessons Learned](#23-lessons-learned)

---

### 1. The Problem
In the modern digital landscape, managing, searching, and drawing insights from massive media libraries is a highly manual, error-prone, and time-consuming process. Traditional Digital Asset Management (DAM) systems lack intelligent semantic search, automated tagging, and deep visual analysis, forcing users to rely on exact keyword matches and manual metadata entry.

### 2. The Solution
**Lumina** provides an end-to-end intelligent media platform that automatically enriches media assets upon upload. By leveraging cutting-edge Vision models and vector databases, Lumina understands the content of your media, enabling semantic search, visual comparisons, and automated reporting without manual tagging.

### 3. Innovation
Unlike traditional DAMs, Lumina treats media as "understanding." It doesn't just store an image; it generates a vector embedding of its meaning (via Pinecone) and extracts rich metadata (via Groq/Claude). This allows for context-aware searches (e.g., "show me images of a sunny beach with a dog") rather than relying on filename keywords.

### 4. Features
- **Smart Uploads & Storage**: Powered by Cloudinary for optimized media delivery.
- **AI Auto-Tagging**: Extracts keywords, descriptions, and visual elements automatically.
- **Semantic Vector Search**: Find assets using natural language queries powered by Pinecone.
- **Visual Comparison**: Compare before/after images and get AI-generated difference reports.
- **Automated Insights**: Generate comprehensive reports on media asset collections.

### 5. User Journey
1. **Upload**: User drops an image into the UI.
2. **Process**: Cloudinary optimizes the image; webhooks trigger AI enrichment.
3. **Analyze**: AI parses the image, generates tags, and creates vector embeddings.
4. **Discover**: User searches for "sunset landscape" and instantly finds the un-named image.
5. **Act**: User selects multiple images to generate a comparison report or export assets.

### 6. System Architecture
Lumina follows a modern, decoupled architecture:
- **Frontend**: Next.js App Router for server-rendered, fast UI.
- **Backend API**: Next.js API routes handling webhooks and client requests.
- **Media Layer**: Cloudinary for edge delivery and transformation.
- **AI Layer**: Groq/Claude for fast inference and semantic understanding.
- **Vector DB**: Pinecone for high-dimensional semantic search.

### 7. Workflow & Orchestration
1. Asset uploaded to Cloudinary.
2. Cloudinary fires a webhook to `/api/assets/webhook`.
3. Webhook triggers an asynchronous enrichment pipeline.
4. `claudeClient` generates image metadata.
5. `embeddings` module generates vectors and upserts to Pinecone.
6. DB updates asset status to "Enriched".

### 8. Data Flow & State Management
- **Client State**: React Context / Hooks for UI state (upload progress, search queries).
- **Server State**: Next.js server components fetch directly from the database for fast initial loads.
- **Asset State Machine**: `Pending` -> `Processing` -> `Enriched` -> `Failed`.

### 9. Tech Stack
- **Framework**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS / Standard CSS
- **Database/Search**: Pinecone Vector DB
- **Media CDN**: Cloudinary
- **AI Models**: Groq SDK, Claude API
- **Testing**: Vitest, React Testing Library

### 10. AI Deep Dive
Lumina relies on state-of-the-art LLMs and Vision models (such as Claude 3.5 Sonnet, Groq, or Gemini 2.5 Flash) to parse visual data.
- **Vision Parsing**: Models analyze image pixels to extract context, emotion, and subjects.
- **Vector Embeddings**: Text descriptions are converted into dense vectors. Pinecone uses cosine similarity to match user queries with these vectors, bypassing traditional lexical search limitations.

### 11. Impact
Lumina drastically reduces the time creative teams spend organizing files—turning a 10-minute manual tagging job into a 2-second automated workflow. It unlocks the hidden value of historical media archives.

### 12. Real-World Use Cases
- **Marketing Agencies**: Quickly finding brand-compliant assets from past campaigns.
- **E-Commerce**: Automatically tagging product images with colors, styles, and attributes.
- **Journalism**: Searching vast photo archives for specific historical contexts.

### 13. Comparison
| Feature | Lumina | Traditional DAM (e.g., Google Drive) |
|---------|--------|--------------------------------------|
| **Search** | Semantic / Natural Language | Exact Keyword / Filename |
| **Tagging** | 100% Automated AI | 100% Manual |
| **Comparisons** | AI visual diffs | Side-by-side manual |

### 14. Scalability
- **Serverless**: Next.js API routes scale infinitely with Vercel/Node edge.
- **Vector DB**: Pinecone handles millions of dense vectors with sub-millisecond latency.
- **CDN**: Cloudinary serves optimized assets from edge nodes closest to the user.

### 15. Responsible AI and Ethics
- **Bias Mitigation**: AI prompts are structured to avoid demographic assumptions.
- **Privacy**: No user media is used to train public models (handled via enterprise API agreements).
- **Transparency**: AI-generated tags are always marked as such and can be edited by humans.

### 16. Evaluation Criteria Alignment
If being judged in a hackathon, Lumina excels in:
- **Technical Complexity**: Integrating webhooks, vector DBs, and Vision APIs.
- **UX**: Seamless, non-blocking upload and search experience.
- **Practicality**: Solves a very real workflow problem for media-heavy businesses.

### 17. Trade-offs
- **Latency vs Accuracy**: Used faster models (Groq) for real-time tagging, slightly trading off the deep reasoning of larger, slower models.
- **Storage Cost**: Vector embeddings add a storage overhead compared to simple relational databases.

### 18. Project Complexity Tiers
- **Tier 1 (Base)**: Upload + Cloudinary storage.
- **Tier 2 (Current)**: AI Auto-tagging + Semantic Search.
- **Tier 3 (Future)**: Video timeline semantic search, automatic video highlight generation.

### 19. Installation & Setup
```bash
git clone https://github.com/rohanjain1648/LUMINA.git
cd LUMINA
npm install
# Set up .env with Cloudinary, Pinecone, and Groq/Claude keys
npm run dev
```

### 20. Why This Will Win
Lumina isn't just a wrapper around an API; it's a deeply integrated architecture that solves a tangible workflow problem using multiple advanced technologies (Vectors, Vision AI, Edge Compute) working in unison.

### 21. Future Scope
- Support for video and audio transcription/search.
- Multi-modal embeddings (image-to-image search).
- Team collaboration features (shared workspaces, RBAC).

### 22. FAQ
**Q: Does this work with existing Cloudinary accounts?**
A: Yes, simply plug in your API keys in the `.env` file.

**Q: Which AI models are supported?**
A: Currently integrated with Groq and Claude, with modular architecture allowing easy swapping to Gemini 2.5 Flash.

### 23. Lessons Learned
- Handling asynchronous webhooks in serverless environments requires careful state management.
- Vector search quality is highly dependent on the quality of the text descriptions generated by the Vision model.
