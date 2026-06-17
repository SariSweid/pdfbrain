// Persistence layer.
//
// With Firebase Auth + Firestore configured, data is saved under the current
// user. Without Firebase, the app falls back to localStorage for demo/local use.
//
// Firestore shape:
//   users/{uid}/documents/{docId}
//   users/{uid}/documents/{docId}/messages/{messageId}
//   users/{uid}/historyEvents/{eventId}
//   users/{uid}/comparisons/{comparisonId}

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db, isFirebaseConfigured } from "./firebase";

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
  localStorage.setItem(getUserStorageKey(key), JSON.stringify(value));
}

function shouldUseFirestore() {
  return Boolean(isFirebaseConfigured && db && auth?.currentUser?.uid);
}

function userCollection(collectionName) {
  return collection(db, "users", auth.currentUser.uid, collectionName);
}

function userDoc(collectionName, id) {
  return doc(db, "users", auth.currentUser.uid, collectionName, id);
}

async function readUserCollection(collectionName, sortField = "createdAt", direction = "desc") {
  const snapshot = await getDocs(
    query(userCollection(collectionName), orderBy(sortField, direction))
  );

  return snapshot.docs.map((snapshotDoc) => ({
    id: snapshotDoc.id,
    ...snapshotDoc.data(),
  }));
}

// ---------- Documents ----------

export async function getDocuments() {
  if (shouldUseFirestore()) {
    return readUserCollection("documents");
  }

  return readJSON(STORAGE_KEYS.documents, []);
}

export async function getDocumentById(documentId) {
  const documents = await getDocuments();
  return documents.find((paperDocument) => paperDocument.id === documentId) ?? null;
}

export async function saveDocument(paperDocument) {
  if (shouldUseFirestore()) {
    await setDoc(userDoc("documents", paperDocument.id), paperDocument);
    return paperDocument;
  }

  const documents = await getDocuments();
  const next = [paperDocument, ...documents];
  writeJSON(STORAGE_KEYS.documents, next);
  return paperDocument;
}

export async function updateDocument(documentId, patch) {
  if (shouldUseFirestore()) {
    await updateDoc(userDoc("documents", documentId), patch);
    return getDocumentById(documentId);
  }

  const documents = await getDocuments();
  const next = documents.map((paperDocument) =>
    paperDocument.id === documentId ? { ...paperDocument, ...patch } : paperDocument
  );
  writeJSON(STORAGE_KEYS.documents, next);
  return next.find((paperDocument) => paperDocument.id === documentId) ?? null;
}

export async function deleteDocument(documentId) {
  if (shouldUseFirestore()) {
    const messagesSnapshot = await getDocs(
      collection(db, "users", auth.currentUser.uid, "documents", documentId, "messages")
    );

    await Promise.all(messagesSnapshot.docs.map((messageDoc) => deleteDoc(messageDoc.ref)));
    await deleteDoc(userDoc("documents", documentId));
    return;
  }

  const documents = (await getDocuments()).filter(
    (paperDocument) => paperDocument.id !== documentId
  );
  writeJSON(STORAGE_KEYS.documents, documents);

  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  delete allMessages[documentId];
  writeJSON(STORAGE_KEYS.messages, allMessages);
}

// ---------- Chat messages (per document) ----------

export async function getMessages(documentId) {
  if (shouldUseFirestore()) {
    const snapshot = await getDocs(
      query(
        collection(db, "users", auth.currentUser.uid, "documents", documentId, "messages"),
        orderBy("createdAt", "asc")
      )
    );

    return snapshot.docs.map((snapshotDoc) => ({
      id: snapshotDoc.id,
      ...snapshotDoc.data(),
    }));
  }

  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  return allMessages[documentId] ?? [];
}

export async function appendMessage(documentId, message) {
  if (shouldUseFirestore()) {
    await setDoc(
      doc(db, "users", auth.currentUser.uid, "documents", documentId, "messages", message.id),
      message
    );

    return message;
  }

  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  const existing = allMessages[documentId] ?? [];
  allMessages[documentId] = [...existing, message];
  writeJSON(STORAGE_KEYS.messages, allMessages);
  return message;
}

// ---------- History events ----------

export async function getHistory() {
  if (shouldUseFirestore()) {
    return readUserCollection("historyEvents");
  }

  return readJSON(STORAGE_KEYS.history, []);
}

export async function addHistoryEvent(event) {
  const historyEvent = {
    ...event,
    id: event.id ?? crypto.randomUUID(),
    createdAt: event.createdAt ?? Date.now(),
  };

  if (shouldUseFirestore()) {
    await setDoc(userDoc("historyEvents", historyEvent.id), historyEvent);
    return historyEvent;
  }

  const history = await getHistory();
  const next = [historyEvent, ...history];
  writeJSON(STORAGE_KEYS.history, next.slice(0, 200));
  return next[0];
}

// ---------- Comparisons ----------

export async function getComparisons() {
  if (shouldUseFirestore()) {
    return readUserCollection("comparisons");
  }

  return readJSON(STORAGE_KEYS.comparisons, []);
}

export async function saveComparison(comparison) {
  if (shouldUseFirestore()) {
    await setDoc(userDoc("comparisons", comparison.id), comparison);
    return comparison;
  }

  const comparisons = await getComparisons();
  const next = [comparison, ...comparisons];
  writeJSON(STORAGE_KEYS.comparisons, next);
  return comparison;
}

export async function getComparisonById(comparisonId) {
  const comparisons = await getComparisons();
  return comparisons.find((comparison) => comparison.id === comparisonId) ?? null;
}
