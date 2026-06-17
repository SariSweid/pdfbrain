import { Document, Packer, Paragraph, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType } from "docx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

// Hebrew/RTL text has no native font support in jsPDF's built-in fonts, so
// PDF export renders the content as styled, hidden HTML and rasterizes it
// with html2canvas — this guarantees the text actually shows up correctly
// instead of rendering blank or garbled.
async function renderHtmlToPdf(html, fileName) {
  const container = window.document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-99999px";
  container.style.left = "-99999px";
  container.style.width = "700px";
  container.style.padding = "32px";
  container.style.background = "#ffffff";
  container.style.direction = "rtl";
  container.style.fontFamily = "Arial, sans-serif";
  container.style.color = "#1f2937";
  container.innerHTML = html;

  window.document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");

    let heightLeft = imgHeight;
    let position = 0;

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

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- Summary export ----------

export async function exportSummaryToWord(paperDocument) {
  const wordDoc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: paperDocument.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
          ...(paperDocument.authors
            ? [
                new Paragraph({
                  text: paperDocument.authors,
                  heading: HeadingLevel.HEADING_3,
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                }),
              ]
            : []),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "תקציר אוטומטי",
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
          new Paragraph({
            text: paperDocument.summary || "לא הופק תקציר עדיין.",
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
          ...(paperDocument.abstract
            ? [
                new Paragraph({ text: "" }),
                new Paragraph({
                  text: "תקציר המאמר (Abstract)",
                  heading: HeadingLevel.HEADING_2,
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                }),
                new Paragraph({
                  text: paperDocument.abstract,
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                }),
              ]
            : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(wordDoc);
  triggerDownload(blob, `${paperDocument.title.slice(0, 60)} - תקציר.docx`);
}

export async function exportSummaryToPdf(paperDocument) {
  const html = `
    <h1 style="font-size:22px; margin:0 0 4px;">${escapeHtml(paperDocument.title)}</h1>
    ${paperDocument.authors ? `<p style="color:#6b7280; margin:0 0 16px;">${escapeHtml(paperDocument.authors)}</p>` : ""}
    <h2 style="font-size:16px; margin:20px 0 8px;">תקציר אוטומטי</h2>
    <p style="font-size:13px; line-height:1.7; margin:0;">${escapeHtml(paperDocument.summary || "לא הופק תקציר עדיין.")}</p>
    ${
      paperDocument.abstract
        ? `<h2 style="font-size:16px; margin:20px 0 8px;">תקציר המאמר (Abstract)</h2>
           <p style="font-size:13px; line-height:1.7; margin:0;">${escapeHtml(paperDocument.abstract)}</p>`
        : ""
    }
  `;

  await renderHtmlToPdf(html, `${paperDocument.title.slice(0, 60)} - תקציר.pdf`);
}

// ---------- Comparison export ----------

export async function exportComparisonToWord(comparison) {
  const headerRow = new TableRow({
    children: ["נושא", comparison.firstPaperTitle, comparison.secondPaperTitle].map(
      (text) =>
        new TableCell({
          width: { size: 33, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              text,
              heading: HeadingLevel.HEADING_4,
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            }),
          ],
        })
    ),
  });

  const dataRows = comparison.rows.map(
    (row) =>
      new TableRow({
        children: [row.topic, row.firstPaper, row.secondPaper].map(
          (text) =>
            new TableCell({
              width: { size: 33, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  text: text || "",
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                }),
              ],
            })
        ),
      })
  );

  const wordDoc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "השוואת מאמרים",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
          new Paragraph({ text: "" }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(wordDoc);
  triggerDownload(blob, "השוואת מאמרים.docx");
}

export async function exportComparisonToPdf(comparison) {
  const rowsHtml = comparison.rows
    .map(
      (row) => `
        <tr>
          <td style="border:1px solid #e5e7eb; padding:8px; font-weight:bold; vertical-align:top; width:18%;">${escapeHtml(row.topic)}</td>
          <td style="border:1px solid #e5e7eb; padding:8px; vertical-align:top; width:41%;">${escapeHtml(row.firstPaper)}</td>
          <td style="border:1px solid #e5e7eb; padding:8px; vertical-align:top; width:41%;">${escapeHtml(row.secondPaper)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <h1 style="font-size:20px; margin:0 0 16px;">השוואת מאמרים</h1>
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="border:1px solid #e5e7eb; padding:8px;">נושא</th>
          <th style="border:1px solid #e5e7eb; padding:8px;">${escapeHtml(comparison.firstPaperTitle)}</th>
          <th style="border:1px solid #e5e7eb; padding:8px;">${escapeHtml(comparison.secondPaperTitle)}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  `;

  await renderHtmlToPdf(html, "השוואת מאמרים.pdf");
}
