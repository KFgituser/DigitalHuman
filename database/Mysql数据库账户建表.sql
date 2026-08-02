CREATE DATABASE digitalhuman;
SHOW DATABASES;
USE digitalhuman;

CREATE TABLE users (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  enabled BOOLEAN DEFAULT TRUE
);
INSERT INTO users (username, password, role, enabled)
VALUES (
  'bjtu',
  '这里放生成出来的BCrypt密文',
  'ROLE_ADMIN',
  TRUE
)
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  role = VALUES(role),
  enabled = VALUES(enabled);

SHOW TABLES;