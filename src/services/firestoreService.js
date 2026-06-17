import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { signInWithEmailAndPassword } from "firebase/auth";

import { db, auth } from "./firebase";

const chatHistoryCollection = collection(db, "chatHistory");

export async function authenticateUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );

  return userCredential.user;
}

export function saveChatMessage(message) {
  return addDoc(chatHistoryCollection, {
    ...message,
    createdAt: serverTimestamp(),
  });
}

export async function getChatMessages() {
  const chatHistoryQuery = query(
    chatHistoryCollection,
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(chatHistoryQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}