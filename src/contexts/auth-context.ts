import { createContext } from "react";
import type { User } from "../types/domain";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: "operator" | "reviewer" | "buyer";
  organizationName?: string;
  region?: string;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
