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

  const inactivityTimer = useRef(null);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    clearTimeout(inactivityTimer.current);
  }, []);

  // ── Reset the 30-min inactivity clock ────────────────────────────────────
  const resetTimer = useCallback(() => {
    clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(logout, INACTIVITY_MS);
  }, [logout]);

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
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}