/**
 * MQTT Client untuk komunikasi dengan ESP8266
 */

class MQTTClient {
    constructor(config) {
        this.config = config;
        this.client = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        
        // Callbacks
        this.onStatusUpdate = null;
        this.onConnectionChange = null;
    }
    
    /**
     * Menghubungkan ke MQTT broker
     */
    connect() {
        try {
            console.log('Menghubungkan ke MQTT broker:', this.config.mqtt.broker);
            
            this.client = mqtt.connect(this.config.mqtt.broker, this.config.mqtt.options);
            
            // Event handler untuk koneksi berhasil
            this.client.on('connect', () => {
                console.log('Terhubung ke MQTT broker');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
                
                // Subscribe ke topik status
                this.subscribeToStatus();
            });
            
            // Event handler untuk menerima pesan
            this.client.on('message', (topic, message) => {
                this.handleMessage(topic, message.toString());
            });
            
            // Event handler untuk error
            this.client.on('error', (error) => {
                console.error('MQTT Error:', error);
                this.updateConnectionStatus(false);
            });
            
            // Event handler untuk disconnect
            this.client.on('close', () => {
                console.log('MQTT connection closed');
                this.connected = false;
                this.updateConnectionStatus(false);
            });
            
            // Event handler untuk reconnect
            this.client.on('reconnect', () => {
                this.reconnectAttempts++;
                console.log(`Mencoba reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error('Maksimal percobaan reconnect tercapai');
                    this.client.end();
                }
            });
            
            // Event handler untuk offline
            this.client.on('offline', () => {
                console.log('MQTT client offline');
                this.connected = false;
                this.updateConnectionStatus(false);
            });
            
        } catch (error) {
            console.error('Error connecting to MQTT:', error);
            this.updateConnectionStatus(false);
        }
    }
    
    /**
     * Subscribe ke topik status
     */
    subscribeToStatus() {
        if (this.client && this.connected) {
            this.client.subscribe(this.config.topics.status, (err) => {
                if (err) {
                    console.error('Error subscribing to status topic:', err);
                } else {
                    console.log('Subscribed to:', this.config.topics.status);
                }
            });
        }
    }
    
    /**
     * Menangani pesan yang diterima
     */
    handleMessage(topic, message) {
        console.log('Received message:', topic, message);
        
        if (topic === this.config.topics.status) {
            try {
                const status = JSON.parse(message);
                this.updateLightStatus(status);
            } catch (e) {
                // Jika bukan JSON, anggap sebagai status sederhana
                const status = {
                    state: message.toLowerCase(),
                    intensity: null,
                    color: null
                };
                this.updateLightStatus(status);
            }
        }
    }
    
    /**
     * Memperbarui status lampu berdasarkan pesan dari ESP8266
     */
    updateLightStatus(status) {
        if (this.onStatusUpdate) {
            this.onStatusUpdate(status);
        }
    }
    
    /**
     * Memperbarui indikator status koneksi
     */
    updateConnectionStatus(connected) {
        if (this.onConnectionChange) {
            this.onConnectionChange(connected);
        }
    }
    
    /**
     * Mengirim perintah ke ESP8266
     */
    publishCommand(command, value = null) {
        if (!this.client || !this.connected) {
            console.error('MQTT client tidak terhubung');
            return false;
        }
        
        const message = value !== null ? JSON.stringify({ command, value }) : command;
        const topic = this.config.topics.command;
        
        this.client.publish(topic, message, { qos: 1 }, (err) => {
            if (err) {
                console.error('Error publishing command:', err);
            } else {
                console.log('Command published:', topic, message);
            }
        });
        
        return true;
    }
    
    /**
     * Mengirim perintah intensitas
     */
    publishIntensity(intensity) {
        if (!this.client || !this.connected) {
            console.error('MQTT client tidak terhubung');
            return false;
        }
        
        const message = JSON.stringify({ intensity: parseInt(intensity) });
        
        this.client.publish(this.config.topics.intensity, message, { qos: 1 }, (err) => {
            if (err) {
                console.error('Error publishing intensity:', err);
            } else {
                console.log('Intensity published:', message);
            }
        });
        
        return true;
    }
    
    /**
     * Mengirim perintah warna
     */
    publishColor(color) {
        if (!this.client || !this.connected) {
            console.error('MQTT client tidak terhubung');
            return false;
        }
        
        // Konversi hex color ke RGB
        const rgb = this.hexToRgb(color);
        const message = JSON.stringify({ 
            color: {
                r: rgb.r,
                g: rgb.g,
                b: rgb.b
            }
        });
        
        this.client.publish(this.config.topics.color, message, { qos: 1 }, (err) => {
            if (err) {
                console.error('Error publishing color:', err);
            } else {
                console.log('Color published:', message);
            }
        });
        
        return true;
    }
    
    /**
     * Konversi hex color ke RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    /**
     * Memutuskan koneksi
     */
    disconnect() {
        if (this.client) {
            this.client.end();
            this.connected = false;
        }
    }
}

// Inisialisasi global MQTT client
let mqttClient = null;

