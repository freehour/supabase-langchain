#!/bin/bash
set -eu

cd "${WORKSPACE_DIR}"

# Ensure bunx is available
if ! command -v bunx &> /dev/null
then
    echo "bunx could not be found. Please ensure Bun is installed."
    exit 1
fi

# Check the status of supabase or start it if not running
bunx supabase status || bunx supabase start

# Generate the migration from the schema as a file <timestamp>_0001_supabase_langchain.sql in the supabase/migrations directory
rm -rf supabase/migrations/.*sql
bunx supabase db diff -f 0001_supabase_langchain

# remove timestamp prefix
migration_file=$(find supabase/migrations -type f -name "*_0001_supabase_langchain.sql" | head -n 1)
if [ -f "$migration_file" ]; then
    mv "$migration_file" "supabase/migrations/0001_supabase_langchain.sql"
fi

# Create the generated directory if it doesn't exist
mkdir -p lib/generated

# Reset the database to apply the new migration
bunx supabase db reset

# Generate TypeScript types from Supabase schema
bunx supabase gen types typescript --local --schema storage,langchain,public,langchain > lib/generated/database.ts

# Run ESLint on the generated file
bunx eslint lib/generated/database.ts --fix --no-ignore

# Build the package
bun run build

