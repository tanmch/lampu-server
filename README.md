# Aplikasi Web Kontrol Lampu LED dengan ESP8266

Aplikasi web sederhana untuk mengontrol lampu LED yang terhubung ke perangkat ESP8266 melalui protokol MQTT. **Tidak memerlukan autentikasi atau database** - langsung bisa digunakan untuk testing dan pengembangan.

## Fitur

- ✅ Kontrol lampu ON/OFF
- ✅ Kontrol intensitas cahaya (0-100%)
- ✅ Kontrol warna lampu (RGB)
- ✅ Indikator status lampu real-time
- ✅ Antarmuka pengguna yang responsif dan modern
- ✅ Komunikasi real-time melalui MQTT
- ✅ Tidak memerlukan login atau autentikasi

## Persyaratan Sistem

- Apache Web Server dengan PHP (opsional, hanya untuk hosting file HTML)
- MQTT Broker (Mosquitto) dengan dukungan WebSocket
- Browser modern dengan dukungan WebSocket
- ESP8266 dengan koneksi WiFi

## Instalasi Server

### 1. Instalasi MQTT Broker (Mosquitto)

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install mosquitto mosquitto-clients

# CentOS/RHEL
sudo yum install mosquitto mosquitto-clients
```

#### Konfigurasi Mosquitto untuk WebSocket

Edit file `/etc/mosquitto/mosquitto.conf`:

```
# Port MQTT standar
port 1883
bind_address 0.0.0.0

# Port WebSocket untuk browser
listener 9001
protocol websockets
bind_address 0.0.0.0

# Allow anonymous connections (untuk development)
allow_anonymous true

# Log
log_dest file /var/log/mosquitto/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
```

Buat direktori log:
```bash
sudo mkdir -p /var/log/mosquitto
sudo chown mosquitto:mosquitto /var/log/mosquitto
```

Restart Mosquitto:
```bash
sudo systemctl restart mosquitto
sudo systemctl enable mosquitto
```

### 2. Deploy Aplikasi Web

1. Copy file aplikasi ke direktori web server:

```bash
sudo cp -r lampu-server/* /var/www/html/
# atau ke subdirectory
sudo cp -r lampu-server/* /var/www/html/lampu/
```

2. Set permissions:

```bash
sudo chown -R www-data:www-data /var/www/html/lampu-server
sudo chmod -R 755 /var/www/html/lampu-server
```

3. Edit konfigurasi MQTT di `js/config.js`:

```javascript
broker: 'ws://192.168.216.207:9001',  // Ganti dengan IP server Anda
```

### 3. Konfigurasi Apache (Opsional)

Jika menggunakan Apache, pastikan mod_headers diaktifkan:

```bash
sudo a2enmod headers
sudo systemctl restart apache2
```

**Catatan:** Aplikasi ini adalah aplikasi web statis (HTML/CSS/JS), jadi bisa dihosting di web server apapun atau bahkan dibuka langsung dari file system.

## Konfigurasi ESP8266

### Library yang Diperlukan

- PubSubClient (untuk MQTT) - Install via Library Manager di Arduino IDE
- ArduinoJson (untuk parsing JSON) - Install via Library Manager di Arduino IDE

### Setup Kode ESP8266

1. Buka file `esp8266/lampu_control.ino` di Arduino IDE
2. Edit konfigurasi WiFi:

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

3. Edit konfigurasi MQTT:

```cpp
const char* mqtt_server = "192.168.216.207";  // IP server MQTT broker
```

4. Upload ke ESP8266

### Topik MQTT

- **Subscribe (ESP8266 menerima):**
  - `lampu/command` - Menerima perintah ON/OFF
  - `lampu/intensity` - Menerima perintah intensitas (0-100)
  - `lampu/color` - Menerima perintah warna RGB

- **Publish (ESP8266 mengirim):**
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

## Penggunaan

1. Pastikan MQTT broker (Mosquitto) berjalan
2. Pastikan ESP8266 terhubung ke WiFi dan MQTT broker
3. Buka browser dan akses: `http://localhost/lampu-server/index.html` atau `http://192.168.216.207/lampu-server/index.html`
4. Tunggu hingga indikator koneksi MQTT menunjukkan "Terhubung"
5. Gunakan kontrol untuk mengatur lampu

## Pengujian

### Test MQTT Broker

```bash
# Terminal 1: Subscribe ke topik
mosquitto_sub -h localhost -t lampu/status

# Terminal 2: Publish test message
mosquitto_pub -h localhost -t lampu/command -m "ON"
```

### Test WebSocket MQTT

Buka browser console (F12) dan pastikan koneksi MQTT berhasil. Tidak ada error berarti koneksi berhasil.

## Struktur File

```
lampu-server/
├── index.html          # Halaman utama kontrol lampu
├── css/
│   └── style.css       # Stylesheet
├── js/
│   ├── config.js       # Konfigurasi MQTT
│   ├── mqtt-client.js  # MQTT client
│   └── controls.js     # Kontrol UI
└── esp8266/
    └── lampu_control.ino  # Kode ESP8266
```

## Troubleshooting

### MQTT tidak terhubung dari browser

1. Pastikan Mosquitto berjalan: `sudo systemctl status mosquitto`
2. Cek port WebSocket (9001) terbuka: `netstat -tuln | grep 9001`
3. Pastikan IP broker di `js/config.js` benar
4. Cek firewall: `sudo ufw allow 9001`
5. Buka browser console (F12) untuk melihat error detail

### ESP8266 tidak bisa terhubung ke MQTT

1. Pastikan ESP8266 terhubung ke WiFi (cek Serial Monitor)
2. Pastikan IP MQTT broker benar di kode ESP8266
3. Pastikan Mosquitto listen di `0.0.0.0:1883` (bukan hanya localhost)
4. Cek firewall server: `sudo ufw allow 1883`
5. Test dari komputer lain: `mosquitto_pub -h 192.168.216.207 -t test -m "hello"`

### Status lampu tidak update

1. Pastikan ESP8266 subscribe ke topik yang benar
2. Cek Serial Monitor ESP8266 untuk melihat pesan yang diterima
3. Pastikan ESP8266 publish status secara berkala (setiap 5 detik)
4. Cek browser console untuk melihat pesan MQTT yang diterima

## Keamanan

**PENTING:** Aplikasi ini tidak memiliki autentikasi dan cocok untuk:
- Testing dan pengembangan
- Jaringan lokal yang terpercaya
- Prototipe dan demonstrasi

**Untuk production, disarankan:**
1. Menambahkan autentikasi (login)
2. Menggunakan HTTPS (SSL/TLS)
3. Mengaktifkan autentikasi MQTT
4. Menggunakan WSS (WebSocket Secure) untuk MQTT
5. Membatasi akses dengan firewall

## Lisensi

Aplikasi ini dibuat untuk keperluan edukasi dan dapat digunakan secara bebas.

