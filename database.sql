CREATE DATABASE IF NOT EXISTS lampu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE lampu_db;

CREATE TABLE IF NOT EXISTS user_configs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(191) NOT NULL,
    led_type ENUM('1led', '4led') NOT NULL,
    config_data JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_led (username, led_type),
    INDEX idx_username (username),
    INDEX idx_led_type (led_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE USER IF NOT EXISTS 'lampu_user'@'localhost' IDENTIFIED BY 'lampu_password';
GRANT ALL PRIVILEGES ON lampu_db.* TO 'lampu_user'@'localhost';
FLUSH PRIVILEGES;

