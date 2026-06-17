import useHistory from "./useHistory";

const TYPE_ICONS = {
  upload: "📤",
  chat: "💬",
  summary: "📝",
  compare: "⚖️",
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

        {loading && (
          <p className="text-sm text-gray-500">טוען היסטוריה...</p>
        )}

        {!loading && historyItems.length === 0 && (
          <p className="text-sm text-gray-400">
            עדיין אין פעילות. העלה מאמר, שאל שאלה, או הפק תקציר כדי לראות אותו כאן.
          </p>
        )}

        <div className="space-y-3">
          {historyItems.map((item) => (
            <article
              key={item.id}
              className="group bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-xl">
                  {TYPE_ICONS[item.type] ?? "📌"}
                </span>

                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 truncate leading-snug">
                    {item.title}
                  </h2>

                  {/* ✅ IMPROVED COMPARE UI */}
                  {item.type === "compare" && item.subtitle && (
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-md w-fit">
                      <span className="truncate max-w-[250px]">
                        {item.subtitle.first}
                      </span>

                      <span className="text-indigo-500">⚖️</span>

                      <span className="truncate max-w-[250px]">
                        {item.subtitle.second}
                      </span>
                    </div>
                  )}

                  <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                    <span>📅</span>
                    <span>{item.date}</span>
                  </div>
                </div>
              </div>

              <span className="shrink-0 text-xs font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
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