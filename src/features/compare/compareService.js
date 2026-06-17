import { callClaudeJSON } from "../../lib/anthropicClient";
import { truncateForLLM } from "../../lib/pdfExtract";
import { COMPARE_SYSTEM_PROMPT, buildComparePrompt } from "../../lib/aiPrompts";
import { getDocuments, saveComparison, addHistoryEvent } from "../../lib/localStore";

export async function fetchDocumentsForCompare() {
  return getDocuments();
}

/**
 * Compares two already-uploaded documents using Claude and returns a
 * structured comparison table (topic / first paper / second paper rows).
 */
export async function fetchComparison(firstDocumentId, secondDocumentId) {
  const documents = getDocuments();
  const firstDoc = documents.find((doc) => doc.id === firstDocumentId);
  const secondDoc = documents.find((doc) => doc.id === secondDocumentId);

  if (!firstDoc || !secondDoc) {
    throw new Error("יש לבחור שני מאמרים תקינים להשוואה.");
  }

  const { rows } = await callClaudeJSON({
    system: COMPARE_SYSTEM_PROMPT,
    prompt: buildComparePrompt({
      firstDocument: { title: firstDoc.title, text: truncateForLLM(firstDoc.fullText, 9000) },
      secondDocument: { title: secondDoc.title, text: truncateForLLM(secondDoc.fullText, 9000) },
    }),
    maxTokens: 1500,
  });

  const comparison = {
    id: crypto.randomUUID(),
    firstDocumentId,
    secondDocumentId,
    firstPaperTitle: firstDoc.title,
    secondPaperTitle: secondDoc.title,
    rows,
    createdAt: Date.now(),
    date: new Date().toLocaleDateString("he-IL"),
  };

  saveComparison(comparison);

  addHistoryEvent({
    type: "compare",
    documentId: firstDocumentId,
    title: `${firstDoc.title} מול ${secondDoc.title}`,
    label: "השוואת מאמרים",
    date: comparison.date,
  });

  return comparison;
}
