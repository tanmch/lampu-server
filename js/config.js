/**
 * Konfigurasi MQTT dan Aplikasi
 */

const CONFIG = {
    // Konfigurasi MQTT Broker
    mqtt: {
        // Alamat broker MQTT (gunakan 'ws://' untuk WebSocket atau 'wss://' untuk secure WebSocket)
        broker: 'ws://localhost:9001',
        
        // Alternatif: jika menggunakan MQTT over WebSocket dengan path tertentu
        // broker: 'ws://localhost:9001/mqtt',
        
        // Opsi koneksi MQTT
        options: {
            clientId: 'lampu_web_client_' + Math.random().toString(16).substr(2, 8),
            username: '', // Jika broker memerlukan autentikasi
            password: '', // Jika broker memerlukan autentikasi
            clean: true,
            reconnectPeriod: 5000, // Reconnect setiap 5 detik jika terputus
            connectTimeout: 30000, // Timeout 30 detik
        }
    },
    
    // Topik MQTT
    topics: {
        // Topik untuk mengirim perintah ke ESP8266
        command: 'lampu/command',
        
        // Topik untuk menerima status dari ESP8266
        status: 'lampu/status',
        
        // Topik untuk mengirim perintah intensitas
        intensity: 'lampu/intensity',
        
        // Topik untuk mengirim perintah warna
        color: 'lampu/color'
    },
    
    // Interval untuk memeriksa status session (dalam milidetik)
    sessionCheckInterval: 60000, // 1 menit
    
    // Timeout untuk indikator status (dalam milidetik)
    statusTimeout: 5000 // 5 detik
};

