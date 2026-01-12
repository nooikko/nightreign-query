# Product Requirements Document: Nightreign Quick Reference

**Version:** 1.0
**Last Updated:** 2026-01-09
**Author:** Quinn
**Status:** Draft

---

## 1. Overview

### 1.1 Problem Statement

While playing Elden Ring Nightreign with friends, we constantly need to look up game information mid-session:
- Boss weaknesses and phase strategies
- Weapon stats and scaling
- Relic effects and builds
- Nightfarer abilities

Current solutions (wikis, guides) are slow, cluttered with ads, and require context-switching that breaks game flow. Tab-alt during intense gameplay is disruptive.

### 1.2 Solution

A local-first search tool that answers natural language questions about Elden Ring Nightreign in **300-500ms** with concise, formatted responses.

**Example Queries:**
| Query | Response Format |
|-------|----------------|
| "How to beat phase 2 of Maris" | Numbered steps |
| "What relic abilities impact spell damage" | Filtered list |
| "Stats of Sword of Night and Flame" | Markdown table |
| "Fulghor weaknesses" | Bullet points with damage types |

### 1.3 Scope

**Personal project** for 5 users (me + 4 friends). Not a product, not commercial.

---

## 2. Goals & Non-Goals

### 2.1 Goals

| Priority | Goal |
|----------|------|
| P0 | Sub-second response times for common queries |
| P0 | Accurate game data (bosses, weapons, relics, nightfarers, skills) |
| P0 | Natural language search (not just keyword matching) |
| P1 | Formatted responses (tables, bullets, steps) based on query type |
| P1 | Works locally without internet (after initial data load) |
| P2 | Dark mode UI suitable for gaming sessions |

### 2.2 Non-Goals

- Mobile app (desktop browser is fine)
- User accounts / authentication
- Multi-language support
- Public deployment / scaling
- Monetization
- Real-time game data updates (manual re-scrape is fine)

---

## 3. Target Users

### 3.1 Primary Users

**Gaming group (5 people):**
- Play Nightreign together regularly
- Need quick lookups during sessions
- Technical enough to run a local app
- Trust each other with shared instance

### 3.2 User Personas

**Quinn (me):**
- Builds the thing
- Wants it to "just work"
- Will host for the group

**Friends (4 people):**
- Access via local network or shared URL
- Don't care how it works, just that it's fast
- Will complain if results are wrong or slow

---

## 4. User Stories

### 4.1 Core Stories

| ID | Story | Acceptance Criteria |
|----|-------|---------------------|
| US-1 | As a player, I want to search for boss strategies so I can beat encounters faster | Search "Maris phase 2" returns numbered strategy steps in <1s |
| US-2 | As a player, I want to see weapon stats so I can choose the right weapon | Search "Black Knife stats" returns damage table with scaling |
| US-3 | As a player, I want to find relics by effect so I can optimize my build | Search "relics that boost spell damage" returns filtered list |
| US-4 | As a player, I want to compare Nightfarer abilities so I can pick a class | Search "Guardian vs Wylder" shows comparison table |
| US-5 | As a player, I want keyboard shortcuts so I can search without mouse | Press "/" to focus search, "Esc" to clear |

### 4.2 Nice-to-Have Stories

| ID | Story | Notes |
|----|-------|-------|
| US-6 | As a player, I want to filter by content type | Dropdown: Boss, Weapon, Relic, etc. |
| US-7 | As a player, I want formatted vs raw results toggle | Some queries work better as raw data |
| US-8 | As a player, I want the UI to remember my last search | Convenience |

---

## 5. Functional Requirements

### 5.1 Search

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | System shall accept natural language queries up to 500 characters | P0 |
| FR-2 | System shall return results within 1 second for 95% of queries | P0 |
| FR-3 | System shall support hybrid search (semantic + keyword) | P0 |
| FR-4 | System shall rank results by relevance | P0 |
| FR-5 | System shall support filtering by content type (boss, weapon, etc.) | P1 |

### 5.2 Response Formatting

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6 | System shall format boss strategies as numbered steps | P1 |
| FR-7 | System shall format weapon stats as markdown tables | P1 |
| FR-8 | System shall format lists as bullet points | P1 |
| FR-9 | System shall stream formatted responses for perceived speed | P1 |
| FR-10 | System shall offer raw results option (no LLM formatting) | P2 |

### 5.3 Data Coverage

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-11 | System shall contain data for all bosses (Night Lords, Night Bosses, Field, etc.) | P0 |
| FR-12 | System shall contain weapon stats, scaling, and skills | P0 |
| FR-13 | System shall contain all relics with effects and tiers | P0 |
| FR-14 | System shall contain all 9 Nightfarers with abilities | P0 |
| FR-15 | System shall contain skills with FP costs and weapon compatibility | P0 |
| FR-16 | System shall contain talismans with effects | P1 |

### 5.4 User Interface

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-17 | System shall provide a single search input on the home page | P0 |
| FR-18 | System shall display results below the search input | P0 |
| FR-19 | System shall support keyboard navigation (/, Esc) | P1 |
| FR-20 | System shall use dark theme by default | P2 |
| FR-21 | System shall be responsive (works on different window sizes) | P2 |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-1 | Search latency (p95) | < 1000ms |
| NFR-2 | Search latency (p50) | < 500ms |
| NFR-3 | Time to first byte (streaming) | < 200ms |
| NFR-4 | Frontend load time | < 2s |
| NFR-5 | Memory usage (idle) | < 500MB |

### 6.2 Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-6 | Uptime | 99% (it's local, so basically "when my computer is on") |
| NFR-7 | Data accuracy | 95%+ (validated against wiki sources) |
| NFR-8 | Graceful degradation | If LLM fails, return raw results |

### 6.3 Maintainability

| ID | Requirement | Notes |
|----|-------------|-------|
| NFR-9 | Re-scrape workflow | Single command to update all data |
| NFR-10 | Type safety | Full TypeScript, no `any` types |
| NFR-11 | Linting | Biome for consistent code style |

### 6.4 Cost

| ID | Requirement | Budget |
|----|-------------|--------|
| NFR-12 | Initial setup cost | < $5 |
| NFR-13 | Monthly operating cost | < $1 |
| NFR-14 | Total budget available | $60 (Claude API credits) |

---

## 7. Technical Architecture

### 7.1 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FLOW                                │
└─────────────────────────────────────────────────────────────────┘

   User Query                Search                    Response
  ┌─────────┐    ┌──────────────────────┐    ┌─────────────────┐
  │ "beat   │ => │ Embed → Orama Search │ => │ Streamed answer │
  │ Maris   │    │    → Groq Format     │    │ with steps      │
  │ phase 2"│    │                      │    │                 │
  └─────────┘    └──────────────────────┘    └─────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       DATA PIPELINE                              │
└─────────────────────────────────────────────────────────────────┘

  Fextralife Wiki         Scraper              Normalized Data
  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────┐
  │ HTML pages  │ => │ Playwright + │ => │ SQLite + Orama      │
  │ (500 pages) │    │ Cheerio +    │    │ with embeddings     │
  │             │    │ Claude Haiku │    │                     │
  └─────────────┘    └──────────────┘    └─────────────────────┘
```

### 7.2 Component Architecture

```
nightreign-query/
├── apps/
│   ├── web/                    # Next.js 16 frontend
│   │   ├── app/               # App Router pages
│   │   ├── components/        # React components
│   │   └── lib/               # Client utilities
│   └── scraper/               # Data ingestion pipeline
│       ├── scraper/           # Playwright + Cheerio
│       ├── normalizer/        # Claude API integration
│       └── embeddings/        # bge-small-en-v1.5
├── packages/
│   ├── database/              # Prisma + SQLite + Orama
│   │   ├── prisma/           # Schema and migrations
│   │   ├── search/           # Search service
│   │   └── data/             # SQLite file + Orama index
│   └── types/                 # Shared TypeScript types
├── turbo.json                 # Monorepo task config
└── biome.json                 # Linting config
```

### 7.3 Technology Choices

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Monorepo** | Turborepo 2.7 | Fast builds, caching, parallel tasks |
| **Frontend** | Next.js 16.1 | Server components, streaming, App Router |
| **Scraping** | Playwright + Cheerio | JS rendering + fast HTML parsing |
| **Normalization** | Claude Haiku 4.5 | Structured outputs, cost-effective |
| **Embeddings** | bge-small-en-v1.5 | 84.7% accuracy, 384 dimensions, fast |
| **Vector Search** | Orama | TypeScript-native, <50ms, hybrid search |
| **LLM Formatting** | Groq llama-3.1-8b | Fastest inference, streaming |
| **Database** | SQLite + Prisma | Simple, local, no server needed |
| **Linting** | Biome | Fast, replaces ESLint + Prettier |

---

## 8. Data Model

### 8.1 Entity Relationship

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    Boss      │     │   Weapon     │     │    Relic     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ name         │     │ name         │     │ name         │
│ category     │     │ type         │     │ color        │
│ weaknesses   │     │ stats        │     │ tier         │
│ phases       │     │ scaling      │     │ effects      │
│ strategies   │     │ skill        │     │ embedding    │
│ rewards      │     │ embedding    │     └──────────────┘
│ embedding    │     └──────────────┘
└──────────────┘
                     ┌──────────────┐     ┌──────────────┐
                     │ Nightfarer   │     │    Skill     │
                     ├──────────────┤     ├──────────────┤
                     │ id           │     │ id           │
                     │ name         │     │ name         │
                     │ stats        │     │ fpCost       │
                     │ passive      │     │ weaponTypes  │
                     │ skill        │     │ effect       │
                     │ ultimate     │     │ embedding    │
                     │ vessel       │     └──────────────┘
                     │ embedding    │
                     └──────────────┘

┌────────────────────────────────────────────────────────────────┐
│                        ContentChunk                             │
├────────────────────────────────────────────────────────────────┤
│ id, type, name, section, content, tags, sourceUrl, embedding   │
│ (Generic chunks for hybrid search - combines all content)      │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 Data Volume Estimates

| Entity | Estimated Count | Storage |
|--------|-----------------|---------|
| Bosses | ~50 | ~100KB |
| Weapons | ~200 | ~500KB |
| Relics | ~100 | ~200KB |
| Nightfarers | 9 | ~50KB |
| Skills | ~150 | ~300KB |
| ContentChunks | ~2000 | ~5MB |
| Embeddings (384-dim) | ~2500 | ~4MB |
| **Total** | - | **~10MB** |

---

## 9. API Specification

### 9.1 Search Endpoint

**POST /api/search**

Request:
```typescript
{
  query: string           // Natural language query
  filters?: {
    type?: ContentType[]  // Filter by content type
    tags?: string[]       // Filter by tags
  }
  limit?: number          // Max results (default: 10)
  format?: boolean        // Enable LLM formatting (default: true)
}
```

Response (format: false):
```typescript
{
  results: {
    id: string
    type: ContentType
    name: string
    content: string
    score: number
  }[]
  timing: {
    embedding: number
    search: number
    total: number
  }
}
```

Response (format: true):
```
Event stream with formatted markdown response
```

### 9.2 Content Types

```typescript
type ContentType =
  | 'boss'
  | 'weapon'
  | 'relic'
  | 'nightfarer'
  | 'skill'
  | 'talisman'
  | 'guide'
```

---

## 10. Success Metrics

### 10.1 Core Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search latency (p50) | < 500ms | Logged per request |
| Search latency (p95) | < 1000ms | Logged per request |
| Result relevance | > 80% useful | Manual spot-check |
| Data coverage | 100% of core content | Audit against wiki |

### 10.2 Usage Metrics (Nice to Have)

| Metric | Notes |
|--------|-------|
| Queries per session | Track popular queries |
| Query patterns | Inform future improvements |
| Failed queries | Identify gaps in data |

---

## 11. Milestones

### 11.1 Phase 1: Foundation (Days 1-2)
- [ ] Initialize Turborepo monorepo
- [ ] Set up apps/web (Next.js 16)
- [ ] Set up apps/scraper (Node.js)
- [ ] Set up packages/database (Prisma + SQLite)
- [ ] Set up packages/types
- [ ] Configure Biome linting
- [ ] Configure turbo.json tasks

**Deliverable:** Running monorepo with placeholder apps

### 11.2 Phase 2: Data Pipeline (Days 3-5)
- [ ] Implement Playwright scraper for Fextralife
- [ ] Implement Cheerio parsers for each page type
- [ ] Implement Claude normalization with Zod schemas
- [ ] Implement embedding generation (bge-small-en-v1.5)
- [ ] Store data in SQLite + build Orama index

**Deliverable:** Populated database with all game content

### 11.3 Phase 3: Search Service (Day 6)
- [ ] Implement Orama hybrid search
- [ ] Implement embedding generation for queries
- [ ] Implement search API endpoint
- [ ] Add timing instrumentation

**Deliverable:** Working search API returning relevant results

### 11.4 Phase 4: Frontend (Day 7)
- [ ] Build search UI with SearchBar component
- [ ] Build Results component with streaming
- [ ] Add keyboard shortcuts
- [ ] Style with dark theme

**Deliverable:** Functional search UI

### 11.5 Phase 5: LLM Formatting (Day 8)
- [ ] Integrate Groq API
- [ ] Implement format templates by query type
- [ ] Add streaming response support
- [ ] Add format toggle in UI

**Deliverable:** Formatted, streamed responses

### 11.6 Phase 6: Polish (Days 9-10)
- [ ] Scrape all content (full run)
- [ ] Manual testing and bug fixes
- [ ] Performance optimization if needed
- [ ] Documentation

**Deliverable:** Production-ready personal tool

---

## 12. Dependencies & Risks

### 12.1 External Dependencies

| Dependency | Risk | Mitigation |
|------------|------|------------|
| Fextralife wiki | Site structure changes | Cache HTML, manual parser updates |
| Claude API | Rate limits, pricing changes | Batch requests, stay within free tier |
| Groq API | Service availability | Fallback to raw results |
| HuggingFace models | Download availability | Cache model locally |

### 12.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Wiki data inaccurate | Medium | Low | Cross-reference with Maxroll |
| Response time > 1s | Medium | Medium | Cache embeddings, optimize queries |
| LLM hallucinations | Low | Low | Ground responses in search results |
| Scraper breaks | Medium | Low | Store raw HTML for re-processing |

---

## 13. Out of Scope (Future Considerations)

These are explicitly **not** in v1.0 but could be added later:

- **Mobile app** - Browser works fine for now
- **Discord bot** - Would be cool for in-voice queries
- **Build calculator** - Combine relics/weapons/stats
- **Offline PWA** - Works if hosting locally anyway
- **Voice search** - Hands-free during gameplay
- **Multi-game support** - Could adapt for other games

---

## 14. Appendix

### 14.1 Research Documents

Full technical research available in `AI_RESEARCH/`:
- `2026-01-09-orama-vector-search-validation.md`
- `2026-01-09-groq-api-fast-inference-validation.md`
- `2026-01-09-local-embedding-models-typescript.md`
- `2026-01-09-maxroll-fextralife-nightreign-content-assessment.md`
- `2026-01-09-web-scraping-and-claude-normalization.md`
- `2026-01-09-turborepo-nextjs16-typescript-setup.md`

### 14.2 Cost Breakdown

| Item | One-time | Monthly | Annual |
|------|----------|---------|--------|
| Scrape + normalize (500 pages) | $1.31 | - | $1.31 |
| Groq queries (~1000/month) | - | $0.32 | $3.84 |
| Re-scrape updates (20%/month) | - | $0.20 | $2.40 |
| **Total** | **$1.31** | **$0.52** | **~$8** |

Budget: $60 → Covers 7+ years of operation

### 14.3 Quick Start

```bash
# Clone and install
git clone <repo>
cd nightreign-query
pnpm install

# Set up database
pnpm db:generate
pnpm db:migrate

# Scrape content (~30 min)
pnpm scrape:all

# Start dev server
pnpm dev

# Open http://localhost:3000
```
