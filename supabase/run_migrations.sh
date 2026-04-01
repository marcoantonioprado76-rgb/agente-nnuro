#!/bin/bash
# ============================================================
# Run migrations 006, 007, 008 against live Supabase database
# ============================================================
#
# USAGE:
#   ./supabase/run_migrations.sh <DATABASE_PASSWORD>
#
# HOW TO GET THE PASSWORD:
#   1. Go to https://supabase.com/dashboard/project/lbrfqtfhmgvlsjpvqnlu/settings/database
#   2. Copy the "Database password"
#   3. Run this script with that password
#
# ALTERNATIVE: Copy the SQL from supabase/migrations/run_006_007_008.sql
#   and paste it into the SQL Editor at:
#   https://supabase.com/dashboard/project/lbrfqtfhmgvlsjpvqnlu/sql/new
# ============================================================

set -e

DB_PASSWORD="${1:?Usage: $0 <DATABASE_PASSWORD>}"
PROJECT_REF="lbrfqtfhmgvlsjpvqnlu"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Running migrations 006, 007, 008..."

# Try direct connection first
if command -v psql &> /dev/null; then
    echo "Using psql via connection pooler..."
    PGPASSWORD="$DB_PASSWORD" psql \
        "postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require" \
        -f "${SCRIPT_DIR}/migrations/006_fix_missing_columns.sql" \
        -f "${SCRIPT_DIR}/migrations/007_bot_model_and_message_limits.sql" \
        -f "${SCRIPT_DIR}/migrations/008_enhanced_products.sql"
    echo "All migrations applied successfully!"
else
    echo "psql not found. Using supabase CLI..."
    cd "${SCRIPT_DIR}/.."
    supabase db push --db-url "postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
    echo "All migrations pushed successfully!"
fi
