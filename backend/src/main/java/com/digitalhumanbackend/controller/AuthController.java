package com.digitalhumanbackend.controller;

import com.digitalhumanbackend.repository.UserRepository;
import com.digitalhumanbackend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// controller/AuthController.java
// AuthController.java
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;  // 认证管理器
    private final JwtUtil jwtUtil;  // JWT 工具类
    private final UserRepository userRepository;  // 用户仓库
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        var username = body.get("username");
        var password = body.get("password");

        // 查找用户并比对密码
        com.digitalhumanbackend.model.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadCredentialsException("用户名或密码错误");
        }

        // 认证成功，生成 JWT

        String token = jwtUtil.generate(body.get("username"));  // 生成 JWT
        return Map.of("token", token, "username", body.get("username"));
    }
}
