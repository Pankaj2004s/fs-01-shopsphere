import { useEffect, useState } from "react";
import { AuthContext } from "./authContext";
import { getMe } from "../api/auth";

const TOKEN_KEY = "shopsphere_token";

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem(TOKEN_KEY)),
  );

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function restoreUser() {
      try {
        const data = await getMe(token);
        if (!cancelled) setUser(data.user);
      } catch (err) {
        if (!cancelled && err.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restoreUser();

    return () => {
      cancelled = true;
    };
  }, [token]);

  function login(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  function updateUser(nextUser) {
    setUser(nextUser);
  }

  const value = { user, token, loading, login, logout, updateUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
