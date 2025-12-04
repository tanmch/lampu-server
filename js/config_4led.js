/**
 * Konfigurasi MQTT dan Aplikasi untuk 4 LED
 */

const CONFIG = {
    // Konfigurasi MQTT Broker
    mqtt: {
        broker: 'ws://localhost:9001',
        options: {
            clientId: 'lampu_4led_web_client_' + Math.random().toString(16).substr(2, 8),
            username: '',
            password: '',
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
        }
    },
    
    // Topik MQTT untuk 4 LED
    topics: {
        // Topik perintah per LED (lampu/led1, lampu/led2, dll)
        commandPrefix: 'lampu/led',
        
        // Topik perintah semua LED
        allCommand: 'lampu/all/command',
        
        // Topik intensitas per LED (lampu/intensity/1, dll)
        intensityPrefix: 'lampu/intensity/',
        
        // Topik warna per LED (lampu/color/1, dll)
        colorPrefix: 'lampu/color/',
        
        // Topik status dari ESP8266
        status: 'lampu/status',
        
        // Topik penjadwalan
        schedule: 'lampu/schedule'
    },
    
    // Jumlah LED
    numLEDs: 4,
    
    // Interval untuk memeriksa status session (dalam milidetik)
    sessionCheckInterval: 60000,
    
    // Timeout untuk indikator status (dalam milidetik)
    statusTimeout: 5000
};



