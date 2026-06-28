import * as pdfjs from "pdfjs-dist";
import { saveDocument, getDocuments, appendMessage, getMessages } from "../../lib/localStore";

// pdfjs worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const ANTHROPIC_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
};

// ── Extract text from a PDF file ─────────────────────────────────────────────
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    fullText += `\n[עמוד ${i}]\n${pageText}`;
  }

  return fullText;
}

// ── Upload a document (extract + save) ───────────────────────────────────────
export async function uploadDocument(file) {
  const existing = await getDocuments();
  const duplicate = existing.find(
    (doc) => doc.filename === file.name || doc.title === file.name.replace(".pdf", "")
  );
  if (duplicate) {
    throw new Error(`המאמר "${file.name}" כבר הועלה בעבר.`);
  }

  const extractedText = await extractTextFromPDF(file);

  const now = Date.now();
  const newDoc = {
    id: crypto.randomUUID(),
    title: file.name.replace(".pdf", ""),
    filename: file.name,
    date: new Date().toLocaleDateString("he-IL"),
    extractedText,
    pageCount: extractedText.split(/\[עמוד \d+\]/).length - 1,
    uploadedAt: now,
    createdAt: now,   // required for Firestore orderBy("createdAt")
  };

  return saveDocument(newDoc);
}

// ── Fetch documents from store ────────────────────────────────────────────────
export async function fetchInitialDocuments() {
  return getDocuments();
}

// ── Fetch messages for a document ────────────────────────────────────────────
export async function fetchMessagesForDocument(documentId) {
  return getMessages(documentId);
}

// ── Send a chat message to Claude ────────────────────────────────────────────
export async function sendChatMessage({ document, question, chatHistory, systemPrompt }) {
  const system = systemPrompt || `אתה עוזר AI מומחה לניתוח מאמרים אקדמיים.
ענה על שאלות על המאמר הבא, ציין מאיפה במאמר המידע מגיע (סעיף/עמוד) כשרלוונטי.

תוכן המאמר:
${document.extractedText || document.title}`;

  const recentHistory = chatHistory.slice(-20);
  const claudeMessages = recentHistory.map((m) => ({
    role: m.sender === "user" ? "user" : "assistant",
    content: m.text,
  }));
  claudeMessages.push({ role: "user", content: question });

  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system,
      messages: claudeMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `שגיאת API: ${response.status}`);
  }

  const data = await response.json();
  const botText = data.content?.[0]?.text ?? "לא הצלחתי לקבל תשובה.";

  const msgTs = Date.now();
  const botMessage = { id: crypto.randomUUID(), sender: "bot", text: botText, createdAt: msgTs + 1 };

  appendMessage(document.id, { id: crypto.randomUUID(), sender: "user", text: question, createdAt: msgTs });
  appendMessage(document.id, botMessage);

  return botMessage;
}

// ── Auto-analysis: run immediately after upload ───────────────────────────────
// Returns the opening educator message (first bot question to the student)
export async function startEducatorSession(document) {
  const system = `אתה מורה אקדמי חינוכי שמסייע לסטודנטים ללמוד מאמרים מדעיים.
תפקידך:
1. להנחות את הסטודנט בתהליך הלמידה של המאמר דרך שאלות ממוקדות.
2. לתת משוב על תשובות הסטודנט.
3. לציין מאיפה במאמר מופיע המידע (עמוד/סעיף).
4. בסוף השיחה (כשמתבקש), לתת ציון על איכות התשובות.

המאמר:
${document.extractedText?.slice(0, 8000) || document.title}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system,
      messages: [
        {
          role: "user",
          content: "התחל את השיחה החינוכית. הצג את עצמך בקצרה, ספר על המאמר שהועלה, ושאל את השאלה הראשונה שתעזור לסטודנט להבין את המאמר.",
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `שגיאת API: ${response.status}`);
  }

  const data = await response.json();
  const botText = data.content?.[0]?.text ?? "שלום! בואו נלמד את המאמר יחד.";

  const botMessage = { id: crypto.randomUUID(), sender: "bot", text: botText, createdAt: Date.now() };
  appendMessage(document.id, botMessage);
  return botMessage;
}

// ── Score the conversation ────────────────────────────────────────────────────
export async function scoreConversation(document, chatHistory) {
  const historyText = chatHistory
    .map((m) => `${m.sender === "user" ? "סטודנט" : "מורה"}: ${m.text}`)
    .join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: `אתה מעריך אקדמי שמדרג שיחות בין סטודנטים למורה על מאמר מדעי.`,
      messages: [
        {
          role: "user",
          content: `להלן שיחה בין סטודנט למורה על המאמר "${document.title}".
הערך את תשובות הסטודנט ותן:
1. **ציון כולל** (0-100)
2. **איכות התשובות** — האם הסטודנט הבין את המאמר?
3. **נקודות חוזק**
4. **נקודות לשיפור**
5. **המלצה** — מה כדאי לקרוא/ללמוד עוד?

השיחה:
${historyText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `שגיאת API: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "לא הצלחתי לחשב ציון.";
}

// ── Generate a full summary/analysis (kept for DocumentAnalysisPanel) ─────────
export async function generateSummary(document) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: "אתה מנתח מאמרים אקדמיים. ספק ניתוח מקיף ומובנה.",
      messages: [
        {
          role: "user",
          content: `נתח את המאמר הבא וספק:
1. **תקציר** (3-4 משפטים)
2. **שאלת המחקר הראשית**
3. **מתודולוגיה**
4. **ממצאים עיקריים**
5. **אלגוריתמים/שיטות** (ציין איפה הם מופיעים במאמר)
6. **מסקנות**

המאמר:
${document.extractedText?.slice(0, 8000) || document.title}`,
        },
      ],
    }),
  });

  const data = await response.json();
  return data.content?.[0]?.text ?? "לא הצלחתי לנתח.";
}