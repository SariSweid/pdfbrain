import UploadButton from "./UploadButton";

function Sidebar({ documents }) {
  return (
    <aside className="w-1/4 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b">
        <UploadButton />
      </div>

      <div className="flex-1 overflow-y-auto">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-4 border-b hover:bg-indigo-50 cursor-pointer transition flex items-center gap-3"
          >
            <span className="text-xl">📄</span>

            <div>
              <p className="font-bold text-gray-800">{doc.title}</p>
              <p className="text-xs text-gray-500">{doc.date}</p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
