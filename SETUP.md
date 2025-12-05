# Panduan Setup Lengkap

## 1. Instalasi MariaDB

```bash
sudo apt update
sudo apt install mariadb-server mariadb-client
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation
```

## 2. Setup Database

```bash
sudo mysql -u root -p < database.sql
```

Atau manual:

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE lampu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lampu_db;
CREATE TABLE user_configs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(191) NOT NULL,
    led_type ENUM('1led', '4led') NOT NULL,
    config_data JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_led (username, led_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE USER 'lampu_user'@'localhost' IDENTIFIED BY 'lampu_password';
GRANT ALL PRIVILEGES ON lampu_db.* TO 'lampu_user'@'localhost';
FLUSH PRIVILEGES;
```

## 3. Konfigurasi Database PHP

Edit `config/db_config.php`:

```php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'lampu_db');
define('DB_USER', 'lampu_user');
define('DB_PASS', 'lampu_password');
```

## 4. Instalasi FreeRADIUS

```bash
sudo apt install freeradius freeradius-utils
```

Edit `/etc/freeradius/3.0/clients.conf`:

```
client localhost {
    ipaddr = 127.0.0.1
    secret = testing123
    require_message_authenticator = no
    nas_type = other
}
```

Edit `/etc/freeradius/3.0/users`:

```
user1 Cleartext-Password := "password1"
user2 Cleartext-Password := "password2"
```

Restart:

```bash
sudo systemctl restart freeradius
sudo systemctl enable freeradius
```

Test:

```bash
radtest user1 password1 localhost 0 testing123
```

## 5. Instalasi MQTT Broker

```bash
sudo apt install mosquitto mosquitto-clients
```

Edit `/etc/mosquitto/mosquitto.conf`:

```
port 1883
bind_address 0.0.0.0
listener 9001
protocol websockets
bind_address 0.0.0.0
allow_anonymous true
log_dest file /var/log/mosquitto/mosquitto.log
```

```bash
sudo mkdir -p /var/log/mosquitto
sudo chown mosquitto:mosquitto /var/log/mosquitto
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```

## 6. Deploy Aplikasi

```bash
sudo cp -r lampu-server/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/lampu-server
sudo chmod -R 755 /var/www/html/lampu-server
```

## 7. Konfigurasi

### RADIUS

Edit `config/radius_config.php` sesuai setup Anda.

### MQTT

Edit `config/mqtt_config.php` jika broker tidak di localhost.

Edit `js/config.js` dan `js/config_4led.js` untuk IP broker WebSocket:

```javascript
broker: 'ws://192.168.216.207:9001',
```

## 8. Setup ESP8266

### 1 LED

1. Buka `esp8266/lampu_control.ino`
2. Edit WiFi dan MQTT settings
3. Upload ke ESP8266

### 4 LED

1. Buka `esp8266/lampu_control_4led.ino`
2. Edit WiFi dan MQTT settings
3. Sesuaikan pin LED jika perlu
4. Upload ke ESP8266

## 9. Testing

1. Akses: `http://localhost/lampu-server/`
2. Login dengan kredensial RADIUS
3. Pilih tipe LED
4. Setelah login, konfigurasi otomatis terkirim ke ESP8266
5. Kontrol lampu dan simpan konfigurasi

## Troubleshooting

### Database Error
- Cek koneksi: `mysql -u lampu_user -p lampu_db`
- Cek privileges user
- Cek error log PHP: `tail -f /var/log/apache2/error.log`

### RADIUS Error
- Test: `radtest user1 password1 localhost 0 testing123`
- Cek log: `sudo tail -f /var/log/freeradius/radius.log`

### MQTT Error
- Test broker: `mosquitto_sub -h localhost -t test`
- Cek port: `netstat -tuln | grep 9001`
- Cek firewall: `sudo ufw allow 9001`

### ESP8266 tidak menerima config
- Pastikan subscribe ke `lampu/config`
- Cek Serial Monitor
- Test publish: `mosquitto_pub -h localhost -t lampu/config -m '{"config":{"state":true}}'`
