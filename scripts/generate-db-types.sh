#!/usr/bin/env bash
# Generate Supabase TypeScript types from your project schema.
# Requires: Supabase CLI (https://supabase.com/docs/guides/cli)
# Usage: bash scripts/generate-db-types.sh <SUPABASE_PROJECT_ID>

set -euo pipefail

PROJECT_ID="${1:-}"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <supabase-project-id>"
  echo "Find your project ID in: https://supabase.com/dashboard → Project Settings → General"
  exit 1
fi

OUTPUT="shared/src/supabase.generated.ts"

echo "Generating types for project: $PROJECT_ID"
npx supabase gen types typescript \
  --project-id "$PROJECT_ID" \
  --schema public \
  > "$OUTPUT"

echo "✓ Types written to $OUTPUT"
echo "  Run 'npm run typecheck' to verify."
