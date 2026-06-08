function UploadButton() {
  const handleUploadClick = () => {
    alert("העלאת PDF תתווסף בהמשך");
  };

  return (
    <button
      type="button"
      onClick={handleUploadClick}
      className="w-full bg-indigo-600 text-white rounded-lg py-2 font-bold hover:bg-indigo-700 transition shadow-md"
    >
      + העלאת PDF חדש
    </button>
  );
}

export default UploadButton;
