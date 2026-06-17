import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth, isFirebaseConfigured } from "../../lib/firebase";

// Used only while Firebase hasn't been configured yet, so the rest of the
// app (chat, compare, history) can still be clicked through and tested.
// Remove this once real Firebase values are in .env — loginUser/registerUser
// will then go through real auth automatically.
const DEMO_USER = {
  uid: "demo-user",
  email: "demo@pdfbrain.local",
  displayName: "משתמש הדגמה",
};

export async function loginUser(email, password) {
  if (!isFirebaseConfigured) {
    return DEMO_USER;
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function registerUser(email, password) {
  if (!isFirebaseConfigured) {
    return DEMO_USER;
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logoutUser() {
  if (!isFirebaseConfigured) {
    return;
  }

  await signOut(auth);
}

export function subscribeToAuthChanges(callback) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, callback);
}

export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-email":
      return "כתובת האימייל אינה תקינה.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "אימייל או סיסמה שגויים.";
    case "auth/wrong-password":
      return "אימייל או סיסמה שגויים.";
    case "auth/email-already-in-use":
      return "כתובת האימייל הזו כבר רשומה במערכת.";
    case "auth/weak-password":
      return "הסיסמה חייבת להיות באורך 6 תווים לפחות.";
    case "auth/too-many-requests":
      return "יותר מדי ניסיונות התחברות. נסה שוב מאוחר יותר.";
    default:
      return "משהו השתבש. נסה שוב.";
  }
}