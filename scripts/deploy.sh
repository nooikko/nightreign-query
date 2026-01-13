#!/bin/bash
set -e

# Nightreign Query Deployment Script
# Usage: ./scripts/deploy.sh [web|scraper|all]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    log_error "PM2 is not installed. Install with: npm install -g pm2"
    exit 1
fi

# Pull latest changes
log_info "Pulling latest changes..."
git pull origin main

# Install dependencies
log_info "Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma client
log_info "Generating Prisma client..."
pnpm db:generate

# Run migrations if needed
log_info "Running database migrations..."
pnpm db:migrate || log_warn "No migrations to run or migration skipped"

# Create logs directory
mkdir -p logs

deploy_web() {
    log_info "Building web application..."
    pnpm turbo build --filter=@nightreign/web

    # Copy static files for standalone output
    if [ -d "apps/web/.next/standalone" ]; then
        log_info "Copying static assets..."
        cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
        cp -r apps/web/public apps/web/.next/standalone/apps/web/public 2>/dev/null || true

        # Copy HuggingFace model cache to standalone (required for GPU/embedding models)
        if [ -d ".cache" ]; then
            log_info "Copying HuggingFace model cache..."
            cp -r .cache apps/web/.next/standalone/
            # Create symlink for backward compatibility (models/ → .cache/)
            ln -sf .cache apps/web/.next/standalone/models 2>/dev/null || true
        fi

        # Copy Orama search index to standalone
        if [ -d "orama-index" ]; then
            log_info "Copying Orama search index..."
            cp -r orama-index apps/web/.next/standalone/
        fi
    fi

    log_info "Reloading web application with PM2..."
    pm2 reload ecosystem.config.cjs --only nightreign-web --env production
}

deploy_scraper() {
    log_info "Building scraper..."
    pnpm turbo build --filter=scraper

    log_info "Restarting scraper with PM2..."
    pm2 restart ecosystem.config.cjs --only nightreign-scraper --env production
}

# Deployment target
TARGET="${1:-all}"

case "$TARGET" in
    web)
        deploy_web
        ;;
    scraper)
        deploy_scraper
        ;;
    all)
        deploy_web
        deploy_scraper
        ;;
    *)
        log_error "Unknown target: $TARGET"
        echo "Usage: $0 [web|scraper|all]"
        exit 1
        ;;
esac

# Save PM2 process list
pm2 save

log_info "Deployment complete!"
pm2 status
