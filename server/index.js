import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import {
  ANALYSIS_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
  COMPARE_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  buildAnalysisPrompt,
  buildChatPrompt,
  buildComparePrompt,
  buildSummaryPrompt,
} from "../src/lib/aiPrompts.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "8mb" }));

function requireApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const error = new Error("ANTHROPIC_API_KEY is not configured on the backend.");
    error.status = 500;
    throw error;
  }
}

function truncateForLLM(text = "", maxChars = 16000) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Text truncated for model context]`;
}

function cleanText(text) {
  return String(text ?? "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^["'`\s]+|["'`\s]+$/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[\t ]{2,}/g, " ")
    .trim();
}

async function callClaude({ system, prompt, maxTokens = 1500 }) {
  requireApiKey();

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`LLM API error (${response.status}): ${errorBody.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const text = data.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("The model returned an empty response.");
  }

  return text;
}

async function callClaudeJSON({ system, prompt, maxTokens = 1500 }) {
  const raw = await callClaude({
    system: `${system}\n\nReturn only valid JSON. Do not include Markdown fences or explanations.`,
    prompt,
    maxTokens,
  });
  const cleaned = raw.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned);
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: MODEL });
});

app.post(
  "/api/analyze-paper",
  asyncRoute(async (req, res) => {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: "PDF text is required." });
    }

    const analysis = await callClaudeJSON({
      system: ANALYSIS_SYSTEM_PROMPT,
      prompt: buildAnalysisPrompt(truncateForLLM(text, 12000)),
      maxTokens: 1000,
    });

    res.json({ analysis });
  })
);

app.post(
  "/api/summarize",
  asyncRoute(async (req, res) => {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: "Paper text is required." });
    }

    const summary = await callClaude({
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: buildSummaryPrompt(truncateForLLM(text, 16000)),
      maxTokens: 700,
    });

    res.json({ summary: cleanText(summary) });
  })
);

app.post(
  "/api/chat",
  asyncRoute(async (req, res) => {
    const { documentText, question, chatHistory = [], socraticMode = false } = req.body;
    if (!documentText?.trim() || !question?.trim()) {
      return res.status(400).json({ error: "Document text and question are required." });
    }

    const socraticInstruction = socraticMode
      ? "\n\nSocratic Learning Mode is enabled. Ask guiding questions, give short hints and feedback, avoid giving the full answer immediately, and use simple academic language."
      : "";

    const answer = await callClaude({
      system: `${CHAT_SYSTEM_PROMPT}${socraticInstruction}`,
      prompt: buildChatPrompt({
        documentText: truncateForLLM(documentText, 16000),
        question,
        chatHistory,
      }),
      maxTokens: 1000,
    });

    res.json({ answer: cleanText(answer) });
  })
);

app.post(
  "/api/compare",
  asyncRoute(async (req, res) => {
    const { firstDocument, secondDocument } = req.body;
    if (!firstDocument?.text?.trim() || !secondDocument?.text?.trim()) {
      return res.status(400).json({ error: "Two paper texts are required." });
    }

    const comparison = await callClaudeJSON({
      system: COMPARE_SYSTEM_PROMPT,
      prompt: buildComparePrompt({
        firstDocument: {
          title: firstDocument.title,
          text: truncateForLLM(firstDocument.text, 9000),
        },
        secondDocument: {
          title: secondDocument.title,
          text: truncateForLLM(secondDocument.text, 9000),
        },
      }),
      maxTokens: 1700,
    });

    res.json(comparison);
  })
);

app.post("/api/export", (_req, res) => {
  res.json({
    ok: true,
    message:
      "Frontend PDF/Word export is implemented with jsPDF/html2canvas and docx. This endpoint is reserved for future server-side exports.",
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.message || "Unexpected backend error.",
  });
});

app.listen(PORT, () => {
  console.log(`PDFBrain backend listening on http://localhost:${PORT}`);
});
