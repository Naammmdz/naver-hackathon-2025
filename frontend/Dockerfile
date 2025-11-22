# Multi-stage build for optimized production image
FROM node:20-alpine AS build

# Build arguments for Vite environment variables
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_JWT_TEMPLATE
ARG VITE_API_BASE_URL
ARG VITE_AI_SERVICE_BASE_URL
ARG VITE_HOCUSPOCUS_URL

# Set as environment variables for build
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_JWT_TEMPLATE=$VITE_CLERK_JWT_TEMPLATE
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_AI_SERVICE_BASE_URL=$VITE_AI_SERVICE_BASE_URL
ENV VITE_HOCUSPOCUS_URL=$VITE_HOCUSPOCUS_URL

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with clean install
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Create nginx templates directory
RUN mkdir -p /etc/nginx/templates

# Copy nginx configuration template
COPY nginx.conf.template /etc/nginx/templates/

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Set default environment variables (can be overridden at runtime)
ENV BACKEND_URL=backend-core:8989
ENV AI_SERVICE_URL=backend-ai-service:8000
ENV HOCUSPOCUS_URL=hocuspocus:1234

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Expose port
EXPOSE 8080

# Use entrypoint script to generate nginx.conf from template
ENTRYPOINT ["/docker-entrypoint.sh"]

