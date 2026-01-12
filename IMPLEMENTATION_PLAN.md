# Nightreign Quick Reference - Implementation Plan

Personal project for fast in-game Elden Ring Nightreign lookups.

## Final Architecture

```
nightreign-query/
├── apps/
│   ├── web/                    # Next.js 16 frontend (search UI)
│   └── scraper/                # Node.js scraper + normalizer
├── packages/
│   ├── database/               # Prisma + SQLite + Orama index
│   └── types/                  # Shared TypeScript types
├── turbo.json
├── biome.json
└── package.json
```

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| **Monorepo** | Turborepo 2.7 | Fast, caching, parallel tasks |
| **Frontend** | Next.js 16.1 | Server components, streaming |
| **Scraper** | Playwright + Cheerio | JS rendering + fast parsing |
| **Normalizer** | Claude Haiku 4.5 | Structured outputs, $1.31 total |
| **Embeddings** | bge-small-en-v1.5 | 84.7% accuracy, 384 dims |
| **Vector Search** | Orama | TypeScript-native, <50ms |
| **LLM Formatting** | Groq llama-3.1-8b | Fast, cheap, streaming |
| **Database** | SQLite + Prisma | Simple, local, no server |
| **Linting** | Biome | Fast, replaces ESLint+Prettier |

## Implementation Phases

### Phase 1: Project Setup

**Goal:** Turborepo monorepo with both apps scaffolded

1. Initialize Turborepo with pnpm
2. Create `apps/web` (Next.js 16)
3. Create `apps/scraper` (Node.js with tsx)
4. Create `packages/database` (Prisma + SQLite)
5. Create `packages/types` (shared types)
6. Configure Biome for linting/formatting
7. Set up turbo.json task pipeline

**Key Files:**
- `turbo.json` - task dependencies
- `biome.json` - linting config
- `packages/database/prisma/schema.prisma` - data models

### Phase 2: Database Schema & Types

**Goal:** Define data models for Nightreign content

```prisma
// Core models
model Boss {
  id          String   @id @default(cuid())
  name        String   @unique
  category    String   // Night Lord, Night Boss, Field, etc.
  location    String?
  weaknesses  Json     // { fire: 0.8, holy: 1.2, etc. }
  phases      Json?    // Array of phase descriptions
  strategies  String?  // Markdown content
  rewards     String[]
  embedding   Bytes?   // 384-dim float32 array
}

model Weapon {
  id          String   @id @default(cuid())
  name        String   @unique
  type        String   // Dagger, Straight Sword, etc.
  stats       Json     // { physical: 100, magic: 0, etc. }
  scaling     Json     // { str: "C", dex: "B", etc. }
  skill       String?
  description String?
  embedding   Bytes?
}

model Relic {
  id          String   @id @default(cuid())
  name        String   @unique
  color       String   // Red, Green, Blue, Yellow
  tier        String   // Delicate, Polished, Grand
  effects     String[]
  embedding   Bytes?
}

model Nightfarer {
  id          String   @id @default(cuid())
  name        String   @unique
  stats       Json     // { hp, fp, str, dex, int, fai, arc }
  passive     String
  skill       String
  ultimate    String
  vessel      String
  embedding   Bytes?
}

model Skill {
  id          String   @id @default(cuid())
  name        String   @unique
  fpCost      Int
  weaponTypes String[]
  effect      String
  embedding   Bytes?
}

model ContentChunk {
  id          String   @id @default(cuid())
  type        String   // boss, weapon, relic, nightfarer, skill, guide
  name        String
  section     String?
  content     String
  tags        String[]
  sourceUrl   String
  embedding   Bytes
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Shared Types (packages/types):**
```typescript
// Query types
export interface SearchQuery {
  query: string
  filters?: {
    type?: ContentType[]
    tags?: string[]
  }
  limit?: number
}

export interface SearchResult {
  chunks: ContentChunk[]
  formatted?: string // LLM-formatted response
}

// Content types
export type ContentType = 'boss' | 'weapon' | 'relic' | 'nightfarer' | 'skill' | 'guide'

export interface NormalizedContent {
  type: ContentType
  name: string
  section?: string
  content: string
  tags: string[]
  metadata: Record<string, unknown>
}
```

### Phase 3: Scraper App

**Goal:** Scrape Fextralife and normalize with Claude

**Structure:**
```
apps/scraper/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── scraper/
│   │   ├── fextralife.ts     # Playwright scraper
│   │   └── parser.ts         # Cheerio extractors
│   ├── normalizer/
│   │   ├── claude.ts         # Claude API client
│   │   └── schemas.ts        # Zod schemas for outputs
│   ├── embeddings/
│   │   └── generator.ts      # bge-small-en-v1.5
│   └── storage/
│       └── index.ts          # Save to SQLite + Orama
├── package.json
└── tsconfig.json
```

**Scraping Targets (Fextralife):**
```
https://eldenringnightreign.wiki.fextralife.com/
├── /Bosses              → Boss list + individual pages
├── /Weapons             → Weapon list + individual pages
├── /Relics              → Relics table
├── /Skills              → Skills table
├── /Nightfarers+(Classes) → Character pages
├── /Talismans           → Talismans table
└── /Magic+Spells        → Spells list
```

**Scraping Flow:**
1. Fetch category page (e.g., `/Bosses`)
2. Extract links to individual pages
3. Parse each page with Cheerio (tables, stats, prose)
4. Batch send to Claude Haiku for normalization
5. Generate embeddings with bge-small-en-v1.5
6. Store in SQLite + build Orama index

**Rate Limiting:**
- 2 requests/second to Fextralife
- 5 concurrent max
- Cache HTML locally for re-processing

### Phase 4: Search Service

**Goal:** Fast hybrid search with Orama

**Structure:**
```
packages/database/
├── src/
│   ├── index.ts           # Main exports
│   ├── client.ts          # Prisma client singleton
│   ├── search/
│   │   ├── orama.ts       # Orama index management
│   │   ├── hybrid.ts      # Combine vector + full-text
│   │   └── embeddings.ts  # Query embedding generation
│   └── types.ts
├── prisma/
│   └── schema.prisma
└── data/
    ├── dev.db             # SQLite database
    └── orama-index.json   # Persisted Orama index
```

**Search Flow:**
1. User query → generate embedding (bge-small-en-v1.5)
2. Hybrid search: Orama vector + full-text
3. Return top-k chunks with metadata
4. (Optional) Send to Groq for formatting

**Orama Schema:**
```typescript
const schema = {
  id: 'string',
  type: 'string',
  name: 'string',
  content: 'string',
  tags: 'string[]',
  embedding: 'vector[384]'
}
```

### Phase 5: Frontend (Next.js 16)

**Goal:** Simple, fast search UI

**Structure:**
```
apps/web/
├── app/
│   ├── layout.tsx         # Root layout (server)
│   ├── page.tsx           # Home/search page
│   ├── api/
│   │   └── search/
│   │       └── route.ts   # Search API endpoint
│   └── components/
│       ├── SearchBar.tsx  # Client component (input)
│       ├── Results.tsx    # Server component (streamed)
│       └── ResultCard.tsx # Individual result display
├── lib/
│   ├── search.ts          # Search service client
│   └── groq.ts            # Groq client for formatting
└── public/
```

**Component Strategy:**
- `SearchBar` → Client component (needs `onChange`, `onSubmit`)
- `Results` → Server component with Suspense streaming
- `ResultCard` → Server component (static rendering)

**API Route (`/api/search`):**
```typescript
export async function POST(request: Request) {
  const { query, format } = await request.json()

  // 1. Search Orama
  const results = await search(query)

  // 2. (Optional) Format with Groq
  if (format) {
    const stream = await formatWithGroq(query, results)
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' }
    })
  }

  return Response.json(results)
}
```

**UI Features:**
- Instant search (debounced)
- Type filtering (boss, weapon, relic, etc.)
- Formatted response toggle
- Dark mode (gaming aesthetic)
- Keyboard shortcuts (/, Esc)

### Phase 6: LLM Formatting (Groq)

**Goal:** Format search results into concise answers

**Format Templates by Query Type:**

```typescript
const formatTemplates = {
  boss: `
    Given these search results about "{query}", provide:
    - A brief strategy (2-3 numbered steps)
    - Key weaknesses (bullet points)
    - Rewards (if applicable)
    Keep it under 100 tokens.
  `,
  weapon: `
    Given these search results about "{query}", provide:
    - Stats summary (markdown table)
    - Best for: (1 sentence)
    - Scaling: (brief)
  `,
  general: `
    Answer "{query}" concisely based on these results.
    Use bullets or numbered lists.
    Keep it under 100 tokens.
  `
}
```

**Streaming Response:**
```typescript
import Groq from 'groq-sdk'

const groq = new Groq()

export async function formatWithGroq(query: string, context: string) {
  const stream = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: 'You are a concise Elden Ring Nightreign guide.' },
      { role: 'user', content: `${query}\n\nContext:\n${context}` }
    ],
    stream: true,
    max_tokens: 150
  })

  return stream
}
```

## Scripts & Commands

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "biome check .",
    "format": "biome format --write .",
    "db:generate": "turbo run db:generate",
    "db:migrate": "turbo run db:migrate",
    "db:studio": "turbo run db:studio",
    "scrape": "turbo run scrape --filter=scraper",
    "scrape:bosses": "pnpm --filter scraper run scrape:bosses",
    "scrape:weapons": "pnpm --filter scraper run scrape:weapons",
    "scrape:all": "pnpm --filter scraper run scrape:all"
  }
}
```

## Environment Variables

```bash
# apps/scraper/.env
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL="file:../../packages/database/data/dev.db"

# apps/web/.env.local
GROQ_API_KEY=gsk_...
DATABASE_URL="file:../../packages/database/data/dev.db"
```

## Estimated Costs

| Item | One-time | Monthly |
|------|----------|---------|
| Scrape + normalize (500 pages) | $1.31 | - |
| Groq queries (~1000/month) | - | $0.32 |
| Re-scrape updates | - | ~$0.20 |
| **Total** | **$1.31** | **~$0.52** |

Annual: ~$8 (you have $60 budget, so 7+ years covered)

## Implementation Order

1. **Day 1:** Project setup (Turborepo, packages, configs)
2. **Day 2:** Database schema + Prisma setup
3. **Day 3:** Scraper foundation (Playwright + Cheerio)
4. **Day 4:** Claude normalizer + Zod schemas
5. **Day 5:** Embedding generation + Orama index
6. **Day 6:** Search service + API
7. **Day 7:** Frontend UI
8. **Day 8:** Groq formatting + polish
9. **Day 9:** Testing + scrape all content
10. **Day 10:** Deploy (Vercel/local)

## Quick Start (After Setup)

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
pnpm db:generate

# 3. Run initial migration
pnpm db:migrate

# 4. Scrape content (takes ~30 min)
pnpm scrape:all

# 5. Start dev server
pnpm dev

# 6. Open http://localhost:3000
```

## Future Enhancements (Optional)

- [ ] Mobile-friendly UI
- [ ] Offline mode (PWA)
- [ ] Build calculator integration
- [ ] Discord bot for queries
- [ ] Voice search (mid-game hands-free)
