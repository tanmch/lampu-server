class MQTTClient4LED {
    constructor(config) {
        this.config = config;
        this.client = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.onStatusUpdate = null;
        this.onConnectionChange = null;
    }
    
    connect() {
        try {
            console.log('Menghubungkan ke MQTT broker:', this.config.mqtt.broker);
            this.client = mqtt.connect(this.config.mqtt.broker, this.config.mqtt.options);
            this.client.on('connect', () => {
                console.log('Terhubung ke MQTT broker');
                this.connected = true;
                this.reconnectAttempts = 0;
                this.updateConnectionStatus(true);
                this.subscribeToStatus();
            });
            this.client.on('message', (topic, message) => {
                this.handleMessage(topic, message.toString());
            });
            this.client.on('error', (error) => {
                console.error('MQTT Error:', error);
                this.updateConnectionStatus(false);
            });
            this.client.on('close', () => {
                console.log('MQTT connection closed');
                this.connected = false;
                this.updateConnectionStatus(false);
            });
            this.client.on('reconnect', () => {
                this.reconnectAttempts++;
                console.log(`Mencoba reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error('Maksimal percobaan reconnect tercapai');
                    this.client.end();
                }
            });
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
    
    updateStatus(status) {
        if (this.onStatusUpdate) {
            this.onStatusUpdate(status);
        }
    }
    
    updateConnectionStatus(connected) {
        if (this.onConnectionChange) {
            this.onConnectionChange(connected);
        }
    }
    
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
    
    publishLEDColor(ledIndex, color) {
        if (!this.client || !this.connected) {
            console.error('MQTT client tidak terhubung');
            return false;
        }
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
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    disconnect() {
        if (this.client) {
            this.client.end();
            this.connected = false;
        }
    }
}

let mqttClient = null;

