#!/usr/bin/env bash
set -euo pipefail
: "${SUPABASE_DB_URL:?Defina SUPABASE_DB_URL com a conexão PostgreSQL do projeto}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p backups
pg_dump "$SUPABASE_DB_URL" --format=custom --no-owner --no-privileges > "backups/camilla-studio-${STAMP}.dump"
pg_dump "$SUPABASE_DB_URL" --schema-only --no-owner --no-privileges > "backups/camilla-studio-schema-${STAMP}.sql"
echo "Backup concluído em backups/"
