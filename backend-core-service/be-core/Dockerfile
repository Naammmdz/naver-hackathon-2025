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

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy built jar
COPY --from=build /app/target/*.jar app.jar

# Override database và redis cho Dokploy deployment
ENV SPRING_DATASOURCE_URL=jdbc:postgresql://devflow-naverhackathon-hggsje:5432/naver_hackathon
ENV SPRING_DATASOURCE_USERNAME=postgres
ENV SPRING_DATASOURCE_PASSWORD=12345

# Redis configuration cho Dokploy
ENV REDIS_HOST=devflow-naverhackathon-ueemyy
ENV REDIS_PORT=6379
ENV SPRING_REDIS_PASSWORD=tqybmepkxzyvrb70

# Elasticsearch configuration - kết nối qua Traefik domain
# Traefik sẽ route request đến container port 9200
# Nếu Traefik có SSL, thử https:// trước, nếu không thì dùng http://
ENV ELASTICSEARCH_HOST=devflow-elasticsearch-8137a9-110-234-195-193.traefik.me
ENV ELASTICSEARCH_PORT=9200
# Thử không port trước (Traefik route tự động), nếu không được thì thêm :9200
ENV SPRING_ELASTICSEARCH_URIS=http://devflow-elasticsearch-8137a9-110-234-195-193.traefik.me

# Production settings
ENV SPRING_PROFILES_ACTIVE=production
ENV SPRING_JPA_SHOW_SQL=false
ENV LOGGING_LEVEL_COM_NAAMMM_BECORE=INFO
ENV LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_WEB=INFO

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

