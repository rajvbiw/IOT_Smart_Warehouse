import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'warehouse_manager' | 'operator' | 'viewer';
  warehouse_id: number | null;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        try {
          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          setUser(response.data);
          setToken(storedToken);
        } catch (err) {
          console.error('Failed to validate token on load:', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    fetchUser();
  }, []);

  const login = (accessToken: string, refreshToken: string, userData: User) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setToken(accessToken);
    setUser(userData);
  };

  const logout = async () => {
    const rt = localStorage.getItem('refreshToken');
    try {
      if (rt) {
        await axios.post('/api/auth/logout', { refreshToken: rt });
      }
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isLoading }}>
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
export default AuthContext;
