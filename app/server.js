// app/server.js — Local JSON Data Backend (Offline Mode)

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static front-end files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Health check route
app.get("/health", (_, res) => {
  res.json({ status: "ok", source: "local-json", timestamp: new Date().toISOString() });
});

// Load JSON data once at startup
const dataPath = path.join(__dirname, "public", "data", "aqi.json");
let cities = [];
try {
  const fileContent = fs.readFileSync(dataPath, "utf8");
  cities = JSON.parse(fileContent);
  console.log(`✅ Loaded ${cities.length} cities from aqi.json`);
} catch (err) {
  console.error("❌ Error loading local data:", err);
  cities = [];
}

// Helper: find a city (case-insensitive)
function findCity(name) {
  if (!name) return null;
  return cities.find(
    (c) => c.city.toLowerCase() === String(name).trim().toLowerCase()
  );
}

// AQI endpoint
app.get("/aqi", (req, res) => {
  const cityName = req.query.city;
  if (!cityName) return res.status(400).json({ error: "Please provide ?city=CityName" });

  const cityData = findCity(cityName);
  if (!cityData) return res.status(404).json({ error: `No local data found for ${cityName}` });

  res.json({
    city: cityData.city,
    metrics: cityData.airQuality,
    lastUpdated: cityData.lastUpdated,
    source: "local-json",
    cached: false,
  });
});

// Weather endpoint
app.get("/weather", (req, res) => {
  const cityName = req.query.city;
  if (!cityName) return res.status(400).json({ error: "Missing ?city parameter" });

  const cityData = findCity(cityName);
  if (!cityData) return res.status(404).json({ error: `No local data found for ${cityName}` });

  res.json({
    city: cityData.city,
    temperature: cityData.weather.temperature,
    humidity: cityData.weather.humidity,
    wind: cityData.weather.wind,
    condition: cityData.weather.condition,
    updated: cityData.lastUpdated,
    source: "local-json",
    cached: false,
  });
});

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () =>
  console.log(` Local AQI + Weather Dashboard running at http://localhost:${port}`)
);
