package com.digitalhumanbackend.config;

import com.digitalhumanbackend.model.User;
import com.digitalhumanbackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

// config/DataInit.java
@Configuration
@RequiredArgsConstructor
class DataInit {
    private final UserRepository repo;
    private final PasswordEncoder encoder;

    @Value("${app.init-admin.enabled:false}")
    private boolean initAdminEnabled;

    @Value("${app.init-admin.username:}")
    private String initAdminUsername;

    @Value("${app.init-admin.password:}")
    private String initAdminPassword;

    @Bean
    CommandLineRunner initUsers() {
        return args -> {
            if (!initAdminEnabled) {
                return;
            }

            String username = initAdminUsername == null ? "" : initAdminUsername.trim();
            String password = initAdminPassword == null ? "" : initAdminPassword.trim();

            if (username.isEmpty() || password.isEmpty()) {
                throw new IllegalStateException("Init admin enabled but username/password not set");
            }

            if (!repo.existsByUsername(username)) {
                User u = new User();
                u.setUsername(username);
                u.setPassword(encoder.encode(password));
                u.setRole("ROLE_ADMIN");
                u.setEnabled(true);
                repo.save(u);
            }
        };
    }
}
