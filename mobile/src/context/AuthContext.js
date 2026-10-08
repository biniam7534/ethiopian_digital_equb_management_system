import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '../api/auth';
import i18n from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem('equb_token');
        if (storedToken) {
          setToken(storedToken);
          const me = await authApi.fetchMe();
          setUser(me);
          if (me.language) await i18n.changeLanguage(me.language);
        }
      } catch {
        await AsyncStorage.multiRemove(['equb_token', 'equb_user']);
        setToken(null);
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const persistSession = async (nextUser, nextToken) => {
    await AsyncStorage.setItem('equb_token', nextToken);
    await AsyncStorage.setItem('equb_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    if (nextUser.language) await i18n.changeLanguage(nextUser.language);
  };

  const login = useCallback(async (phone, password) => {
    const result = await authApi.login(phone, password);
    await persistSession(result.user, result.token);
    return result.user;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await authApi.register(payload);
    await persistSession(result.user, result.token);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.multiRemove(['equb_token', 'equb_user']);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.fetchMe();
    setUser(me);
    await AsyncStorage.setItem('equb_user', JSON.stringify(me));
    return me;
  }, []);

  const value = useMemo(
    () => ({ user, token, booting, login, register, logout, refreshUser, isAuthenticated: !!token }),
    [user, token, booting, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
