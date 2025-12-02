# Aplikasi Web Kontrol Lampu LED dengan ESP8266

Aplikasi web untuk mengontrol lampu LED yang terhubung ke perangkat ESP8266 melalui protokol MQTT, dengan sistem autentikasi menggunakan RADIUS.

## Fitur

- ✅ Autentikasi pengguna menggunakan FreeRADIUS
- ✅ Kontrol lampu ON/OFF
- ✅ Kontrol intensitas cahaya (0-100%)
- ✅ Kontrol warna lampu (RGB)
- ✅ Indikator status lampu real-time
- ✅ Antarmuka pengguna yang responsif dan modern
- ✅ Komunikasi real-time melalui MQTT

## Persyaratan Sistem

- Apache Web Server dengan PHP 7.4 atau lebih baru
- PHP dengan ekstensi:
  - `php-radius` (opsional, untuk autentikasi RADIUS langsung)
  - `session`
  - `json`
- FreeRADIUS Server
- MQTT Broker (Mosquitto) dengan dukungan WebSocket
- Browser modern dengan dukungan WebSocket

## Instalasi Server

### 1. Instalasi Apache dan PHP

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install apache2 php php-cli php-common libapache2-mod-php

# CentOS/RHEL
sudo yum install httpd php php-cli
sudo systemctl enable httpd
sudo systemctl start httpd
```

### 2. Instalasi FreeRADIUS

```bash
# Debian/Ubuntu
sudo apt install freeradius freeradius-utils

# CentOS/RHEL
sudo yum install freeradius freeradius-utils
```

#### Konfigurasi FreeRADIUS

Edit file `/etc/freeradius/3.0/clients.conf` (atau `/etc/freeradius/clients.conf` untuk versi lama):

```
client localhost {
    ipaddr = 127.0.0.1
    secret = testing123
    require_message_authenticator = no
    nas_type = other
}
```

Edit file `/etc/freeradius/3.0/users` untuk menambahkan pengguna:

```
# Format: username Cleartext-Password := "password"
user1 Cleartext-Password := "password1"
user2 Cleartext-Password := "password2"
```

Restart FreeRADIUS:

```bash
sudo systemctl restart freeradius
```

### 3. Instalasi MQTT Broker (Mosquitto)

```bash
# Debian/Ubuntu
sudo apt install mosquitto mosquitto-clients

# CentOS/RHEL
sudo yum install mosquitto mosquitto-clients
```

#### Konfigurasi Mosquitto untuk WebSocket

Edit file `/etc/mosquitto/mosquitto.conf`:

```
# Port MQTT standar
port 1883

# Port WebSocket untuk browser
listener 9001
protocol websockets

# Allow anonymous connections (untuk development)
# Untuk production, gunakan autentikasi
allow_anonymous true
```

Restart Mosquitto:

```bash
sudo systemctl restart mosquitto
```

### 4. Instalasi PHP RADIUS Extension (Opsional)

Jika ingin menggunakan ekstensi PHP RADIUS langsung:

```bash
# Debian/Ubuntu
sudo apt install php-radius

# Atau compile dari source
# Download dari: https://pecl.php.net/package/radius
```

Jika ekstensi tidak tersedia, aplikasi akan menggunakan `radclient` sebagai fallback.

### 5. Deploy Aplikasi Web

1. Clone atau copy file aplikasi ke direktori web server:

```bash
sudo cp -r lampu-server/* /var/www/html/
# atau
sudo cp -r lampu-server/* /var/www/html/lampu/
```

2. Set permissions:

```bash
sudo chown -R www-data:www-data /var/www/html/lampu-server
sudo chmod -R 755 /var/www/html/lampu-server
```

3. Edit konfigurasi RADIUS di `config/radius_config.php` sesuai dengan setup Anda.

4. Edit konfigurasi MQTT di `js/config.js` jika broker tidak di localhost.

### 6. Konfigurasi Apache

Pastikan mod_rewrite dan mod_headers diaktifkan:

```bash
sudo a2enmod rewrite headers
sudo systemctl restart apache2
```

## Konfigurasi ESP8266

Contoh kode untuk ESP8266 tersedia di file `esp8266/lampu_control.ino`. 

### Library yang Diperlukan

- PubSubClient (untuk MQTT)
- WiFi (built-in)
- ArduinoJson (untuk parsing JSON)

### Topik MQTT

- **Subscribe:**
  - `lampu/command` - Menerima perintah ON/OFF
  - `lampu/intensity` - Menerima perintah intensitas (0-100)
  - `lampu/color` - Menerima perintah warna RGB

- **Publish:**
  - `lampu/status` - Mengirim status lampu (JSON format)

### Format Pesan

**Command:**
```
ON
OFF
```

**Intensity:**
```json
{"intensity": 75}
```

**Color:**
```json
{"color": {"r": 255, "g": 0, "b": 0}}
```

**Status (dari ESP8266):**
```json
{
  "state": "on",
  "intensity": 75,
  "color": {"r": 255, "g": 0, "b": 0}
}
```

## Pengujian

### 1. Test RADIUS Authentication

```bash
# Test dengan radtest
radtest user1 password1 localhost 0 testing123
```

### 2. Test MQTT Broker

```bash
# Subscribe ke topik
mosquitto_sub -h localhost -t lampu/status

# Publish test message
mosquitto_pub -h localhost -t lampu/command -m "ON"
```

### 3. Test WebSocket MQTT

Buka browser console dan pastikan koneksi MQTT berhasil.

## Struktur File

```
lampu-server/
├── index.html          # Halaman utama kontrol lampu
├── login.html          # Halaman login
├── auth.php            # Script autentikasi RADIUS
├── logout.php          # Script logout
├── check_session.php   # Script cek session
├── .htaccess           # Konfigurasi Apache
├── css/
│   └── style.css       # Stylesheet
├── js/
│   ├── config.js       # Konfigurasi MQTT
│   ├── mqtt-client.js  # MQTT client
│   ├── controls.js     # Kontrol UI
│   └── login.js        # Script login
├── config/
│   └── radius_config.php  # Konfigurasi RADIUS
└── esp8266/
    └── lampu_control.ino  # Kode ESP8266
```

## Troubleshooting

### Masalah Koneksi MQTT

1. Pastikan Mosquitto berjalan: `sudo systemctl status mosquitto`
2. Cek port WebSocket (9001) terbuka: `netstat -tuln | grep 9001`
3. Cek firewall: `sudo ufw allow 9001`

### Masalah Autentikasi RADIUS

1. Test dengan radtest: `radtest username password localhost 0 secret`
2. Cek log FreeRADIUS: `sudo tail -f /var/log/freeradius/radius.log`
3. Pastikan secret di `config/radius_config.php` sesuai dengan `clients.conf`

### Masalah Session

1. Pastikan direktori session writable: `sudo chmod 777 /var/lib/php/sessions`
2. Cek error log Apache: `sudo tail -f /var/log/apache2/error.log`

## Keamanan

Untuk production, disarankan:

1. Menggunakan HTTPS (SSL/TLS)
2. Mengaktifkan autentikasi MQTT
3. Menggunakan WSS (WebSocket Secure) untuk MQTT
4. Mengubah shared secret RADIUS
5. Menggunakan password yang kuat untuk pengguna RADIUS
6. Membatasi akses ke file konfigurasi

## Lisensi

Aplikasi ini dibuat untuk keperluan edukasi dan dapat digunakan secara bebas.

## Kontribusi

Silakan buat issue atau pull request untuk perbaikan dan fitur baru.

