import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase.js";
import { getMe } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [account, setAccount] = useState(null); // { id, email, username, phone, full_name }
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  const refresh = useCallback(async () => {
    if (!auth.currentUser) {
      setAccount(null);
      setRole(null);
      setProfile(null);
      setSyncError(null);
      return null;
    }
    try {
      const me = await getMe();
      setAccount(me.user);
      setRole(me.role);
      setProfile(me.profile);
      setSyncError(null);
      return me;
    } catch (error) {
      const status = error?.response?.status;
      // Only a genuine 401 (Firebase rejected the token: signed out, revoked, expired
      // beyond refresh) means "this person isn't authenticated" — clear their role so
      // routing sends them to log in again. Anything else (backend down, a network
      // blip, the transient 503 the backend now returns when token verification itself
      // couldn't run) is not proof the account is unregistered, so their last-known
      // role/profile is kept and the failure is surfaced instead of silently bouncing
      // an already-registered user back into the registration flow.
      if (status === 401) {
        setAccount(null);
        setRole(null);
        setProfile(null);
        setSyncError(null);
      } else {
        setSyncError(error);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await refresh();
      } else {
        setAccount(null);
        setRole(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [refresh]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setAccount(null);
    setRole(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, account, role, profile, loading, syncError, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
