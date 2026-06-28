// ⚠️ LOCAL DEV ONLY ⚠️
// This calls the Anthropic API directly from the browser using
// VITE_ANTHROPIC_API_KEY. That means the key is bundled into the JS sent
// to the browser and anyone using the app could extract it from DevTools.
// This is acceptable for local testing only. Before deploying anywhere
// public, replace callClaude() with a fetch() to your own backend
// (e.g. a Firebase Cloud Function) that holds the key server-side.

const MODEL = "claude-sonnet-4-6";

export const isAnthropicConfigured = Boolean(
  import.meta.env.VITE_ANTHROPIC_API_KEY
);

/**
 * Calls Claude with a system prompt + user message and returns the text response.
 * @param {Object} options
 * @param {string} options.system - system prompt
 * @param {string} options.prompt - user message content
 * @param {number} [options.maxTokens]
 * @returns {Promise<string>} the model's text reply
 */
export async function callClaude({ system, prompt, maxTokens = 1500 }) {
  if (!isAnthropicConfigured) {
    throw new Error(
      "VITE_ANTHROPIC_API_KEY חסר. הוסף אותו לקובץ .env כדי להפעיל את הבוט."
    );
  }

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

if (!response.ok) {
  const errorBody = await response.text();
  throw new Error(
    `Anthropic API error (${response.status}): ${errorBody.slice(0, 300)}`
  );
}

const data = await response.json();

const text = data.content
  ?.filter((block) => block.type === "text")
  .map((block) => block.text)
  .join("\n")
  .trim();

if (!text) {
  throw new Error("התקבלה תשובה ריקה מהמודל.");
}

return text;
}

/**
 * Calls Claude and asks it to return strictly JSON, then parses it.
 * Strips markdown code fences if the model adds them anyway.
 */
export async function callClaudeJSON({ system, prompt, maxTokens = 1500 }) {
  const fullSystem = `${system}\n\nהשב אך ורק באובייקט JSON תקני, בלי טקסט נוסף, בלי הסברים, ובלי גדרות קוד (code fences).`;

  const raw = await callClaude({ system: fullSystem, prompt, maxTokens });
  const cleaned = raw
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`לא ניתן לפענח את תשובת ה-AI כ-JSON: ${error.message}`);
  }
}
