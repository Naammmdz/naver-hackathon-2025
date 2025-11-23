#!/bin/bash
set -e

echo "=========================================="
echo "  AI Service Startup"
echo "=========================================="

# Wait for database to be ready
echo "Waiting for database to be ready..."
until python -c "from database.connection import test_connection; test_connection()" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "✓ Database is ready"

# Run migrations
echo ""
echo "Running database migrations..."
cd /app/database
python run_migrations.py
cd /app
echo "✓ Migrations completed"

# Ensure Welcome Workspace exists for all users
echo ""
echo "Ensuring Welcome Workspace..."
python scripts/ensure_welcome_workspace.py || echo "⚠️ Failed to ensure Welcome Workspace, continuing..."
echo "✓ Welcome Workspace check complete"

# Start the application
echo ""
echo "Starting AI Service..."
exec python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
