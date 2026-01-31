import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const MOCK_USERS: { email: string; password: string; user: User }[] = [
  {
    email: 'pastor@church.com',
    password: 'pastor123',
    user: {
      id: '1',
      email: 'pastor@church.com',
      name: 'Rev. John Mensah',
      role: 'pastor',
    },
  },
  {
    email: 'admin@church.com',
    password: 'admin123',
    user: {
      id: '2',
      email: 'admin@church.com',
      name: 'Grace Owusu',
      role: 'admin',
    },
  },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth
    const storedUser = localStorage.getItem('cms_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('cms_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const matchedUser = MOCK_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (matchedUser) {
      setUser(matchedUser.user);
      localStorage.setItem('cms_user', JSON.stringify(matchedUser.user));
      
      // Log audit trail
      const auditLog = {
        id: Date.now().toString(),
        userId: matchedUser.user.id,
        userName: matchedUser.user.name,
        userRole: matchedUser.user.role,
        action: 'login',
        resourceType: 'auth',
        details: `User logged in: ${matchedUser.user.email}`,
        timestamp: new Date().toISOString(),
      };
      
      const logs = JSON.parse(localStorage.getItem('cms_audit_logs') || '[]');
      logs.push(auditLog);
      localStorage.setItem('cms_audit_logs', JSON.stringify(logs));

      return { success: true };
    }

    return { success: false, error: 'Invalid email or password' };
  };

  const logout = () => {
    if (user) {
      // Log audit trail
      const auditLog = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'logout',
        resourceType: 'auth',
        details: `User logged out: ${user.email}`,
        timestamp: new Date().toISOString(),
      };
      
      const logs = JSON.parse(localStorage.getItem('cms_audit_logs') || '[]');
      logs.push(auditLog);
      localStorage.setItem('cms_audit_logs', JSON.stringify(logs));
    }

    setUser(null);
    localStorage.removeItem('cms_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        isLoading,
      }}
    >
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
