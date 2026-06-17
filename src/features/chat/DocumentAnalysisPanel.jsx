import { exportSummaryToWord, exportSummaryToPdf } from "../../lib/exportUtils";

function DocumentAnalysisPanel({ document, onGenerateSummary, summaryLoading }) {
  if (!document) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-5 text-center text-gray-400 text-sm">
        בחר מאמר מהרשימה כדי לראות את הניתוח שלו, או העלה מאמר חדש.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900">{document.title}</h2>
          {document.authors && (
            <p className="text-sm text-gray-500 mt-0.5">{document.authors}</p>
          )}
        </div>

        <span className="shrink-0 text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">
          {document.pageCount ? `${document.pageCount} עמודים` : "PDF"}
        </span>
      </div>

      {document.field && (
        <p className="text-sm text-gray-600">
          <span className="font-semibold">תחום: </span>
          {document.field}
        </p>
      )}

      {document.abstract && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">תקציר המאמר (Abstract)</p>
          <p className="text-sm text-gray-600 leading-relaxed">{document.abstract}</p>
        </div>
      )}

      {document.keywords && (
        <p className="text-xs text-gray-500">
          <span className="font-semibold">מילות מפתח: </span>
          {document.keywords}
        </p>
      )}

      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between gap-3 mb-1">
          <p className="text-sm font-semibold text-gray-700">תקציר אוטומטי (AI)</p>

          <button
            type="button"
            onClick={onGenerateSummary}
            disabled={summaryLoading}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:text-gray-400"
          >
            {summaryLoading
              ? "מפיק תקציר..."
              : document.summary
              ? "הפק מחדש"
              : "הפק תקציר"}
          </button>
        </div>

        {document.summary ? (
          <>
            <p className="text-sm text-gray-600 leading-relaxed">{document.summary}</p>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() =>
                  exportSummaryToWord(document).catch((err) =>
                    alert(`ייצוא נכשל: ${err.message}`)
                  )
                }
                className="text-xs font-bold text-gray-600 hover:text-indigo-700"
              >
                ייצוא ל-Word 📄
              </button>

              <button
                type="button"
                onClick={() =>
                  exportSummaryToPdf(document).catch((err) =>
                    alert(`ייצוא נכשל: ${err.message}`)
                  )
                }
                className="text-xs font-bold text-gray-600 hover:text-indigo-700"
              >
                ייצוא ל-PDF 📄
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">לא הופק תקציר עדיין.</p>
        )}
      </div>
    </div>
  );
}

export default DocumentAnalysisPanel;
