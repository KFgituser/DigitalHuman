package com.digitalhumanbackend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/tailscale")
@RequiredArgsConstructor
public class TailscaleStatusController {

    @Value("${tailscale.target.tangshan.name}")
    private String tangshanName;

    @Value("${tailscale.target.tangshan.url}")
    private String tangshanUrl;

    @Value("${tailscale.target.tangshan.ip}")
    private String tangshanIp;

    @Value("${tailscale.target.beijing.name}")
    private String beijingName;

    @Value("${tailscale.target.beijing.url}")
    private String beijingUrl;

    @Value("${tailscale.target.beijing.ip}")
    private String beijingIp;

    @Value("${tailscale.timeout.ms:4000}")
    private int timeoutMs;

    @GetMapping("/status")
    public Map<String, Object> status() {
        Map<String, Object> response = new HashMap<>();
        TargetResult tangshan = safeCheckTarget(tangshanName, tangshanUrl, tangshanIp);
        TargetResult beijing = safeCheckTarget(beijingName, beijingUrl, beijingIp);
        response.put("tangshan", tangshan);
        response.put("beijing", beijing);
        return response;
    }

    private boolean checkHttp(String url) throws IOException {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(timeoutMs);
            connection.setReadTimeout(timeoutMs);
            connection.setRequestMethod("HEAD");
            int code = connection.getResponseCode();
            return code >= 200 && code < 400;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private PingResult pingHost(String ip) throws IOException, InterruptedException {
        boolean windows = System.getProperty("os.name", "").toLowerCase(Locale.ROOT).startsWith("windows");
        int effectiveTimeoutMs = Math.max(1, timeoutMs);
        ProcessBuilder processBuilder = new ProcessBuilder(buildPingCommand(ip, effectiveTimeoutMs, windows));
        processBuilder.redirectErrorStream(true);
        long start = System.currentTimeMillis();
        Process process = processBuilder.start();
        try {
            if (!process.waitFor((long) effectiveTimeoutMs + 1000L, TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                return new PingResult(false, null);
            }
            String output = new String(process.getInputStream().readAllBytes(), Charset.defaultCharset());
            if (process.exitValue() != 0) {
                return new PingResult(false, null);
            }
            Long parsed = parsePingMs(output);
            long elapsed = System.currentTimeMillis() - start;
            return new PingResult(true, parsed != null ? parsed : elapsed);
        } finally {
            process.destroyForcibly();
            try {
                process.getInputStream().close();
            } catch (IOException ignored) {
                // The ping result has already been determined.
            }
        }
    }

    static List<String> buildPingCommand(String ip, int timeoutMs, boolean windows) {
        if (windows) {
            return List.of("ping", "-n", "1", "-w", String.valueOf(timeoutMs), ip);
        }
        int timeoutSeconds = (int) Math.min(Integer.MAX_VALUE, ((long) timeoutMs + 999L) / 1000L);
        return List.of("ping", "-c", "1", "-W", String.valueOf(Math.max(1, timeoutSeconds)), ip);
    }

    static Long parsePingMs(String output) {
        Pattern pattern = Pattern.compile("(?:time|时间)\\s*[=<]\\s*(\\d+(?:[.,]\\d+)?)\\s*ms", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(output);
        if (matcher.find()) {
            try {
                return Math.max(1L, Math.round(Double.parseDouble(matcher.group(1).replace(',', '.'))));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private TargetResult checkTarget(String name, String url, String ip) throws IOException, InterruptedException {
        boolean httpOk = checkHttp(url);
        PingResult pingResult = pingHost(ip);
        boolean pingOk = pingResult.ok();
        boolean connected = httpOk && pingOk;
        Long pingMs = pingResult.timeMs();
        return new TargetResult(name, url, ip, connected, httpOk, pingOk, pingMs);
    }

    private record PingResult(boolean ok, Long timeMs) {}

    private record TargetResult(
            String name,
            String url,
            String ip,
            boolean connected,
            boolean httpOk,
            boolean pingOk,
            Long pingMs
    ) {
        static TargetResult error(String name, String url, String ip) {
            return new TargetResult(name, url, ip, false, false, false, null);
        }
    }

    private TargetResult safeCheckTarget(String name, String url, String ip) {
        try {
            return checkTarget(name, url, ip);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            return TargetResult.error(name, url, ip);
        } catch (Exception ex) {
            return TargetResult.error(name, url, ip);
        }
    }
}
