# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nightreign Query is a local-first semantic search application for Elden Ring Nightreign game content. It uses vector embeddings and hybrid search (vector + BM25) to provide fast, relevant results with optional LLM-powered natural language formatting.

## Commands

### Development
```bash
pnpm dev                    # Start all apps in dev mode (web + scraper watch)
pnpm build                  # Build all packages
pnpm lint                   # Lint with Biome
pnpm type-check             # TypeScript type checking
pnpm format                 # Auto-format code
pnpm check                  # Lint + format combined
```

### Database
```bash
pnpm db:generate            # Generate Prisma client (required before build)
pnpm db:migrate             # Run database migrations
pnpm db:studio              # Open Prisma Studio GUI
```

### Scraper CLI
```bash
pnpm scrape                 # Scrape single category
pnpm scrape:all             # Scrape all categories from Fextralife

# Direct scraper commands (from apps/scraper)
pnpm --filter scraper start scrape <category>    # Scrape: bosses, weapons, relics, etc.
pnpm --filter scraper start parse:all            # Parse HTML to structured JSON
pnpm --filter scraper start normalize:all        # Normalize with Claude API
pnpm --filter scraper start import               # Import to SQLite
pnpm --filter scraper start index                # Build Orama search index
```

### Turborepo Filtering
```bash
pnpm turbo build --filter=@nightreign/web        # Build only web app
pnpm turbo build --filter=scraper                # Build only scraper
pnpm turbo type-check --filter=@nightreign/web   # Type check single package
```

## Architecture

### Monorepo Structure
- **apps/web** - Next.js 16 frontend (App Router, React 19, Turbopack)
- **apps/scraper** - CLI for scraping Fextralife wiki, normalizing data, generating embeddings
- **packages/database** - Prisma ORM + Orama vector search index
- **packages/types** - Shared TypeScript types
- **packages/typescript-config** - Shared tsconfig (base, nextjs, node)

### Data Flow
1. **Scraper** fetches HTML from Fextralife → cached in `apps/scraper/cache/html/`
2. **Parser** extracts structured data via Cheerio
3. **Normalizer** uses Claude API to standardize data → `apps/scraper/cache/normalized/`
4. **Import** writes to SQLite via Prisma
5. **Indexer** generates embeddings (bge-small-en-v1.5) and builds Orama index

### Search Architecture
- **Embeddings**: `@huggingface/transformers` with BAAI/bge-small-en-v1.5 (384 dimensions)
- **Vector Store**: Orama with hybrid search (vector similarity + BM25 full-text)
- **Reranker**: Optional bge-reranker-base for relevance scoring
- **LLM Formatting**: Groq API (llama-3.1-8b-instant) for streaming natural language responses
- **GPU Acceleration**: Optional CUDA support for ~5-10x faster embeddings

### Key Files
- `packages/database/prisma/schema.prisma` - Database models (Boss, Weapon, Relic, etc.)
- `packages/database/src/search/` - Search implementation (hybrid.ts, orama.ts, embeddings.ts)
- `apps/web/app/api/search/route.ts` - Search API endpoint
- `apps/scraper/src/index.ts` - Scraper CLI with all commands

## Build Dependencies

The build order is managed by Turborepo:
1. `db:generate` runs first (Prisma client generation)
2. Package builds depend on `^build` (dependencies build first)
3. Apps depend on generated Prisma client

Always run `pnpm db:generate` after cloning or if Prisma client is missing.

## Environment Variables

**apps/web/.env**
```
GROQ_API_KEY=              # Optional: for LLM-formatted responses
```

**apps/scraper/.env**
```
ANTHROPIC_API_KEY=         # Required: for Claude normalization
```

**packages/database/.env**
```
DATABASE_URL="file:./data/dev.db"
```

## GPU Configuration

Embedding generation supports CUDA GPU acceleration for ~5-10x speedup.

### Environment Variables
```bash
# Option 1: Explicit device selection
EMBEDDING_DEVICE=cuda    # or 'cpu'

# Option 2: Simple toggle
USE_GPU=true             # or 'false'
```

### Requirements for GPU (Linux only)
- NVIDIA GPU (e.g., RTX 3070)
- CUDA toolkit installed
- `CUDA_PATH` or `CUDA_HOME` environment variable set

### Behavior
- **Auto-detection**: If no env var is set, GPU is used when CUDA is detected
- **Fallback**: If GPU requested but unavailable, falls back to CPU with warning
- **Data Types**: GPU uses fp16 for speed, CPU uses fp32 for precision

### Performance Comparison
| Operation | CPU | GPU (RTX 3070) |
|-----------|-----|----------------|
| Single embedding | ~50-100ms | ~5-10ms |
| Batch of 100 | ~5-10s | ~0.5-1s |

## Server Deployment

Uses PM2 for process management with systemd integration.

### First-Time Setup
```bash
./scripts/setup-server.sh   # Installs PM2, builds, configures systemd
```

### Subsequent Deployments
```bash
./scripts/deploy.sh         # Pull, build, zero-downtime reload
./scripts/deploy.sh web     # Deploy only web app
./scripts/deploy.sh scraper # Deploy only scraper
```

### PM2 Commands
```bash
pm2 status                  # Check running processes
pm2 logs                    # View logs
pm2 reload ecosystem.config.cjs --env production  # Zero-downtime reload
```

## Code Style

- **Formatter**: Biome (2 spaces, single quotes, no semicolons)
- **Imports**: Use `@nightreign/database`, `@nightreign/types` for workspace packages
- **Path Aliases**: `@/` in web app maps to `apps/web/`
