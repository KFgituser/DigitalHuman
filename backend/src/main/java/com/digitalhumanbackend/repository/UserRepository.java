package com.digitalhumanbackend.repository;

import com.digitalhumanbackend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// repository/UserRepository.java
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
}
