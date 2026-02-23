#include <Arduino.h>
#include <WiFi.h>
#include <FirebaseESP32.h>
#include <DHT.h>

//WI-FI
#define WIFI_SSID "HANDOKO.NET"
#define WIFI_PASSWORD "spasi6kali"
#define DATABASE_URL "NOPE"
#define DATABASE_SECRET "NOPE"

#define DHTPIN 4
#define DHTTYPE DHT11
#define RAIN_PIN 16
#define LED_PIN 2
#define BUZZER_PIN 18

DHT dht(DHTPIN, DHTTYPE);
FirebaseData firebaseData;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long rainStartTime = 0;
bool isWaterDetected = false;

void setup() {
  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(RAIN_PIN, INPUT);

  // --- WIFI CONNECT ---
  Serial.print("Connecting WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nWiFi Connected");

  // --- DHT ---
  dht.begin();
  delay(2000);

  // --- FIREBASE (SECRET MODE) ---
  config.database_url = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("System Ready");
}

void loop() {

  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int rainDigital = digitalRead(RAIN_PIN);

  // --- VALIDASI DHT ---
  if (isnan(h) || isnan(t)) {
    Serial.println("DHT FAILED");
    delay(1000);
    return;
  }

  // --- DEBUG SERIAL ---
  Serial.print("Temp: "); Serial.println(t);
  Serial.print("Hum : "); Serial.println(h);
  Serial.print("Rain: "); Serial.println(rainDigital);

  // --- LOGIKA HUJAN ---
  int duration = 0;

  if (rainDigital == LOW) {
    if (!isWaterDetected) {
      isWaterDetected = true;
      rainStartTime = millis();
    }

    duration = (millis() - rainStartTime) / 1000;

    if (duration >= 5) {
      digitalWrite(LED_PIN, HIGH);
      digitalWrite(BUZZER_PIN, HIGH);
    }

  } else {
    isWaterDetected = false;
    duration = 0;
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
  }

  // --- FIREBASE SEND ---
  FirebaseJson json;
  json.set("suhu", t);
  json.set("kelembaban", h);
  json.set("durasi_air", duration);

  if (!Firebase.updateNode(firebaseData, "/monitoring/current", json)) {
    Serial.print("Firebase Error: ");
    Serial.println(firebaseData.errorReason());
  } else {
    Serial.println("Firebase OK");
  }

  delay(1000);

}
