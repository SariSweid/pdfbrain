import express from "express";
import cors    from "cors";

const app  = express();
const PORT = process.env.PORT || 3001;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowed = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => (!origin || allowed.includes(origin) ? cb(null, true) : cb(new Error("CORS"))),
}));
app.use(express.json({ limit: "10mb" }));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.json({ status: "ok", service: "pdfbrain-backend" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── Generic Claude proxy ─────────────────────────────────────────────────────
// All Claude calls from the frontend come here.
// The ANTHROPIC_API_KEY never leaves this server.
app.post("/api/claude", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on server" });
  }
  try {
    const upstream = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }

    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`PDFBrain backend on port ${PORT}`));