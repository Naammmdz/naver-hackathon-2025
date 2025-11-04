#!/bin/bash

# Development startup script for backend-core-service
# This script disables Yjs persistence to fix collaborative sync issues after restarts

echo "Starting backend-core-service in development mode..."
echo "Yjs persistence is DISABLED to prevent sync conflicts"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load development environment variables (skip comments)
if [ -f "$SCRIPT_DIR/.env.development" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env.development" | xargs)
fi

# Change to be-core directory and run the Spring Boot application
cd "$SCRIPT_DIR/be-core" || exit 1
./mvnw spring-boot:run