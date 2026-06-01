#!/bin/sh
set -e

echo "⏳ Running database migrations..."
npx prisma migrate deploy

echo "🌱 Running database seed..."
npm run seed:prod 2>/dev/null || echo "⚠️  Seed skipped (already seeded)"

echo "🚀 Starting CoreStack API..."
exec node dist/src/server.js
