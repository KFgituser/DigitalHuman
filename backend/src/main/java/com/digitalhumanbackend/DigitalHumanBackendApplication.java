package com.digitalhumanbackend;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import lombok.extern.slf4j.Slf4j;

@Slf4j

@SpringBootApplication

public class DigitalHumanBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(DigitalHumanBackendApplication.class, args);
    }

        @Bean
        ApplicationRunner printTailscaleConfig(Environment env) {
            return args -> {
                log.info("beijing={}", env.getProperty("tailscale.target.beijing.name"));
                log.info("tangshan={}", env.getProperty("tailscale.target.tangshan.name"));
            };
        }



}
