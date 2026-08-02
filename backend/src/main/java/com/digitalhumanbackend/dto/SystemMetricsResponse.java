package com.digitalhumanbackend.dto;

import java.time.Instant;
import java.util.List;

public record SystemMetricsResponse(
        Instant timestamp,
        String sessionId,
        String connectionName,
        String targetHost,
        String hostname,
        CpuMetrics cpu,
        CpuHardwareMetrics cpuHardware,
        MemoryMetrics memory,
        LoadMetrics load,
        UptimeMetrics uptime,
        int processCount,
        List<PowerStatus> powerSupplies,
        List<GpuMetrics> gpus,
        List<DiskUsage> disks,
        List<ProcessInfo> topProcesses
) {
    public record CpuMetrics(
            int logicalCores,
            double usagePercent,
            String temperatureLabel,
            Double temperatureCelsius
    ) {
    }

    public record CpuHardwareMetrics(
            String modelName,
            Integer sockets,
            Integer physicalCores,
            Integer logicalThreads,
            Double currentFrequencyMHz,
            Double maxFrequencyMHz,
            List<TemperaturePoint> coreTemperatures
    ) {
    }

    public record TemperaturePoint(
            String label,
            Double temperatureCelsius
    ) {
    }

    public record MemoryMetrics(
            long totalBytes,
            long usedBytes,
            long freeBytes,
            long availableBytes,
            double usagePercent
    ) {
    }

    public record LoadMetrics(
            double oneMinute,
            double fiveMinutes,
            double fifteenMinutes
    ) {
    }

    public record UptimeMetrics(
            long seconds
    ) {
    }

    public record PowerStatus(
            String name,
            String type,
            String status,
            Boolean online,
            String reading,
            String unit,
            String detail
    ) {
    }

    public record GpuMetrics(
            int index,
            String name,
            Double temperatureCelsius,
            Double fanSpeedPercent,
            Double utilizationPercent,
            Long memoryUsedMiB,
            Long memoryTotalMiB,
            Double powerDrawWatts,
            Double powerLimitWatts
    ) {
    }

    public record DiskUsage(
            String filesystem,
            String mountPoint,
            long totalBytes,
            long usedBytes,
            long availableBytes,
            double usagePercent
    ) {
    }

    public record ProcessInfo(
            long pid,
            long parentPid,
            double cpuPercent,
            double memoryPercent,
            String elapsedTime,
            String state,
            String command
    ) {
    }
}
