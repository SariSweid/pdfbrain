const historyItems = [
  {
    id: 1,
    title: "שאלות על מאמר",
    date: "12.05.2026",
    type: "צ'אט אקדמי",
  },
  {
    id: 2,
    title: "תקציר אוטומטי",
    date: "10.05.2026",
    type: "סיכום PDF",
  },
  {
    id: 3,
    title: "השוואת מאמרים",
    date: "08.05.2026",
    type: "השוואה",
  },
];

function HistoryPage() {
  return (
    <main className="p-8 bg-slate-50 min-h-full">
      <section className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">היסטוריית פעילות</h1>
          <p className="mt-2 text-gray-600">
            כאן ניתן לראות פעולות אחרונות שבוצעו במערכת PDFBrain לצורך מעקב
            אחר שאלות, סיכומים והשוואות.
          </p>
        </div>

        <div className="space-y-3">
          {historyItems.map((item) => (
            <article
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex items-center justify-between gap-4"
            >
              <div>
                <h2 className="text-lg font-bold text-gray-900">{item.title}</h2>
                <p className="mt-1 text-sm text-gray-500">{item.date}</p>
              </div>

              <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                {item.type}
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default HistoryPage;
