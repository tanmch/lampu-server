#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";
const int mqtt_port = 1883;
const char* mqtt_client_id = "ESP8266_Lampu_Client";

const char* topic_command = "lampu/command";
const char* topic_intensity = "lampu/intensity";
const char* topic_color = "lampu/color";
const char* topic_status = "lampu/status";
const char* topic_config = "lampu/config";

#define PIN_RED    5
#define PIN_GREEN  4
#define PIN_BLUE   0
#define LED_COMMON_ANODE false

WiFiClient espClient;
PubSubClient client(espClient);

bool lampState = false;
int lampIntensity = 100;
int redValue = 255;
int greenValue = 255;
int blueValue = 255;
bool configLoaded = false;

unsigned long lastStatusUpdate = 0;
const unsigned long statusUpdateInterval = 5000;

void setup() {
  Serial.begin(115200);
  delay(100);
  pinMode(PIN_RED, OUTPUT);
  pinMode(PIN_GREEN, OUTPUT);
  pinMode(PIN_BLUE, OUTPUT);
  setLED(0, 0, 0);
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
  
  if (String(topic) == topic_config) {
    DynamicJsonDocument doc(2048);
    deserializeJson(doc, message);
    if (doc.containsKey("config")) {
      JsonObject config = doc["config"];
      if (config.containsKey("state")) {
        lampState = config["state"];
      }
      if (config.containsKey("intensity")) {
        lampIntensity = config["intensity"];
        lampIntensity = constrain(lampIntensity, 0, 100);
      }
      if (config.containsKey("color")) {
        JsonObject color = config["color"];
        redValue = color["r"];
        greenValue = color["g"];
        blueValue = color["b"];
        redValue = constrain(redValue, 0, 255);
        greenValue = constrain(greenValue, 0, 255);
        blueValue = constrain(blueValue, 0, 255);
      }
      updateLED();
      configLoaded = true;
      Serial.println("Konfigurasi diterima dan diterapkan");
      publishStatus();
    }
  }
  else if (String(topic) == topic_command) {
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
  else if (String(topic) == topic_color) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, message);
    if (doc.containsKey("color")) {
      JsonObject color = doc["color"];
      redValue = color["r"];
      greenValue = color["g"];
      blueValue = color["b"];
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

void reconnect_mqtt() {
  while (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT broker...");
    if (client.connect(mqtt_client_id)) {
      Serial.println("Terhubung!");
      client.subscribe(topic_command);
      client.subscribe(topic_intensity);
      client.subscribe(topic_color);
      client.subscribe(topic_config);
      publishStatus();
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Mencoba lagi dalam 5 detik...");
      delay(5000);
    }
  }
}

void setLED(int r, int g, int b) {
  r = (r * lampIntensity) / 100;
  g = (g * lampIntensity) / 100;
  b = (b * lampIntensity) / 100;
  if (!lampState) {
    r = 0;
    g = 0;
    b = 0;
  }
  if (LED_COMMON_ANODE) {
    r = 255 - r;
    g = 255 - g;
    b = 255 - b;
  }
  analogWrite(PIN_RED, r);
  analogWrite(PIN_GREEN, g);
  analogWrite(PIN_BLUE, b);
}

void updateLED() {
  setLED(redValue, greenValue, blueValue);
}

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
