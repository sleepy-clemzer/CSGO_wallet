import { useState, useEffect, useCallback } from "react";

const PROXY = import.meta.env.VITE_STEAM_PROXY_URL || "http://localhost:3001";

export interface SteamUser {
  steamId:     string;
  displayName: string;
  avatar:      string | null;
  profileUrl:  string | null;
}

interface AuthState {
  user:          SteamUser | null;
  authenticated: boolean;
  loading:       boolean;
}

interface UseAuthReturn extends AuthState {
  login:   () => void;
  logout:  () => void;
  refetch: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user:          null,
    authenticated: false,
    loading:       true,
  });

  const fetchMe = useCallback(async () => {
    try {
      const r = await fetch(`${PROXY}/api/me`, { credentials: "include" });
      const d = await r.json();
      setState({
        authenticated: d.authenticated,
        user:          d.user || null,
        loading:       false,
      });
    } catch {
      setState({ authenticated: false, user: null, loading: false });
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const login  = () => { window.location.href = `${PROXY}/auth/steam`; };
  const logout = () => { window.location.href = `${PROXY}/auth/logout`; };

  return { ...state, login, logout, refetch: fetchMe };
}