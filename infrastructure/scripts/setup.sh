#!/usr/bin/env bash
# SETT — Local Development Setup Script
# Run once after cloning to set up the dev environment.
# Windows: run in Git Bash or WSL

set -e

echo "▶ Setting up SETT development environment..."
echo ""

# Check prerequisites
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "✗ $1 is required but not installed."
    echo "  Install: $2"
    exit 1
  fi
  echo "✓ $1 found"
}

check_command node "https://nodejs.org"
check_command python3 "https://python.org"
check_command psql "https://www.postgresql.org/download/"

echo ""
echo "▶ Installing Node dependencies..."
npm install

echo ""
echo "▶ Installing Python dependencies..."
cd services/api
pip install -r requirements.txt --quiet
cd ../..

echo ""
echo "▶ Setting up environment files..."
if [ ! -f apps/web/.env.local ]; then
  cp infrastructure/env/.env.example apps/web/.env.local
  echo "  ✓ Created apps/web/.env.local — fill in your values"
else
  echo "  ↷ apps/web/.env.local already exists"
fi

if [ ! -f services/api/.env ]; then
  cp infrastructure/env/.env.example services/api/.env
  echo "  ✓ Created services/api/.env — fill in your values"
else
  echo "  ↷ services/api/.env already exists"
fi

echo ""
echo "▶ Setting up database..."
echo "  Creating database 'sett-db' if it doesn't exist..."
psql -U postgres -c "CREATE DATABASE \"sett-db\";" 2>/dev/null || echo "  ↷ Database already exists"

echo "  Running migrations..."
cd services/api
python scripts/migrate.py --seed
cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "  Start development:"
echo "    npm run dev"
echo ""
echo "  Frontend: http://localhost:3000"
echo "  API:      http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
