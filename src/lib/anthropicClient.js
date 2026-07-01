/**
 * Smart Claude client — one place that handles all 3 environments:
 *
 *  LOCAL DEV   VITE_ANTHROPIC_API_KEY set, no VITE_BACKEND_URL
 *              → direct browser call (key from .env, never shipped to prod)
 *
 *  VERCEL      No VITE_BACKEND_URL, no local API key
 *              → /api/claude  (Vercel serverless function)
 *
 *  RENDER      VITE_BACKEND_URL=https://pdfbrain-backend.onrender.com
 *              → ${BACKEND_URL}/api/claude  (Express backend)
 */

const MODEL       = "claude-sonnet-4-6";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;   // set on Vercel when using Render
const API_KEY     = import.meta.env.VITE_ANTHROPIC_API_KEY; // local dev only

function resolveEndpoint() {
  if (BACKEND_URL) return `${BACKEND_URL}/api/claude`;   // Render
  if (API_KEY)     return "https://api.anthropic.com/v1/messages"; // local dev
  return "/api/claude";                                   // Vercel serverless
}

function buildHeaders() {
  if (API_KEY && !BACKEND_URL) {
    // local dev — direct browser access
    return {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }
  return { "Content-Type": "application/json" };
}

const ENDPOINT = resolveEndpoint();
const HEADERS  = buildHeaders();

export const isAnthropicConfigured = true;

/** Low-level fetch — accepts a full Anthropic messages array */
async function fetchClaude(body) {
  const res     = await fetch(ENDPOINT, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
  const rawText = await res.text();
  if (!rawText.trim()) throw new Error(`שרת לא החזיר תגובה (${res.status})`);
  let data;
  try { data = JSON.parse(rawText); } catch { throw new Error("תגובה לא תקינה מהשרת"); }
  if (!res.ok) throw new Error(data.error?.message ?? `שגיאת API: ${res.status}`);
  return data;
}

/**
 * Single-turn: system + one user message → text string
 */
export async function callClaude({ system, prompt, maxTokens = 1500 }) {
  const data = await fetchClaude({
    model: MODEL, max_tokens: maxTokens, system,
    messages: [{ role: "user", content: prompt }],
  });
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  if (!text) throw new Error("התקבלה תשובה ריקה מהמודל");
  return text;
}

/**
 * Multi-turn: system + full messages array → text string
 * Use this for chat history / educator bot / mission chat
 */
export async function callClaudeMultiturn({ system, messages, maxTokens = 1000 }) {
  // Anthropic requires conversations to start with a user message
  let safeMessages = [...messages];
  while (safeMessages.length > 0 && safeMessages[0].role !== "user") {
    safeMessages = safeMessages.slice(1);
  }
  if (safeMessages.length === 0) throw new Error("אין הודעות לשליחה");

  const data = await fetchClaude({ model: MODEL, max_tokens: maxTokens, system, messages: safeMessages });
  const text = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
  if (!text) throw new Error("התקבלה תשובה ריקה מהמודל");
  return text;
}

/**
 * Single-turn JSON: parses and returns the model's JSON response
 */
export async function callClaudeJSON({ system, prompt, maxTokens = 1500 }) {
  const fullSystem = `${system}\n\nהשב אך ורק באובייקט JSON תקני, בלי טקסט נוסף ובלי גדרות קוד.`;
  const raw = await callClaude({ system: fullSystem, prompt, maxTokens });
  const cleaned = raw.trim().replace(/^```json/i,"").replace(/^```/,"").replace(/```$/,"").trim();
  try { return JSON.parse(cleaned); }
  catch (e) { throw new Error(`לא ניתן לפענח תשובת AI כ-JSON: ${e.message}`); }
}