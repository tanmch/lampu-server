# Dokumentasi Konfigurasi

## Konfigurasi Database (config/db_config.php)

```php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'lampu_db');
define('DB_USER', 'lampu_user');
define('DB_PASS', 'lampu_password');
define('DB_CHARSET', 'utf8mb4');
```

**Penjelasan:**
- `DB_HOST`: Alamat server MariaDB/MySQL
- `DB_NAME`: Nama database
- `DB_USER`: Username untuk koneksi database
- `DB_PASS`: Password untuk koneksi database
- `DB_CHARSET`: Character set untuk koneksi

## Konfigurasi RADIUS (config/radius_config.php)

```php
define('RADIUS_SERVER', 'localhost');
define('RADIUS_PORT', 1812);
define('RADIUS_SECRET', 'testing123');
define('RADIUS_TIMEOUT', 3);
define('RADIUS_MAX_TRIES', 3);
define('RADIUS_CLIENT_PATH', '/usr/bin/radclient');
```

**Penjelasan:**
- `RADIUS_SERVER`: IP atau hostname server FreeRADIUS
- `RADIUS_PORT`: Port autentikasi RADIUS (default 1812)
- `RADIUS_SECRET`: Shared secret yang sama dengan di `/etc/freeradius/3.0/clients.conf`
- `RADIUS_TIMEOUT`: Timeout koneksi dalam detik
- `RADIUS_MAX_TRIES`: Maksimal percobaan autentikasi
- `RADIUS_CLIENT_PATH`: Path ke executable radclient

**Sinkronisasi dengan FreeRADIUS:**
Pastikan `RADIUS_SECRET` sama dengan `secret` di `/etc/freeradius/3.0/clients.conf`:

```
client localhost {
    ipaddr = 127.0.0.1
    secret = testing123
    ...
}
```

## Konfigurasi MQTT (config/mqtt_config.php)

```php
define('MQTT_BROKER_HOST', 'localhost');
define('MQTT_BROKER_PORT', 1883);
define('MQTT_WS_PORT', 9001);
define('MQTT_TOPIC_CONFIG', 'lampu/config');
define('MQTT_TOPIC_STATUS', 'lampu/status');
```

**Penjelasan:**
- `MQTT_BROKER_HOST`: IP atau hostname broker MQTT
- `MQTT_BROKER_PORT`: Port MQTT untuk ESP8266 (default 1883)
- `MQTT_WS_PORT`: Port WebSocket untuk browser (default 9001)
- `MQTT_TOPIC_CONFIG`: Topik untuk mengirim konfigurasi user ke ESP8266
- `MQTT_TOPIC_STATUS`: Topik untuk menerima status dari ESP8266

## Konfigurasi MQTT WebSocket (js/config.js dan js/config_4led.js)

```javascript
const CONFIG = {
    mqtt: {
        broker: 'ws://localhost:9001',
        options: {
            clientId: 'lampu_web_client_' + Math.random().toString(16).substr(2, 8),
            username: '',
            password: '',
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
        }
    },
    topics: {
        command: 'lampu/command',
        status: 'lampu/status',
        intensity: 'lampu/intensity',
        color: 'lampu/color',
        config: 'lampu/config'
    }
};
```

**Penjelasan:**
- `broker`: URL WebSocket broker (ws:// untuk HTTP, wss:// untuk HTTPS)
- `clientId`: ID unik untuk client MQTT
- `username/password`: Kredensial jika broker memerlukan autentikasi
- `reconnectPeriod`: Interval reconnect dalam milidetik
- `connectTimeout`: Timeout koneksi dalam milidetik
- `topics`: Daftar topik MQTT yang digunakan

**Untuk akses dari jaringan lain:**
Ganti `localhost` dengan IP server:
```javascript
broker: 'ws://192.168.216.207:9001',
```

## Konfigurasi ESP8266

### 1 LED (esp8266/lampu_control.ino)

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";
const int mqtt_port = 1883;

#define PIN_RED    5
#define PIN_GREEN  4
#define PIN_BLUE   0
#define LED_COMMON_ANODE false
```

**Penjelasan:**
- `ssid`: Nama jaringan WiFi
- `password`: Password WiFi
- `mqtt_server`: IP broker MQTT (bukan localhost, gunakan IP server)
- `mqtt_port`: Port MQTT (default 1883)
- `PIN_RED/GREEN/BLUE`: GPIO pin untuk LED RGB
- `LED_COMMON_ANODE`: true jika LED Common Anode, false jika Common Cathode

### 4 LED (esp8266/lampu_control_4led.ino)

```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";
const int mqtt_port = 1883;

const int LED_PINS[NUM_LEDS][3] = {
  {5, 4, 0},    // LED 1: Red, Green, Blue
  {2, 14, 12},  // LED 2: Red, Green, Blue
  {13, 15, 16}, // LED 3: Red, Green, Blue
  {1, 3, 10}    // LED 4: Red, Green, Blue
};
```

**Penjelasan:**
- Konfigurasi WiFi dan MQTT sama dengan 1 LED
- `LED_PINS`: Array 2D untuk pin setiap LED [LED][R,G,B]
- Setiap LED membutuhkan 3 pin (Red, Green, Blue)

## Konfigurasi Apache (.htaccess)

```
DirectoryIndex login.html
```

**Penjelasan:**
- `DirectoryIndex`: File default yang diakses saat masuk ke direktori
- Redirect otomatis ke `login.html` saat akses root

## Struktur Konfigurasi User di Database

### Format 1 LED

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

### Format 4 LED

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

## Alur Konfigurasi

1. **User Login** → Autentikasi RADIUS
2. **Load Config** → Ambil dari database berdasarkan username dan led_type
3. **Publish Config** → Kirim ke topik `lampu/config` via MQTT
4. **ESP8266 Receive** → Subscribe dan terapkan konfigurasi
5. **User Control** → Perubahan real-time via MQTT
6. **Save Config** → Simpan ke database saat user klik "Simpan Konfigurasi"

## Troubleshooting Konfigurasi

### Database tidak terhubung
- Cek kredensial di `config/db_config.php`
- Test: `mysql -u lampu_user -p lampu_db`
- Cek service: `sudo systemctl status mariadb`

### RADIUS tidak bekerja
- Pastikan `RADIUS_SECRET` sama dengan di `clients.conf`
- Test: `radtest user1 password1 localhost 0 testing123`
- Cek log: `sudo tail -f /var/log/freeradius/radius.log`

### MQTT tidak terhubung
- Pastikan broker berjalan: `sudo systemctl status mosquitto`
- Cek port: `netstat -tuln | grep 9001`
- Pastikan IP broker benar di semua konfigurasi
- Test: `mosquitto_sub -h localhost -t test`

### Konfigurasi tidak terkirim
- Pastikan ESP8266 subscribe ke `lampu/config`
- Cek Serial Monitor ESP8266
- Test publish: `mosquitto_pub -h localhost -t lampu/config -m '{"config":{"state":true}}'`

