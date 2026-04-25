// Authored by James Williams in collaboration with Claude
import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "casevault_token";
const USER_KEY    = "casevault_user";
const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser]   = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [timedOut, setTimedOut] = useState(false);

  const inactivityTimer = useRef(null);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setTimedOut(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    clearTimeout(inactivityTimer.current);
  }, []);

  // ── Inactivity timeout — same as logout but flags the reason ─────────────
  const logoutDueToInactivity = useCallback(() => {
    setToken(null);
    setUser(null);
    setTimedOut(true);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    clearTimeout(inactivityTimer.current);
  }, []);

  const clearTimedOut = useCallback(() => setTimedOut(false), []);

  // ── Reset the 30-min inactivity clock ────────────────────────────────────
  const resetTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(logoutDueToInactivity, INACTIVITY_MS);
  }, [logoutDueToInactivity]);

  // ── Attach / detach activity listeners while logged in ───────────────────
  useEffect(() => {
    if (!token) return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start the clock immediately on login

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      clearTimeout(inactivityTimer.current);
    };
  }, [token, resetTimer]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback((newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem(STORAGE_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, timedOut, clearTimedOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}