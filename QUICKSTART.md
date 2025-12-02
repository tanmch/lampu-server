# Quick Start Guide

Panduan cepat untuk menjalankan aplikasi kontrol lampu LED.

## Prerequisites

Pastikan sudah terinstall:
- Apache dengan PHP
- FreeRADIUS
- Mosquitto MQTT Broker

## Langkah Cepat

### 1. Setup FreeRADIUS

```bash
# Edit users file
sudo nano /etc/freeradius/3.0/users

# Tambahkan user (contoh):
user1 Cleartext-Password := "password1"

# Edit clients.conf
sudo nano /etc/freeradius/3.0/clients.conf

# Tambahkan:
client localhost {
    ipaddr = 127.0.0.1
    secret = testing123
    require_message_authenticator = no
    nas_type = other
}

# Restart
sudo systemctl restart freeradius
```

### 2. Setup Mosquitto

```bash
# Edit config
sudo nano /etc/mosquitto/mosquitto.conf

# Tambahkan:
listener 9001
protocol websockets
allow_anonymous true

# Restart
sudo systemctl restart mosquitto
```

### 3. Deploy Aplikasi

```bash
# Copy files
sudo cp -r lampu-server/* /var/www/html/

# Set permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
sudo chmod 777 /var/www/html/config

# Copy config example
cp config/radius_config.php.example config/radius_config.php
```

### 4. Konfigurasi

Edit `config/radius_config.php` sesuai setup Anda.

Edit `js/config.js` jika MQTT broker tidak di localhost.

### 5. Setup ESP8266

1. Buka `esp8266/lampu_control.ino` di Arduino IDE
2. Install library: PubSubClient, ArduinoJson
3. Edit WiFi dan MQTT settings
4. Upload ke ESP8266

### 6. Akses Aplikasi

Buka browser: `http://localhost/login.html`

Login dengan kredensial yang dibuat di FreeRADIUS.

## Testing

### Test RADIUS:
```bash
radtest user1 password1 localhost 0 testing123
```

### Test MQTT:
```bash
# Terminal 1
mosquitto_sub -h localhost -t lampu/status

# Terminal 2
mosquitto_pub -h localhost -t lampu/command -m "ON"
```

## Troubleshooting

- **MQTT tidak connect**: Cek port 9001 terbuka, restart mosquitto
- **RADIUS error**: Test dengan radtest, cek log `/var/log/freeradius/radius.log`
- **Session error**: Cek permissions `/var/lib/php/sessions`

Untuk detail lengkap, lihat `SETUP.md` dan `README.md`.

