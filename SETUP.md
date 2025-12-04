# Panduan Setup Lengkap

## 1. Instalasi Apache dan PHP

### Debian/Ubuntu:
```bash
sudo apt update
sudo apt install apache2 php php-cli php-common libapache2-mod-php php-json
sudo systemctl enable apache2
sudo systemctl start apache2
```

### CentOS/RHEL:
```bash
sudo yum install httpd php php-cli php-json
sudo systemctl enable httpd
sudo systemctl start httpd
```

## 2. Instalasi FreeRADIUS

### Debian/Ubuntu:
```bash
sudo apt install freeradius freeradius-utils
```

### CentOS/RHEL:
```bash
sudo yum install freeradius freeradius-utils
```

### Konfigurasi FreeRADIUS:

1. Edit `/etc/freeradius/3.0/clients.conf`:
```bash
sudo nano /etc/freeradius/3.0/clients.conf
```

Tambahkan:
```
client localhost {
    ipaddr = 127.0.0.1
    secret = testing123
    require_message_authenticator = no
    nas_type = other
}
```

2. Edit `/etc/freeradius/3.0/users`:
```bash
sudo nano /etc/freeradius/3.0/users
```

Tambahkan pengguna:
```
user1 Cleartext-Password := "password1"
user2 Cleartext-Password := "password2"
```

3. Restart FreeRADIUS:
```bash
sudo systemctl restart freeradius
sudo systemctl enable freeradius
```

4. Test autentikasi:
```bash
radtest user1 password1 localhost 0 testing123
```

## 3. Instalasi MQTT Broker (Mosquitto)

### Debian/Ubuntu:
```bash
sudo apt install mosquitto mosquitto-clients
```

### CentOS/RHEL:
```bash
sudo yum install mosquitto mosquitto-clients
```

### Konfigurasi Mosquitto:

1. Edit `/etc/mosquitto/mosquitto.conf`:
```bash
sudo nano /etc/mosquitto/mosquitto.conf
```

Tambahkan:
```
# Port MQTT standar
port 1883

# Port WebSocket untuk browser
listener 9001
protocol websockets

# Allow anonymous (untuk development)
allow_anonymous true

# Log
log_dest file /var/log/mosquitto/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
```

2. Buat direktori log:
```bash
sudo mkdir -p /var/log/mosquitto
sudo chown mosquitto:mosquitto /var/log/mosquitto
```

3. Restart Mosquitto:
```bash
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```

4. Test MQTT:
```bash
# Terminal 1: Subscribe
mosquitto_sub -h localhost -t test/topic

# Terminal 2: Publish
mosquitto_pub -h localhost -t test/topic -m "Hello MQTT"
```

## 4. Deploy Aplikasi Web

1. Copy file ke direktori web:
```bash
sudo cp -r /home/m/git/lampu-server/* /var/www/html/
# atau ke subdirectory
sudo cp -r /home/m/git/lampu-server/* /var/www/html/lampu/
```

2. Set permissions:
```bash
sudo chown -R www-data:www-data /var/www/html/lampu-server
sudo chmod -R 755 /var/www/html/lampu-server
sudo chmod -R 777 /var/www/html/lampu-server/config
```

3. Edit konfigurasi:
```bash
sudo nano /var/www/html/lampu-server/config/radius_config.php
```

Sesuaikan dengan setup RADIUS Anda.

4. Edit konfigurasi MQTT:
```bash
sudo nano /var/www/html/lampu-server/js/config.js
```

Sesuaikan alamat broker jika tidak di localhost.

## 5. Konfigurasi Apache

1. Aktifkan modul yang diperlukan:
```bash
sudo a2enmod rewrite headers
sudo systemctl restart apache2
```

2. Cek error log jika ada masalah:
```bash
sudo tail -f /var/log/apache2/error.log
```

## 6. Setup ESP8266

1. Install Arduino IDE dan ESP8266 board support
2. Install library:
   - PubSubClient (via Library Manager)
   - ArduinoJson (via Library Manager)
3. Buka file `esp8266/lampu_control.ino`
4. Edit konfigurasi WiFi dan MQTT
5. Upload ke ESP8266

## 7. Testing

1. Buka browser dan akses: `http://localhost/lampu-server/login.html`
2. Login dengan kredensial yang dibuat di FreeRADIUS
3. Pastikan ESP8266 terhubung ke WiFi dan MQTT broker
4. Test kontrol lampu

### Mode Testing Tanpa Autentikasi & Database

Jika Anda hanya ingin menguji koneksi MQTT, antarmuka web, dan ESP8266 **tanpa RADIUS dan tanpa MySQL**, Anda dapat menggunakan halaman khusus mode testing:

1. Pastikan Mosquitto sudah dikonfigurasi dengan `allow_anonymous true` (seperti di atas) dan berjalan.
2. Pastikan file `js/config.js` mengarah ke broker yang benar, misalnya untuk server lokal:

```javascript
broker: 'ws://localhost:9001',
// atau jika diakses dari perangkat lain di jaringan:
// broker: 'ws://192.168.216.207:9001',
```

3. Akses halaman testing tanpa login:

```text
http://localhost/lampu-server/index_test.php
```

atau, jika diakses dari perangkat lain di jaringan:

```text
http://192.168.216.207/lampu-server/index_test.php
```

4. Pada mode ini:
   - Tidak ada proses login RADIUS.
   - Tidak ada pencatatan ke database MySQL.
   - Halaman langsung menampilkan kontrol lampu dan mencoba terhubung ke MQTT.
   - Sangat cocok untuk pengujian cepat (proof-of-concept) di lingkungan lab.

## Troubleshooting

### MQTT tidak terhubung:
- Cek apakah Mosquitto berjalan: `sudo systemctl status mosquitto`
- Cek port 9001: `netstat -tuln | grep 9001`
- Cek firewall: `sudo ufw allow 9001`

### RADIUS tidak bekerja:
- Test dengan radtest: `radtest user1 password1 localhost 0 testing123`
- Cek log: `sudo tail -f /var/log/freeradius/radius.log`
- Pastikan secret di config sesuai

### Integrasi RADIUS Web Login dengan MySQL

Untuk mencatat akun RADIUS yang berhasil login ke aplikasi web serta menyimpan riwayat login ke database MySQL, lakukan langkah berikut:

1. Buat database dan user MySQL:

```bash
sudo mysql -u root -p
```

Di dalam console MySQL:

```sql
CREATE DATABASE lampu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lampu_user'@'localhost' IDENTIFIED BY 'password_yang_kuat';
GRANT ALL PRIVILEGES ON lampu_db.* TO 'lampu_user'@'localhost';
FLUSH PRIVILEGES;
```

2. Buat tabel untuk menyimpan akun dan riwayat login:

```sql
USE lampu_db;

-- Tabel akun RADIUS yang pernah login ke web
CREATE TABLE users_radius (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(191) NOT NULL UNIQUE,
  created_at    DATETIME NOT NULL,
  last_login_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabel riwayat login web
CREATE TABLE login_history (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(191) NOT NULL,
  success     TINYINT(1) NOT NULL DEFAULT 0,
  source      VARCHAR(50) NOT NULL DEFAULT 'web',
  ip_address  VARCHAR(45) DEFAULT NULL,
  user_agent  TEXT,
  login_time  DATETIME NOT NULL,
  INDEX idx_username (username),
  INDEX idx_login_time (login_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

3. Salin file konfigurasi database PHP:

```bash
cd /var/www/html/lampu-server/config
cp db_config.php.example db_config.php
```

4. Edit `db_config.php` dan sesuaikan dengan kredensial database:

```bash
sudo nano /var/www/html/lampu-server/config/db_config.php
```

Contoh isi (sesuaikan password dan nama database):

```php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'lampu_db');
define('DB_USER', 'lampu_user');
define('DB_PASS', 'password_yang_kuat');
```

5. Setelah konfigurasi ini dibuat:

- Setiap login web yang menggunakan akun RADIUS dan berhasil akan:
  - Mengupdate / menambahkan data di tabel `users_radius` (waktu login terakhir).
  - Mencatat satu baris riwayat login di tabel `login_history` (username, IP, user agent, waktu login, status sukses/gagal).
- Jika koneksi database gagal, proses login web tetap berjalan (hanya logging yang dilewati), sehingga tidak mengganggu autentikasi utama melalui RADIUS.

### Session tidak bekerja:
- Cek permissions: `sudo chmod 777 /var/lib/php/sessions`
- Cek error log Apache

