# Aplikasi Web Kontrol Lampu LED dengan ESP8266

Aplikasi web untuk mengontrol lampu LED yang terhubung ke perangkat ESP8266 melalui protokol MQTT, dengan sistem autentikasi menggunakan RADIUS dan penyimpanan konfigurasi per akun di MariaDB.

## Fitur

- ✅ Autentikasi pengguna menggunakan FreeRADIUS
- ✅ Penyimpanan konfigurasi per akun di MariaDB
- ✅ Auto-load konfigurasi ke ESP8266 saat login
- ✅ Kontrol lampu ON/OFF
- ✅ Kontrol intensitas cahaya (0-100%)
- ✅ Kontrol warna lampu (RGB)
- ✅ Versi 1 LED dan 4 LED RGB
- ✅ Indikator status lampu real-time
- ✅ Antarmuka pengguna yang responsif dan modern
- ✅ Komunikasi real-time melalui MQTT

## Persyaratan Sistem

- Apache Web Server dengan PHP 7.4 atau lebih baru
- PHP dengan ekstensi:
  - `pdo_mysql` (untuk koneksi MariaDB)
  - `session`
  - `json`
- FreeRADIUS Server
- MariaDB/MySQL Server
- MQTT Broker (Mosquitto) dengan dukungan WebSocket
- Browser modern dengan dukungan WebSocket

## Instalasi

### 1. Setup Database MariaDB

```bash
sudo mysql -u root -p < database.sql
```

Atau secara manual:

```bash
sudo mysql -u root -p
```

```sql
CREATE DATABASE lampu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lampu_user'@'localhost' IDENTIFIED BY 'lampu_password';
GRANT ALL PRIVILEGES ON lampu_db.* TO 'lampu_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Konfigurasi Database

Edit `config/db_config.php`:

```php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'lampu_db');
define('DB_USER', 'lampu_user');
define('DB_PASS', 'lampu_password');
```

### 3. Setup FreeRADIUS

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

Restart FreeRADIUS:

```bash
sudo systemctl restart freeradius
```

### 4. Setup MQTT Broker

Edit `/etc/mosquitto/mosquitto.conf`:

```
port 1883
bind_address 0.0.0.0
listener 9001
protocol websockets
bind_address 0.0.0.0
allow_anonymous true
```

Restart Mosquitto:

```bash
sudo systemctl restart mosquitto
```

### 5. Deploy Aplikasi

```bash
sudo cp -r lampu-server/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html/lampu-server
sudo chmod -R 755 /var/www/html/lampu-server
```

### 6. Konfigurasi

Edit `config/radius_config.php` sesuai setup RADIUS Anda.
Edit `config/mqtt_config.php` jika broker tidak di localhost.
Edit `js/config.js` dan `js/config_4led.js` untuk IP broker WebSocket.

## Penggunaan

1. Akses aplikasi: `http://localhost/lampu-server/` (otomatis redirect ke login)
2. Login dengan kredensial RADIUS
3. Pilih tipe LED (1 LED atau 4 LED)
4. Setelah login, konfigurasi user otomatis dikirim ke ESP8266
5. Kontrol lampu melalui antarmuka web
6. Klik "Simpan Konfigurasi" untuk menyimpan pengaturan

## Struktur Database

### Tabel `user_configs`

- `id`: Primary key
- `username`: Username dari RADIUS
- `led_type`: '1led' atau '4led'
- `config_data`: JSON konfigurasi lampu
- `created_at`: Waktu dibuat
- `updated_at`: Waktu diupdate

### Format Konfigurasi 1 LED

```json
{
  "state": true,
  "intensity": 75,
  "color": {
    "r": 255,
    "g": 0,
    "b": 0
  }
}
```

### Format Konfigurasi 4 LED

```json
{
  "leds": [
    {
      "state": true,
      "intensity": 100,
      "color": {"r": 255, "g": 0, "b": 0}
    },
    {
      "state": false,
      "intensity": 50,
      "color": {"r": 0, "g": 255, "b": 0}
    },
    {
      "state": true,
      "intensity": 75,
      "color": {"r": 0, "g": 0, "b": 255}
    },
    {
      "state": true,
      "intensity": 100,
      "color": {"r": 255, "g": 255, "b": 255}
    }
  ]
}
```

## Topik MQTT

### 1 LED

- `lampu/command` - Perintah ON/OFF
- `lampu/intensity` - Perintah intensitas
- `lampu/color` - Perintah warna
- `lampu/config` - Konfigurasi user (dikirim saat login)
- `lampu/status` - Status dari ESP8266

### 4 LED

- `lampu/led1` sampai `lampu/led4` - Perintah per LED
- `lampu/all/command` - Perintah semua LED
- `lampu/intensity/1` sampai `lampu/intensity/4` - Intensitas per LED
- `lampu/color/1` sampai `lampu/color/4` - Warna per LED
- `lampu/config` - Konfigurasi user (dikirim saat login)
- `lampu/status` - Status semua LED dari ESP8266

## Konfigurasi ESP8266

### 1 LED

Edit `esp8266/lampu_control.ino`:
- WiFi SSID dan password
- MQTT broker IP
- Pin LED (default: GPIO 5, 4, 0)

### 4 LED

Edit `esp8266/lampu_control_4led.ino`:
- WiFi SSID dan password
- MQTT broker IP
- Pin LED (default: GPIO 5,4,0 untuk LED1; 2,14,12 untuk LED2; 13,15,16 untuk LED3; 1,3,10 untuk LED4)

## Alur Kerja

1. User login → Autentikasi RADIUS
2. Jika berhasil → Load konfigurasi dari database
3. Publish konfigurasi ke topik `lampu/config`
4. ESP8266 menerima dan menerapkan konfigurasi
5. User kontrol lampu → Perubahan real-time
6. User simpan konfigurasi → Simpan ke database

## Troubleshooting

### Database tidak terhubung
- Cek kredensial di `config/db_config.php`
- Pastikan user MariaDB memiliki privilege
- Test koneksi: `mysql -u lampu_user -p lampu_db`

### RADIUS tidak bekerja
- Test: `radtest user1 password1 localhost 0 testing123`
- Cek log: `sudo tail -f /var/log/freeradius/radius.log`

### Konfigurasi tidak terkirim ke ESP8266
- Pastikan ESP8266 subscribe ke `lampu/config`
- Cek Serial Monitor ESP8266
- Test publish manual: `mosquitto_pub -h localhost -t lampu/config -m '{"config":{"state":true}}'`

## Keamanan

Untuk production:
1. Gunakan HTTPS
2. Aktifkan autentikasi MQTT
3. Gunakan WSS untuk WebSocket
4. Ubah shared secret RADIUS
5. Gunakan password kuat untuk database
