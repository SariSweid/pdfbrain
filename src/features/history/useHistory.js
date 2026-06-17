import { useEffect, useState } from "react";

import { fetchHistory } from "./historyService";

function useHistory() {
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);

      try {
        const items = await fetchHistory();
        setHistoryItems(items);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  return { historyItems, loading };
}

export default useHistory;
