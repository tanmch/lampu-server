# Dokumentasi Konfigurasi Jaringan MikroTik untuk Aplikasi Kontrol Lampu LED

## Daftar Isi
1. [Topologi Jaringan](#topologi-jaringan)
2. [Spesifikasi Jaringan](#spesifikasi-jaringan)
3. [Konfigurasi Router MikroTik](#konfigurasi-router-mikrotik)
4. [Konfigurasi CAPsMAN](#konfigurasi-capsman)
5. [Konfigurasi Access Point (CAP)](#konfigurasi-access-point-cap)
6. [Konfigurasi Server](#konfigurasi-server)
7. [Konfigurasi ESP8266](#konfigurasi-esp8266)
8. [Konfigurasi Aplikasi Web](#konfigurasi-aplikasi-web)
9. [Pengujian Konektivitas](#pengujian-konektivitas)
10. [Troubleshooting](#troubleshooting)

---

## Topologi Jaringan

```
Internet
   |
   | (WAN)
   |
[Router MikroTik] (192.168.216.1)
   | (LAN: 192.168.216.0/24)
   |
   +---[Server] (192.168.216.207)
   |      - Apache Web Server
   |      - FreeRADIUS
   |      - MQTT Broker (Mosquitto)
   |
   +---[CAPsMAN Controller] (Router MikroTik)
   |      |
   |      +---[Access Point 1] (CAP)
   |      +---[Access Point 2] (CAP)
   |      +---[Access Point N] (CAP)
   |
   +---[ESP8266] (DHCP: 192.168.216.x)
   |      - Terhubung ke WiFi AP
   |      - MQTT Client
   |
   +---[Client Devices]
          - Handphone
          - Komputer
          - Laptop
```

---

## Spesifikasi Jaringan

### Informasi Jaringan
- **Network:** 192.168.216.0/24
- **Subnet Mask:** 255.255.255.0
- **Gateway/Router:** 192.168.216.1
- **Server:** 192.168.216.207
- **DHCP Range:** 192.168.216.100 - 192.168.216.200
- **DNS Server:** 192.168.216.1 (Router) atau 8.8.8.8

### Port yang Digunakan
- **HTTP:** 80 (Web Server)
- **HTTPS:** 443 (Web Server - jika menggunakan SSL)
- **MQTT:** 1883 (ESP8266 ke Broker)
- **MQTT WebSocket:** 9001 (Browser ke Broker)
- **RADIUS:** 1812 (Authentication)
- **SSH:** 22 (Administrasi Server)

---

## Konfigurasi Router MikroTik

### 1. Akses Router MikroTik

Masuk ke Router MikroTik menggunakan Winbox, WebFig, atau SSH:
- **IP:** 192.168.216.1
- **Username:** admin (default)
- **Password:** (sesuai konfigurasi Anda)

### 2. Konfigurasi Interface

#### Set IP Address pada Interface LAN

```
/ip address add address=192.168.216.1/24 interface=ether2 comment="LAN Interface"
```

**Catatan:** Ganti `ether2` dengan nama interface LAN Anda. Cek interface dengan:
```
/interface print
```

### 3. Konfigurasi DHCP Server

#### Buat DHCP Pool

```
/ip pool add name=dhcp-pool ranges=192.168.216.100-192.168.216.200
```

#### Konfigurasi DHCP Server

```
/ip dhcp-server add interface=ether2 name=dhcp-server address-pool=dhcp-pool lease-time=1d
```

#### Konfigurasi DHCP Network

```
/ip dhcp-server network add address=192.168.216.0/24 gateway=192.168.216.1 dns-server=192.168.216.1,8.8.8.8
```

### 4. Konfigurasi NAT (Masquerade)

Jika router terhubung ke internet dan perlu NAT:

```
/ip firewall nat add chain=srcnat action=masquerade out-interface=ether1
```

**Catatan:** Ganti `ether1` dengan interface WAN Anda.

### 5. Konfigurasi Firewall (Opsional)

#### Allow LAN ke Internet

```
/ip firewall filter add chain=forward action=accept connection-state=established,related
/ip firewall filter add chain=forward action=accept in-interface=ether2 out-interface=ether1
/ip firewall filter add chain=forward action=accept in-interface=ether1 out-interface=ether2
```

#### Allow Input untuk Administrasi

```
/ip firewall filter add chain=input action=accept connection-state=established,related
/ip firewall filter add chain=input action=accept src-address=192.168.216.0/24
/ip firewall filter add chain=input action=drop
```

### 6. Konfigurasi DNS

```
/ip dns set servers=8.8.8.8,8.8.4.4 allow-remote-requests=yes
```

### 7. Reserve IP untuk Server (DHCP Reservation)

```
/ip dhcp-server lease add address=192.168.216.207 mac-address=AA:BB:CC:DD:EE:FF client-id="server-hostname" comment="Web Server"
```

**Catatan:** Ganti `AA:BB:CC:DD:EE:FF` dengan MAC address server Anda.

---

## Konfigurasi CAPsMAN

### 1. Aktifkan CAPsMAN pada Router

```
/caps-man manager set enabled=yes
```

### 2. Buat Configuration Profile

#### Profile untuk 2.4 GHz

```
/caps-man configuration add name=config-2.4ghz country=indonesia channel-width=20/40mhz-XX \
    datapath.bridge=bridge-local \
    security.authentication-types=wpa2-psk \
    security.encryption=aes-ccm \
    security.passphrase=YourWiFiPassword123 \
    ssid=Lampu-Control-2.4G
```

#### Profile untuk 5 GHz (Opsional)

```
/caps-man configuration add name=config-5ghz country=indonesia channel-width=20/40/80mhz-XXXX \
    datapath.bridge=bridge-local \
    security.authentication-types=wpa2-psk \
    security.encryption=aes-ccm \
    security.passphrase=YourWiFiPassword123 \
    ssid=Lampu-Control-5G
```

**Catatan:** 
- Ganti `YourWiFiPassword123` dengan password WiFi yang diinginkan
- Ganti `bridge-local` dengan nama bridge interface Anda (biasanya `bridge`)

### 3. Buat Provisioning Rule

#### Rule untuk 2.4 GHz

```
/caps-man provisioning add action=create-dynamic-enabled \
    master-configuration=config-2.4ghz \
    identity-regexp="^CAP" \
    radio-mac=00:00:00:00:00:00
```

#### Rule untuk 5 GHz (Opsional)

```
/caps-man provisioning add action=create-dynamic-enabled \
    master-configuration=config-5ghz \
    identity-regexp="^CAP" \
    radio-mac=00:00:00:00:00:00
```

### 4. Buat Bridge Interface (jika belum ada)

```
/interface bridge add name=bridge-local
/interface bridge port add interface=ether2 bridge=bridge-local
```

**Catatan:** Ganti `ether2` dengan interface LAN Anda.

### 5. Verifikasi CAPsMAN

Cek status CAPsMAN:
```
/caps-man manager print
```

Cek daftar CAP yang terhubung:
```
/caps-man registration-table print
```

---

## Konfigurasi Access Point (CAP)

### 1. Reset dan Konfigurasi Awal CAP

#### Akses CAP via Kabel (Ethernet)

Hubungkan CAP ke router atau komputer via kabel, lalu akses IP default CAP (biasanya 192.168.88.1).

#### Set IP Address CAP

```
/ip address add address=192.168.216.10/24 interface=ether1
```

**Catatan:** Gunakan IP yang tidak konflik dengan DHCP range.

#### Set Gateway

```
/ip route add gateway=192.168.216.1
```

#### Set Identity CAP

```
/system identity set name=CAP-01
```

**Catatan:** Nama harus sesuai dengan regex di provisioning rule (misalnya dimulai dengan "CAP").

### 2. Konfigurasi CAP Mode

#### Aktifkan CAP Mode

```
/caps-man ca certificate print
/caps-man ca set enabled=yes
```

#### Set CAPsMAN Manager IP

```
/caps-man manager set enabled=yes caps-man-addresses=192.168.216.1
```

**Catatan:** Ganti `192.168.216.1` dengan IP router yang menjalankan CAPsMAN.

### 3. Verifikasi Koneksi CAP

Setelah beberapa detik, CAP akan terhubung ke CAPsMAN. Verifikasi dengan:

Di Router (CAPsMAN):
```
/caps-man registration-table print
```

Di CAP:
```
/caps-man manager print
```

### 4. Konfigurasi Tambahan (Opsional)

#### Set IP Static untuk CAP

Jika ingin CAP memiliki IP tetap:

Di Router (CAPsMAN):
```
/ip dhcp-server lease add address=192.168.216.10 mac-address=XX:XX:XX:XX:XX:XX comment="CAP-01"
```

**Catatan:** Ganti `XX:XX:XX:XX:XX:XX` dengan MAC address CAP.

---

## Konfigurasi Server

### 1. Set IP Address Static

#### Ubuntu/Debian

Edit file `/etc/netplan/01-netcfg.yaml` atau buat file baru:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 192.168.216.207/24
      gateway4: 192.168.216.1
      nameservers:
        addresses:
          - 192.168.216.1
          - 8.8.8.8
```

Terapkan konfigurasi:
```bash
sudo netplan apply
```

#### CentOS/RHEL

Edit file `/etc/sysconfig/network-scripts/ifcfg-eth0`:

```
BOOTPROTO=static
ONBOOT=yes
IPADDR=192.168.216.207
NETMASK=255.255.255.0
GATEWAY=192.168.216.1
DNS1=192.168.216.1
DNS2=8.8.8.8
```

Restart network:
```bash
sudo systemctl restart network
```

### 2. Verifikasi Koneksi

```bash
# Cek IP address
ip addr show

# Test ping ke router
ping -c 4 192.168.216.1

# Test ping ke internet (jika router terhubung internet)
ping -c 4 8.8.8.8
```

### 3. Konfigurasi Firewall (Opsional)

#### Ubuntu/Debian (UFW)

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 1883/tcp  # MQTT
sudo ufw allow 9001/tcp  # MQTT WebSocket
sudo ufw allow 1812/udp  # RADIUS
sudo ufw enable
```

#### CentOS/RHEL (firewalld)

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=1883/tcp
sudo firewall-cmd --permanent --add-port=9001/tcp
sudo firewall-cmd --permanent --add-port=1812/udp
sudo firewall-cmd --reload
```

### 4. Install dan Konfigurasi MQTT Broker

Pastikan Mosquitto dikonfigurasi untuk menerima koneksi dari jaringan lokal:

Edit `/etc/mosquitto/mosquitto.conf`:

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

Restart Mosquitto:
```bash
sudo systemctl restart mosquitto
```

### 5. Verifikasi Service

```bash
# Cek status Apache
sudo systemctl status apache2

# Cek status FreeRADIUS
sudo systemctl status freeradius

# Cek status Mosquitto
sudo systemctl status mosquitto

# Cek port yang listening
sudo netstat -tuln | grep -E '80|443|1883|9001|1812'
```

---

## Konfigurasi ESP8266

### 1. Konfigurasi WiFi

Edit file `esp8266/lampu_control.ino` atau `esp8266/lampu_control_4led.ino`:

```cpp
// ========== KONFIGURASI WIFI ==========
const char* ssid = "Lampu-Control-2.4G";  // Nama SSID dari CAPsMAN
const char* password = "YourWiFiPassword123";  // Password WiFi
```

### 2. Konfigurasi MQTT Broker

```cpp
// ========== KONFIGURASI MQTT ==========
const char* mqtt_server = "192.168.216.207";  // IP Server
const int mqtt_port = 1883;
```

### 3. Konfigurasi IP Static (Opsional)

Jika ingin ESP8266 menggunakan IP static, tambahkan setelah koneksi WiFi:

```cpp
// Set IP static (opsional)
IPAddress local_IP(192, 168, 216, 150);  // IP yang diinginkan
IPAddress gateway(192, 168, 216, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress dns(192, 168, 216, 1);

if (!WiFi.config(local_IP, gateway, subnet, dns)) {
    Serial.println("STA Failed to configure");
}
```

**Catatan:** Pastikan IP yang dipilih tidak dalam range DHCP (192.168.216.100-200) atau reserve IP di router.

### 4. Reserve IP di Router (Rekomendasi)

Di Router MikroTik, reserve IP untuk ESP8266:

```
/ip dhcp-server lease add address=192.168.216.150 mac-address=XX:XX:XX:XX:XX:XX comment="ESP8266-LED"
```

**Catatan:** 
- Ganti `XX:XX:XX:XX:XX:XX` dengan MAC address ESP8266
- MAC address bisa dilihat di Serial Monitor saat ESP8266 boot

### 5. Upload Kode ke ESP8266

1. Buka file `.ino` di Arduino IDE
2. Edit konfigurasi WiFi dan MQTT sesuai di atas
3. Upload ke ESP8266
4. Buka Serial Monitor (115200 baud) untuk melihat status koneksi

### 6. Verifikasi Koneksi ESP8266

Di Serial Monitor, Anda akan melihat:
```
Menghubungkan ke WiFi: Lampu-Control-2.4G
WiFi terhubung!
IP address: 192.168.216.150
Menghubungkan ke MQTT broker...
Terhubung!
```

---

## Konfigurasi Aplikasi Web

### 1. Konfigurasi MQTT Broker di JavaScript

Edit file `js/config.js` (untuk 1 LED) atau `js/config_4led.js` (untuk 4 LED):

```javascript
const CONFIG = {
    mqtt: {
        // Ganti localhost dengan IP server
        broker: 'ws://192.168.216.207:9001',
        options: {
            clientId: 'lampu_web_client_' + Math.random().toString(16).substr(2, 8),
            username: '',
            password: '',
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
        }
    },
    // ... konfigurasi lainnya
};
```

### 2. Konfigurasi RADIUS (Sudah Benar)

File `config/radius_config.php` sudah menggunakan `localhost` yang benar karena RADIUS berjalan di server yang sama.

### 3. Akses Aplikasi Web

Aplikasi web dapat diakses dari perangkat manapun di jaringan:

- **Dari komputer/laptop:** `http://192.168.216.207/login.html`
- **Dari handphone:** `http://192.168.216.207/login.html`

**Catatan:** Pastikan perangkat terhubung ke WiFi yang sama (Lampu-Control-2.4G atau Lampu-Control-5G).

---

## Pengujian Konektivitas

### 1. Test Koneksi dari Router ke Server

Di Router MikroTik:
```
/ping 192.168.216.207
```

### 2. Test Koneksi dari Server ke Router

Di Server:
```bash
ping -c 4 192.168.216.1
```

### 3. Test Koneksi dari Server ke ESP8266

Di Server:
```bash
ping -c 4 192.168.216.150
```

**Catatan:** Ganti IP dengan IP ESP8266 Anda.

### 4. Test MQTT dari Server

Di Server:
```bash
# Subscribe ke topik status
mosquitto_sub -h localhost -t lampu/status

# Di terminal lain, publish test message
mosquitto_pub -h localhost -t lampu/command -m "ON"
```

### 5. Test MQTT dari ESP8266 ke Server

Di Server, subscribe:
```bash
mosquitto_sub -h 192.168.216.207 -t lampu/status
```

ESP8266 akan mengirim status secara berkala.

### 6. Test MQTT dari Browser

Buka browser console (F12) di halaman kontrol lampu, pastikan tidak ada error koneksi MQTT.

### 7. Test Aplikasi Web dari Handphone

1. Pastikan handphone terhubung ke WiFi "Lampu-Control-2.4G"
2. Buka browser di handphone
3. Akses `http://192.168.216.207/login.html`
4. Login dan test kontrol lampu

### 8. Test Aplikasi Web dari Komputer

1. Pastikan komputer terhubung ke WiFi atau kabel LAN
2. Buka browser
3. Akses `http://192.168.216.207/login.html`
4. Login dan test kontrol lampu

---

## Troubleshooting

### 1. ESP8266 Tidak Bisa Terhubung ke WiFi

**Gejala:** ESP8266 tidak bisa connect ke WiFi

**Solusi:**
- Pastikan SSID dan password benar di kode
- Pastikan ESP8266 dalam jangkauan Access Point
- Cek di router apakah ESP8266 mendapat IP (DHCP lease)
- Cek log di Serial Monitor untuk error detail

**Cek di Router:**
```
/ip dhcp-server lease print
```

### 2. ESP8266 Tidak Bisa Terhubung ke MQTT

**Gejala:** ESP8266 terhubung WiFi tapi tidak bisa connect MQTT

**Solusi:**
- Pastikan IP server (192.168.216.207) benar di kode
- Test ping dari ESP8266 ke server (tidak langsung, tapi cek di router)
- Pastikan port 1883 terbuka di firewall server
- Cek apakah Mosquitto berjalan: `sudo systemctl status mosquitto`
- Cek log Mosquitto: `sudo tail -f /var/log/mosquitto/mosquitto.log`

**Test MQTT dari komputer lain:**
```bash
mosquitto_pub -h 192.168.216.207 -t test/topic -m "test"
```

### 3. Browser Tidak Bisa Terhubung ke MQTT WebSocket

**Gejala:** Aplikasi web tidak bisa connect ke MQTT

**Solusi:**
- Pastikan IP server benar di `js/config.js` atau `js/config_4led.js`
- Pastikan port 9001 terbuka di firewall server
- Cek apakah Mosquitto WebSocket listener aktif
- Buka browser console (F12) untuk melihat error detail
- Test koneksi WebSocket: buka `ws://192.168.216.207:9001` di browser console

**Cek di Server:**
```bash
sudo netstat -tuln | grep 9001
```

### 4. Handphone/Komputer Tidak Bisa Akses Web

**Gejala:** Tidak bisa akses `http://192.168.216.207`

**Solusi:**
- Pastikan perangkat terhubung ke WiFi yang sama
- Pastikan IP server benar (192.168.216.207)
- Test ping dari perangkat ke server
- Cek apakah Apache berjalan: `sudo systemctl status apache2`
- Cek firewall server (port 80 harus terbuka)

**Test dari perangkat:**
```bash
# Di komputer Linux/Mac
ping 192.168.216.207
curl http://192.168.216.207

# Di Windows (Command Prompt)
ping 192.168.216.207
```

### 5. CAP Tidak Terhubung ke CAPsMAN

**Gejala:** Access Point tidak muncul di registration table

**Solusi:**
- Pastikan CAP dan Router dalam jaringan yang sama
- Pastikan IP CAPsMAN manager benar di CAP
- Pastikan identity CAP sesuai dengan provisioning rule
- Cek koneksi antara CAP dan Router

**Cek di Router:**
```
/caps-man registration-table print
```

**Cek di CAP:**
```
/caps-man manager print
```

### 6. Perangkat Tidak Mendapat IP dari DHCP

**Gejala:** Perangkat tidak mendapat IP otomatis

**Solusi:**
- Cek apakah DHCP server aktif di router
- Cek DHCP pool dan range
- Cek apakah interface DHCP server benar
- Restart DHCP server

**Cek di Router:**
```
/ip dhcp-server print
/ip dhcp-server lease print
```

**Restart DHCP:**
```
/ip dhcp-server disable dhcp-server
/ip dhcp-server enable dhcp-server
```

### 7. Server Tidak Bisa Diakses dari Jaringan

**Gejala:** Server tidak bisa di-ping atau diakses

**Solusi:**
- Pastikan IP server benar (192.168.216.207)
- Pastikan gateway benar (192.168.216.1)
- Cek routing di server: `ip route`
- Cek firewall di server
- Test ping dari server ke router

**Cek routing:**
```bash
ip route show
```

**Test koneksi:**
```bash
ping -c 4 192.168.216.1
ping -c 4 8.8.8.8
```

---

## Checklist Konfigurasi

Gunakan checklist ini untuk memastikan semua konfigurasi sudah benar:

### Router MikroTik
- [ ] IP address LAN: 192.168.216.1/24
- [ ] DHCP server aktif dengan range 192.168.216.100-200
- [ ] Gateway dan DNS dikonfigurasi
- [ ] NAT/Masquerade aktif (jika ada internet)
- [ ] Firewall dikonfigurasi dengan benar
- [ ] IP server di-reserve di DHCP (192.168.216.207)
- [ ] IP ESP8266 di-reserve di DHCP (jika menggunakan static)

### CAPsMAN
- [ ] CAPsMAN manager aktif
- [ ] Configuration profile dibuat (2.4 GHz dan/atau 5 GHz)
- [ ] Provisioning rule dibuat
- [ ] Bridge interface dibuat dan dikonfigurasi
- [ ] SSID dan password WiFi dikonfigurasi

### Access Point (CAP)
- [ ] CAP terhubung ke router via kabel
- [ ] IP CAP dikonfigurasi (192.168.216.10 atau DHCP)
- [ ] Gateway dikonfigurasi (192.168.216.1)
- [ ] Identity CAP sesuai dengan provisioning rule
- [ ] CAP mode aktif
- [ ] CAPsMAN manager address dikonfigurasi
- [ ] CAP muncul di registration table

### Server
- [ ] IP static: 192.168.216.207/24
- [ ] Gateway: 192.168.216.1
- [ ] DNS: 192.168.216.1, 8.8.8.8
- [ ] Apache berjalan dan dapat diakses
- [ ] FreeRADIUS berjalan dan dikonfigurasi
- [ ] Mosquitto berjalan dengan WebSocket (port 9001)
- [ ] Firewall mengizinkan port yang diperlukan
- [ ] Server dapat ping ke router dan internet

### ESP8266
- [ ] SSID WiFi sesuai dengan CAPsMAN
- [ ] Password WiFi benar
- [ ] IP MQTT broker: 192.168.216.207
- [ ] Port MQTT: 1883
- [ ] ESP8266 terhubung ke WiFi
- [ ] ESP8266 mendapat IP dari DHCP
- [ ] ESP8266 dapat connect ke MQTT broker
- [ ] Status LED terkirim ke broker

### Aplikasi Web
- [ ] IP MQTT broker di `config.js` atau `config_4led.js`: 192.168.216.207
- [ ] Port WebSocket: 9001
- [ ] Aplikasi dapat diakses dari browser
- [ ] Login RADIUS berfungsi
- [ ] Koneksi MQTT dari browser berhasil
- [ ] Kontrol lampu berfungsi
- [ ] Status lampu update real-time

### Client Devices
- [ ] Handphone terhubung ke WiFi
- [ ] Komputer terhubung ke WiFi atau LAN
- [ ] Perangkat mendapat IP dari DHCP
- [ ] Perangkat dapat ping ke server
- [ ] Perangkat dapat akses aplikasi web
- [ ] Kontrol lampu berfungsi dari perangkat

---

## Konfigurasi untuk 1 LED vs 4 LED

### Perbedaan Konfigurasi

Kedua versi (1 LED dan 4 LED) menggunakan konfigurasi jaringan yang sama. Perbedaannya hanya pada:

1. **File Kode ESP8266:**
   - 1 LED: `esp8266/lampu_control.ino`
   - 4 LED: `esp8266/lampu_control_4led.ino`

2. **File Aplikasi Web:**
   - 1 LED: `index.php`
   - 4 LED: `index_4led.php`

3. **File Konfigurasi JavaScript:**
   - 1 LED: `js/config.js`
   - 4 LED: `js/config_4led.js`

4. **File MQTT Client:**
   - 1 LED: `js/mqtt-client.js`
   - 4 LED: `js/mqtt-client-4led.js`

### Konfigurasi Jaringan Sama

Kedua versi menggunakan:
- IP Server: 192.168.216.207
- MQTT Broker: 192.168.216.207
- Port MQTT: 1883
- Port WebSocket: 9001
- Topik MQTT: `lampu/*` (dengan variasi untuk 4 LED)

**Tidak ada perbedaan konfigurasi jaringan antara versi 1 LED dan 4 LED.**

---

## Kesimpulan

Dengan mengikuti dokumentasi ini, semua perangkat akan terhubung dalam satu jaringan lokal:

1. **Router MikroTik** sebagai gateway dan DHCP server
2. **CAPsMAN** mengelola Access Point secara terpusat
3. **Access Point** menyediakan koneksi WiFi untuk perangkat
4. **Server** menyediakan layanan web, RADIUS, dan MQTT
5. **ESP8266** terhubung ke WiFi dan berkomunikasi dengan server via MQTT
6. **Client devices** (handphone, komputer) dapat mengakses aplikasi web

Semua perangkat dapat saling berkomunikasi dalam jaringan 192.168.216.0/24, dan aplikasi kontrol lampu LED dapat berfungsi dengan baik baik untuk versi 1 LED maupun 4 LED.

---

**Catatan Penting:**
- Ganti semua placeholder (seperti `YourWiFiPassword123`, `XX:XX:XX:XX:XX:XX`) dengan nilai yang sesuai dengan setup Anda
- Sesuaikan nama interface (seperti `ether1`, `ether2`) dengan konfigurasi router Anda
- Backup konfigurasi router sebelum melakukan perubahan besar
- Test setiap langkah sebelum melanjutkan ke langkah berikutnya


