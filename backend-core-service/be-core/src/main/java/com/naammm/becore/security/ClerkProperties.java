package com.naammm.becore.security;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "clerk")
public class ClerkProperties {

    /**
     * JWKS endpoint published by Clerk, e.g. https://clerk.your-domain/.well-known/jwks.json
     */
    private String jwksUrl;

    /**
     * Optional PEM-encoded public key that can be used instead of remote JWKS (useful in offline dev).
     */
    private String publicKey;

    /**
     * Expected issuer of Clerk JWTs, e.g. https://clerk.your-domain/
     */
    private String issuer;

    /**
     * Expected audience claim for the tokens (typically your Clerk application ID).
     * Optional: leave blank to skip audience validation.
     */
    private String audience;
}
