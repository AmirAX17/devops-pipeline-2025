import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// Health check route
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Main route
app.get("/", (_req, res) => {
  res.status(200).send("Hello, DevOps!");
});

// Start server only if not running tests
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

export default app; // exported for tests
