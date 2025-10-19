// 🌏 Air Quality + Weather Dashboard Script (via secure backend)

// Helper: map AQI value to color and angle
function getAQIInfo(aqi) {
  if (aqi <= 50)
    return { label: "Good 😊", color: "#6dd400", angle: (aqi / 500) * 90 };
  if (aqi <= 100)
    return { label: "Moderate 😐", color: "#f8e71c", angle: 90 + ((aqi - 50) / 500) * 90 };
  if (aqi <= 150)
    return { label: "Unhealthy (Sensitive) 😷", color: "#f5a623", angle: 180 + ((aqi - 100) / 500) * 90 };
  if (aqi <= 200)
    return { label: "Unhealthy 😨", color: "#d0021b", angle: 270 + ((aqi - 150) / 500) * 90 };
  return { label: "Hazardous ☠️", color: "#8b0000", angle: 360 };
}

async function fetchAQI() {
  const city = document.getElementById("cityInput").value.trim();
  const resultBox = document.getElementById("aqiDisplay");
  const weatherBox = document.getElementById("weatherBox");
  const needle = document.getElementById("needle");
  const aqiValue = document.getElementById("aqiValue");
  const aqiStatus = document.getElementById("aqiStatus");
  const pm25 = document.getElementById("pm25");
  const pm10 = document.getElementById("pm10");
  const o3 = document.getElementById("o3");
  const co = document.getElementById("co");
  const lastUpdated = document.getElementById("lastUpdated");
  const statusBar = document.getElementById("statusBar");

  // Weather DOM references
  const temp = document.getElementById("temp");
  const humidity = document.getElementById("humidity");
  const wind = document.getElementById("wind");
  const condition = document.getElementById("condition");

  if (!city) {
    alert("Please enter a city name!");
    return;
  }

  resultBox.classList.add("hidden");
  weatherBox.classList.add("hidden");

  try {
    // --- 1️⃣ Fetch AQI from backend ---
    const response = await fetch(`/aqi?city=${encodeURIComponent(city)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to fetch AQI data.");

    // Calculate simple AQI average
    const avgAQI =
      (parseFloat(data.metrics.PM25 || 0) +
        parseFloat(data.metrics.PM10 || 0) +
        parseFloat(data.metrics.O3 || 0) * 2) /
      3;
    const AQI = Math.round(avgAQI);
    const { label, color, angle } = getAQIInfo(AQI);

    // Update AQI gauge
    needle.style.transform = `rotate(${angle}deg)`;
    aqiValue.textContent = AQI;
    aqiStatus.textContent = label;
    aqiStatus.style.color = color;

    // Update pollutant cards
    pm25.textContent = data.metrics.PM25 ?? "--";
    pm10.textContent = data.metrics.PM10 ?? "--";
    o3.textContent = data.metrics.O3 ?? "--";
    co.textContent = data.metrics.CO ?? "--";
    lastUpdated.textContent = `Last updated: ${
      data.lastUpdated || new Date().toISOString()
    }`;

    resultBox.classList.remove("hidden");

    // --- 2️⃣ Fetch WEATHER from backend ---
    const weatherRes = await fetch(`/weather?city=${encodeURIComponent(city)}`);
    const weather = await weatherRes.json();
    if (!weatherRes.ok) throw new Error(weather.error || "Weather fetch failed.");

    // Update weather fields
    temp.textContent = `${weather.temperature.toFixed(1)} °C`;
    humidity.textContent = `${weather.humidity} %`;
    wind.textContent = `${weather.wind} m/s`;
    condition.textContent = weather.condition
      .split(" ")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");

    weatherBox.classList.remove("hidden");

    statusBar.textContent = "✅ Data loaded successfully";
  } catch (err) {
    console.error(err);
  }
}

// Optional health check (on page load)
async function checkHealth() {
  try {
    const res = await fetch("/health");
    const data = await res.json();
    document.getElementById("statusBar").textContent =
      data.status === "ok"
        ? "🩺 Server is healthy"
        : "⚠️ Server issue detected";
  } catch {
    document.getElementById("statusBar").textContent = "❌ Server not responding";
  }
}

checkHealth();
