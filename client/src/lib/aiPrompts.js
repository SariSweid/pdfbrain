// Centralized prompts for every AI-backed feature. Keeping them in one
// place makes it easy to tune wording later without hunting through
// service files.

export const ANALYSIS_SYSTEM_PROMPT = `אתה עוזר מחקר אקדמי. תפקידך לנתח טקסט שחולץ ממאמר מדעי (PDF) ולחלץ ממנו מטא-דאטה בסיסית בצורה מדויקת. אם פרט מסוים לא קיים בטקסט, השב במחרוזת ריקה "" עבורו, אל תמציא מידע.`;

export function buildAnalysisPrompt(extractedText) {
  return `להלן הטקסט שחולץ מתחילת מאמר מדעי (ייתכן שהפורמט מבולגן בגלל חילוץ אוטומטי מ-PDF):

"""
${extractedText}
"""

החזר אובייקט JSON עם המפתחות הבאים בלבד:
{
  "title": "כותרת המאמר",
  "authors": "שמות המחברים, מופרדים בפסיקים",
  "abstract": "התקציר של המאמר (Abstract), כפי שמופיע במאמר, או תקציר קצר שאתה מנסח אם אין Abstract מפורש",
  "keywords": "מילות מפתח אם קיימות, מופרדות בפסיקים",
  "field": "תחום המחקר הכללי במשפט קצר"
}`;
}

export const SUMMARY_SYSTEM_PROMPT = `אתה עוזר מחקר אקדמי שמייצר תקצירים קצרים וברורים של מאמרים מדעיים בעברית, מותאמים לקורא שרוצה להבין את המאמר במהירות בלי לקרוא אותו במלואו.`;

export function buildSummaryPrompt(documentText) {
  return `סכם את המאמר המדעי הבא בעברית, ב-4 עד 6 משפטים. כלול: מה השאלה/בעיה שהמאמר עוסק בה, מה השיטה, ומה התוצאות או המסקנות העיקריות. כתוב בטקסט רגיל בלבד (לא JSON, לא כותרות, לא בולטים).

טקסט המאמר:
"""
${documentText}
"""`;
}

export const CHAT_SYSTEM_PROMPT = `אתה "PDFBrain" — עוזר מחקר אקדמי שעונה על שאלות לגבי מאמר מדעי ספציפי, על סמך הטקסט שלו בלבד. ענה תמיד בעברית, בצורה ברורה ומדויקת. אם התשובה לא נמצאת בטקסט המאמר, אמור זאת בבירור במקום להמציא תשובה. אל תחזור על כל תוכן המאמר — תן תשובה ממוקדת לשאלה שנשאלה.`;

export function buildChatPrompt({ documentText, question, chatHistory }) {
  const historyBlock =
    chatHistory && chatHistory.length > 0
      ? `\n\nהיסטוריית השיחה הקודמת על מאמר זה (לצורך הקשר בלבד):\n${chatHistory
          .map((m) => `${m.sender === "user" ? "משתמש" : "בוט"}: ${m.text}`)
          .join("\n")}`
      : "";

  return `טקסט המאמר:
"""
${documentText}
"""
${historyBlock}

שאלת המשתמש: ${question}`;
}

export const COMPARE_SYSTEM_PROMPT = `אתה עוזר מחקר אקדמי שמשווה בין שני מאמרים מדעיים על סמך הטקסט שלהם, ומפיק טבלת השוואה מסודרת בעברית.`;

export function buildComparePrompt({ firstDocument, secondDocument }) {
  return `להלן טקסטים של שני מאמרים מדעיים. השווה ביניהם והחזר JSON בפורמט הבא בלבד:

{
  "rows": [
    { "topic": "נושא/תחום מחקר", "firstPaper": "...", "secondPaper": "..." },
    { "topic": "שיטת מחקר", "firstPaper": "...", "secondPaper": "..." },
    { "topic": "תוצאות מרכזיות", "firstPaper": "...", "secondPaper": "..." },
    { "topic": "מגבלות", "firstPaper": "...", "secondPaper": "..." }
  ]
}

כל תא בטבלה צריך להיות תמציתי (1-2 משפטים).

מאמר ראשון - "${firstDocument.title}":
"""
${firstDocument.text}
"""

מאמר שני - "${secondDocument.title}":
"""
${secondDocument.text}
"""`;
}
