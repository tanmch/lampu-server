#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";
const int mqtt_port = 1883;
const char* mqtt_client_id = "ESP8266_Lampu_4LED_Client";

#define NUM_LEDS 4
const int LED_PINS[NUM_LEDS][3] = {
  {5, 4, 0},
  {2, 14, 12},
  {13, 15, 16},
  {1, 3, 10}
};

#define LED_COMMON_ANODE false

struct LEDState {
  bool state;
  int intensity;
  int red;
  int green;
  int blue;
};

LEDState leds[NUM_LEDS];
bool configLoaded = false;

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastStatusUpdate = 0;
const unsigned long statusUpdateInterval = 5000;

void setup() {
  Serial.begin(115200);
  delay(100);
  for (int i = 0; i < NUM_LEDS; i++) {
    for (int j = 0; j < 3; j++) {
      pinMode(LED_PINS[i][j], OUTPUT);
    }
    leds[i].state = false;
    leds[i].intensity = 100;
    leds[i].red = 255;
    leds[i].green = 255;
    leds[i].blue = 255;
  }
  setAllLEDs(0, 0, 0);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqtt_callback);
}

void loop() {
  if (!client.connected()) {
    reconnect_mqtt();
  }
  client.loop();
  if (millis() - lastStatusUpdate > statusUpdateInterval) {
    publishStatus();
    lastStatusUpdate = millis();
  }
}

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
  
  if (topicStr == "lampu/config") {
    DynamicJsonDocument doc(4096);
    deserializeJson(doc, message);
    if (doc.containsKey("config") && doc["config"].containsKey("leds")) {
      JsonArray ledsArray = doc["config"]["leds"];
      for (int i = 0; i < NUM_LEDS && i < ledsArray.size(); i++) {
        JsonObject led = ledsArray[i];
        if (led.containsKey("state")) leds[i].state = led["state"];
        if (led.containsKey("intensity")) {
          leds[i].intensity = led["intensity"];
          leds[i].intensity = constrain(leds[i].intensity, 0, 100);
        }
        if (led.containsKey("color")) {
          JsonObject color = led["color"];
          leds[i].red = color["r"];
          leds[i].green = color["g"];
          leds[i].blue = color["b"];
          leds[i].red = constrain(leds[i].red, 0, 255);
          leds[i].green = constrain(leds[i].green, 0, 255);
          leds[i].blue = constrain(leds[i].blue, 0, 255);
        }
        updateLED(i);
      }
      configLoaded = true;
      Serial.println("Konfigurasi 4 LED diterima dan diterapkan");
      publishStatus();
    }
  }
  else if (topicStr.startsWith("lampu/led")) {
    int ledIndex = topicStr.charAt(topicStr.length() - 1) - '1';
    if (ledIndex >= 0 && ledIndex < NUM_LEDS) {
      String cmd = message;
      cmd.toUpperCase();
      cmd.trim();
      if (cmd == "ON") {
        leds[ledIndex].state = true;
        updateLED(ledIndex);
      } else if (cmd == "OFF") {
        leds[ledIndex].state = false;
        setLED(ledIndex, 0, 0, 0);
      }
      publishStatus();
    }
  }
  else if (topicStr == "lampu/all/command") {
    String cmd = message;
    cmd.toUpperCase();
    cmd.trim();
    if (cmd == "ON") {
      for (int i = 0; i < NUM_LEDS; i++) {
        leds[i].state = true;
        updateLED(i);
      }
    } else if (cmd == "OFF") {
      for (int i = 0; i < NUM_LEDS; i++) {
        leds[i].state = false;
        setLED(i, 0, 0, 0);
      }
    }
    publishStatus();
  }
  else if (topicStr.startsWith("lampu/intensity/")) {
    int ledIndex = topicStr.charAt(topicStr.length() - 1) - '1';
    if (ledIndex >= 0 && ledIndex < NUM_LEDS) {
      DynamicJsonDocument doc(1024);
      deserializeJson(doc, message);
      if (doc.containsKey("intensity")) {
        leds[ledIndex].intensity = doc["intensity"];
        leds[ledIndex].intensity = constrain(leds[ledIndex].intensity, 0, 100);
        updateLED(ledIndex);
        publishStatus();
      }
    }
  }
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
        publishStatus();
      }
    }
  }
}

void reconnect_mqtt() {
  while (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT broker...");
    if (client.connect(mqtt_client_id)) {
      Serial.println("Terhubung!");
      for (int i = 1; i <= NUM_LEDS; i++) {
        String topic = "lampu/led" + String(i);
        client.subscribe(topic.c_str());
        topic = "lampu/intensity/" + String(i);
        client.subscribe(topic.c_str());
        topic = "lampu/color/" + String(i);
        client.subscribe(topic.c_str());
      }
      client.subscribe("lampu/all/command");
      client.subscribe("lampu/config");
      publishStatus();
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Mencoba lagi dalam 5 detik...");
      delay(5000);
    }
  }
}

void setLED(int ledIndex, int r, int g, int b) {
  if (ledIndex < 0 || ledIndex >= NUM_LEDS) return;
  r = (r * leds[ledIndex].intensity) / 100;
  g = (g * leds[ledIndex].intensity) / 100;
  b = (b * leds[ledIndex].intensity) / 100;
  if (!leds[ledIndex].state) {
    r = 0;
    g = 0;
    b = 0;
  }
  if (LED_COMMON_ANODE) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }
  analogWrite(LED_PINS[ledIndex][0], r);
  analogWrite(LED_PINS[ledIndex][1], g);
  analogWrite(LED_PINS[ledIndex][2], b);
}

void setAllLEDs(int r, int g, int b) {
  for (int i = 0; i < NUM_LEDS; i++) {
    setLED(i, r, g, b);
  }
}

void updateLED(int ledIndex) {
  if (ledIndex < 0 || ledIndex >= NUM_LEDS) return;
  setLED(ledIndex, leds[ledIndex].red, leds[ledIndex].green, leds[ledIndex].blue);
}

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
  String statusJson;
  serializeJson(doc, statusJson);
  client.publish("lampu/status", statusJson.c_str(), true);
  Serial.println("Status dipublish: " + statusJson);
}

