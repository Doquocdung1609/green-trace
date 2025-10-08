// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, type ReactNode } from 'react';

interface AuthContextType {
  user: any | null;
  role: 'admin' | 'farmer' | 'customer' | null;
  setUser: (user: any | null) => void;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  setUser: () => {},
  logout: () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<'admin' | 'farmer' | 'customer' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setRole(parsed.role);
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    setRole(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, role, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
