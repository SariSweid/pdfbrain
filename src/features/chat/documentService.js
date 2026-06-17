import { extractTextFromPdf, truncateForLLM } from "../../lib/pdfExtract";
import { callClaudeJSON } from "../../lib/anthropicClient";
import { ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt } from "../../lib/aiPrompts";
import {
  getDocuments,
  saveDocument,
  addHistoryEvent,
} from "../../lib/localStore";

export async function fetchInitialDocuments() {
  return getDocuments();
}

/**
 * Full upload pipeline for one PDF file:
 * 1. Extract text with pdf.js
 * 2. Ask Claude to identify title / authors / abstract / keywords / field
 * 3. Persist the document (with full text, for later chat/summary/compare)
 */
export async function uploadDocument(file) {
  const { fullText, pageCount } = await extractTextFromPdf(file);

  if (!fullText.trim()) {
    throw new Error(
      "לא הצלחנו לחלץ טקסט מה-PDF. ייתכן שזהו מסמך סרוק (תמונה) ולא טקסט אמיתי."
    );
  }

  const analysisText = truncateForLLM(fullText, 12000);

  let analysis = {
    title: file.name.replace(/\.pdf$/i, ""),
    authors: "",
    abstract: "",
    keywords: "",
    field: "",
  };

  try {
    analysis = await callClaudeJSON({
      system: ANALYSIS_SYSTEM_PROMPT,
      prompt: buildAnalysisPrompt(analysisText),
      maxTokens: 1000,
    });
  } catch (error) {
    // Upload still succeeds even if AI analysis fails — the user gets the
    // raw file name as a title and can still chat/summarize manually.
    console.error("ניתוח AI נכשל, ממשיכים עם כותרת בסיסית:", error);
  }

  const document = {
    id: crypto.randomUUID(),
    title: analysis.title?.trim() || file.name.replace(/\.pdf$/i, ""),
    authors: analysis.authors?.trim() || "",
    abstract: analysis.abstract?.trim() || "",
    keywords: analysis.keywords?.trim() || "",
    field: analysis.field?.trim() || "",
    fileName: file.name,
    fullText,
    pageCount,
    date: new Date().toLocaleDateString("he-IL"),
    createdAt: Date.now(),
  };

  saveDocument(document);

  addHistoryEvent({
    type: "upload",
    documentId: document.id,
    title: document.title,
    label: "העלאת מאמר",
    date: document.date,
  });

  return document;
}
