/**
 * ESP8266 LED Control via MQTT
 * 
 * Kontrol lampu LED menggunakan MQTT dengan fitur:
 * - ON/OFF
 * - Intensitas (PWM)
 * - Warna RGB
 * 
 * Hardware:
 * - ESP8266 (NodeMCU atau sejenisnya)
 * - LED RGB (Common Anode atau Common Cathode)
 * - Resistor 220Ω untuk setiap pin LED
 * 
 * Pin Configuration:
 * - Red LED: GPIO 5 (D1)
 * - Green LED: GPIO 4 (D2)
 * - Blue LED: GPIO 0 (D3)
 * 
 * Untuk LED Common Anode, gunakan logika terbalik (255 - value)
 */

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ========== KONFIGURASI WIFI ==========
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ========== KONFIGURASI MQTT ==========
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";  // IP address MQTT broker (contoh: "192.168.216.207")
const int mqtt_port = 1883;
const char* mqtt_client_id = "ESP8266_Lampu_Client";

// Topik MQTT
const char* topic_command = "lampu/command";
const char* topic_intensity = "lampu/intensity";
const char* topic_color = "lampu/color";
const char* topic_status = "lampu/status";

// ========== KONFIGURASI LED ==========
// Pin untuk LED RGB
#define PIN_RED    5   // D1
#define PIN_GREEN  4   // D2
#define PIN_BLUE   0   // D3

// Tipe LED (ubah sesuai hardware Anda)
// true = Common Anode, false = Common Cathode
#define LED_COMMON_ANODE false

// ========== VARIABEL GLOBAL ==========
WiFiClient espClient;
PubSubClient client(espClient);

// Status lampu
bool lampState = false;
int lampIntensity = 100;  // 0-100%
int redValue = 255;
int greenValue = 255;
int blueValue = 255;

unsigned long lastStatusUpdate = 0;
const unsigned long statusUpdateInterval = 5000;  // Update status setiap 5 detik

// ========== FUNGSI SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(100);
  
  // Setup pin LED
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  
  // Matikan semua LED
  setLED(0, 0, 0);
  
  // Koneksi WiFi
  setup_wifi();
  
  // Setup MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqtt_callback);
}

// ========== FUNGSI LOOP ==========
void loop() {
  if (!client.connected()) {
    reconnect_mqtt();
  }
  client.loop();
  
  // Update status secara berkala
  if (millis() - lastStatusUpdate > statusUpdateInterval) {
    publishStatus();
    lastStatusUpdate = millis();
  }
}

// ========== SETUP WIFI ==========
void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(ssid);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi terhubung!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

// ========== CALLBACK MQTT ==========
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Pesan diterima [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);
  
  // Handle perintah ON/OFF
  if (String(topic) == topic_command) {
    String cmd = message;
    cmd.toUpperCase();
    cmd.trim();
    
    if (cmd == "ON") {
      lampState = true;
      updateLED();
      Serial.println("Lampu: ON");
    } else if (cmd == "OFF") {
      lampState = false;
      setLED(0, 0, 0);
      Serial.println("Lampu: OFF");
    }
    publishStatus();
  }
  
  // Handle intensitas
  else if (String(topic) == topic_intensity) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, message);
    
    if (doc.containsKey("intensity")) {
      lampIntensity = doc["intensity"];
      if (lampIntensity < 0) lampIntensity = 0;
      if (lampIntensity > 100) lampIntensity = 100;
      
      updateLED();
      Serial.print("Intensitas: ");
      Serial.print(lampIntensity);
      Serial.println("%");
      publishStatus();
    }
  }
  
  // Handle warna
  else if (String(topic) == topic_color) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, message);
    
    if (doc.containsKey("color")) {
      JsonObject color = doc["color"];
      redValue = color["r"];
      greenValue = color["g"];
      blueValue = color["b"];
      
      // Clamp values
      redValue = constrain(redValue, 0, 255);
      greenValue = constrain(greenValue, 0, 255);
      blueValue = constrain(blueValue, 0, 255);
      
      updateLED();
      Serial.print("Warna: R=");
      Serial.print(redValue);
      Serial.print(" G=");
      Serial.print(greenValue);
      Serial.print(" B=");
      Serial.println(blueValue);
      publishStatus();
    }
  }
}

// ========== RECONNECT MQTT ==========
void reconnect_mqtt() {
  while (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT broker...");
    
    if (client.connect(mqtt_client_id)) {
      Serial.println("Terhubung!");
      
      // Subscribe ke topik
      client.subscribe(topic_command);
      client.subscribe(topic_intensity);
      client.subscribe(topic_color);
      
      // Publish status awal
      publishStatus();
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Mencoba lagi dalam 5 detik...");
      delay(5000);
    }
  }
}

// ========== SET LED ==========
void setLED(int r, int g, int b) {
  // Apply intensity
  r = (r * lampIntensity) / 100;
  g = (g * lampIntensity) / 100;
  b = (b * lampIntensity) / 100;
  
  // Apply state
  if (!lampState) {
    r = 0;
    g = 0;
    b = 0;
  }
  
  // Invert untuk Common Anode
  if (LED_COMMON_ANODE) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }
  
  analogWrite(PIN_RED, r);
  analogWrite(PIN_GREEN, g);
  analogWrite(PIN_BLUE, b);
}

// ========== UPDATE LED ==========
void updateLED() {
  setLED(redValue, greenValue, blueValue);
}

// ========== PUBLISH STATUS ==========
void publishStatus() {
  DynamicJsonDocument doc(1024);
  
  doc["state"] = lampState ? "on" : "off";
  doc["intensity"] = lampIntensity;
  doc["color"]["r"] = redValue;
  doc["color"]["g"] = greenValue;
  doc["color"]["b"] = blueValue;
  
  String statusJson;
  serializeJson(doc, statusJson);
  
  client.publish(topic_status, statusJson.c_str(), true);
  Serial.println("Status dipublish: " + statusJson);
}

