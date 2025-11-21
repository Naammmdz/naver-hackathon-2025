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

# Set environment variables for Dokploy deployment
ENV SPRING_PROFILES_ACTIVE=production
ENV SPRING_DATASOURCE_URL=jdbc:postgresql://devflow-naverhackathon-hggsje:5432/naver_hackathon
ENV SPRING_DATASOURCE_USERNAME=postgres
ENV SPRING_DATASOURCE_PASSWORD=12345
ENV SPRING_DATASOURCE_DRIVER_CLASS_NAME=org.postgresql.Driver

# Redis configuration
ENV SPRING_REDIS_HOST=devflow-naverhackathon-ueemyy
ENV SPRING_REDIS_PORT=6379
ENV SPRING_REDIS_PASSWORD=tqybmepkxzyvrb70
ENV SPRING_REDIS_USERNAME=default

# JPA/Hibernate settings
ENV SPRING_JPA_HIBERNATE_DDL_AUTO=update
ENV SPRING_JPA_SHOW_SQL=false
ENV SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect
ENV SPRING_JPA_OPEN_IN_VIEW=false

# Server settings
ENV SERVER_PORT=8989

# Logging
ENV LOGGING_LEVEL_COM_NAAMMM_BECORE=INFO
ENV LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_WEB=INFO

# Clerk settings (sẽ được override bởi Dokploy)
ENV CLERK_JWKS_URL=https://direct-newt-10.clerk.accounts.dev/.well-known/jwks.json
ENV CLERK_ISSUER=https://direct-newt-10.clerk.accounts.dev

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8989/api/tasks || exit 1

EXPOSE 8989

# Run with optimized JVM settings
ENTRYPOINT ["java", "-Xmx512m", "-Xms256m", "-jar", "app.jar"]

