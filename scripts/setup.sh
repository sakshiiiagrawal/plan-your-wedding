#!/usr/bin/env bash
# One-command project bootstrap for Wedding Planner.
# Run from the repo root: bash scripts/setup.sh

set -euo pipefail

echo "=================================================="
echo "  Wedding Planner — Project Setup"
echo "=================================================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required."; exit 1; }

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Node.js 18+ is required (found v$NODE_VERSION)"
  exit 1
fi

# Set up .env if it doesn't exist
if [ ! -f "api/.env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example api/.env
    echo "✓ Created api/.env from .env.example — please fill in your values"
  else
    echo "⚠ No .env.example found. You'll need to create api/.env manually."
  fi
else
  echo "✓ api/.env already exists"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."

echo "  → shared/"
cd shared && npm install && cd ..

echo "  → api/"
cd api && npm install && cd ..

echo "  → frontend/"
cd frontend && npm install && cd ..

echo ""
echo "=================================================="
echo "  Setup complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. Edit api/.env with your Supabase and JWT credentials"
echo "  2. Run the database migrations in Supabase SQL Editor:"
echo "     api/supabase/migrations/001_initial_schema.sql"
echo "  3. Start the API:      cd api && npm run dev"
echo "  4. Start the frontend: cd frontend && npm run dev"
echo ""
echo "  App will be at: http://localhost:5173"
echo "  API will be at: http://localhost:3001/api/v1"
