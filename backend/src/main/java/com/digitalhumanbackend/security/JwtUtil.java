package com.digitalhumanbackend.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

// security/JwtUtil.java
@Component
public class JwtUtil {
    private final Key key;

    public JwtUtil(@Value("${app.jwt.secret}") String secret) {
        String cleaned = secret == null ? "" : secret.trim();
        if (cleaned.isEmpty()) {
            throw new IllegalStateException("JWT secret is not configured");
        }
        if (cleaned.length() < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 characters");
        }
        this.key = Keys.hmacShaKeyFor(cleaned.getBytes(StandardCharsets.UTF_8));
    }

    public String generate(String username) {
        var now = new Date();
        long ttlMs = 7 * 24 * 3600_000L;
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + ttlMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String parseUsername(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody().getSubject();
    }
}
