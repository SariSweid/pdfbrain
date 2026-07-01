// Persistence layer.
//
// With Firebase Auth + Firestore configured, data is saved under the current
// user. Without Firebase (or when Firestore fails), falls back to localStorage.
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
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db, isFirebaseConfigured } from "./firebase";

const STORAGE_KEYS = {
  documents:   "pdfbrain:documents",
  messages:    "pdfbrain:messages",
  history:     "pdfbrain:history",
  comparisons: "pdfbrain:comparisons",
};

// ── localStorage helpers ──────────────────────────────────────────────────────

function getUserStorageKey(key) {
  const uid = auth?.currentUser?.uid;
  return uid ? `pdfbrain:${uid}:${key}` : `pdfbrain:guest:${key}`;
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
  try {
    localStorage.setItem(getUserStorageKey(key), JSON.stringify(value));
  } catch (err) {
    // Quota exceeded — retry with trimmed extractedText
    try {
      const trimmed = JSON.parse(JSON.stringify(value));
      if (Array.isArray(trimmed)) {
        trimmed.forEach((item) => {
          if (item?.extractedText?.length > 50000)
            item.extractedText = item.extractedText.slice(0, 50000);
        });
      }
      localStorage.setItem(getUserStorageKey(key), JSON.stringify(trimmed));
    } catch {
      console.error("localStorage write failed:", err);
    }
  }
}

// ── Firestore helpers ─────────────────────────────────────────────────────────

function shouldUseFirestore() {
  return Boolean(isFirebaseConfigured && db && auth?.currentUser?.uid);
}

function userCollection(collectionName) {
  return collection(db, "users", auth.currentUser.uid, collectionName);
}

function userDoc(collectionName, id) {
  return doc(db, "users", auth.currentUser.uid, collectionName, id);
}

// ── KEY FIX: no orderBy → Firestore won't silently drop docs missing the field.
// Sort in JS so both old docs (uploadedAt) and new docs (createdAt) are returned.
async function readUserCollection(collectionName, sortField = "createdAt", direction = "desc") {
  const snapshot = await getDocs(userCollection(collectionName));
  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => {
    // Fall back through common timestamp fields so old and new docs both sort
    const aVal = a[sortField] ?? a.uploadedAt ?? a.createdAt ?? 0;
    const bVal = b[sortField] ?? b.uploadedAt ?? b.createdAt ?? 0;
    return direction === "desc" ? bVal - aVal : aVal - bVal;
  });
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function getDocuments() {
  if (shouldUseFirestore()) {
    try {
      return await readUserCollection("documents", "uploadedAt");
    } catch (err) {
      console.error("Firestore getDocuments failed, falling back to localStorage:", err);
    }
  }
  return readJSON(STORAGE_KEYS.documents, []);
}

export async function getDocumentById(documentId) {
  const documents = await getDocuments();
  return documents.find((d) => d.id === documentId) ?? null;
}

export async function saveDocument(paperDocument) {
  if (shouldUseFirestore()) {
    try {
      await setDoc(userDoc("documents", paperDocument.id), paperDocument);
      return paperDocument;
    } catch (err) {
      console.error("Firestore saveDocument failed, saving to localStorage:", err);
    }
  }
  const documents = readJSON(STORAGE_KEYS.documents, []);
  writeJSON(STORAGE_KEYS.documents, [paperDocument, ...documents.filter((d) => d.id !== paperDocument.id)]);
  return paperDocument;
}

export async function updateDocument(documentId, patch) {
  if (shouldUseFirestore()) {
    try {
      await updateDoc(userDoc("documents", documentId), patch);
      return getDocumentById(documentId);
    } catch (err) {
      console.error("Firestore updateDocument failed:", err);
    }
  }
  const documents = readJSON(STORAGE_KEYS.documents, []);
  const next = documents.map((d) => (d.id === documentId ? { ...d, ...patch } : d));
  writeJSON(STORAGE_KEYS.documents, next);
  return next.find((d) => d.id === documentId) ?? null;
}

export async function deleteDocument(documentId) {
  if (shouldUseFirestore()) {
    try {
      const msgsSnap = await getDocs(
        collection(db, "users", auth.currentUser.uid, "documents", documentId, "messages")
      );
      await Promise.all(msgsSnap.docs.map((m) => deleteDoc(m.ref)));
      await deleteDoc(userDoc("documents", documentId));
      return;
    } catch (err) {
      console.error("Firestore deleteDocument failed:", err);
    }
  }
  const documents = readJSON(STORAGE_KEYS.documents, []).filter((d) => d.id !== documentId);
  writeJSON(STORAGE_KEYS.documents, documents);
  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  delete allMessages[documentId];
  writeJSON(STORAGE_KEYS.messages, allMessages);
}

// ── Messages ────────────────────────────────────────────────────────────────

export async function clearMessages(documentId) {
  if (shouldUseFirestore()) {
    try {
      const snap = await getDocs(
        collection(db, "users", auth.currentUser.uid, "documents", documentId, "messages")
      );
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    } catch (err) {
      console.error("Firestore clearMessages failed:", err);
    }
    return;
  }
  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  delete allMessages[documentId];
  writeJSON(STORAGE_KEYS.messages, allMessages);
}

export async function getMessages(documentId) {
  if (shouldUseFirestore()) {
    try {
      // No orderBy — sort in JS so messages without createdAt still appear
      const snapshot = await getDocs(
        collection(db, "users", auth.currentUser.uid, "documents", documentId, "messages")
      );
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return msgs.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
    } catch (err) {
      console.error("Firestore getMessages failed, falling back to localStorage:", err);
    }
  }
  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  return allMessages[documentId] ?? [];
}

export async function appendMessage(documentId, message) {
  if (shouldUseFirestore()) {
    try {
      await setDoc(
        doc(db, "users", auth.currentUser.uid, "documents", documentId, "messages", message.id),
        message
      );
      return message;
    } catch (err) {
      console.error("Firestore appendMessage failed, saving to localStorage:", err);
    }
  }
  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  allMessages[documentId] = [...(allMessages[documentId] ?? []), message];
  writeJSON(STORAGE_KEYS.messages, allMessages);
  return message;
}

// ── History ───────────────────────────────────────────────────────────────────

export async function getHistory() {
  if (shouldUseFirestore()) {
    try {
      return await readUserCollection("historyEvents", "createdAt");
    } catch (err) {
      console.error("Firestore getHistory failed:", err);
    }
  }
  return readJSON(STORAGE_KEYS.history, []);
}

export async function addHistoryEvent(event) {
  const historyEvent = {
    ...event,
    id:        event.id        ?? crypto.randomUUID(),
    createdAt: event.createdAt ?? Date.now(),
  };

  if (shouldUseFirestore()) {
    try {
      await setDoc(userDoc("historyEvents", historyEvent.id), historyEvent);
      return historyEvent;
    } catch (err) {
      console.error("Firestore addHistoryEvent failed:", err);
    }
  }
  const history = readJSON(STORAGE_KEYS.history, []);
  writeJSON(STORAGE_KEYS.history, [historyEvent, ...history].slice(0, 200));
  return historyEvent;
}

// ── Comparisons ───────────────────────────────────────────────────────────────

export async function getComparisons() {
  if (shouldUseFirestore()) {
    try {
      return await readUserCollection("comparisons", "createdAt");
    } catch (err) {
      console.error("Firestore getComparisons failed:", err);
    }
  }
  return readJSON(STORAGE_KEYS.comparisons, []);
}

export async function saveComparison(comparison) {
  if (shouldUseFirestore()) {
    try {
      await setDoc(userDoc("comparisons", comparison.id), comparison);
      return comparison;
    } catch (err) {
      console.error("Firestore saveComparison failed:", err);
    }
  }
  const comparisons = readJSON(STORAGE_KEYS.comparisons, []);
  writeJSON(STORAGE_KEYS.comparisons, [comparison, ...comparisons]);
  return comparison;
}

export async function getComparisonById(comparisonId) {
  const comparisons = await getComparisons();
  return comparisons.find((c) => c.id === comparisonId) ?? null;
}

// ── Lecturer / Student registration ──────────────────────────────────────────

// Save a student under a lecturer's sub-collection
// Called by the student themselves when they enter the class code.
export async function registerWithLecturer(lecturerUid) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) {
    throw new Error("חיבור לפיירבייס נדרש להרשמה אצל מרצה");
  }

  // Verify the lecturer exists by trying to write to their students sub-collection.
  // Firestore rules enforce that only the student (auth.uid == studentId) can write here.
  const profile = {
    uid,
    email:       auth.currentUser.email       ?? "",
    displayName: auth.currentUser.displayName ?? auth.currentUser.email ?? "סטודנט",
    registeredAt: Date.now(),
  };

  await setDoc(doc(db, "lecturers", lecturerUid, "students", uid), profile, { merge: true });
  localStorage.setItem("pdfbrain:my_lecturer", lecturerUid);
}

// Get all students registered under the current lecturer
export async function getMyStudents() {
  const myUid = auth?.currentUser?.uid;
  if (!myUid || !isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, "lecturers", myUid, "students"));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (err) {
    console.error("getMyStudents failed:", err);
    return [];
  }
}

// ── Read another user's data (lecturer VIEW MODE — no writes) ──────────────

export async function getStudentDocuments(studentUid) {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, "users", studentUid, "documents"));
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return docs.sort((a, b) => (b.uploadedAt ?? b.createdAt ?? 0) - (a.uploadedAt ?? a.createdAt ?? 0));
  } catch (err) {
    console.error("getStudentDocuments failed:", err);
    return [];
  }
}

export async function getStudentHistory(studentUid) {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, "users", studentUid, "historyEvents"));
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return events
      .filter((e) => e.type === "grade")
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch (err) {
    console.error("getStudentHistory failed:", err);
    return [];
  }
}

export async function getStudentMessages(studentUid, documentId) {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      collection(db, "users", studentUid, "documents", documentId, "messages")
    );
    const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return msgs.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  } catch (err) {
    console.error("getStudentMessages failed:", err);
    return [];
  }
}

// ── User profile / role (Firestore-locked, never changes) ─────────────────────

// Load full profile after login — role, classCode (lecturer) or registeredCode (student)
export async function loadUserProfile() {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) {
    const role = localStorage.getItem("pdfbrain:role");
    return role ? { role } : null;
  }
  try {
    const snap = await getDoc(doc(db, "userRoles", uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("loadUserProfile failed:", err);
    const role = localStorage.getItem("pdfbrain:role");
    return role ? { role } : null;
  }
}

// Save role to Firestore on first selection (create-only — role can't be changed later)
export async function saveUserRole(role) {
  const uid = auth?.currentUser?.uid;
  localStorage.setItem("pdfbrain:role", role);
  if (!uid || !isFirebaseConfigured || !db) return;
  const existing = await getDoc(doc(db, "userRoles", uid));
  if (existing.exists()) return; // already set — do NOT overwrite
  await setDoc(doc(db, "userRoles", uid), {
    uid,
    role,
    email: auth.currentUser.email ?? "",
    createdAt: Date.now(),
  });
}

// ── Class codes ────────────────────────────────────────────────────────────────

// Check if a code is already taken
export async function isCodeAvailable(code) {
  if (!isFirebaseConfigured || !db) return true;
  const snap = await getDoc(doc(db, "classCodes", code.toUpperCase()));
  return !snap.exists();
}

// Lecturer creates their class code
export async function createClassCode(code) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) throw new Error("חיבור לפיירבייס נדרש");
  const upper = code.toUpperCase().trim();

  const existing = await getDoc(doc(db, "classCodes", upper));
  if (existing.exists()) throw new Error(`הקוד "${upper}" תפוס — בחר קוד אחר`);

  // Save code → lecturer mapping
  await setDoc(doc(db, "classCodes", upper), {
    lecturerUid: uid,
    email: auth.currentUser.email ?? "",
    createdAt: Date.now(),
  });

  // Update lecturer's profile with their code
  await setDoc(doc(db, "userRoles", uid), { classCode: upper }, { merge: true });
  localStorage.setItem("pdfbrain:class_code", upper);
  return upper;
}

// Student registers with a class code
export async function registerStudentWithCode(code) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) throw new Error("חיבור לפיירבייס נדרש");
  const upper = code.toUpperCase().trim();

  // Resolve code → lecturer
  const codeSnap = await getDoc(doc(db, "classCodes", upper));
  if (!codeSnap.exists()) throw new Error(`הקוד "${upper}" לא נמצא — בדוק שהקוד נכון`);
  const { lecturerUid } = codeSnap.data();

  // Register student under that lecturer
  const profile = {
    uid,
    email:        auth.currentUser.email       ?? "",
    displayName:  auth.currentUser.displayName ?? auth.currentUser.email ?? "סטודנט",
    registeredAt: Date.now(),
  };
  await setDoc(doc(db, "lecturers", lecturerUid, "students", uid), profile, { merge: true });

  // Update student's profile with the lecturer reference
  await setDoc(doc(db, "userRoles", uid), {
    registeredCode: upper,
    lecturerUid,
  }, { merge: true });
  localStorage.setItem("pdfbrain:my_lecturer_code", upper);
  return { lecturerUid, code: upper };
}

// ── Sessions (archived chats — preserved when student clicks "שיחה חדשה") ────

export async function archiveAndClearMessages(documentId) {
  const uid = auth?.currentUser?.uid;

  if (shouldUseFirestore()) {
    try {
      const snap = await getDocs(
        collection(db, "users", uid, "documents", documentId, "messages")
      );
      const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (messages.length > 0) {
        const sessionId = `session_${Date.now()}`;
        await setDoc(
          doc(db, "users", uid, "documents", documentId, "sessions", sessionId),
          { id: sessionId, messages, messageCount: messages.length, createdAt: Date.now() }
        );
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }
    } catch (err) {
      console.error("archiveAndClearMessages (Firestore) failed:", err);
    }
    return;
  }

  // localStorage fallback
  const allMessages = readJSON(STORAGE_KEYS.messages, {});
  const currentMsgs = allMessages[documentId] ?? [];
  if (currentMsgs.length > 0) {
    const allSessions = readJSON("pdfbrain:sessions", {});
    if (!allSessions[documentId]) allSessions[documentId] = [];
    allSessions[documentId].push({
      id: `session_${Date.now()}`,
      messages: currentMsgs,
      messageCount: currentMsgs.length,
      createdAt: Date.now(),
    });
    writeJSON("pdfbrain:sessions", allSessions);
  }
  delete allMessages[documentId];
  writeJSON(STORAGE_KEYS.messages, allMessages);
}

// Get all archived sessions for a student's document (lecturer view)
export async function getStudentDocumentSessions(studentUid, documentId) {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      collection(db, "users", studentUid, "documents", documentId, "sessions")
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch (err) {
    console.error("getStudentDocumentSessions failed:", err);
    return [];
  }
}
// ════════════════════════════════════════════════════════════════════════════
// CLASSES — multi-class support
// Firestore shape:
//   classes/{classId}  { id, title, code, lecturerUid, createdAt }
//   classCodes/{code}  { classId, lecturerUid }        ← reverse lookup
//   classes/{classId}/students/{uid}   { uid, email, displayName, joinedAt }
//   classes/{classId}/missions/{mId}   { id, title, description, createdAt }
//   studentEnrollments/{uid}/classes/{classId}   { classId, classTitle, classCode, lecturerUid, joinedAt }
// ════════════════════════════════════════════════════════════════════════════

// ── Generate a random 6-char class code ─────────────────────────────────────
function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// ── Lecturer: check if a class code is free ──────────────────────────────────
export async function isClassCodeAvailable(code) {
  if (!isFirebaseConfigured || !db) return true;
  try {
    const snap = await getDoc(doc(db, "classCodes", code.toUpperCase()));
    return !snap.exists();
  } catch { return true; }
}

// ── Lecturer: create a new class ─────────────────────────────────────────────
export async function createClass(title, customCode) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db)
    throw new Error("חיבור לפיירבייס נדרש");

  const code    = (customCode ?? genCode()).toUpperCase().trim();
  const classId = `class_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // Check code uniqueness
  const existing = await getDoc(doc(db, "classCodes", code));
  if (existing.exists()) throw new Error(`הקוד "${code}" תפוס — בחר קוד אחר`);

  const classData = {
    id:          classId,
    title:       title.trim(),
    code,
    lecturerUid: uid,
    lecturerEmail: auth.currentUser.email ?? "",
    createdAt:   Date.now(),
  };

  await setDoc(doc(db, "classes", classId), classData);
  await setDoc(doc(db, "classCodes", code), { classId, lecturerUid: uid });

  return classData;
}

// ── Lecturer: get all their classes ──────────────────────────────────────────
export async function getLecturerClasses() {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) return [];
  try {
    const q    = query(collection(db, "classes"), where("lecturerUid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs
      .map(d => d.data())
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch (err) {
    console.error("getLecturerClasses failed:", err);
    return [];
  }
}

// ── Lecturer: get students in a specific class ────────────────────────────────
export async function getClassStudents(classId) {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, "classes", classId, "students"));
    return snap.docs
      .map(d => d.data())
      .sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0));
  } catch (err) {
    console.error("getClassStudents failed:", err);
    return [];
  }
}

// ── Student: join a class by code ─────────────────────────────────────────────
export async function joinClassByCode(code) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db)
    throw new Error("חיבור לפיירבייס נדרש");

  const upper    = code.toUpperCase().trim();
  const codeSnap = await getDoc(doc(db, "classCodes", upper));
  if (!codeSnap.exists())
    throw new Error(`הקוד "${upper}" לא נמצא — בדוק שהקוד נכון`);

  const { classId } = codeSnap.data();

  // Check if already enrolled
  const enrollSnap = await getDoc(
    doc(db, "studentEnrollments", uid, "classes", classId)
  );
  if (enrollSnap.exists()) throw new Error("כבר הצטרפת לכיתה זו");

  // Get class info
  const classSnap = await getDoc(doc(db, "classes", classId));
  if (!classSnap.exists()) throw new Error("הכיתה לא נמצאה");
  const classData = classSnap.data();

  // Add student to the class
  const profile = {
    uid,
    email:       auth.currentUser.email ?? "",
    displayName: auth.currentUser.displayName ?? auth.currentUser.email ?? "סטודנט",
    joinedAt:    Date.now(),
  };
  await setDoc(doc(db, "classes", classId, "students", uid), profile, { merge: true });

  // Save enrollment for the student
  await setDoc(doc(db, "studentEnrollments", uid, "classes", classId), {
    classId,
    classTitle:  classData.title,
    classCode:   upper,
    lecturerUid: classData.lecturerUid,
    joinedAt:    Date.now(),
  });

  return classData;
}

// ── Student: get all enrolled classes ────────────────────────────────────────
export async function getStudentClasses() {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      collection(db, "studentEnrollments", uid, "classes")
    );
    return snap.docs
      .map(d => d.data())
      .sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0));
  } catch (err) {
    console.error("getStudentClasses failed:", err);
    return [];
  }
}

// ── Missions ──────────────────────────────────────────────────────────────────

export async function addMissionToClass(classId, { title, description, pdfTitle, pdfText }) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db)
    throw new Error("חיבור לפיירבייס נדרש");

  const missionId = `mission_${Date.now()}`;
  const mission   = {
    id:          missionId,
    title:       title.trim(),
    description: (description ?? "").trim(),
    classId,
    lecturerUid: uid,
    createdAt:   Date.now(),
    // Lecturer PDF — optional, used as base document in student chat
    ...(pdfTitle ? { pdfTitle } : {}),
    ...(pdfText  ? { pdfText  } : {}),
  };
  await setDoc(doc(db, "classes", classId, "missions", missionId), mission);
  return mission;
}

export async function getClassMissions(classId) {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, "classes", classId, "missions"));
    return snap.docs
      .map(d => d.data())
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  } catch (err) {
    console.error("getClassMissions failed:", err);
    return [];
  }
}

export async function deleteMission(classId, missionId) {
  if (!isFirebaseConfigured || !db) return;
  try {
    await deleteDoc(doc(db, "classes", classId, "missions", missionId));
  } catch (err) {
    console.error("deleteMission failed:", err);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// MISSION SUBMISSIONS — class work visible to lecturer
// Path: classes/{classId}/missions/{missionId}/submissions/{uid}
//       classes/{classId}/missions/{missionId}/submissions/{uid}/messages/{msgId}
// ════════════════════════════════════════════════════════════════════════════

// Save / update a student's submission record for a mission
export async function saveMissionSubmission(classId, missionId, data) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) return;
  try {
    await setDoc(
      doc(db, "classes", classId, "missions", missionId, "submissions", uid),
      { uid, email: auth.currentUser.email ?? "", ...data, updatedAt: Date.now() },
      { merge: true }
    );
  } catch (err) {
    console.error("saveMissionSubmission failed:", err);
  }
}

// Get current student's own submission for a mission
export async function getMyMissionSubmission(classId, missionId) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) return null;
  try {
    const snap = await getDoc(
      doc(db, "classes", classId, "missions", missionId, "submissions", uid)
    );
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

// Append a message to the mission chat
export async function appendMissionMessage(classId, missionId, message) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) return;
  try {
    await setDoc(
      doc(db, "classes", classId, "missions", missionId, "submissions", uid, "messages", message.id),
      message
    );
  } catch (err) {
    console.error("appendMissionMessage failed:", err);
  }
}

// Get current student's mission messages
export async function getMissionMessages(classId, missionId) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      collection(db, "classes", classId, "missions", missionId, "submissions", uid, "messages")
    );
    return snap.docs.map(d => d.data()).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  } catch { return []; }
}

// Lecturer: get all submissions for a mission
export async function getAllMissionSubmissions(classId, missionId) {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      collection(db, "classes", classId, "missions", missionId, "submissions")
    );
    return snap.docs.map(d => d.data()).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  } catch { return []; }
}

// Lecturer: get a specific student's messages for a mission
export async function getStudentMissionMessages(classId, missionId, studentUid) {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      collection(db, "classes", classId, "missions", missionId, "submissions", studentUid, "messages")
    );
    return snap.docs.map(d => d.data()).sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  } catch { return []; }
}

// ── Mission grades (permanent — never deleted on redo) ────────────────────────

export async function saveMissionGrade(classId, missionId, gradeData) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) return;

  const gradeEntry = { ...gradeData, gradedAt: Date.now() };

  // Read existing grades array from submission doc
  let existingGrades = [];
  try {
    const snap = await getDoc(doc(db, "classes", classId, "missions", missionId, "submissions", uid));
    if (snap.exists()) existingGrades = snap.data().grades ?? [];
  } catch { /* first submission */ }

  const updatedGrades = [gradeEntry, ...existingGrades].slice(0, 20);

  // Save grade to submission document (grades array — lecturer can always read this)
  await setDoc(
    doc(db, "classes", classId, "missions", missionId, "submissions", uid),
    {
      uid,
      email:         auth.currentUser.email ?? "",
      latestGrade:   gradeData.score,
      lastGradedAt:  Date.now(),
      grades:        updatedGrades,   // ← array of all attempts
      updatedAt:     Date.now(),
    },
    { merge: true }
  );

  // Also save to grades subcollection (belt-and-suspenders)
  try {
    await setDoc(
      doc(db, "classes", classId, "missions", missionId, "submissions", uid, "grades", `grade_${Date.now()}`),
      { ...gradeEntry, uid }
    );
  } catch (err) {
    console.error("grades subcollection write failed (non-critical):", err);
  }
}

// Student: get own grade history for a mission
export async function getMyMissionGrades(classId, missionId) {
  const uid = auth?.currentUser?.uid;
  if (!uid || !isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(
      collection(db, "classes", classId, "missions", missionId, "submissions", uid, "grades")
    );
    return snap.docs.map(d => d.data()).sort((a, b) => (b.gradedAt ?? 0) - (a.gradedAt ?? 0));
  } catch { return []; }
}

// Lecturer: get a student's grade history for a mission
export async function getStudentMissionGrades(classId, missionId, studentUid) {
  if (!isFirebaseConfigured || !db) return [];
  try {
    // Read from submission doc (reliable — lecturer already has read permission here)
    const snap = await getDoc(
      doc(db, "classes", classId, "missions", missionId, "submissions", studentUid)
    );
    if (snap.exists() && snap.data().grades?.length) {
      return [...snap.data().grades].sort((a, b) => (b.gradedAt ?? 0) - (a.gradedAt ?? 0));
    }
    return [];
  } catch (err) {
    console.error("getStudentMissionGrades failed:", err);
    return [];
  }
}