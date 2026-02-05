import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'admin_session';

// Load saved user from localStorage
function loadSavedUser(): User | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const user = JSON.parse(saved);
    if (user?.id && user?.email && user?.name && user?.role) {
      return user;
    }
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSavedUser);
  const loginMutation = useMutation(api.auth.login);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await loginMutation({ email, password });
      if (result) {
        const userData: User = {
          id: result.id,
          email: result.email,
          name: result.name,
          role: result.role,
        };
        setUser(userData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [loginMutation]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
