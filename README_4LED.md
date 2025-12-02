# Aplikasi Web Kontrol 4 Lampu LED dengan ESP8266

Versi upgrade dari aplikasi kontrol lampu LED yang mendukung **4 buah LED RGB** dengan fitur **switch toggle** dan **penjadwalan otomatis**.

## Fitur Baru

- ✅ **4 LED RGB Independen** - Kontrol 4 LED secara terpisah
- ✅ **Switch Toggle** - Ganti tombol ON/OFF dengan switch yang lebih intuitif
- ✅ **Penjadwalan Otomatis** - Atur jadwal untuk menyalakan/mematikan LED secara otomatis
- ✅ **Kontrol Per LED** - Setiap LED dapat dikontrol intensitas dan warnanya sendiri
- ✅ **Kontrol Semua LED** - Switch untuk mengontrol semua LED sekaligus

## Hardware Requirements

### ESP8266 Pin Configuration

Setiap LED RGB membutuhkan 3 pin (Red, Green, Blue), sehingga total **12 pin GPIO** diperlukan:

**LED 1:**
- Red: GPIO 5 (D1)
- Green: GPIO 4 (D2)
- Blue: GPIO 0 (D3)

**LED 2:**
- Red: GPIO 2 (D4)
- Green: GPIO 14 (D5)
- Blue: GPIO 12 (D6)

**LED 3:**
- Red: GPIO 13 (D7)
- Green: GPIO 15 (D8)
- Blue: GPIO 16 (D0)

**LED 4:**
- Red: GPIO 1 (TX) - **Hati-hati!**
- Green: GPIO 3 (RX) - **Hati-hati!**
- Blue: GPIO 10 (SD3) - **Hati-hati!**

**Catatan:** GPIO 1, 3, dan 10 mungkin tidak cocok untuk semua board ESP8266. Alternatif:
- Gunakan pin yang tersedia di board Anda
- Atau gunakan multiplexer/shift register jika pin terbatas
- Atau gunakan LED strip WS2812B (NeoPixel) yang hanya butuh 1 pin data

## Instalasi

### 1. Upload Kode ke ESP8266

1. Buka `esp8266/lampu_control_4led.ino` di Arduino IDE
2. Install library yang diperlukan:
   - PubSubClient (via Library Manager)
   - ArduinoJson (via Library Manager)
3. Edit konfigurasi:
   - WiFi SSID dan password
   - MQTT broker IP address
   - Pin configuration (sesuaikan dengan board Anda)
4. Upload ke ESP8266

### 2. Setup Web Application

1. Copy semua file ke web server
2. Akses `index_4led.php` (bukan `index.php`)
3. Login dengan kredensial RADIUS

## Penggunaan

### Kontrol LED

1. **Switch Toggle:** Gunakan switch di setiap LED card untuk menyalakan/mematikan
2. **Intensitas:** Gunakan slider untuk mengatur intensitas (0-100%)
3. **Warna:** Pilih warna menggunakan color picker
4. **Terapkan:** Klik tombol "Terapkan" untuk mengaplikasikan perubahan

### Kontrol Semua LED

Gunakan switch "Power Semua Lampu" untuk mengontrol semua LED sekaligus.

### Penjadwalan

1. Klik "Tambah Jadwal"
2. Pilih LED (atau "Semua LED")
3. Set waktu
4. Pilih aksi (Nyalakan/Matikan)
5. Set intensitas dan warna (opsional)
6. Pilih apakah akan diulang setiap hari
7. Klik "Simpan Jadwal"

Jadwal akan dieksekusi otomatis pada waktu yang ditentukan.

## Topik MQTT

### Perintah ke ESP8266:

- `lampu/led1` - Perintah ON/OFF untuk LED 1
- `lampu/led2` - Perintah ON/OFF untuk LED 2
- `lampu/led3` - Perintah ON/OFF untuk LED 3
- `lampu/led4` - Perintah ON/OFF untuk LED 4
- `lampu/all/command` - Perintah untuk semua LED
- `lampu/intensity/1` - Intensitas LED 1 (JSON: `{"intensity": 75}`)
- `lampu/intensity/2` - Intensitas LED 2
- `lampu/intensity/3` - Intensitas LED 3
- `lampu/intensity/4` - Intensitas LED 4
- `lampu/color/1` - Warna LED 1 (JSON: `{"color": {"r": 255, "g": 0, "b": 0}}`)
- `lampu/color/2` - Warna LED 2
- `lampu/color/3` - Warna LED 3
- `lampu/color/4` - Warna LED 4
- `lampu/schedule` - Perintah penjadwalan

### Status dari ESP8266:

- `lampu/status` - Status semua LED dan jadwal (JSON)

## Format Data Penjadwalan

### Tambah Jadwal:
```json
{
  "action": "add",
  "enabled": true,
  "ledIndex": -1,  // -1 untuk semua LED, 0-3 untuk LED spesifik
  "hour": 18,
  "minute": 30,
  "turnOn": true,
  "intensity": 100,
  "red": 255,
  "green": 255,
  "blue": 255,
  "repeat": true
}
```

### Hapus Jadwal:
```json
{
  "action": "remove",
  "index": 0
}
```

### Hapus Semua Jadwal:
```json
{
  "action": "clear"
}
```

## Format Status

```json
{
  "num_leds": 4,
  "leds": [
    {
      "index": 1,
      "state": "on",
      "intensity": 75,
      "color": {"r": 255, "g": 0, "b": 0}
    },
    ...
  ],
  "schedules": [
    {
      "index": 0,
      "enabled": true,
      "ledIndex": -1,
      "hour": 18,
      "minute": 30,
      "action": "on",
      "intensity": 100,
      "color": {"r": 255, "g": 255, "b": 255},
      "repeat": true
    }
  ]
}
```

## Catatan Penting

1. **Waktu Real-time:** ESP8266 menggunakan NTP untuk mendapatkan waktu. Pastikan ESP8266 terhubung ke internet dan dapat mengakses NTP server.

2. **Pin GPIO:** Beberapa pin (GPIO 1, 3, 10) mungkin tidak cocok untuk semua board. Sesuaikan dengan board ESP8266 Anda.

3. **Common Anode vs Common Cathode:** Edit `LED_COMMON_ANODE` di kode sesuai dengan jenis LED RGB Anda.

4. **Resistor:** Gunakan resistor 220Ω untuk setiap pin LED (total 12 resistor).

5. **Power Supply:** Pastikan power supply cukup untuk 4 LED RGB. Setiap LED dapat mengonsumsi hingga 60mA per warna.

## Troubleshooting

### LED tidak menyala:
- Cek koneksi pin
- Cek apakah LED Common Anode/Cathode sesuai dengan konfigurasi
- Cek resistor

### Penjadwalan tidak bekerja:
- Pastikan ESP8266 terhubung ke internet (untuk NTP)
- Cek waktu di ESP8266 via Serial Monitor
- Pastikan jadwal enabled

### MQTT tidak terhubung:
- Cek IP address MQTT broker
- Cek port WebSocket (9001)
- Cek firewall

## File yang Digunakan

- `index_4led.php` - Halaman utama untuk 4 LED
- `esp8266/lampu_control_4led.ino` - Kode ESP8266 untuk 4 LED
- `js/config_4led.js` - Konfigurasi untuk 4 LED
- `js/mqtt-client-4led.js` - MQTT client untuk 4 LED
- `js/controls_4led.js` - Kontrol UI untuk 4 LED
- `css/style_4led.css` - Styling untuk 4 LED

## Perbedaan dengan Versi 1 LED

| Fitur | Versi 1 LED | Versi 4 LED |
|-------|-------------|-------------|
| Jumlah LED | 1 | 4 |
| Kontrol | Tombol ON/OFF | Switch Toggle |
| Penjadwalan | ❌ | ✅ |
| Kontrol Per LED | N/A | ✅ |
| Kontrol Semua LED | N/A | ✅ |

Tidak wajib punya domain; yang penting semua perangkat bisa saling menjangkau lewat IP/hostname yang benar.

### Untuk skenario yang sekarang:

- **Web aplikasi (Apache)**  
  - Di server yang sama: cukup akses `http://IP-SERVER/index_4led.php` atau `http://localhost/index_4led.php`.  
  - Domain hanya perlu kalau mau akses dari internet dengan nama cantik + HTTPS (misalnya `lampu.rumahku.com`).

- **ESP8266 → MQTT Broker**  
  - Di `lampu_control_4led.ino` cukup isi `mqtt_server` dengan **IP atau hostname** broker, misalnya:
    - `192.168.1.10` (IP lokal server Mosquitto), atau
    - `mqtt.rumahku.com` kalau kamu sudah punya DNS.
  - Tidak perlu domain khusus, IP pun sudah cukup.

- **Web App → MQTT (via WebSocket)**  
  - Di `js/config_4led.js`, bagian `broker: 'ws://localhost:9001'`:
    - Kalau browser di komputer lain, ganti `localhost` jadi **IP server MQTT**, misalnya `ws://192.168.1.10:9001`.

- **Web App → RADIUS**  
  - PHP (`radius_config.php`) pakai `RADIUS_SERVER = 'localhost'` atau IP RADIUS server; lagi‑lagi, domain tidak wajib.

**Kesimpulan**:  
Untuk jaringan lokal/lab, cukup pakai IP (tidak perlu domain). Domain, DNS, dan SSL baru dibutuhkan kalau ingin akses dari luar (internet) atau mau URL yang rapi dan HTTPS.