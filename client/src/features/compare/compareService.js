import { callClaudeJSON } from "../../lib/anthropicClient";
import { COMPARE_SYSTEM_PROMPT, buildComparePrompt } from "../../lib/aiPrompts";
import { getDocuments, saveComparison, addHistoryEvent } from "../../lib/localStore";

export async function fetchDocumentsForCompare() {
  return getDocuments();
}

export async function fetchComparison(firstDocumentId, secondDocumentId) {
  const documents = await getDocuments();
  const firstDoc = documents.find((doc) => doc.id === firstDocumentId);
  const secondDoc = documents.find((doc) => doc.id === secondDocumentId);

  if (!firstDoc || !secondDoc) {
    throw new Error("יש לבחור שני מאמרים תקינים להשוואה.");
  }

  // Support both field names — older docs may use fullText, newer ones extractedText
  const firstText = (firstDoc.extractedText || firstDoc.fullText || "").slice(0, 9000);
  const secondText = (secondDoc.extractedText || secondDoc.fullText || "").slice(0, 9000);

  const { rows } = await callClaudeJSON({
    system: COMPARE_SYSTEM_PROMPT,
    prompt: buildComparePrompt({
      firstDocument: { title: firstDoc.title, text: firstText },
      secondDocument: { title: secondDoc.title, text: secondText },
    }),
    maxTokens: 1500,
  });

  const comparison = {
    id: crypto.randomUUID(),
    type: "compare",
    firstDocumentId,
    secondDocumentId,
    firstPaperTitle: firstDoc.title,
    secondPaperTitle: secondDoc.title,
    rows,
    createdAt: Date.now(),
    date: new Date().toLocaleDateString("he-IL"),
  };

  await saveComparison(comparison);
  await addHistoryEvent({
    type: "compare",
    documentId: firstDocumentId,
    title: "השוואת מאמרים",
    subtitle: { first: firstDoc.title, second: secondDoc.title },
    label: "השוואת מאמרים",
    date: comparison.date,
  });

  return comparison;
}