import useHistory from "./useHistory";

const TYPE_ICONS = {
  upload: "📤",
  chat: "💬",
  summary: "📝",
  compare: "🔍",
};

function HistoryPage() {
  const { historyItems, loading } = useHistory();

  return (
    <main className="p-8 bg-slate-50 min-h-full overflow-y-auto">
      <section className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">היסטוריית פעילות</h1>
          <p className="mt-2 text-gray-600">
            כאן ניתן לראות פעולות אחרונות שבוצעו במערכת PDFBrain לצורך מעקב
            אחר שאלות, סיכומים והשוואות.
          </p>
        </div>

        {loading && <p className="text-sm text-gray-500">טוען היסטוריה...</p>}

        {!loading && historyItems.length === 0 && (
          <p className="text-sm text-gray-400">
            עדיין אין פעילות. העלה מאמר, שאל שאלה, או הפק תקציר כדי לראות אותו כאן.
          </p>
        )}

        <div className="space-y-3">
          {historyItems.map((item) => (
            <article
              key={item.id}
              className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl">{TYPE_ICONS[item.type] ?? "📌"}</span>

                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">{item.title}</h2>
                  <p className="mt-1 text-sm text-gray-500">{item.date}</p>
                </div>
              </div>

              <span className="shrink-0 text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
                {item.label}
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default HistoryPage;
