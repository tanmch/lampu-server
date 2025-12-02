# Struktur Proyek

```
lampu-server/
│
├── index.php              # Halaman utama kontrol (dilindungi session)
├── index.html             # Backup/alternatif halaman utama
├── login.html             # Halaman login
├── auth.php               # Script autentikasi RADIUS
├── logout.php             # Script logout
├── check_session.php      # API endpoint untuk cek session
├── .htaccess              # Konfigurasi Apache (security headers)
├── .gitignore             # File yang diabaikan Git
│
├── css/
│   └── style.css          # Stylesheet utama (responsive, modern UI)
│
├── js/
│   ├── config.js          # Konfigurasi MQTT dan aplikasi
│   ├── mqtt-client.js     # MQTT client class (publish/subscribe)
│   ├── controls.js        # Event handlers dan kontrol UI
│   └── login.js           # Script untuk halaman login
│
├── config/
│   ├── radius_config.php          # Konfigurasi RADIUS (jangan commit!)
│   └── radius_config.php.example  # Template konfigurasi RADIUS
│
├── esp8266/
│   └── lampu_control.ino  # Kode Arduino untuk ESP8266
│
└── Dokumentasi/
    ├── README.md          # Dokumentasi lengkap
    ├── SETUP.md           # Panduan setup detail
    └── QUICKSTART.md      # Panduan cepat

```

## Deskripsi File

### Frontend
- **index.php**: Halaman utama dengan proteksi session PHP
- **login.html**: Form login dengan validasi client-side
- **css/style.css**: Styling responsif dengan gradient modern

### Backend PHP
- **auth.php**: Autentikasi menggunakan RADIUS (dengan fallback radclient)
- **logout.php**: Menghancurkan session dan redirect
- **check_session.php**: API JSON untuk cek status session

### JavaScript
- **config.js**: Konfigurasi MQTT broker, topik, dan settings
- **mqtt-client.js**: Class untuk koneksi MQTT via WebSocket
- **controls.js**: Handler untuk semua kontrol UI dan update status
- **login.js**: Validasi form login

### Konfigurasi
- **config/radius_config.php**: Settings RADIUS (server, port, secret)
- **js/config.js**: Settings MQTT (broker URL, topik, options)

### Hardware
- **esp8266/lampu_control.ino**: Kode lengkap untuk ESP8266 dengan:
  - WiFi connection
  - MQTT client
  - LED RGB control (PWM)
  - Status publishing

## Alur Aplikasi

1. User mengakses `login.html`
2. Submit form → `auth.php` → Autentikasi RADIUS
3. Jika berhasil → Session dibuat → Redirect ke `index.php`
4. `index.php` cek session → Tampilkan halaman kontrol
5. JavaScript koneksi ke MQTT broker (WebSocket)
6. User klik kontrol → Publish ke MQTT topic
7. ESP8266 subscribe → Eksekusi perintah → Publish status
8. Web app receive status → Update UI real-time

## Topik MQTT

- `lampu/command` - Perintah ON/OFF (subscribe ESP8266)
- `lampu/intensity` - Perintah intensitas 0-100% (subscribe ESP8266)
- `lampu/color` - Perintah warna RGB (subscribe ESP8266)
- `lampu/status` - Status lampu dari ESP8266 (publish ESP8266, subscribe web)

## Format Data

### Command (ke ESP8266):
```
"ON" atau "OFF"
```

### Intensity (ke ESP8266):
```json
{"intensity": 75}
```

### Color (ke ESP8266):
```json
{"color": {"r": 255, "g": 0, "b": 0}}
```

### Status (dari ESP8266):
```json
{
  "state": "on",
  "intensity": 75,
  "color": {"r": 255, "g": 0, "b": 0}
}
```

