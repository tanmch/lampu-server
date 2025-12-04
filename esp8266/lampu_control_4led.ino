/**
 * ESP8266 4 LED RGB Control via MQTT
 * 
 * Kontrol 4 buah lampu LED RGB menggunakan MQTT dengan fitur:
 * - ON/OFF per LED (switch)
 * - Intensitas (PWM) per LED
 * - Warna RGB per LED
 * - Penjadwalan otomatis
 * 
 * Hardware:
 * - ESP8266 (NodeMCU atau sejenisnya)
 * - 4x LED RGB (Common Anode atau Common Cathode)
 * - Resistor 220Ω untuk setiap pin LED (total 12 resistor)
 * 
 * Pin Configuration (NodeMCU):
 * LED 1:
 *   - Red: GPIO 5 (D1)
 *   - Green: GPIO 4 (D2)
 *   - Blue: GPIO 0 (D3)
 * 
 * LED 2:
 *   - Red: GPIO 2 (D4)
 *   - Green: GPIO 14 (D5)
 *   - Blue: GPIO 12 (D6)
 * 
 * LED 3:
 *   - Red: GPIO 13 (D7)
 *   - Green: GPIO 15 (D8)
 *   - Blue: GPIO 16 (D0)
 * 
 * LED 4:
 *   - Red: GPIO 1 (TX) - Hati-hati, ini TX pin!
 *   - Green: GPIO 3 (RX) - Hati-hati, ini RX pin!
 *   - Blue: GPIO 10 (SD3) - Hati-hati, ini SD card pin!
 * 
 * Catatan: GPIO 1, 3, 10 mungkin tidak cocok untuk semua board.
 * Alternatif untuk LED 4: Gunakan pin yang tersedia atau gunakan
 * multiplexer/shift register jika pin terbatas.
 * 
 * Untuk LED Common Anode, gunakan logika terbalik (255 - value)
 */

#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ========== KONFIGURASI WIFI ==========
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// ========== KONFIGURASI MQTT ==========
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";  // IP address MQTT broker
const int mqtt_port = 1883;
const char* mqtt_client_id = "ESP8266_Lampu_4LED_Client";

// Topik MQTT
const char* topic_command_prefix = "lampu/led";  // lampu/led1, lampu/led2, dll
const char* topic_intensity_prefix = "lampu/intensity";  // lampu/intensity/1, dll
const char* topic_color_prefix = "lampu/color";  // lampu/color/1, dll
const char* topic_schedule = "lampu/schedule";
const char* topic_status = "lampu/status";
const char* topic_all_command = "lampu/all/command";  // Kontrol semua LED sekaligus

// ========== KONFIGURASI LED ==========
#define NUM_LEDS 4

// Pin untuk setiap LED RGB [LED][R, G, B]
// Sesuaikan dengan pin yang tersedia di board Anda
const int LED_PINS[NUM_LEDS][3] = {
  {5, 4, 0},    // LED 1: D1, D2, D3
  {2, 14, 12},  // LED 2: D4, D5, D6
  {13, 15, 16}, // LED 3: D7, D8, D0
  {1, 3, 10}    // LED 4: TX, RX, SD3 (hati-hati dengan pin ini!)
};

// Tipe LED (ubah sesuai hardware Anda)
// true = Common Anode, false = Common Cathode
#define LED_COMMON_ANODE false

// ========== STRUKTUR DATA LED ==========
struct LEDState {
  bool state;        // ON/OFF
  int intensity;     // 0-100%
  int red;           // 0-255
  int green;         // 0-255
  int blue;          // 0-255
};

LEDState leds[NUM_LEDS];

// ========== PENJADWALAN ==========
struct Schedule {
  bool enabled;
  int ledIndex;      // 0-3, atau -1 untuk semua LED
  int hour;
  int minute;
  bool action;       // true = ON, false = OFF
  int intensity;     // 0-100
  int red, green, blue;  // Warna
  bool repeat;       // Ulang setiap hari
};

#define MAX_SCHEDULES 10
Schedule schedules[MAX_SCHEDULES];
int scheduleCount = 0;

// ========== VARIABEL GLOBAL ==========
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastStatusUpdate = 0;
const unsigned long statusUpdateInterval = 5000;  // Update status setiap 5 detik
unsigned long lastScheduleCheck = 0;
const unsigned long scheduleCheckInterval = 60000;  // Cek jadwal setiap 1 menit

// NTP untuk waktu (opsional, jika ingin waktu real-time)
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600;  // GMT+7 (WIB)
const int daylightOffset_sec = 0;

// ========== FUNGSI SETUP ==========
void setup() {
  Serial.begin(115200);
  delay(100);
  
  // Inisialisasi LED
  for (int i = 0; i < NUM_LEDS; i++) {
    for (int j = 0; j < 3; j++) {
      pinMode(LED_PINS[i][j], OUTPUT);
    }
    // Inisialisasi state LED
    leds[i].state = false;
    leds[i].intensity = 100;
    leds[i].red = 255;
    leds[i].green = 255;
    leds[i].blue = 255;
  }
  
  // Matikan semua LED
  setAllLEDs(0, 0, 0);
  
  // Koneksi WiFi
  setup_wifi();
  
  // Setup waktu (opsional)
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  
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
  
  // Cek penjadwalan
  if (millis() - lastScheduleCheck > scheduleCheckInterval) {
    checkSchedules();
    lastScheduleCheck = millis();
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
  
  String topicStr = String(topic);
  
  // Handle perintah untuk LED spesifik (lampu/led1, lampu/led2, dll)
  if (topicStr.startsWith("lampu/led")) {
    int ledIndex = topicStr.charAt(topicStr.length() - 1) - '1';  // '1' -> 0, '2' -> 1, dll
    if (ledIndex >= 0 && ledIndex < NUM_LEDS) {
      String cmd = message;
      cmd.toUpperCase();
      cmd.trim();
      
      if (cmd == "ON") {
        leds[ledIndex].state = true;
        updateLED(ledIndex);
        Serial.print("LED ");
        Serial.print(ledIndex + 1);
        Serial.println(": ON");
      } else if (cmd == "OFF") {
        leds[ledIndex].state = false;
        setLED(ledIndex, 0, 0, 0);
        Serial.print("LED ");
        Serial.print(ledIndex + 1);
        Serial.println(": OFF");
      }
      publishStatus();
    }
  }
  
  // Handle perintah untuk semua LED
  else if (topicStr == "lampu/all/command") {
    String cmd = message;
    cmd.toUpperCase();
    cmd.trim();
    
    if (cmd == "ON") {
      for (int i = 0; i < NUM_LEDS; i++) {
        leds[i].state = true;
        updateLED(i);
      }
      Serial.println("Semua LED: ON");
    } else if (cmd == "OFF") {
      for (int i = 0; i < NUM_LEDS; i++) {
        leds[i].state = false;
        setLED(i, 0, 0, 0);
      }
      Serial.println("Semua LED: OFF");
    }
    publishStatus();
  }
  
  // Handle intensitas per LED (lampu/intensity/1, dll)
  else if (topicStr.startsWith("lampu/intensity/")) {
    int ledIndex = topicStr.charAt(topicStr.length() - 1) - '1';
    if (ledIndex >= 0 && ledIndex < NUM_LEDS) {
      DynamicJsonDocument doc(1024);
      deserializeJson(doc, message);
      
      if (doc.containsKey("intensity")) {
        leds[ledIndex].intensity = doc["intensity"];
        leds[ledIndex].intensity = constrain(leds[ledIndex].intensity, 0, 100);
        updateLED(ledIndex);
        Serial.print("LED ");
        Serial.print(ledIndex + 1);
        Serial.print(" Intensitas: ");
        Serial.print(leds[ledIndex].intensity);
        Serial.println("%");
        publishStatus();
      }
    }
  }
  
  // Handle warna per LED (lampu/color/1, dll)
  else if (topicStr.startsWith("lampu/color/")) {
    int ledIndex = topicStr.charAt(topicStr.length() - 1) - '1';
    if (ledIndex >= 0 && ledIndex < NUM_LEDS) {
      DynamicJsonDocument doc(1024);
      deserializeJson(doc, message);
      
      if (doc.containsKey("color")) {
        JsonObject color = doc["color"];
        leds[ledIndex].red = color["r"];
        leds[ledIndex].green = color["g"];
        leds[ledIndex].blue = color["b"];
        
        leds[ledIndex].red = constrain(leds[ledIndex].red, 0, 255);
        leds[ledIndex].green = constrain(leds[ledIndex].green, 0, 255);
        leds[ledIndex].blue = constrain(leds[ledIndex].blue, 0, 255);
        
        updateLED(ledIndex);
        Serial.print("LED ");
        Serial.print(ledIndex + 1);
        Serial.print(" Warna: R=");
        Serial.print(leds[ledIndex].red);
        Serial.print(" G=");
        Serial.print(leds[ledIndex].green);
        Serial.print(" B=");
        Serial.println(leds[ledIndex].blue);
        publishStatus();
      }
    }
  }
  
  // Handle penjadwalan
  else if (topicStr == "lampu/schedule") {
    handleSchedule(message);
  }
}

// ========== HANDLE SCHEDULE ==========
void handleSchedule(String message) {
  DynamicJsonDocument doc(2048);
  deserializeJson(doc, message);
  
  if (doc.containsKey("action")) {
    String action = doc["action"];
    
    if (action == "add") {
      if (scheduleCount < MAX_SCHEDULES) {
        Schedule s;
        s.enabled = doc["enabled"] | true;
        s.ledIndex = doc["ledIndex"] | -1;  // -1 = semua LED
        s.hour = doc["hour"];
        s.minute = doc["minute"];
        s.action = doc["turnOn"] | true;
        s.intensity = doc["intensity"] | 100;
        s.red = doc["red"] | 255;
        s.green = doc["green"] | 255;
        s.blue = doc["blue"] | 255;
        s.repeat = doc["repeat"] | true;
        
        schedules[scheduleCount] = s;
        scheduleCount++;
        
        Serial.println("Schedule ditambahkan");
        publishStatus();
      }
    } else if (action == "remove") {
      int index = doc["index"] | -1;
      if (index >= 0 && index < scheduleCount) {
        // Shift array
        for (int i = index; i < scheduleCount - 1; i++) {
          schedules[i] = schedules[i + 1];
        }
        scheduleCount--;
        Serial.println("Schedule dihapus");
        publishStatus();
      }
    } else if (action == "clear") {
      scheduleCount = 0;
      Serial.println("Semua schedule dihapus");
      publishStatus();
    }
  }
}

// ========== CEK PENJADWALAN ==========
void checkSchedules() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Gagal mendapatkan waktu");
    return;
  }
  
  int currentHour = timeinfo.tm_hour;
  int currentMinute = timeinfo.tm_min;
  
  for (int i = 0; i < scheduleCount; i++) {
    if (!schedules[i].enabled) continue;
    
    if (schedules[i].hour == currentHour && schedules[i].minute == currentMinute) {
      // Eksekusi schedule
      if (schedules[i].ledIndex == -1) {
        // Semua LED
        for (int j = 0; j < NUM_LEDS; j++) {
          leds[j].state = schedules[i].action;
          leds[j].intensity = schedules[i].intensity;
          leds[j].red = schedules[i].red;
          leds[j].green = schedules[i].green;
          leds[j].blue = schedules[i].blue;
          updateLED(j);
        }
      } else {
        // LED spesifik
        int idx = schedules[i].ledIndex;
        if (idx >= 0 && idx < NUM_LEDS) {
          leds[idx].state = schedules[i].action;
          leds[idx].intensity = schedules[i].intensity;
          leds[idx].red = schedules[i].red;
          leds[idx].green = schedules[i].green;
          leds[idx].blue = schedules[i].blue;
          updateLED(idx);
        }
      }
      
      // Jika tidak repeat, disable schedule
      if (!schedules[i].repeat) {
        schedules[i].enabled = false;
      }
      
      publishStatus();
      Serial.print("Schedule dieksekusi: LED ");
      Serial.print(schedules[i].ledIndex + 1);
      Serial.print(" ");
      Serial.println(schedules[i].action ? "ON" : "OFF");
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
      for (int i = 1; i <= NUM_LEDS; i++) {
        String topic = "lampu/led" + String(i);
        client.subscribe(topic.c_str());
        topic = "lampu/intensity/" + String(i);
        client.subscribe(topic.c_str());
        topic = "lampu/color/" + String(i);
        client.subscribe(topic.c_str());
      }
      client.subscribe(topic_all_command);
      client.subscribe(topic_schedule);
      
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
void setLED(int ledIndex, int r, int g, int b) {
  if (ledIndex < 0 || ledIndex >= NUM_LEDS) return;
  
  // Apply intensity
  r = (r * leds[ledIndex].intensity) / 100;
  g = (g * leds[ledIndex].intensity) / 100;
  b = (b * leds[ledIndex].intensity) / 100;
  
  // Apply state
  if (!leds[ledIndex].state) {
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
  
  analogWrite(LED_PINS[ledIndex][0], r);   // Red
  analogWrite(LED_PINS[ledIndex][1], g);   // Green
  analogWrite(LED_PINS[ledIndex][2], b);   // Blue
}

// ========== SET ALL LEDs ==========
void setAllLEDs(int r, int g, int b) {
  for (int i = 0; i < NUM_LEDS; i++) {
    setLED(i, r, g, b);
  }
}

// ========== UPDATE LED ==========
void updateLED(int ledIndex) {
  if (ledIndex < 0 || ledIndex >= NUM_LEDS) return;
  setLED(ledIndex, leds[ledIndex].red, leds[ledIndex].green, leds[ledIndex].blue);
}

// ========== PUBLISH STATUS ==========
void publishStatus() {
  DynamicJsonDocument doc(4096);
  
  doc["num_leds"] = NUM_LEDS;
  
  JsonArray ledsArray = doc.createNestedArray("leds");
  for (int i = 0; i < NUM_LEDS; i++) {
    JsonObject ledObj = ledsArray.createNestedObject();
    ledObj["index"] = i + 1;
    ledObj["state"] = leds[i].state ? "on" : "off";
    ledObj["intensity"] = leds[i].intensity;
    ledObj["color"]["r"] = leds[i].red;
    ledObj["color"]["g"] = leds[i].green;
    ledObj["color"]["b"] = leds[i].blue;
  }
  
  // Schedule info
  JsonArray schedulesArray = doc.createNestedArray("schedules");
  for (int i = 0; i < scheduleCount; i++) {
    JsonObject schedObj = schedulesArray.createNestedObject();
    schedObj["index"] = i;
    schedObj["enabled"] = schedules[i].enabled;
    schedObj["ledIndex"] = schedules[i].ledIndex;
    schedObj["hour"] = schedules[i].hour;
    schedObj["minute"] = schedules[i].minute;
    schedObj["action"] = schedules[i].action ? "on" : "off";
    schedObj["intensity"] = schedules[i].intensity;
    schedObj["color"]["r"] = schedules[i].red;
    schedObj["color"]["g"] = schedules[i].green;
    schedObj["color"]["b"] = schedules[i].blue;
    schedObj["repeat"] = schedules[i].repeat;
  }
  
  String statusJson;
  serializeJson(doc, statusJson);
  
  client.publish(topic_status, statusJson.c_str(), true);
  Serial.println("Status dipublish: " + statusJson);
}



