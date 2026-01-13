#!/bin/bash
# Rebuild all data from scratch
# Usage: ./scripts/rebuild-data.sh

set -e

CATEGORIES="bosses weapons relics skills nightfarers talismans spells armor shields enemies npcs merchants locations expeditions items"

echo "=== Rebuilding all data ==="
echo ""

# Scrape all
echo "Step 1: Scraping all categories..."
pnpm scrape:all

# Parse all categories
echo ""
echo "Step 2: Parsing all categories..."
for cat in $CATEGORIES; do
  echo "  Parsing $cat..."
  pnpm --filter scraper start parse $cat
done

# Normalize all categories
echo ""
echo "Step 3: Normalizing all categories..."
for cat in $CATEGORIES; do
  echo "  Normalizing $cat..."
  pnpm --filter scraper start normalize $cat
done

# Import to database
echo ""
echo "Step 4: Importing to database..."
pnpm --filter scraper start import

# Build search index
echo ""
echo "Step 5: Building search index..."
pnpm --filter scraper start index

echo ""
echo "=== Done! ==="
