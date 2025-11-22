#!/bin/bash
# Build command cho Dokploy với auto cleanup
# Copy nội dung này vào Dokploy Build Command

set -e

# Cleanup trước khi build
echo "🧹 Cleaning Docker before build..."
docker builder prune -af || true
docker image prune -af || true
echo "✅ Cleanup complete!"
echo ""

# Build và start services
docker compose -p devflow-service-gokytk -f ./docker-compose.yml up -d --build --remove-orphans

