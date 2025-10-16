import express from "express";
const app = express();
const PORT = process.env.PORT || 8080;
app.get("/", (_, res) => res.send("AQI App ✅"));
app.listen(PORT, () => console.log(`AQI on ${PORT}`));
