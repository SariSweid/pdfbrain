import useCompare from "./useCompare";
import { exportComparisonToWord, exportComparisonToPdf } from "../../lib/exportUtils";

function ComparePage() {
  const {
    documents,
    firstDocumentId,
    secondDocumentId,
    setFirstDocumentId,
    setSecondDocumentId,
    comparison,
    loading,
    error,
    runComparison,
  } = useCompare();

  const hasEnoughDocuments = documents.length >= 2;

  return (
    <main className="p-8 bg-slate-50 h-full overflow-y-auto">
      <section className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">השוואת מאמרים</h1>
          <p className="mt-2 text-gray-600">
            בחר שני מאמרים אקדמיים כדי לקבל השוואה מסודרת בין תחום המחקר,
            שיטת המחקר, הממצאים והמגבלות המרכזיות.
          </p>
        </div>

        {!hasEnoughDocuments && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-sm">
            יש להעלות לפחות שני מאמרים בעמוד הצ'אט לפני שניתן להשוות.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm font-semibold text-indigo-600 mb-2">מאמר ראשון</p>

            <select
              value={firstDocumentId}
              onChange={(e) => setFirstDocumentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            >
              <option value="">בחר מאמר...</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <p className="text-sm font-semibold text-indigo-600 mb-2">מאמר שני</p>

            <select
              value={secondDocumentId}
              onChange={(e) => setSecondDocumentId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            >
              <option value="">בחר מאמר...</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={() => runComparison()}
          disabled={loading || !hasEnoughDocuments}
          className="bg-indigo-600 text-white rounded-lg px-6 py-3 font-bold hover:bg-indigo-700 transition shadow-sm disabled:bg-gray-400"
        >
          {loading ? "משווה..." : "בצע השוואה"}
        </button>

        {comparison && (
          <>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full text-right">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="p-4 font-bold">נושא</th>
                    <th className="p-4 font-bold">{comparison.firstPaperTitle}</th>
                    <th className="p-4 font-bold">{comparison.secondPaperTitle}</th>
                  </tr>
                </thead>

                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.topic} className="border-t border-gray-200">
                      <td className="p-4 font-bold text-gray-900">{row.topic}</td>
                      <td className="p-4 text-gray-700">{row.firstPaper}</td>
                      <td className="p-4 text-gray-700">{row.secondPaper}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  exportComparisonToWord(comparison).catch((err) =>
                    alert(`ייצוא נכשל: ${err.message}`)
                  )
                }
                className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-bold hover:bg-gray-50 transition"
              >
                ייצוא ל-Word 📄
              </button>

              <button
                onClick={() =>
                  exportComparisonToPdf(comparison).catch((err) =>
                    alert(`ייצוא נכשל: ${err.message}`)
                  )
                }
                className="bg-white border border-gray-300 text-gray-700 rounded-lg px-4 py-2 text-sm font-bold hover:bg-gray-50 transition"
              >
                ייצוא ל-PDF 📄
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default ComparePage;
