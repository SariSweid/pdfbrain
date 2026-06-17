import { callClaude } from "../../lib/anthropicClient";
import { truncateForLLM } from "../../lib/pdfExtract";
import {
  CHAT_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
  buildChatPrompt,
  buildSummaryPrompt,
} from "../../lib/aiPrompts";
import {
  getMessages,
  appendMessage,
  addHistoryEvent,
  updateDocument,
} from "../../lib/localStore";

export async function fetchMessagesForDocument(documentId) {
  if (!documentId) return [];
  return getMessages(documentId);
}

/**
 * Sends a free-text question about a specific document to Claude, grounded
 * in that document's extracted text, and persists both the question and
 * the answer to chat history for that document.
 */
export async function sendChatMessage({ document, question, chatHistory }) {
  if (!document) {
    throw new Error("יש לבחור מאמר לפני שליחת שאלה.");
  }

  const userMessage = {
    id: crypto.randomUUID(),
    sender: "user",
    text: question,
    createdAt: Date.now(),
  };
  await appendMessage(document.id, userMessage);

  const documentText = truncateForLLM(document.fullText, 16000);

  const answerText = await callClaude({
    system: CHAT_SYSTEM_PROMPT,
    prompt: buildChatPrompt({ documentText, question, chatHistory }),
    maxTokens: 1000,
  });

  // Clean up model output: remove code fences, excessive whitespace, and surrounding quotes
  const cleaned = answerText
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^```+/g, "")
    .replace(/```+$/g, "")
    .replace(/^["'`\s]+|["'`\s]+$/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[\t ]{2,}/g, " ")
    .trim();

  const botMessage = {
    id: crypto.randomUUID(),
    sender: "bot",
    text: cleaned,
    createdAt: Date.now(),
  };
  await appendMessage(document.id, botMessage);

  await addHistoryEvent({
    type: "chat",
    documentId: document.id,
    title: document.title,
    label: "שאלה על מאמר",
    date: new Date().toLocaleDateString("he-IL"),
  });

  return botMessage;
}

/**
 * Generates (or regenerates) an automatic summary for a document and
 * caches it on the document record so it isn't re-generated every time.
 */
export async function generateSummary(document) {
  if (!document) {
    throw new Error("יש לבחור מאמר ליצירת תקציר.");
  }

  const documentText = truncateForLLM(document.fullText, 16000);

  const summary = await callClaude({
    system: SUMMARY_SYSTEM_PROMPT,
    prompt: buildSummaryPrompt(documentText),
    maxTokens: 600,
  });

  await updateDocument(document.id, { summary });

  await addHistoryEvent({
    type: "summary",
    documentId: document.id,
    title: document.title,
    label: "תקציר אוטומטי",
    date: new Date().toLocaleDateString("he-IL"),
  });

  return summary;
}
