#!/usr/bin/env bash
# One-command project bootstrap for Wedding Planner.
# Run from the repo root: bash scripts/setup.sh   (or: npm run setup)

set -euo pipefail

echo "=================================================="
echo "  Wedding Planner — Project Setup"
echo "=================================================="

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "npm is required."; exit 1; }

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Node.js 20+ is required (found v$NODE_VERSION). Install from https://nodejs.org"
  exit 1
fi

# ---------------------------------------------------------------------------
# .env configuration
# ---------------------------------------------------------------------------
configure_env() {
  echo ""
  echo "--- Supabase Configuration ---"
  echo "Find these in your Supabase project: Settings > API"
  echo ""

  read -rp "SUPABASE_URL (e.g. https://xxxx.supabase.co): " SUPABASE_URL
  read -rp "SUPABASE_SERVICE_KEY (service_role key):       " SUPABASE_SERVICE_KEY
  read -rp "SUPABASE_ANON_KEY (anon/public key):           " SUPABASE_ANON_KEY

  read -rp "JWT_SECRET (press Enter to auto-generate):     " JWT_SECRET_INPUT
  if [ -z "$JWT_SECRET_INPUT" ]; then
    JWT_SECRET=$(openssl rand -base64 48)
    echo "  → Auto-generated JWT_SECRET"
  else
    JWT_SECRET="$JWT_SECRET_INPUT"
  fi

  echo ""
  echo "--- Optional: Direct database access ---"
  echo "Needed for 'npm run db:migrate'. Format:"
  echo "  postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres"
  echo ""
  read -rp "DATABASE_URL (press Enter to skip): " DATABASE_URL

  # Build api/.env from root .env.example
  local EXAMPLE=".env.example"
  local API_ENV="api/.env"

  [ -f "$EXAMPLE" ] && cp "$EXAMPLE" "$API_ENV" || touch "$API_ENV"

  set_var() {
    local KEY="$1" VAL="$2"
    [ -z "$VAL" ] && return
    if grep -q "^${KEY}=" "$API_ENV" 2>/dev/null; then
      sed -i.bak "s|^${KEY}=.*|${KEY}=${VAL}|" "$API_ENV" && rm -f "${API_ENV}.bak"
    else
      printf '\n%s=%s' "$KEY" "$VAL" >> "$API_ENV"
    fi
  }

  set_var SUPABASE_URL         "$SUPABASE_URL"
  set_var SUPABASE_SERVICE_KEY "$SUPABASE_SERVICE_KEY"
  set_var SUPABASE_ANON_KEY    "$SUPABASE_ANON_KEY"
  set_var JWT_SECRET           "$JWT_SECRET"
  set_var DATABASE_URL         "$DATABASE_URL"

  echo "✓ Created api/.env"

  # Create frontend/.env
  cat > "frontend/.env" <<EOF
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=${SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
EOF
  echo "✓ Created frontend/.env"
}

# Check if env files already exist
API_ENV_EXISTS=false
FRONTEND_ENV_EXISTS=false
[ -f "api/.env" ]      && API_ENV_EXISTS=true
[ -f "frontend/.env" ] && FRONTEND_ENV_EXISTS=true

if $API_ENV_EXISTS && $FRONTEND_ENV_EXISTS; then
  read -rp $'\napi/.env and frontend/.env already exist. Reconfigure? [y/N]: ' RECONFIGURE
  if [ "${RECONFIGURE,,}" = "y" ]; then
    configure_env
  else
    echo "Skipping env configuration."
  fi
else
  configure_env
fi

# ---------------------------------------------------------------------------
# Install dependencies
# ---------------------------------------------------------------------------
echo ""
echo "Installing dependencies..."

echo "  → root/"
npm install

echo "  → shared/"
cd shared && npm install && cd ..

echo "  → api/"
cd api && npm install && cd ..

echo "  → frontend/"
cd frontend && npm install && cd ..

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "=================================================="
echo "  Setup complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "  1. npm run db:migrate   — apply schema to your database"
echo "  2. npm run dev          — start API (:3001) + frontend (:5173)"
echo "  3. Open http://localhost:5173/onboard to create your account"
echo ""
