package com.digitalhumanbackend.controller;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class TailscaleStatusControllerTest {

    @Test
    void usesWindowsPingArgumentsWithMillisecondTimeout() {
        assertEquals(
                List.of("ping", "-n", "1", "-w", "8000", "10.168.1.101"),
                TailscaleStatusController.buildPingCommand("10.168.1.101", 8000, true)
        );
    }

    @Test
    void usesLinuxPingArgumentsWithRoundedUpSecondTimeout() {
        assertEquals(
                List.of("ping", "-c", "1", "-W", "8", "10.168.1.101"),
                TailscaleStatusController.buildPingCommand("10.168.1.101", 7500, false)
        );
    }

    @Test
    void parsesLinuxAndWindowsRoundTripTimes() {
        assertEquals(13L, TailscaleStatusController.parsePingMs("64 bytes from host: time=12.5 ms"));
        assertEquals(1L, TailscaleStatusController.parsePingMs("Reply from host: time<1ms TTL=128"));
        assertNull(TailscaleStatusController.parsePingMs("Destination Host Unreachable"));
    }
}
