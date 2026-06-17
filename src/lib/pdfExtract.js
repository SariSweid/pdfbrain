import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts plain text from a PDF File object, page by page.
 * @param {File} file
 * @returns {Promise<{ fullText: string, pageCount: number, pages: string[] }>}
 */
export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push(pageText);
  }

  return {
    fullText: pages.join("\n\n"),
    pageCount: pdf.numPages,
    pages,
  };
}

/**
 * Truncates extracted text to a safe size for sending as LLM context.
 * Keeps the beginning (title/abstract/intro) and the end (conclusion/refs)
 * since these matter most for analysis, summary, and comparison.
 */
export function truncateForLLM(text, maxChars = 18000) {
  if (text.length <= maxChars) return text;

  const headChars = Math.floor(maxChars * 0.7);
  const tailChars = maxChars - headChars;

  const head = text.slice(0, headChars);
  const tail = text.slice(text.length - tailChars);

  return `${head}\n\n[...טקסט קוצר עבור הניתוח...]\n\n${tail}`;
}
