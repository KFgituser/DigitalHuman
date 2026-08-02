package com.digitalhumanbackend.service;

import com.digitalhumanbackend.dto.MonitorSessionConnectRequest;
import com.digitalhumanbackend.dto.MonitorSessionResponse;
import com.digitalhumanbackend.dto.SystemMetricsResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import net.schmizz.sshj.SSHClient;
import net.schmizz.sshj.connection.channel.direct.Session;
import net.schmizz.sshj.transport.TransportException;
import net.schmizz.sshj.transport.verification.PromiscuousVerifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class SystemMonitorService {

    private static final int DEFAULT_CONNECT_TIMEOUT_MS = 5000;
    private static final int DEFAULT_COMMAND_TIMEOUT_SECONDS = 10;
    private static final int PROCESS_SAMPLE_INTERVAL_MILLIS = 200;
    private static final Pattern KEY_VALUE_PATTERN = Pattern.compile("^([^:]+):\\s*(.*)$");
    private static final Pattern MEMINFO_PATTERN = Pattern.compile("^([^:]+):\\s*(\\d+)");
    private static final Set<String> SKIPPED_FILESYSTEM_PREFIXES = Set.of("tmpfs", "devtmpfs", "overlay", "squashfs");

    private final Map<String, MonitorSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MonitorSessionResponse connect(MonitorSessionConnectRequest request) throws IOException {
        String host = requireNonBlank(request.host(), "服务器 IP 不能为空");
        String username = requireNonBlank(request.username(), "用户名不能为空");
        String password = requireNonBlank(request.password(), "密码不能为空");
        String connectionName = request.connectionName() == null || request.connectionName().isBlank()
                ? host
                : request.connectionName().trim();
        int port = request.port() == null || request.port() <= 0 ? 22 : request.port();

        SSHClient client = createConnectedClient(host, port, username, password);
        Instant connectedAt = Instant.now();
        String sessionId = UUID.randomUUID().toString();

        MonitorSession session = new MonitorSession(
                sessionId,
                connectionName,
                host,
                port,
                username,
                password,
                connectedAt,
                client
        );
        sessions.put(sessionId, session);

        return new MonitorSessionResponse(sessionId, connectionName, host, port, username, connectedAt);
    }

    public void disconnect(String sessionId) {
        MonitorSession session = sessions.remove(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("鏈壘鍒板搴旂殑鐩戞帶浼氳瘽");
        }
        synchronized (session.lock) {
            closeClientQuietly(session.client);
            session.client = null;
        }
    }

    public List<MonitorSessionResponse> getSessions() {
        List<MonitorSessionResponse> result = new ArrayList<>();
        for (MonitorSession session : sessions.values()) {
            result.add(toResponse(session));
        }
        result.sort(Comparator.comparing(MonitorSessionResponse::connectedAt));
        return result;
    }

    public SystemMetricsResponse getOverview(String sessionId, int processLimit) throws IOException {
        MonitorSession session = requireSession(sessionId);
        int limit = normalizeLimit(processLimit);

        return executeWithClient(session, client -> {
            String hostname = nonBlankOrFallback(runCommand(client, "hostname"), session.host);
            int logicalCores = parsePositiveInt(runCommand(client, "getconf _NPROCESSORS_ONLN 2>/dev/null || nproc 2>/dev/null || echo 1"), 1);
            CpuSamplePair cpuSamples = parseCpuSamplePair(runCommand(client, "grep '^cpu ' /proc/stat; sleep 0.2; grep '^cpu ' /proc/stat"));
            double cpuUsagePercent = calculateCpuUsagePercent(cpuSamples.before, cpuSamples.after);

            SystemMetricsResponse.MemoryMetrics memory = parseMemoryMetrics(runCommand(client, "cat /proc/meminfo"));
            SystemMetricsResponse.LoadMetrics load = parseLoadAverage(runCommand(client, "cat /proc/loadavg"));
            SystemMetricsResponse.UptimeMetrics uptime = new SystemMetricsResponse.UptimeMetrics(parseUptimeSeconds(runCommand(client, "cat /proc/uptime")));
            int processCount = parsePositiveInt(runCommand(client, "ps -e --no-headers -o pid | wc -l"), 0);
            List<SystemMetricsResponse.PowerStatus> powerSupplies = parsePowerSupplies(
                    runOptionalCommand(client, buildPowerStatusCommand())
            );

            String lscpuRaw = runOptionalCommand(client, "LC_ALL=C lscpu");
            String sensorsRaw = runOptionalCommand(client, "sensors -j 2>/dev/null || true");
            CpuSensorSnapshot cpuSensorSnapshot = parseCpuSensors(sensorsRaw);
            Double currentFrequencyMHz = readCurrentFrequencyMHz(client, lscpuRaw);
            SystemMetricsResponse.CpuHardwareMetrics cpuHardware = parseCpuHardwareMetrics(
                    lscpuRaw,
                    logicalCores,
                    currentFrequencyMHz,
                    cpuSensorSnapshot.coreTemperatures
            );

            List<SystemMetricsResponse.GpuMetrics> gpus = parseGpus(runOptionalCommand(
                    client,
                    "nvidia-smi --query-gpu=index,name,temperature.gpu,fan.speed,utilization.gpu,memory.used,memory.total,power.draw,power.limit --format=csv,noheader,nounits 2>/dev/null || true"
            ));
            List<SystemMetricsResponse.DiskUsage> disks = parseDiskUsage(runCommand(client, "df -B1 -P"));

            List<SystemMetricsResponse.ProcessInfo> topProcesses;
            try {
                topProcesses = collectRealtimeProcesses(client, logicalCores, limit);
            } catch (IOException ex) {
                log.warn("瀹炴椂杩涚▼閲囨牱澶辫触锛屽洖閫€鍒?ps 缁撴灉: {}", ex.getMessage());
                topProcesses = parseProcesses(runCommand(
                        client,
                        "ps -eo pid,ppid,%cpu,%mem,etime,state,comm --sort=-%cpu | head -n " + (limit + 1)
                ));
            }

            return new SystemMetricsResponse(
                    Instant.now(),
                    session.sessionId,
                    session.connectionName,
                    session.host,
                    hostname,
                    new SystemMetricsResponse.CpuMetrics(
                            logicalCores,
                            cpuUsagePercent,
                            cpuSensorSnapshot.packageLabel,
                            cpuSensorSnapshot.packageTemperatureCelsius
                    ),
                    cpuHardware,
                    memory,
                    load,
                    uptime,
                    processCount,
                    powerSupplies,
                    gpus,
                    disks,
                    topProcesses
            );
        });
    }

    public List<SystemMetricsResponse.ProcessInfo> getTopProcesses(String sessionId, int limit) throws IOException {
        MonitorSession session = requireSession(sessionId);
        int normalizedLimit = normalizeLimit(limit);
        return executeWithClient(session, client -> {
            int logicalCores = parsePositiveInt(runCommand(client, "getconf _NPROCESSORS_ONLN 2>/dev/null || nproc 2>/dev/null || echo 1"), 1);
            try {
                return collectRealtimeProcesses(client, logicalCores, normalizedLimit);
            } catch (IOException ex) {
                log.warn("瀹炴椂杩涚▼閲囨牱澶辫触锛屽洖閫€鍒?ps 缁撴灉: {}", ex.getMessage());
                return parseProcesses(runCommand(
                        client,
                        "ps -eo pid,ppid,%cpu,%mem,etime,state,comm --sort=-%cpu | head -n " + (normalizedLimit + 1)
                ));
            }
        });
    }

    private MonitorSession requireSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId 涓嶈兘涓虹┖");
        }
        MonitorSession session = sessions.get(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("鏈壘鍒板搴旂殑鐩戞帶浼氳瘽");
        }
        return session;
    }

    private <T> T executeWithClient(MonitorSession session, SshCallback<T> callback) throws IOException {
        synchronized (session.lock) {
            try {
                ensureConnected(session);
                return callback.execute(session.client);
            } catch (IOException ex) {
                if (shouldRetryConnection(ex)) {
                    log.warn("SSH 浼氳瘽寮傚父锛屽噯澶囬噸杩?{}@{}:{}: {}", session.username, session.host, session.port, ex.getMessage());
                    reconnect(session);
                    return callback.execute(session.client);
                }
                throw ex;
            }
        }
    }

    private void ensureConnected(MonitorSession session) throws IOException {
        if (session.client == null || !session.client.isConnected() || !session.client.isAuthenticated()) {
            reconnect(session);
        }
    }

    private void reconnect(MonitorSession session) throws IOException {
        closeClientQuietly(session.client);
        session.client = createConnectedClient(session.host, session.port, session.username, session.password);
    }

    private boolean shouldRetryConnection(IOException ex) {
        if (ex instanceof TransportException) {
            return true;
        }
        String message = ex.getMessage();
        if (message == null) {
            return false;
        }
        String normalized = message.toLowerCase();
        return normalized.contains("connection reset")
                || normalized.contains("broken pipe")
                || normalized.contains("socket closed")
                || normalized.contains("disconnect");
    }

    private SSHClient createConnectedClient(String host, int port, String username, String password) throws IOException {
        SSHClient client = new SSHClient();
        client.addHostKeyVerifier(new PromiscuousVerifier());
        client.setConnectTimeout(DEFAULT_CONNECT_TIMEOUT_MS);
        client.setTimeout(DEFAULT_CONNECT_TIMEOUT_MS);
        client.connect(host, port);
        try {
            client.authPassword(username, password);
        } catch (IOException ex) {
            closeClientQuietly(client);
            throw ex;
        }
        return client;
    }

    private String runOptionalCommand(SSHClient client, String command) {
        try {
            return runCommand(client, command);
        } catch (IOException ex) {
            log.debug("鍙€夊懡浠ゆ墽琛屽け璐? {} -> {}", command, ex.getMessage());
            return "";
        }
    }

    private String runCommand(SSHClient client, String command) throws IOException {
        return runCommand(client, command, DEFAULT_COMMAND_TIMEOUT_SECONDS);
    }

    private String runCommand(SSHClient client, String command, int timeoutSeconds) throws IOException {
        try (Session session = client.startSession()) {
            Session.Command remoteCommand = session.exec(command);
            try {
                remoteCommand.join(timeoutSeconds, TimeUnit.SECONDS);
                Integer exitStatus = remoteCommand.getExitStatus();
                if (exitStatus == null && remoteCommand.isOpen()) {
                    remoteCommand.close();
                    throw new IOException("Remote command timed out");
                }

                String stdout = readStream(remoteCommand.getInputStream());
                String stderr = readStream(remoteCommand.getErrorStream());
                if (exitStatus != null && exitStatus != 0) {
                    String detail = stderr.isBlank() ? stdout : stderr;
                    throw new IOException("Remote command failed: " + detail.trim());
                }
                return stdout;
            } finally {
                remoteCommand.close();
            }
        }
    }

    private String readStream(InputStream stream) throws IOException {
        if (stream == null) {
            return "";
        }
        return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
    }

    private List<SystemMetricsResponse.ProcessInfo> collectRealtimeProcesses(SSHClient client, int logicalCores, int limit) throws IOException {
        String raw = runCommand(client, buildRealtimeProcessCpuCommand());
        Map<Long, Double> realtimeCpuMap = parseRealtimeCpuSamples(raw, logicalCores);
        if (realtimeCpuMap.isEmpty()) {
            return List.of();
        }

        List<Long> topPids = realtimeCpuMap.entrySet().stream()
                .sorted(Map.Entry.<Long, Double>comparingByValue().reversed())
                .limit(limit)
                .map(Map.Entry::getKey)
                .toList();
        if (topPids.isEmpty()) {
            return List.of();
        }

        String pidList = topPids.stream()
                .map(String::valueOf)
                .reduce((left, right) -> left + "," + right)
                .orElse("");
        String metadataRaw = runCommand(
                client,
                "ps -p " + pidList + " -o pid=,ppid=,%mem=,etime=,state=,comm= --no-headers"
        );

        Map<Long, ProcessMetadata> metadataMap = parseProcessMetadata(metadataRaw);
        List<SystemMetricsResponse.ProcessInfo> processes = new ArrayList<>();
        for (Long pid : topPids) {
            ProcessMetadata metadata = metadataMap.get(pid);
            if (metadata == null) {
                continue;
            }
            processes.add(new SystemMetricsResponse.ProcessInfo(
                    pid,
                    metadata.parentPid,
                    realtimeCpuMap.getOrDefault(pid, 0.0d),
                    metadata.memoryPercent,
                    metadata.elapsedTime,
                    metadata.state,
                    metadata.command
            ));
        }
        return processes;
    }

    private String buildRealtimeProcessCpuCommand() {
        return "bash -lc \"set -euo pipefail; "
                + "sample_total(){ awk '/^cpu /{sum=0; idle=\\$5+\\$6; for(i=2;i<=NF;i++) sum+=\\$i; printf \\\"%s %s\\\\n\\\", sum, idle; exit}' /proc/stat; }; "
                + "sample_proc(){ for f in /proc/[0-9]*/stat; do [ -r \\\"\\$f\\\" ] || continue; awk '{print \\$1, (\\$14+\\$15)}' \\\"\\$f\\\" 2>/dev/null || true; done | sort -n; }; "
                + "sample_total; sample_proc; "
                + "echo __CODEX_SPLIT__; "
                + "sleep " + String.format("%.1f", PROCESS_SAMPLE_INTERVAL_MILLIS / 1000.0) + "; "
                + "sample_total; sample_proc\"";
    }

    private Map<Long, Double> parseRealtimeCpuSamples(String raw, int logicalCores) throws IOException {
        String[] parts = raw.split("__CODEX_SPLIT__\\R?", 2);
        if (parts.length != 2) {
            throw new IOException("Failed to split realtime cpu samples from remote host.");
        }

        Snapshot before = parseRealtimeSnapshot(parts[0]);
        Snapshot after = parseRealtimeSnapshot(parts[1]);
        long totalDelta = after.totalJiffies - before.totalJiffies;
        if (totalDelta <= 0) {
            throw new IOException("Failed to calculate total cpu delta from remote host.");
        }

        Map<Long, Double> cpuMap = new HashMap<>();
        for (Map.Entry<Long, Long> entry : after.processJiffies.entrySet()) {
            long pid = entry.getKey();
            Long beforeJiffies = before.processJiffies.get(pid);
            if (beforeJiffies == null) {
                continue;
            }
            long processDelta = entry.getValue() - beforeJiffies;
            if (processDelta <= 0) {
                continue;
            }
            double cpuPercent = (processDelta * logicalCores * 100.0d) / totalDelta;
            cpuMap.put(pid, roundOneDecimal(cpuPercent));
        }
        return cpuMap;
    }

    private Snapshot parseRealtimeSnapshot(String raw) throws IOException {
        List<String> lines = raw.lines()
                .map(String::trim)
                .filter(line -> !line.isBlank())
                .toList();
        if (lines.isEmpty()) {
            throw new IOException("Remote realtime cpu snapshot is blank.");
        }

        String[] totalParts = lines.get(0).split("\\s+");
        if (totalParts.length < 2) {
            throw new IOException("Invalid total cpu sample format.");
        }

        long totalJiffies = parseLong(totalParts[0], 0L);
        Map<Long, Long> processJiffies = new HashMap<>();
        for (int i = 1; i < lines.size(); i++) {
            String[] parts = lines.get(i).split("\\s+");
            if (parts.length < 2) {
                continue;
            }
            long pid = parseLong(parts[0], -1L);
            long jiffies = parseLong(parts[1], -1L);
            if (pid > 0 && jiffies >= 0) {
                processJiffies.put(pid, jiffies);
            }
        }
        return new Snapshot(totalJiffies, processJiffies);
    }

    private Map<Long, ProcessMetadata> parseProcessMetadata(String raw) {
        Map<Long, ProcessMetadata> metadataMap = new HashMap<>();
        for (String line : raw.lines().toList()) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            String[] parts = trimmed.split("\\s+", 6);
            if (parts.length < 6) {
                continue;
            }
            long pid = parseLong(parts[0], -1L);
            if (pid <= 0) {
                continue;
            }
            metadataMap.put(pid, new ProcessMetadata(
                    parseLong(parts[1], 0L),
                    parseDouble(parts[2], 0.0d),
                    parts[3],
                    parts[4],
                    parts[5]
            ));
        }
        return metadataMap;
    }

    private CpuSamplePair parseCpuSamplePair(String raw) throws IOException {
        List<String> lines = raw.lines()
                .map(String::trim)
                .filter(line -> !line.isBlank())
                .toList();
        if (lines.size() < 2) {
            throw new IOException("Failed to read cpu samples from remote host.");
        }
        CpuSample before = parseCpuSample(lines.get(0));
        CpuSample after = parseCpuSample(lines.get(lines.size() - 1));
        return new CpuSamplePair(before, after);
    }

    private CpuSample parseCpuSample(String line) throws IOException {
        String[] parts = line.trim().split("\\s+");
        if (parts.length < 6 || !"cpu".equals(parts[0])) {
            throw new IOException("Invalid cpu sample format.");
        }
        long total = 0L;
        for (int i = 1; i < parts.length; i++) {
            total += parseLong(parts[i], 0L);
        }
        long idle = parseLong(parts[4], 0L);
        if (parts.length > 5) {
            idle += parseLong(parts[5], 0L);
        }
        return new CpuSample(total, idle);
    }

    private double calculateCpuUsagePercent(CpuSample before, CpuSample after) {
        long totalDelta = after.totalJiffies - before.totalJiffies;
        long idleDelta = after.idleJiffies - before.idleJiffies;
        if (totalDelta <= 0) {
            return 0.0d;
        }
        double usage = (totalDelta - idleDelta) * 100.0d / totalDelta;
        return roundOneDecimal(usage);
    }

    private SystemMetricsResponse.MemoryMetrics parseMemoryMetrics(String raw) {
        Map<String, Long> meminfo = parseMemInfo(raw);
        long total = meminfo.getOrDefault("MemTotal", 0L) * 1024L;
        long free = meminfo.getOrDefault("MemFree", 0L) * 1024L;
        long available = meminfo.getOrDefault("MemAvailable", free / 1024L) * 1024L;
        long used = Math.max(total - available, 0L);
        double usagePercent = total > 0 ? roundOneDecimal(used * 100.0d / total) : 0.0d;
        return new SystemMetricsResponse.MemoryMetrics(total, used, free, available, usagePercent);
    }

    private Map<String, Long> parseMemInfo(String raw) {
        Map<String, Long> result = new HashMap<>();
        for (String line : raw.lines().toList()) {
            Matcher matcher = MEMINFO_PATTERN.matcher(line.trim());
            if (matcher.find()) {
                result.put(matcher.group(1), parseLong(matcher.group(2), 0L));
            }
        }
        return result;
    }

    private SystemMetricsResponse.LoadMetrics parseLoadAverage(String raw) throws IOException {
        String[] parts = raw.trim().split("\\s+");
        if (parts.length < 3) {
            throw new IOException("Unexpected load average format: " + raw);
        }
        return new SystemMetricsResponse.LoadMetrics(
                parseDouble(parts[0], 0.0d),
                parseDouble(parts[1], 0.0d),
                parseDouble(parts[2], 0.0d)
        );
    }

    private long parseUptimeSeconds(String raw) throws IOException {
        String trimmed = raw.trim();
        if (trimmed.isBlank()) {
            throw new IOException("Unexpected uptime format: " + raw);
        }
        String[] parts = trimmed.split("\\s+");
        return (long) parseDouble(parts[0], 0.0d);
    }

    private List<SystemMetricsResponse.DiskUsage> parseDiskUsage(String raw) {
        List<SystemMetricsResponse.DiskUsage> disks = new ArrayList<>();
        List<String> lines = raw.lines().toList();
        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i).trim();
            if (line.isBlank()) {
                continue;
            }
            String[] parts = line.split("\\s+");
            if (parts.length < 6) {
                continue;
            }
            String filesystem = parts[0];
            if (shouldSkipFilesystem(filesystem)) {
                continue;
            }
            disks.add(new SystemMetricsResponse.DiskUsage(
                    filesystem,
                    parts[5],
                    parseLong(parts[1], 0L),
                    parseLong(parts[2], 0L),
                    parseLong(parts[3], 0L),
                    parseDouble(parts[4].replace("%", ""), 0.0d)
            ));
        }
        return disks;
    }

    private boolean shouldSkipFilesystem(String filesystem) {
        if (filesystem == null || filesystem.isBlank()) {
            return true;
        }
        for (String prefix : SKIPPED_FILESYSTEM_PREFIXES) {
            if (filesystem.startsWith(prefix)) {
                return true;
            }
        }
        return false;
    }

    private List<SystemMetricsResponse.GpuMetrics> parseGpus(String raw) {
        List<SystemMetricsResponse.GpuMetrics> gpus = new ArrayList<>();
        for (String line : raw.lines().toList()) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            String[] parts = trimmed.split("\\s*,\\s*");
            if (parts.length < 9) {
                continue;
            }
            gpus.add(new SystemMetricsResponse.GpuMetrics(
                    (int) parseLong(parts[0], 0L),
                    parts[1],
                    parseNullableDouble(parts[2]),
                    parseNullableDouble(parts[3]),
                    parseNullableDouble(parts[4]),
                    parseNullableLong(parts[5]),
                    parseNullableLong(parts[6]),
                    parseNullableDouble(parts[7]),
                    parseNullableDouble(parts[8])
            ));
        }
        return gpus;
    }

    private String buildPowerStatusCommand() {
        return "bash -lc \""
                + "if sudo -n /usr/local/bin/read_power_status.sh >/dev/null 2>&1; then "
                + "sudo -n /usr/local/bin/read_power_status.sh; "
                + "else "
                + "for d in /sys/class/power_supply/*; do "
                + "[ -d \\\"$d\\\" ] || continue; "
                + "name=$(basename \\\"$d\\\"); "
                + "type=$(cat \\\"$d/type\\\" 2>/dev/null || true); "
                + "status=$(cat \\\"$d/status\\\" 2>/dev/null || true); "
                + "online=$(cat \\\"$d/online\\\" 2>/dev/null || true); "
                + "capacity=$(cat \\\"$d/capacity\\\" 2>/dev/null || true); "
                + "manufacturer=$(cat \\\"$d/manufacturer\\\" 2>/dev/null || true); "
                + "model=$(cat \\\"$d/model_name\\\" 2>/dev/null || cat \\\"$d/model\\\" 2>/dev/null || true); "
                + "printf '%s|%s|%s|%s|%s|%s|%s\\n' \\\"$name\\\" \\\"$type\\\" \\\"$status\\\" \\\"$online\\\" \\\"$capacity\\\" \\\"$manufacturer\\\" \\\"$model\\\"; "
                + "done; "
                + "fi\"";
    }

    private List<SystemMetricsResponse.PowerStatus> parsePowerSupplies(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        if (raw.contains("=== CHASSIS ===")) {
            return parseIpmiPowerSupplies(raw);
        }

        List<SystemMetricsResponse.PowerStatus> powerSupplies = new ArrayList<>();
        for (String line : raw.lines().toList()) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            String[] parts = trimmed.split("\\|", -1);
            if (parts.length < 7) {
                continue;
            }
            powerSupplies.add(new SystemMetricsResponse.PowerStatus(
                    emptyToNull(parts[0]),
                    emptyToNull(parts[1]),
                    emptyToNull(parts[2]),
                    parseOnlineFlag(parts[3]),
                    emptyToNull(parts[4]),
                    parts[4].isBlank() ? null : "%",
                    joinNonBlank(parts[5], parts[6])
            ));
        }
        return powerSupplies;
    }

    private List<SystemMetricsResponse.PowerStatus> parseIpmiPowerSupplies(String raw) {
        List<SystemMetricsResponse.PowerStatus> powerSupplies = new ArrayList<>();
        Map<String, String> chassisValues = new LinkedHashMap<>();
        boolean inChassis = false;
        boolean inSensors = false;

        for (String line : raw.lines().toList()) {
            String trimmed = line.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            if ("=== CHASSIS ===".equals(trimmed)) {
                inChassis = true;
                inSensors = false;
                continue;
            }
            if ("=== SENSORS ===".equals(trimmed)) {
                inChassis = false;
                inSensors = true;
                continue;
            }

            if (inChassis) {
                Matcher matcher = KEY_VALUE_PATTERN.matcher(trimmed);
                if (matcher.find()) {
                    chassisValues.put(matcher.group(1).trim(), matcher.group(2).trim());
                }
                continue;
            }

            if (inSensors) {
                String[] parts = trimmed.split("\\|");
                if (parts.length < 2) {
                    continue;
                }
                String sensorName = parts[0].trim();
                if (!isPowerSensor(sensorName)) {
                    continue;
                }
                String reading = normalizeIpmiValue(parts.length > 1 ? parts[1] : "");
                String unit = normalizeIpmiValue(parts.length > 2 ? parts[2] : "");
                String status = extractPowerSensorStatus(parts);
                String detail = extractPowerSensorDetail(parts);
                if ("discrete".equalsIgnoreCase(unit)) {
                    reading = null;
                    unit = null;
                }
                powerSupplies.add(new SystemMetricsResponse.PowerStatus(
                        sensorName,
                        "IPMI Sensor",
                        emptyToNull(status),
                        parsePowerOkStatus(status),
                        reading,
                        unit,
                        detail
                ));
            }
        }

        if (!chassisValues.isEmpty()) {
            String systemPower = chassisValues.get("System Power");
            String mainPowerFault = chassisValues.get("Main Power Fault");
            String powerOverload = chassisValues.get("Power Overload");
            String powerControlFault = chassisValues.get("Power Control Fault");
            String summary = buildChassisPowerSummary(systemPower, mainPowerFault, powerOverload, powerControlFault);
            powerSupplies.add(0, new SystemMetricsResponse.PowerStatus(
                    "System Power",
                    "IPMI Chassis",
                    mapSystemPowerStatus(systemPower),
                    parsePowerOnline(systemPower),
                    null,
                    null,
                    summary
                ));
        }

        return powerSupplies;
    }

    private boolean isPowerSensor(String sensorName) {
        String normalized = sensorName.toUpperCase();
        if (normalized.contains("FAN") || normalized.contains("POWER IN") || normalized.contains("POWER OUT")) {
            return false;
        }
        return normalized.contains("PSU") && normalized.contains("STATUS");
    }

    private String extractPowerSensorStatus(String[] parts) {
        String reading = normalizeIpmiValue(parts.length > 1 ? parts[1] : "");
        String unit = normalizeIpmiValue(parts.length > 2 ? parts[2] : "");

        if ("discrete".equalsIgnoreCase(unit)) {
            if ("0x0".equalsIgnoreCase(reading)) {
                return "正常";
            }
            return reading;
        }

        String status = normalizeIpmiValue(parts.length > 3 ? parts[3] : "");
        if (status != null) {
            return status;
        }
        if (reading != null && unit != null) {
            return reading + " " + unit;
        }
        return reading;
    }

    private String extractPowerSensorDetail(String[] parts) {
        String sensorName = parts.length > 0 ? parts[0].trim().toUpperCase() : "";
        if (sensorName.contains("STATUS")) {
            return null;
        }
        List<String> detailParts = new ArrayList<>();
        for (int i = 3; i < parts.length; i++) {
            String value = normalizeIpmiValue(parts[i]);
            if (value != null && value.startsWith("0x")) {
                continue;
            }
            if (value != null) {
                detailParts.add(value);
            }
        }
        return detailParts.isEmpty() ? null : String.join(" / ", detailParts);
    }

    private Boolean parsePowerOkStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String normalized = status.trim().toLowerCase();
        if (normalized.contains("ok") || normalized.contains("on") || normalized.contains("present")) {
            return true;
        }
        if (normalized.contains("fail") || normalized.contains("lost") || normalized.contains("absent") || normalized.contains("off")) {
            return false;
        }
        return null;
    }

    private Boolean parsePowerOnline(String systemPower) {
        if (systemPower == null || systemPower.isBlank()) {
            return null;
        }
        String normalized = systemPower.trim().toLowerCase();
        if ("on".equals(normalized)) {
            return true;
        }
        if ("off".equals(normalized)) {
            return false;
        }
        return null;
    }

    private String buildChassisPowerSummary(String systemPower, String mainPowerFault, String powerOverload, String powerControlFault) {
        List<String> parts = new ArrayList<>();
        if (mainPowerFault != null && !mainPowerFault.isBlank()) {
            parts.add("主电源故障: " + toYesNo(mainPowerFault));
        }
        if (powerOverload != null && !powerOverload.isBlank()) {
            parts.add("过载: " + toYesNo(powerOverload));
        }
        if (powerControlFault != null && !powerControlFault.isBlank()) {
            parts.add("控制故障: " + toYesNo(powerControlFault));
        }
        return parts.isEmpty() ? null : String.join(" / ", parts);
    }

    private String mapSystemPowerStatus(String systemPower) {
        if (systemPower == null || systemPower.isBlank()) {
            return null;
        }
        String normalized = systemPower.trim().toLowerCase();
        if ("on".equals(normalized)) {
            return "正常";
        }
        if ("off".equals(normalized)) {
            return "关闭";
        }
        return systemPower;
    }

    private String toYesNo(String value) {
        if (value == null) {
            return "--";
        }
        String normalized = value.trim().toLowerCase();
        if ("false".equals(normalized) || "inactive".equals(normalized) || "off".equals(normalized)) {
            return "否";
        }
        if ("true".equals(normalized) || "active".equals(normalized) || "on".equals(normalized)) {
            return "是";
        }
        return value;
    }

    private String normalizeIpmiValue(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank() || "na".equalsIgnoreCase(trimmed)) {
            return null;
        }
        return trimmed;
    }

    private String joinNonBlank(String left, String right) {
        List<String> parts = new ArrayList<>();
        if (left != null && !left.isBlank()) {
            parts.add(left.trim());
        }
        if (right != null && !right.isBlank()) {
            parts.add(right.trim());
        }
        return parts.isEmpty() ? null : String.join(" / ", parts);
    }

    private SystemMetricsResponse.CpuHardwareMetrics parseCpuHardwareMetrics(
            String lscpuRaw,
            int logicalCores,
            Double currentFrequencyMHz,
            List<SystemMetricsResponse.TemperaturePoint> coreTemperatures
    ) {
        Map<String, String> values = parseKeyValueSection(lscpuRaw);
        String modelName = emptyToNull(values.get("Model name"));
        Integer sockets = parseNullableInt(values.get("Socket(s)"));
        Integer coresPerSocket = parseNullableInt(values.get("Core(s) per socket"));
        Integer threadsPerCore = parseNullableInt(values.get("Thread(s) per core"));
        Integer logicalThreads = parseNullableInt(values.get("CPU(s)"));
        if (logicalThreads == null && logicalCores > 0) {
            logicalThreads = logicalCores;
        }

        Integer physicalCores = null;
        if (sockets != null && coresPerSocket != null) {
            physicalCores = sockets * coresPerSocket;
        } else if (coresPerSocket != null) {
            physicalCores = coresPerSocket;
        } else if (logicalThreads != null && threadsPerCore != null && threadsPerCore > 0) {
            physicalCores = logicalThreads / threadsPerCore;
        }

        if (logicalThreads == null && physicalCores != null && threadsPerCore != null && threadsPerCore > 0) {
            logicalThreads = physicalCores * threadsPerCore;
        }

        return new SystemMetricsResponse.CpuHardwareMetrics(
                modelName,
                sockets,
                physicalCores,
                logicalThreads,
                currentFrequencyMHz,
                parseNullableDouble(values.get("CPU max MHz")),
                coreTemperatures
        );
    }

    private Map<String, String> parseKeyValueSection(String raw) {
        Map<String, String> values = new LinkedHashMap<>();
        for (String line : raw.lines().toList()) {
            Matcher matcher = KEY_VALUE_PATTERN.matcher(line);
            if (matcher.find()) {
                values.put(matcher.group(1).trim(), matcher.group(2).trim());
            }
        }
        return values;
    }

    private CpuSensorSnapshot parseCpuSensors(String raw) {
        if (raw == null || raw.isBlank()) {
            return new CpuSensorSnapshot(null, null, List.of());
        }
        try {
            JsonNode root = objectMapper.readTree(raw);
            List<SystemMetricsResponse.TemperaturePoint> coreTemperatures = new ArrayList<>();
            String packageLabel = null;
            Double packageTemp = null;
            int packageScore = Integer.MIN_VALUE;

            var chips = root.fields();
            while (chips.hasNext()) {
                Map.Entry<String, JsonNode> chipEntry = chips.next();
                String chipName = chipEntry.getKey();
                JsonNode chipNode = chipEntry.getValue();
                if (!chipNode.isObject()) {
                    continue;
                }
                boolean cpuLikeChip = isCpuLikeChip(chipName);
                var labels = chipNode.fields();
                while (labels.hasNext()) {
                    Map.Entry<String, JsonNode> labelEntry = labels.next();
                    String label = labelEntry.getKey();
                    JsonNode labelNode = labelEntry.getValue();
                    if (!labelNode.isObject()) {
                        continue;
                    }

                    Double inputValue = findTemperatureInput(labelNode);
                    if (inputValue == null) {
                        continue;
                    }

                    if (label.startsWith("Core ")) {
                        coreTemperatures.add(new SystemMetricsResponse.TemperaturePoint(label, inputValue));
                        continue;
                    }

                    int score = scoreCpuTemperatureCandidate(cpuLikeChip, label);
                    if (score > packageScore) {
                        packageScore = score;
                        packageLabel = label;
                        packageTemp = inputValue;
                    }
                }
            }

            coreTemperatures.sort(Comparator.comparingInt(tp -> extractCpuCoreIndex(tp.label())));
            return new CpuSensorSnapshot(packageLabel, packageTemp, coreTemperatures);
        } catch (Exception ex) {
            log.debug("CPU 浼犳劅鍣?JSON 瑙ｆ瀽澶辫触: {}", ex.getMessage());
            return new CpuSensorSnapshot(null, null, List.of());
        }
    }

    private Double findTemperatureInput(JsonNode node) {
        var fields = node.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> entry = fields.next();
            if (entry.getKey().endsWith("_input") && entry.getValue().isNumber()) {
                return entry.getValue().asDouble();
            }
        }
        return null;
    }

    private boolean isCpuLikeChip(String chipName) {
        if (chipName == null) {
            return false;
        }
        String normalized = chipName.toLowerCase();
        return normalized.contains("coretemp")
                || normalized.contains("k10temp")
                || normalized.contains("cpu")
                || normalized.contains("zenpower");
    }

    private int scoreCpuTemperatureCandidate(boolean cpuLikeChip, String label) {
        if (label == null) {
            return Integer.MIN_VALUE;
        }
        String normalized = label.toLowerCase();
        if (normalized.startsWith("package id")) {
            return 100;
        }
        if (cpuLikeChip && normalized.contains("tdie")) {
            return 95;
        }
        if (cpuLikeChip && normalized.contains("tctl")) {
            return 90;
        }
        if (cpuLikeChip && normalized.contains("package")) {
            return 85;
        }
        if (cpuLikeChip && normalized.contains("cpu")) {
            return 80;
        }
        if (normalized.startsWith("core ")) {
            return 10;
        }
        return cpuLikeChip ? 50 : 0;
    }

    private int extractCpuCoreIndex(String label) {
        if (label == null) {
            return Integer.MAX_VALUE;
        }
        Matcher matcher = Pattern.compile("Core\\s+(\\d+)").matcher(label);
        if (matcher.find()) {
            return parsePositiveInt(matcher.group(1), Integer.MAX_VALUE);
        }
        return Integer.MAX_VALUE;
    }

    private Double readCurrentFrequencyMHz(SSHClient client, String lscpuRaw) {
        Double fromLscpu = parseNullableDouble(parseKeyValueSection(lscpuRaw).get("CPU MHz"));
        if (fromLscpu != null) {
            return fromLscpu;
        }

        Double fromScaling = readFrequencyFile(client, "/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq", true);
        if (fromScaling != null) {
            return fromScaling;
        }

        Double fromCpuInfoCur = readFrequencyFile(client, "/sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_cur_freq", true);
        if (fromCpuInfoCur != null) {
            return fromCpuInfoCur;
        }

        String cpuinfoRaw = runOptionalCommand(client, "awk -F': +' '/^cpu MHz/{print $2; exit}' /proc/cpuinfo 2>/dev/null || true");
        return parseNullableDouble(cpuinfoRaw);
    }

    private Double readFrequencyFile(SSHClient client, String path, boolean kiloHertz) {
        String raw = runOptionalCommand(client, "cat " + path + " 2>/dev/null || true");
        Double value = parseNullableDouble(raw);
        if (value == null) {
            return null;
        }
        return kiloHertz ? value / 1000.0d : value;
    }

    private List<SystemMetricsResponse.ProcessInfo> parseProcesses(String raw) {
        List<SystemMetricsResponse.ProcessInfo> processes = new ArrayList<>();
        List<String> lines = raw.lines().toList();
        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i).trim();
            if (line.isBlank()) {
                continue;
            }
            String[] parts = line.split("\\s+", 7);
            if (parts.length < 7) {
                continue;
            }
            processes.add(new SystemMetricsResponse.ProcessInfo(
                    parseLong(parts[0], 0L),
                    parseLong(parts[1], 0L),
                    roundOneDecimal(parseDouble(parts[2], 0.0d)),
                    roundOneDecimal(parseDouble(parts[3], 0.0d)),
                    parts[4],
                    parts[5],
                    parts[6]
            ));
        }
        return processes;
    }

    private MonitorSessionResponse toResponse(MonitorSession session) {
        return new MonitorSessionResponse(
                session.sessionId,
                session.connectionName,
                session.host,
                session.port,
                session.username,
                session.connectedAt
        );
    }

    private int normalizeLimit(int limit) {
        if (limit <= 0) {
            return 10;
        }
        return Math.min(limit, 50);
    }

    private String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private String nonBlankOrFallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private int parsePositiveInt(String value, int fallback) {
        Integer parsed = parseNullableInt(value);
        return parsed == null || parsed <= 0 ? fallback : parsed;
    }

    private Integer parseNullableInt(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(trimmed);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Long parseNullableLong(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank() || "N/A".equalsIgnoreCase(trimmed) || "[N/A]".equalsIgnoreCase(trimmed)) {
            return null;
        }
        try {
            return Long.parseLong(trimmed);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Double parseNullableDouble(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank() || "N/A".equalsIgnoreCase(trimmed) || "[N/A]".equalsIgnoreCase(trimmed) || "--".equals(trimmed)) {
            return null;
        }
        try {
            return Double.parseDouble(trimmed);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Boolean parseOnlineFlag(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        if ("1".equals(trimmed) || "true".equalsIgnoreCase(trimmed) || "online".equalsIgnoreCase(trimmed)) {
            return true;
        }
        if ("0".equals(trimmed) || "false".equalsIgnoreCase(trimmed) || "offline".equalsIgnoreCase(trimmed)) {
            return false;
        }
        return null;
    }

    private long parseLong(String value, long fallback) {
        Long parsed = parseNullableLong(value);
        return parsed == null ? fallback : parsed;
    }

    private double parseDouble(String value, double fallback) {
        Double parsed = parseNullableDouble(value);
        return parsed == null ? fallback : parsed;
    }

    private String emptyToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0d) / 10.0d;
    }

    private void closeClientQuietly(SSHClient client) {
        if (client == null) {
            return;
        }
        try {
            client.disconnect();
        } catch (IOException ignored) {
        }
        try {
            client.close();
        } catch (IOException ignored) {
        }
    }

    @FunctionalInterface
    private interface SshCallback<T> {
        T execute(SSHClient client) throws IOException;
    }

    private static final class MonitorSession {
        private final String sessionId;
        private final String connectionName;
        private final String host;
        private final int port;
        private final String username;
        private final String password;
        private final Instant connectedAt;
        private final Object lock = new Object();
        private SSHClient client;

        private MonitorSession(
                String sessionId,
                String connectionName,
                String host,
                int port,
                String username,
                String password,
                Instant connectedAt,
                SSHClient client
        ) {
            this.sessionId = sessionId;
            this.connectionName = connectionName;
            this.host = host;
            this.port = port;
            this.username = username;
            this.password = password;
            this.connectedAt = connectedAt;
            this.client = client;
        }
    }

    private record CpuSample(long totalJiffies, long idleJiffies) {
    }

    private record CpuSamplePair(CpuSample before, CpuSample after) {
    }

    private record Snapshot(long totalJiffies, Map<Long, Long> processJiffies) {
    }

    private record ProcessMetadata(
            long parentPid,
            double memoryPercent,
            String elapsedTime,
            String state,
            String command
    ) {
    }

    private record CpuSensorSnapshot(
            String packageLabel,
            Double packageTemperatureCelsius,
            List<SystemMetricsResponse.TemperaturePoint> coreTemperatures
    ) {
    }
}

