import { useEffect, useState } from "react";

import {
  getAuthErrorMessage,
  loginUser,
  logoutUser,
  registerUser,
  subscribeToAuthChanges,
} from "./authService";

function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  // Keeps the user logged in across page refreshes by listening to Firebase
  // directly, instead of relying on a plain useState boolean.
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    setAuthError("");
    setAuthLoading(true);

    try {
      const loggedInUser = await loginUser(email, password);
      setUser(loggedInUser);
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async (email, password) => {
    setAuthError("");
    setAuthLoading(true);

    try {
      const newUser = await registerUser(email, password);
      setUser(newUser);
      return true;
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
      return false;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return {
    user,
    isLoggedIn: Boolean(user),
    authLoading,
    authError,
    login,
    register,
    logout,
  };
}

export default useAuth;
