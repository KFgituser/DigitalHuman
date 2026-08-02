package com.digitalhumanbackend.dto;

public record MonitorTargetResponse(
        String key,
        String name,
        String host,
        int port
) {
}
