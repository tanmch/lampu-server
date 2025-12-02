/**
 * MQTT Client untuk 4 LED dengan penjadwalan
 */

class MQTTClient4LED {
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
                this.updateStatus(status);
            } catch (e) {
                console.error('Error parsing status JSON:', e);
            }
        }
    }
    
    /**
     * Memperbarui status dari ESP8266
     */
    updateStatus(status) {
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
     * Mengirim perintah ke LED spesifik
     */
    publishLEDCommand(ledIndex, command) {
        if (!this.client || !this.connected) {
            console.error('MQTT client tidak terhubung');
            return false;
        }
        
        const topic = this.config.topics.commandPrefix + ledIndex;
        this.client.publish(topic, command, { qos: 1 }, (err) => {
            if (err) {
                console.error('Error publishing LED command:', err);
            } else {
                console.log('LED command published:', topic, command);
            }
        });
        
        return true;
    }
    
    /**
     * Mengirim perintah ke semua LED
     */
    publishAllCommand(command) {
        if (!this.client || !this.connected) {
            console.error('MQTT client tidak terhubung');
            return false;
        }
        
        const topic = this.config.topics.allCommand;
        this.client.publish(topic, command, { qos: 1 }, (err) => {
            if (err) {
                console.error('Error publishing all command:', err);
            } else {
                console.log('All command published:', topic, command);
            }
        });
        
        return true;
    }
    
    /**
     * Mengirim perintah intensitas ke LED spesifik
     */
    publishLEDIntensity(ledIndex, intensity) {
        if (!this.client || !this.connected) {
            console.error('MQTT client tidak terhubung');
            return false;
        }
        
        const message = JSON.stringify({ intensity: parseInt(intensity) });
        const topic = this.config.topics.intensityPrefix + ledIndex;
        
        this.client.publish(topic, message, { qos: 1 }, (err) => {
            if (err) {
                console.error('Error publishing LED intensity:', err);
            } else {
                console.log('LED intensity published:', topic, message);
            }
        });
        
        return true;
    }
    
    /**
     * Mengirim perintah warna ke LED spesifik
     */
    publishLEDColor(ledIndex, color) {
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
        const topic = this.config.topics.colorPrefix + ledIndex;
        
        this.client.publish(topic, message, { qos: 1 }, (err) => {
            if (err) {
                console.error('Error publishing LED color:', err);
            } else {
                console.log('LED color published:', topic, message);
            }
        });
        
        return true;
    }
    
    /**
     * Mengirim perintah penjadwalan
     */
    publishSchedule(schedule) {
        if (!this.client || !this.connected) {
            console.error('MQTT client tidak terhubung');
            return false;
        }
        
        const message = JSON.stringify(schedule);
        const topic = this.config.topics.schedule;
        
        this.client.publish(topic, message, { qos: 1 }, (err) => {
            if (err) {
                console.error('Error publishing schedule:', err);
            } else {
                console.log('Schedule published:', topic, message);
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

