// Local persistence layer.
//
// Data is namespaced per-user (so when real Firebase Auth lands, switching
// is just a matter of swapping the storage backend — the shape of the data
// below mirrors what Firestore collections would look like:
//   documents/{docId}
//   documents/{docId}/messages/{messageId}
//   historyEvents/{eventId}
//   comparisons/{comparisonId}

import { auth } from "./firebase";

const STORAGE_KEYS = {
  documents: "pdfbrain:documents",
  messages: "pdfbrain:messages", // keyed by documentId
  history: "pdfbrain:history",
  comparisons: "pdfbrain:comparisons",
};

function getUserStorageKey(key) {
  const uid = auth?.currentUser?.uid;

  if (!uid) {
    return `pdfbrain:guest:${key}`;
  }

  return `pdfbrain:${uid}:${key}`;
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(getUserStorageKey(key));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(
    getUserStorageKey(key),
    JSON.stringify(value)
  );
}

// ---------- Documents ----------

export function getDocuments() {
  return readJSON(STORAGE_KEYS.documents, []);
}

export function getDocumentById(documentId) {
  return getDocuments().find((doc) => doc.id === documentId) ?? null;
}

export function saveDocument(document) {
  const documents = getDocuments();
  const next = [document, ...documents];
  writeJSON(STORAGE_KEYS.documents, next);
  return document;
}

export function updateDocument(documentId, patch) {
  const documents = getDocuments();
  const next = documents.map((doc) =>
    doc.id === documentId ? { ...doc, ...patch } : doc
  );
  writeJSON(STORAGE_KEYS.documents, next);
  return next.find((doc) => doc.id === documentId) ?? null;
}

export function deleteDocument(documentId) {
  const documents = getDocuments().filter((doc) => doc.id !== documentId);
  writeJSON(STORAGE_KEYS.documents, documents);

  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  delete allMessages[documentId];
  writeJSON(STORAGE_KEYS.messages, allMessages);
}

// ---------- Chat messages (per document) ----------

export function getMessages(documentId) {
  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  return allMessages[documentId] ?? [];
}

export function appendMessage(documentId, message) {
  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  const existing = allMessages[documentId] ?? [];
  allMessages[documentId] = [...existing, message];
  writeJSON(STORAGE_KEYS.messages, allMessages);
  return message;
}

// ---------- History events ----------

export function getHistory() {
  return readJSON(STORAGE_KEYS.history, []);
}

export function addHistoryEvent(event) {
  const history = getHistory();
  const next = [{ ...event, id: event.id ?? crypto.randomUUID() }, ...history];
  writeJSON(STORAGE_KEYS.history, next.slice(0, 200)); // cap history size
  return next[0];
}

// ---------- Comparisons ----------

export function getComparisons() {
  return readJSON(STORAGE_KEYS.comparisons, []);
}

export function saveComparison(comparison) {
  const comparisons = getComparisons();
  const next = [comparison, ...comparisons];
  writeJSON(STORAGE_KEYS.comparisons, next);
  return comparison;
}

export function getComparisonById(comparisonId) {
  return getComparisons().find((c) => c.id === comparisonId) ?? null;
}
