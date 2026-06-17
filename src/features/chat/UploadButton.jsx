import { useRef, useState } from "react";

function UploadButton({ onUpload }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);

    try {
      // Upload sequentially so each file's AI analysis call doesn't race
      // with the others and so the document list updates one at a time.
      for (const file of files) {
        try {
          await onUpload(file);
        } catch {
          // The error is already surfaced via uploadError in the parent;
          // keep going so one bad file doesn't block the rest of the batch.
        }
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        type="button"
        onClick={handleUploadClick}
        disabled={uploading}
        className="w-full bg-indigo-600 text-white rounded-lg py-2 font-bold hover:bg-indigo-700 transition shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {uploading ? "מעלה ומנתח..." : "+ העלאת PDF חדש"}
      </button>
    </>
  );
}

export default UploadButton;
