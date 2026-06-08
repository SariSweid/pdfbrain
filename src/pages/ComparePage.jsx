const comparisonRows = [
  {
    topic: "תחום מחקר",
    firstPaper: "למידת מכונה לעיבוד מסמכים אקדמיים",
    secondPaper: "ניתוח שפה טבעית במערכות המלצה",
  },
  {
    topic: "שיטת מחקר",
    firstPaper: "ניסוי מבוקר עם מערך נתונים של מאמרים",
    secondPaper: "השוואת מודלים וניתוח ביצועים",
  },
  {
    topic: "תוצאות מרכזיות",
    firstPaper: "שיפור בדיוק סיווג נושאים במסמכי PDF",
    secondPaper: "שיפור התאמת תשובות לשאלות משתמשים",
  },
  {
    topic: "מגבלות",
    firstPaper: "תלות באיכות חילוץ הטקסט מהקובץ",
    secondPaper: "קושי בזיהוי הקשר במאמרים ארוכים",
  },
];

function ComparePage() {
  return (
    <main className="p-8 bg-slate-50 min-h-full">
      <section className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">השוואת מאמרים</h1>
          <p className="mt-2 text-gray-600">
            בחר שני מאמרים אקדמיים כדי לקבל השוואה מסודרת בין תחום המחקר,
            שיטת המחקר, הממצאים והמגבלות המרכזיות.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm font-semibold text-indigo-600">מאמר ראשון</p>
            <h2 className="mt-2 text-lg font-bold text-gray-900">
              אלגוריתמים בבינה מלאכותית
            </h2>
            <p className="mt-1 text-sm text-gray-500">נבחר מתוך מסמכי PDF שהועלו</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm font-semibold text-indigo-600">מאמר שני</p>
            <h2 className="mt-2 text-lg font-bold text-gray-900">
              מבני נתונים מתקדמים
            </h2>
            <p className="mt-1 text-sm text-gray-500">נבחר מתוך מסמכי PDF שהועלו</p>
          </div>
        </div>

        <button className="bg-indigo-600 text-white rounded-lg px-6 py-3 font-bold hover:bg-indigo-700 transition shadow-sm">
          בצע השוואה
        </button>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <table className="w-full text-right">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-4 font-bold">נושא</th>
                <th className="p-4 font-bold">מאמר ראשון</th>
                <th className="p-4 font-bold">מאמר שני</th>
              </tr>
            </thead>

            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row.topic} className="border-t border-gray-200">
                  <td className="p-4 font-bold text-gray-900">{row.topic}</td>
                  <td className="p-4 text-gray-700">{row.firstPaper}</td>
                  <td className="p-4 text-gray-700">{row.secondPaper}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default ComparePage;
