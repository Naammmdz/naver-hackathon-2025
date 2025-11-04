package com.naammm.becore.security;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKMatcher;
import com.nimbusds.jose.jwk.JWKSelector;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.proc.BadJWTException;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

@Component
public class ClerkTokenVerifier {

    private final ClerkProperties properties;
    private final RSAKey staticRsaKey;
    private final JWKSource<SecurityContext> jwkSource;

    public ClerkTokenVerifier(ClerkProperties properties) {
        Assert.notNull(properties, "Clerk properties must not be null");
        this.properties = properties;
        validateProperties(properties);

        if (StringUtils.hasText(properties.getPublicKey())) {
            this.staticRsaKey = parseRsaKey(properties.getPublicKey());
            this.jwkSource = null;
        } else {
            this.staticRsaKey = null;
            this.jwkSource = new RemoteJWKSet<>(toUrl(properties.getJwksUrl()));
        }
    }

    public String verify(String token) {
        if (!StringUtils.hasText(token)) {
            throw new JwtVerificationException("Missing JWT token");
        }

        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            if (!verifySignature(signedJWT)) {
                throw new JwtVerificationException("Invalid Clerk token signature");
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            validateClaims(claims);
            return claims.getSubject();
        } catch (ParseException | JOSEException | BadJWTException e) {
            throw new JwtVerificationException("Invalid Clerk token", e);
        }
    }

    private boolean verifySignature(SignedJWT signedJWT) throws JOSEException {
        if (staticRsaKey != null) {
            return signedJWT.verify(new RSASSAVerifier(staticRsaKey));
        }

        if (jwkSource == null) {
            return false;
        }

        JWKSelector selector = new JWKSelector(JWKMatcher.forJWSHeader(signedJWT.getHeader()));
        List<JWK> jwks = jwkSource.get(selector, null);
        for (JWK jwk : jwks) {
            if (jwk instanceof RSAKey rsaKey) {
                if (signedJWT.verify(new RSASSAVerifier(rsaKey))) {
                    return true;
                }
            }
        }
        return false;
    }

    private void validateClaims(JWTClaimsSet claims) throws BadJWTException {
        if (claims.getSubject() == null || claims.getSubject().isBlank()) {
            throw new BadJWTException("Token is missing subject claim");
        }

        Date exp = claims.getExpirationTime();
        if (exp == null || exp.toInstant().isBefore(Instant.now())) {
            throw new BadJWTException("Token is expired");
        }

        if (StringUtils.hasText(properties.getIssuer()) && !properties.getIssuer().equals(claims.getIssuer())) {
            throw new BadJWTException("Issuer does not match expected value");
        }

        if (StringUtils.hasText(properties.getAudience())) {
            if (claims.getAudience() == null || claims.getAudience().isEmpty()) {
                throw new BadJWTException("Token is missing audience claim");
            }
            boolean matches = claims.getAudience().stream().anyMatch(aud -> aud.equals(properties.getAudience()));
            if (!matches) {
                throw new BadJWTException("Audience does not match expected value");
            }
        }
    }

    private RSAKey parseRsaKey(String location) {
        try {
            String pem = resolvePublicKeyPem(location);
            JWK jwk = JWK.parseFromPEMEncodedObjects(pem);
            if (!(jwk instanceof RSAKey rsaKey)) {
                throw new IllegalStateException("Provided Clerk public key is not an RSA key");
            }
            return rsaKey;
        } catch (JOSEException e) {
            throw new IllegalStateException("Failed to parse Clerk public key", e);
        }
    }

    private URL toUrl(String url) {
        try {
            return new URL(url);
        } catch (MalformedURLException e) {
            throw new IllegalStateException("Invalid Clerk JWKS URL: " + url, e);
        }
    }

    private void validateProperties(ClerkProperties properties) {
        if (!StringUtils.hasText(properties.getPublicKey()) && !StringUtils.hasText(properties.getJwksUrl())) {
            throw new IllegalStateException("Either clerk.public-key or clerk.jwks-url must be configured");
        }
        if (!StringUtils.hasText(properties.getIssuer())) {
            throw new IllegalStateException("clerk.issuer must be configured");
        }
    }

    private String resolvePublicKeyPem(String value) {
        try {
            if (value.startsWith("classpath:")) {
                String path = value.substring("classpath:".length());
                ClassPathResource resource = new ClassPathResource(path);
                try (InputStream inputStream = resource.getInputStream()) {
                    return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
                }
            }

            if (value.startsWith("file:")) {
                URI uri = URI.create(value);
                Path filePath = Path.of(uri);
                return Files.readString(filePath, StandardCharsets.UTF_8);
            }

            return value;
        } catch (IOException e) {
            throw new IllegalStateException("Failed to read Clerk public key resource", e);
        }
    }
}
