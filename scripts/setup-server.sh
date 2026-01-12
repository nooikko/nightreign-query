#!/bin/bash
set -e

# Nightreign Query Server Setup Script
# Run this once on a fresh server to set up the environment

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "========================================"
echo "  Nightreign Query Server Setup"
echo "========================================"
echo ""

# Check Node.js version
log_info "Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    log_error "Node.js 20+ is required. Current version: $(node -v)"
    exit 1
fi
log_info "Node.js version: $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    log_info "Installing pnpm..."
    npm install -g pnpm@9
fi
log_info "pnpm version: $(pnpm -v)"

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    log_info "Installing PM2..."
    npm install -g pm2
fi
log_info "PM2 version: $(pm2 -v)"

# Install dependencies
log_info "Installing project dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma client
log_info "Generating Prisma client..."
pnpm db:generate

# Create logs directory
mkdir -p logs

# Create .env files from examples if they don't exist
if [ ! -f "apps/web/.env" ] && [ -f "apps/web/.env.example" ]; then
    log_warn "Creating apps/web/.env from example - please update with real values"
    cp apps/web/.env.example apps/web/.env
fi

if [ ! -f "apps/scraper/.env" ] && [ -f "apps/scraper/.env.example" ]; then
    log_warn "Creating apps/scraper/.env from example - please update with real values"
    cp apps/scraper/.env.example apps/scraper/.env
fi

# Build everything
log_info "Building all packages..."
pnpm build

# Copy static files for standalone output
if [ -d "apps/web/.next/standalone" ]; then
    log_info "Copying static assets..."
    cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static
    cp -r apps/web/public apps/web/.next/standalone/apps/web/public 2>/dev/null || true
fi

# Setup PM2 to start on boot
log_info "Setting up PM2 startup script..."
pm2 startup systemd -u $USER --hp $HOME || log_warn "PM2 startup setup may require sudo"

# Start all applications
log_info "Starting applications with PM2..."
pm2 start ecosystem.config.cjs --env production

# Save PM2 process list
pm2 save

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Update .env files with your API keys:"
echo "     - apps/web/.env (GROQ_API_KEY)"
echo "     - apps/scraper/.env (ANTHROPIC_API_KEY)"
echo "     - packages/database/.env (DATABASE_URL)"
echo ""
echo "  2. Run database migrations:"
echo "     pnpm db:migrate"
echo ""
echo "  3. Check application status:"
echo "     pm2 status"
echo ""
echo "  4. View logs:"
echo "     pm2 logs"
echo ""
echo "  5. For future deployments:"
echo "     ./scripts/deploy.sh"
echo ""
