package com.digitalhumanbackend.security;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtUtilTest {
    private static final String SECRET = "test-secret-that-is-at-least-thirty-two-characters";

    @Test
    void generatesTokenThatCanBeParsedWithTheSameKey() {
        JwtUtil jwtUtil = new JwtUtil(SECRET);

        String token = jwtUtil.generate("alice");

        assertEquals("alice", jwtUtil.parseUsername(token));
    }

    @Test
    void rejectsBlankOrTooShortSecrets() {
        assertThrows(IllegalStateException.class, () -> new JwtUtil("  "));
        assertThrows(IllegalStateException.class, () -> new JwtUtil("too-short"));
    }

    @Test
    void rejectsTokenSignedWithAnotherKey() {
        JwtUtil issuer = new JwtUtil(SECRET);
        JwtUtil verifier = new JwtUtil("another-test-secret-that-is-at-least-32-chars");

        assertThrows(JwtException.class, () -> verifier.parseUsername(issuer.generate("alice")));
    }
}
