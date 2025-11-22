#!/bin/sh
set -e

# Set default values if not provided
export BACKEND_URL="${BACKEND_URL:-backend-core:8989}"
export AI_SERVICE_URL="${AI_SERVICE_URL:-backend-ai-service:8000}"
export HOCUSPOCUS_URL="${HOCUSPOCUS_URL:-hocuspocus:1234}"

echo "Generating nginx.conf with:"
echo "  BACKEND_URL=${BACKEND_URL}"
echo "  AI_SERVICE_URL=${AI_SERVICE_URL}"
echo "  HOCUSPOCUS_URL=${HOCUSPOCUS_URL}"

# Generate nginx.conf from template using envsubst
envsubst '${BACKEND_URL} ${AI_SERVICE_URL} ${HOCUSPOCUS_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g "daemon off;"

