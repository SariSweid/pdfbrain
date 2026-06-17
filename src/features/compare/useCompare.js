import { useCallback, useEffect, useState } from "react";

import { fetchDocumentsForCompare, fetchComparison } from "./compareService";

function useCompare() {
  const [documents, setDocuments] = useState([]);
  const [firstDocumentId, setFirstDocumentId] = useState("");
  const [secondDocumentId, setSecondDocumentId] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDocuments() {
      const loadedDocuments = await fetchDocumentsForCompare();
      setDocuments(loadedDocuments);

      if (loadedDocuments.length >= 2) {
        setFirstDocumentId(loadedDocuments[0].id);
        setSecondDocumentId(loadedDocuments[1].id);
      }
    }

    loadDocuments();
  }, []);

  const runComparison = useCallback(async () => {
    if (!firstDocumentId || !secondDocumentId) {
      setError("יש לבחור שני מאמרים שונים להשוואה.");
      return;
    }

    if (firstDocumentId === secondDocumentId) {
      setError("יש לבחור שני מאמרים שונים זה מזה.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await fetchComparison(firstDocumentId, secondDocumentId);
      setComparison(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [firstDocumentId, secondDocumentId]);

  return {
    documents,
    firstDocumentId,
    secondDocumentId,
    setFirstDocumentId,
    setSecondDocumentId,
    comparison,
    loading,
    error,
    runComparison,
  };
}

export default useCompare;
