import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, unwrap } from '../api/client';
import { AppUser } from '../api/types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  bootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          const me = await unwrap<AppUser>(await api.get('/api/v1/customers/me'));
          setUser(me);
        }
      } catch {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await unwrap<any>(
        await api.post('/api/v1/auth/login', { email, password })
      );
      await AsyncStorage.setItem('access_token', data.access_token);
      await AsyncStorage.setItem('refresh_token', data.refresh_token);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    setUser(null);
    api.post('/api/v1/auth/logout').catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, bootstrapping, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
