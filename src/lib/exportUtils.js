import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// ── Download helper ───────────────────────────────────────────────────────────
function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = fileName;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── HTML → PDF via html2canvas (handles Hebrew/RTL) ──────────────────────────
async function renderHtmlToPdf(html, fileName) {
  const container = window.document.createElement("div");
  container.style.cssText = [
    "position:fixed", "top:-99999px", "left:-99999px",
    "width:720px", "padding:40px", "background:#ffffff",
    "direction:rtl", "font-family:Arial,sans-serif", "color:#1f2937",
    "line-height:1.7", "font-size:13px",
  ].join(";");
  container.innerHTML = html;
  window.document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
    const imgWidth  = 210;
    const pageHeight = 297;
    const imgHeight  = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");

    let heightLeft = imgHeight;
    let position   = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } finally {
    window.document.body.removeChild(container);
  }
}

function esc(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Inline markdown → HTML (bold, italic, inline-code) ───────────────────────
function inlineToHtml(text) {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`(.+?)`/g,       '<code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px;">$1</code>');
}

// ── Markdown → HTML (used for PDF export) ────────────────────────────────────
function markdownToHtml(md) {
  const lines = md.split(/\r?\n/);
  let html = "";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Table block ──
    if (trimmed.startsWith("|")) {
      let tableRows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|");
        if (!cells.join("").replace(/[-:\s]/g, "")) { i++; continue; } // skip separator
        tableRows.push(cells.map(c => c.trim()));
        i++;
      }
      if (tableRows.length > 0) {
        const [header, ...body] = tableRows;
        const thCss = "background:#4f46e5;color:#fff;padding:9px 12px;border:1px solid #e5e7eb;text-align:right;font-weight:700;";
        const tdCss = "padding:8px 12px;border:1px solid #e5e7eb;text-align:right;vertical-align:top;";
        html += `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;">
          <thead><tr>${header.map(h => `<th style="${thCss}">${inlineToHtml(h)}</th>`).join("")}</tr></thead>
          <tbody>${body.map((r,ri) => `<tr style="background:${ri%2?"#f9fafb":"#fff"}">${r.map(c => `<td style="${tdCss}">${inlineToHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>`;
      }
      continue;
    }

    // ── Headings ──
    if (trimmed.startsWith("### ")) {
      html += `<h3 style="font-size:14px;font-weight:700;margin:16px 0 5px;color:#1e1b4b;">${inlineToHtml(trimmed.slice(4))}</h3>`;
    } else if (trimmed.startsWith("## ")) {
      html += `<h2 style="font-size:17px;font-weight:700;margin:22px 0 7px;color:#1e1b4b;border-bottom:2px solid #e5e7eb;padding-bottom:5px;">${inlineToHtml(trimmed.slice(3))}</h2>`;
    } else if (trimmed.startsWith("# ")) {
      html += `<h1 style="font-size:21px;font-weight:800;margin:0 0 16px;color:#1e1b4b;">${inlineToHtml(trimmed.slice(2))}</h1>`;

    // ── Blockquote ──
    } else if (trimmed.startsWith("> ")) {
      html += `<blockquote style="border-right:3px solid #6366f1;padding:6px 12px;margin:8px 0;color:#6b7280;font-style:italic;background:#f5f3ff;border-radius:0 6px 6px 0;">${inlineToHtml(trimmed.slice(2))}</blockquote>`;

    // ── Bullet list item ──
    } else if (trimmed.match(/^[-*] /)) {
      html += `<div style="display:flex;gap:8px;margin:4px 0;padding-right:8px;"><span style="color:#6366f1;flex-shrink:0;">•</span><span>${inlineToHtml(trimmed.slice(2))}</span></div>`;

    // ── Ordered list item ──
    } else if (trimmed.match(/^\d+\. /)) {
      const [num, ...rest] = trimmed.split(". ");
      html += `<div style="display:flex;gap:8px;margin:4px 0;padding-right:8px;"><span style="color:#6366f1;flex-shrink:0;font-weight:700;">${esc(num)}.</span><span>${inlineToHtml(rest.join(". "))}</span></div>`;

    // ── HR ──
    } else if (trimmed === "---" || trimmed === "***") {
      html += `<hr style="border:none;border-top:1px solid #e5e7eb;margin:14px 0;">`;

    // ── Code block ──
    } else if (trimmed.startsWith("```")) {
      i++;
      let code = "";
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code += esc(lines[i]) + "\n";
        i++;
      }
      html += `<pre style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:12px;font-family:monospace;font-size:12px;overflow-x:auto;direction:ltr;text-align:left;">${code}</pre>`;

    // ── Empty line ──
    } else if (trimmed === "") {
      html += "<br>";

    // ── Regular paragraph ──
    } else {
      html += `<p style="margin:5px 0;font-size:13px;line-height:1.75;">${inlineToHtml(trimmed)}</p>`;
    }

    i++;
  }

  return html;
}

// ── Inline markdown → docx TextRuns (bold, plain) ────────────────────────────
function inlineToRuns(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.filter(Boolean).map(part => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return new TextRun({ text: part.slice(2, -2), bold: true });
    }
    return new TextRun({ text: part });
  });
}

// ── Markdown → docx Paragraph array (used for Word export) ───────────────────
function markdownToDocxParagraphs(md) {
  const paragraphs = [];
  const lines = md.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line  = lines[i];
    const trim  = line.trim();
    const plain = trim.replace(/\*\*/g, "").replace(/\*/g, "").replace(/`/g, "");

    // Skip markdown table separator rows (|---|)
    if (trim.startsWith("|") && trim.replace(/[\|\s\-:]/g, "") === "") { i++; continue; }

    // Table → flatten to plain paragraphs (Word tables are complex)
    if (trim.startsWith("|")) {
      const cells = trim.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      paragraphs.push(new Paragraph({
        children: cells.flatMap((c, ci) => [
          new TextRun({ text: c, bold: ci === 0 }),
          new TextRun({ text: ci < cells.length - 1 ? "  |  " : "" }),
        ]),
        alignment: AlignmentType.RIGHT, bidirectional: true,
      }));
      i++; continue;
    }

    if (trim.startsWith("### ")) {
      paragraphs.push(new Paragraph({ text: trim.slice(4).replace(/\*\*/g,""), heading: HeadingLevel.HEADING_3, alignment: AlignmentType.RIGHT, bidirectional: true }));
    } else if (trim.startsWith("## ")) {
      paragraphs.push(new Paragraph({ text: trim.slice(3).replace(/\*\*/g,""), heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT, bidirectional: true }));
    } else if (trim.startsWith("# ")) {
      paragraphs.push(new Paragraph({ text: trim.slice(2).replace(/\*\*/g,""), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, bidirectional: true }));
    } else if (trim.startsWith("> ")) {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: "❝ " + trim.slice(2).replace(/\*\*/g,""), italics: true, color: "6B7280" })], alignment: AlignmentType.RIGHT, bidirectional: true }));
    } else if (trim.match(/^[-*] /)) {
      paragraphs.push(new Paragraph({ children: inlineToRuns(trim.slice(2)), alignment: AlignmentType.RIGHT, bidirectional: true, bullet: { level: 0 } }));
    } else if (trim.match(/^\d+\. /)) {
      const rest = trim.replace(/^\d+\. /, "");
      paragraphs.push(new Paragraph({ children: inlineToRuns(rest), alignment: AlignmentType.RIGHT, bidirectional: true, numbering: { reference: "default-numbering", level: 0 } }));
    } else if (trim === "" || trim === "---" || trim === "***") {
      paragraphs.push(new Paragraph({ text: "" }));
    } else {
      paragraphs.push(new Paragraph({ children: inlineToRuns(trim), alignment: AlignmentType.RIGHT, bidirectional: true }));
    }

    i++;
  }

  return paragraphs;
}

// ── Summary export ────────────────────────────────────────────────────────────

export async function exportSummaryToWord(paperDocument) {
  const summaryParagraphs = markdownToDocxParagraphs(
    paperDocument.summary || "לא הופק תקציר עדיין."
  );

  const wordDoc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: paperDocument.title, heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, bidirectional: true }),
        ...(paperDocument.authors
          ? [new Paragraph({ text: paperDocument.authors, heading: HeadingLevel.HEADING_3, alignment: AlignmentType.RIGHT, bidirectional: true })]
          : []),
        new Paragraph({ text: "" }),
        ...summaryParagraphs,
      ],
    }],
  });

  const blob = await Packer.toBlob(wordDoc);
  triggerDownload(blob, `${paperDocument.title.slice(0, 60)} - ניתוח.docx`);
}

export async function exportSummaryToPdf(paperDocument) {
  const summaryHtml = markdownToHtml(
    paperDocument.summary || "לא הופק תקציר עדיין."
  );

  const html = `
    <h1 style="font-size:22px;font-weight:800;margin:0 0 6px;color:#1e1b4b;">${esc(paperDocument.title)}</h1>
    ${paperDocument.authors ? `<p style="color:#6b7280;margin:0 0 20px;font-size:13px;">${esc(paperDocument.authors)}</p>` : "<br>"}
    ${summaryHtml}
  `;

  await renderHtmlToPdf(html, `${paperDocument.title.slice(0, 60)} - ניתוח.pdf`);
}

// ── Comparison export ─────────────────────────────────────────────────────────

export async function exportComparisonToWord(comparison) {
  const headerRow = new TableRow({
    children: ["קריטריון", comparison.firstPaperTitle, comparison.secondPaperTitle].map(text =>
      new TableCell({
        width: { size: 33, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ text, heading: HeadingLevel.HEADING_4, alignment: AlignmentType.RIGHT, bidirectional: true })],
      })
    ),
  });

  const dataRows = comparison.rows.map(row =>
    new TableRow({
      children: [row.topic, row.firstPaper, row.secondPaper].map(text =>
        new TableCell({
          width: { size: 33, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ text: text || "", alignment: AlignmentType.RIGHT, bidirectional: true })],
        })
      ),
    })
  );

  const wordDoc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: "השוואת מאמרים", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT, bidirectional: true }),
        new Paragraph({ text: `${comparison.firstPaperTitle}  vs.  ${comparison.secondPaperTitle}`, heading: HeadingLevel.HEADING_3, alignment: AlignmentType.RIGHT, bidirectional: true }),
        new Paragraph({ text: "" }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }),
      ],
    }],
  });

  const blob = await Packer.toBlob(wordDoc);
  triggerDownload(blob, "השוואת מאמרים.docx");
}

export async function exportComparisonToPdf(comparison) {
  const rowsHtml = comparison.rows.map((row, i) => `
    <tr style="background:${i % 2 ? "#f9fafb" : "#fff"}">
      <td style="border:1px solid #e5e7eb;padding:10px 12px;font-weight:700;color:#4f46e5;vertical-align:top;width:18%;">${esc(row.topic)}</td>
      <td style="border:1px solid #e5e7eb;padding:10px 12px;vertical-align:top;width:41%;line-height:1.6;">${esc(row.firstPaper)}</td>
      <td style="border:1px solid #e5e7eb;padding:10px 12px;vertical-align:top;width:41%;line-height:1.6;">${esc(row.secondPaper)}</td>
    </tr>`).join("");

  const html = `
    <h1 style="font-size:21px;font-weight:800;margin:0 0 4px;color:#1e1b4b;">השוואת מאמרים</h1>
    <p style="color:#6b7280;font-size:13px;margin:0 0 16px;">${esc(comparison.firstPaperTitle)} לעומת ${esc(comparison.secondPaperTitle)}</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#4f46e5;color:#fff;">
          <th style="padding:10px 12px;border:1px solid #4338ca;text-align:right;">קריטריון</th>
          <th style="padding:10px 12px;border:1px solid #4338ca;text-align:right;">${esc(comparison.firstPaperTitle)}</th>
          <th style="padding:10px 12px;border:1px solid #4338ca;text-align:right;">${esc(comparison.secondPaperTitle)}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  await renderHtmlToPdf(html, "השוואת מאמרים.pdf");
}