import { getHistory } from "../../lib/localStore";

// Real history is now derived from actions performed across the app
// (upload, chat, summary, compare) and persisted via localStore's
// addHistoryEvent(). This service just reads it back, sorted newest-first.
export async function fetchHistory() {
  return getHistory();
}
