package com.digitalhumanbackend.dto;

import java.time.Instant;

public record MonitorSessionResponse(
        String sessionId,
        String connectionName,
        String host,
        int port,
        String username,
        Instant connectedAt
) {
}
