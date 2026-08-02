package com.digitalhumanbackend.dto;

public record MonitorSessionConnectRequest(
        String connectionName,
        String host,
        Integer port,
        String username,
        String password
) {
}
