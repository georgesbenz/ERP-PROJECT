#!/bin/sh
set -e

# Wait for PostgreSQL to accept connections
echo "⏳  Waiting for PostgreSQL..."
until npx prisma db execute --stdin <<'SQL' 2>/dev/null
SELECT 1;
SQL
do
  echo "   PostgreSQL not ready yet — retrying in 2s..."
  sleep 2
done
echo "✅  PostgreSQL is ready."

# Apply any pending migrations (idempotent — safe to run on every start)
echo "🔄  Running database migrations..."
npx prisma migrate deploy
echo "✅  Migrations applied."

# Seed initial data (the seed script checks for existing data before inserting)
echo "🌱  Seeding initial data..."
node prisma/seed.js 2>/dev/null || npx ts-node --transpile-only prisma/seed.ts 2>/dev/null || echo "   (seed skipped — already seeded or ts-node unavailable)"
echo "✅  Seed complete."

echo "🚀  Starting application..."
exec "$@"
