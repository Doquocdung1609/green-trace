import React from "react";
import { createContext, useState, useEffect, type ReactNode } from "react";

interface AuthContextType {
  user: any | null;
  role: "farmer" | "customer" | null;
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
  const [role, setRole] = useState<"farmer" | "customer" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setRole(parsed.role);
    }
    setLoading(false);
  }, []);

  const logout = async () => {
    try {
      await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
      });
      localStorage.removeItem("currentUser");
      setUser(null);
      setRole(null);
      window.location.href = "/login";
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook tùy chỉnh để sử dụng AuthContext
export const useAuth = () => {
  return React.useContext(AuthContext);
};