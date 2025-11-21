# Multi-stage build for optimized production image
FROM node:20-alpine AS build

# Build arguments for Vite environment variables
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_JWT_TEMPLATE
ARG VITE_HOCUSPOCUS_URL

# Set as environment variables for build
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_JWT_TEMPLATE=$VITE_CLERK_JWT_TEMPLATE
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

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Expose port
EXPOSE 8080

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

