package com.digitalhumanbackend.model;

import jakarta.persistence.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// model/User.java
@lombok.NoArgsConstructor
@lombok.Data
@lombok.AllArgsConstructor
@Entity
@Table(name="users")
public class User {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(nullable=false, unique=true) private String username;
    @Column(nullable=false) private String password;  // BCrypt
    private String role = "ROLE_USER";
    private boolean enabled = true;
    // getter/setter
}

