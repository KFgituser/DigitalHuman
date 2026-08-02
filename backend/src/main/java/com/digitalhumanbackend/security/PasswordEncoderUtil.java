package com.digitalhumanbackend.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordEncoderUtil {

    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String rawPassword = "123456"; // 要加密的密码
        String encodedPassword = encoder.encode(rawPassword);  // 加密后的密码
        System.out.println("Encoded Password: " + encodedPassword);  // 打印加密后的密码
    }
}