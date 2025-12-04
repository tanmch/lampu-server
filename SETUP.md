# Panduan Setup Sederhana

## 1. Instalasi MQTT Broker (Mosquitto)

### Debian/Ubuntu:
```bash
sudo apt update
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
bind_address 0.0.0.0

# Port WebSocket untuk browser
listener 9001
protocol websockets
bind_address 0.0.0.0

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

## 2. Deploy Aplikasi Web

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
```

3. Edit konfigurasi MQTT:
```bash
sudo nano /var/www/html/lampu-server/js/config.js
```

Ubah IP broker jika tidak di localhost:
```javascript
broker: 'ws://192.168.216.207:9001',  // IP server Anda
```

## 3. Setup ESP8266

1. Install Arduino IDE dan ESP8266 board support
2. Install library:
   - PubSubClient (via Library Manager)
   - ArduinoJson (via Library Manager)
3. Buka file `esp8266/lampu_control.ino`
4. Edit konfigurasi:
   - WiFi SSID dan password
   - MQTT broker IP address
5. Upload ke ESP8266

## 4. Testing

1. Buka browser dan akses: `http://localhost/lampu-server/index.html`
2. Pastikan ESP8266 terhubung ke WiFi dan MQTT broker
3. Pastikan indikator MQTT di browser menunjukkan "Terhubung"
4. Test kontrol lampu

## Troubleshooting

### MQTT tidak terhubung dari browser:
- Cek apakah Mosquitto berjalan: `sudo systemctl status mosquitto`
- Cek port 9001: `netstat -tuln | grep 9001`
- Cek firewall: `sudo ufw allow 9001`
- Pastikan IP broker benar di `js/config.js`

### ESP8266 tidak bisa terhubung ke MQTT:
- Pastikan ESP8266 terhubung ke WiFi (cek Serial Monitor)
- Pastikan IP MQTT broker benar di kode ESP8266
- Pastikan Mosquitto listen di `0.0.0.0:1883` (bukan hanya localhost)
- Cek firewall server: `sudo ufw allow 1883`
- Test dari komputer lain: `mosquitto_pub -h 192.168.216.207 -t test -m "hello"`

### Status lampu tidak update:
- Pastikan ESP8266 subscribe ke topik yang benar
- Cek Serial Monitor ESP8266 untuk melihat pesan yang diterima
- Pastikan ESP8266 publish status secara berkala
- Cek browser console untuk melihat pesan MQTT yang diterima

