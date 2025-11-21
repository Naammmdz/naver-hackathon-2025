# Multi-stage build for backend-core
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy pom.xml first for better caching
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Production stage
FROM eclipse-temurin:21-jre-alpine

# Install curl và các tools cần thiết cho debugging
RUN apk add --no-cache curl bash

WORKDIR /app

# Copy built jar
COPY --from=build /app/target/*.jar app.jar

# Copy test script (optional, để debug)
COPY test-elasticsearch.sh /app/test-elasticsearch.sh
RUN chmod +x /app/test-elasticsearch.sh

# Default environment variables (can be overridden by docker-compose.yml)
# For local docker-compose: sẽ được override bởi docker-compose.yml
# For Dokploy deployment: dùng docker-compose.dokploy.yml hoặc set ENV ở Dokploy
ENV SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/naver_hackathon
ENV SPRING_DATASOURCE_USERNAME=postgres
ENV SPRING_DATASOURCE_PASSWORD=12345
ENV REDIS_HOST=localhost
ENV REDIS_PORT=6379
ENV SPRING_ELASTICSEARCH_URIS=http://localhost:9200

# Production settings
ENV SPRING_PROFILES_ACTIVE=production
ENV SPRING_JPA_SHOW_SQL=false
ENV LOGGING_LEVEL_COM_NAAMMM_BECORE=INFO
ENV LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_WEB=INFO

# Debug Elasticsearch connection
ENV LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_DATA_ELASTICSEARCH=DEBUG
ENV LOGGING_LEVEL_ORG_ELASTICSEARCH=DEBUG

# Các settings khác sẽ dùng từ application.properties:
# - Clerk authentication (đã có sẵn)
# - Gemini API (đã có sẵn với key mặc định)
# - JPA/Hibernate settings (đã có sẵn)
# - Server port (đã có sẵn)

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8989/api/tasks || exit 1

EXPOSE 8989

# Run with optimized JVM settings
ENTRYPOINT ["java", "-Xmx512m", "-Xms256m", "-jar", "app.jar"]

