package com.digitalhumanbackend.controller;

import com.digitalhumanbackend.dto.MonitorSessionConnectRequest;
import com.digitalhumanbackend.dto.MonitorSessionResponse;
import com.digitalhumanbackend.dto.SystemMetricsResponse;
import com.digitalhumanbackend.service.SystemMonitorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/system-monitor")
@RequiredArgsConstructor
@Slf4j
public class SystemMonitorController {

    private final SystemMonitorService systemMonitorService;

    @GetMapping("/sessions")
    public List<MonitorSessionResponse> sessions() {
        return systemMonitorService.getSessions();
    }

    @PostMapping("/sessions")
    public MonitorSessionResponse connect(@RequestBody MonitorSessionConnectRequest request) {
        try {
            MonitorSessionResponse response = systemMonitorService.connect(request);
            log.info("Monitor session connected: {}@{}:{} ({})", response.username(), response.host(), response.port(), response.sessionId());
            return response;
        } catch (IllegalArgumentException ex) {
            log.warn("Monitor session connect validation failed: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        } catch (IOException ex) {
            log.warn("Monitor session connect failed for {}@{}:{}: {}", request.username(), request.host(), request.port(), ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, buildIoErrorMessage("SSH 连接失败", ex), ex);
        }
    }

    @DeleteMapping("/sessions/{sessionId}")
    public Map<String, Object> disconnect(@PathVariable String sessionId) {
        try {
            systemMonitorService.disconnect(sessionId);
            log.info("Monitor session disconnected: {}", sessionId);
            return Map.of("sessionId", sessionId, "disconnected", true);
        } catch (IllegalArgumentException ex) {
            log.warn("Monitor session disconnect failed: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @GetMapping("/overview")
    public SystemMetricsResponse overview(
            @RequestParam String sessionId,
            @RequestParam(defaultValue = "10") int processLimit
    ) {
        try {
            SystemMetricsResponse response = systemMonitorService.getOverview(sessionId, processLimit);
            log.info("Monitor overview succeeded: {} ({})", sessionId, response.targetHost());
            return response;
        } catch (IllegalArgumentException ex) {
            log.warn("Monitor overview validation failed for {}: {}", sessionId, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        } catch (IOException ex) {
            log.warn("Monitor overview failed for {}: {}", sessionId, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, buildIoErrorMessage("监控数据采集失败", ex), ex);
        }
    }

    @GetMapping("/processes")
    public Map<String, Object> processes(
            @RequestParam String sessionId,
            @RequestParam(defaultValue = "10") int limit
    ) {
        try {
            int normalizedLimit = normalizeLimit(limit);
            List<SystemMetricsResponse.ProcessInfo> processes = systemMonitorService.getTopProcesses(sessionId, normalizedLimit);
            log.info("Monitor processes succeeded: {} (limit={})", sessionId, normalizedLimit);
            return Map.of(
                    "timestamp", Instant.now(),
                    "sessionId", sessionId,
                    "limit", normalizedLimit,
                    "processes", processes
            );
        } catch (IllegalArgumentException ex) {
            log.warn("Monitor processes validation failed for {}: {}", sessionId, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        } catch (IOException ex) {
            log.warn("Monitor processes failed for {}: {}", sessionId, ex.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, buildIoErrorMessage("进程数据采集失败", ex), ex);
        }
    }

    private String buildIoErrorMessage(String prefix, IOException ex) {
        String detail = ex.getMessage();
        if (detail == null || detail.isBlank()) {
            return prefix;
        }
        String normalized = detail.replaceAll("[\\r\\n]+", " ").trim();
        return prefix + ": " + normalized;
        
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return 10;
        }
        return Math.min(limit, 50);
    }
}
