#!/bin/bash
# Rebuild all data from scratch
# Usage: ./scripts/rebuild-data.sh
# Options:
#   --skip-scrape    Skip scraping, use cached HTML
#   --purge-only     Only purge data, don't rebuild
#   --no-purge       Skip purging, just rebuild

set -e

CATEGORIES="bosses weapons relics skills nightfarers talismans spells armor shields enemies npcs merchants locations expeditions items"

# Parse arguments
SKIP_SCRAPE=false
PURGE_ONLY=false
NO_PURGE=false

for arg in "$@"; do
  case $arg in
    --skip-scrape)
      SKIP_SCRAPE=true
      ;;
    --purge-only)
      PURGE_ONLY=true
      ;;
    --no-purge)
      NO_PURGE=true
      ;;
  esac
done

echo "=== Nightreign Query Data Rebuild ==="
echo "Model: BAAI/bge-large-en-v1.5 (1024 dimensions)"
echo ""

# Step 0: Purge stale data
if [ "$NO_PURGE" = false ]; then
  echo "Step 0: Purging stale data..."

  # SQLite database - keep the file but it will be recreated
  echo "  - Resetting SQLite database..."
  rm -f packages/database/prisma/data/dev.db
  rm -f packages/database/data/dev.db

  # Orama vector index
  echo "  - Removing Orama search index..."
  rm -f packages/database/data/orama-index.json

  # Scraper caches (HTML, parsed, and normalized)
  echo "  - Clearing all scraper caches..."
  rm -rf apps/scraper/cache/
  rm -rf apps/scraper/apps/scraper/cache/

  # Turbo cache (ensures fresh builds)
  echo "  - Clearing Turbo build cache..."
  rm -rf .turbo/cache/

  echo "  Done."
  echo ""
fi

if [ "$PURGE_ONLY" = true ]; then
  echo "=== Purge complete (--purge-only specified) ==="
  exit 0
fi

# Step 1: Regenerate Prisma client
echo "Step 1: Regenerating Prisma client..."
pnpm db:generate

# Step 2: Push schema to SQLite (creates tables)
echo ""
echo "Step 2: Creating database tables..."
pnpm db:migrate

# Step 3: Scrape all (optional)
if [ "$SKIP_SCRAPE" = false ]; then
  echo ""
  echo "Step 3: Scraping all categories..."
  pnpm scrape:all
else
  echo ""
  echo "Step 3: Skipping scrape (--skip-scrape specified, using cached HTML)"
fi

# Step 4: Parse all categories
echo ""
echo "Step 4: Parsing all categories..."
pnpm --filter scraper start parse:all

# Step 5: Normalize all categories
echo ""
echo "Step 5: Normalizing all categories..."
pnpm --filter scraper start normalize:all

# Step 6: Import to database
echo ""
echo "Step 6: Importing to database..."
pnpm --filter scraper start import

# Step 7: Build search index with embeddings
echo ""
echo "Step 7: Building search index with bge-large-en-v1.5 embeddings..."
pnpm --filter scraper start index

echo ""
echo "=== Rebuild Complete ==="
echo ""
echo "Summary:"
echo "  - Database: packages/database/prisma/data/dev.db"
echo "  - Search Index: packages/database/data/orama-index.json"
echo "  - Embedding Model: BAAI/bge-large-en-v1.5 (1024 dimensions)"
echo ""
echo "To test search, run:"
echo "  pnpm dev"
echo "  curl -X POST http://localhost:3000/api/search -d '{\"query\": \"stonesword keys\"}'"
