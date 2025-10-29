package com.naammm.becore.security;

import java.io.IOException;
import java.util.Set;

import com.naammm.becore.security.ClerkTokenVerifier;
import com.naammm.becore.security.JwtVerificationException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class ClerkAuthFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(ClerkAuthFilter.class);

    private static final String USER_HEADER = "X-User-Id";
    private static final String USER_QUERY_PARAM = "userId";

    private static final Set<String> PUBLIC_PATH_PREFIXES = Set.of(
            "/v3/api-docs",
            "/swagger-resources",
            "/swagger-ui",
            "/swagger-ui.html",
            "/h2-console",
            "/error"
    );

    private final ClerkTokenVerifier tokenVerifier;

    public ClerkAuthFilter(ClerkTokenVerifier tokenVerifier) {
        this.tokenVerifier = tokenVerifier;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!request.getRequestURI().startsWith("/api/")) {
            return true;
        }

        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        return PUBLIC_PATH_PREFIXES.stream().anyMatch(prefix -> request.getRequestURI().startsWith(prefix));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String token = resolveBearerToken(request);

        if (!StringUtils.hasText(token)) {
            writeUnauthorized(request, response, "Missing Authorization bearer token");
            return;
        }

        try {
            String userId = tokenVerifier.verify(token);
            if (!isUserIdentityConsistent(request, userId)) {
                writeUnauthorized(request, response, "User identity mismatch");
                return;
            }

            UserContext.setUserId(userId);
            filterChain.doFilter(request, response);
        } catch (JwtVerificationException ex) {
            if (log.isDebugEnabled()) {
                log.debug("Failed to verify Clerk token: {}", ex.getMessage(), ex.getCause());
            }
            writeUnauthorized(request, response, "Invalid authentication token");
        } finally {
            UserContext.clear();
        }
    }

    private boolean isUserIdentityConsistent(HttpServletRequest request, String userId) {
        String headerUserId = request.getHeader(USER_HEADER);
        if (StringUtils.hasText(headerUserId) && !userId.equals(headerUserId.trim())) {
            return false;
        }

        String queryUserId = request.getParameter(USER_QUERY_PARAM);
        if (StringUtils.hasText(queryUserId) && !userId.equals(queryUserId.trim())) {
            return false;
        }

        return true;
    }

    private String resolveBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7).trim();
        }
        return null;
    }

    private void writeUnauthorized(HttpServletRequest request, HttpServletResponse response, String message) throws IOException {
        applyCorsHeaders(request, response);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }

    private void applyCorsHeaders(HttpServletRequest request, HttpServletResponse response) {
        String origin = request.getHeader("Origin");
        if (StringUtils.hasText(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Vary", "Origin");
        } else {
            response.setHeader("Access-Control-Allow-Origin", "*");
        }
        String requestedHeaders = request.getHeader("Access-Control-Request-Headers");
        if (StringUtils.hasText(requestedHeaders)) {
            response.setHeader("Access-Control-Allow-Headers", requestedHeaders);
        } else {
            response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, X-User-Id");
        }
        response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    }
}
