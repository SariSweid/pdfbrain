import UploadButton from "./UploadButton";

function Sidebar({ documents, selectedDocumentId, onSelectDocument, onUploadDocument, onDeleteDocument, uploadError }) {
  return (
    <aside className="w-1/4 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b space-y-2">
        <UploadButton onUpload={onUploadDocument} />

        {uploadError && (
          <p className="text-xs text-red-600 leading-relaxed">{uploadError}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {documents.length === 0 && (
          <p className="p-4 text-sm text-gray-400 text-center">
            עדיין לא הועלו מאמרים. העלה PDF כדי להתחיל.
          </p>
        )}

        {documents.map((doc) => {
          const isSelected = doc.id === selectedDocumentId;

          return (
            <div
              key={doc.id}
              className={`group w-full p-4 border-b transition flex items-center gap-3 ${
                isSelected ? "bg-indigo-50" : "hover:bg-indigo-50/60"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectDocument(doc.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-right"
              >
                <span className="text-xl">📄</span>

                <div className="min-w-0">
                  <p className="font-bold text-gray-800 truncate">{doc.title}</p>
                  <p className="text-xs text-gray-500">{doc.date}</p>
                  {doc.authors && (
                    <p className="text-xs text-gray-400 truncate">{doc.authors}</p>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => onDeleteDocument(doc.id)}
                title="מחיקת מאמר"
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition shrink-0"
              >
                🗑️
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default Sidebar;
