import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, cartAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    
    // Merge guest cart with user cart
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
      try {
        await cartAPI.merge(sessionId);
        localStorage.removeItem('sessionId');
      } catch (err) {
        console.error('Cart merge failed:', err);
      }
    }
    
    return user;
  };

  const register = async (name, email, password, phone) => {
    const response = await authAPI.register({ name, email, password, phone });
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedFields) => {
    const updatedUser = { ...user, ...updatedFields };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
    isAdmin: !!user?.is_admin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
