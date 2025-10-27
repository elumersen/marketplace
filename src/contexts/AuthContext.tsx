import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, tokenManager, getErrorMessage } from '@/lib/api';
import type { User } from '@/types/api.types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = tokenManager.getToken();
      
      if (token) {
        try {
          const response = await authAPI.getProfile();
          setUser(response.user);
        } catch (err) {
          tokenManager.removeToken();
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      // Call login API
      const response = await authAPI.login(email, password);
      
      // Store token
      tokenManager.setToken(response.token);
      
      // Store user in state
      setUser(response.user);
      
      // Optionally store user in localStorage for persistence
      localStorage.setItem('user', JSON.stringify(response.user));
      
      return true;
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      console.error('Login error:', errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear token
    tokenManager.removeToken();
    
    // Clear user state
    setUser(null);
    
    // Clear localStorage
    localStorage.removeItem('user');
    
    // Clear any errors
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
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