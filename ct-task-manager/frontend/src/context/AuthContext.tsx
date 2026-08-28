import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User, tokenStorage } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.getToken());
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (token) {
        const response = await api.getCurrentUser();
        if (response.success) {
          setCurrentUser(response.data.user);
        } else {
          logout();
        }
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (credentials: any) => {
    const response = await api.login(credentials);
    if (response.success) {
      const newToken = response.data.token;
      tokenStorage.setToken(newToken);
      setToken(newToken);
      setCurrentUser(response.data.user);
    }
  };

  const logout = () => {
    tokenStorage.clearToken();
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: !!currentUser,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
