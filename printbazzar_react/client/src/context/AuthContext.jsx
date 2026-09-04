import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only attempt profile fetch if admin token is present to eliminate unnecessary 401s and network delay
    if (localStorage.getItem('pb_admin_token')) {
      api
        .getAdminProfile()
        .then((res) => {
          if (res.success && res.user) {
            setAdminUser(res.user);
          } else {
            setAdminUser(null);
            localStorage.removeItem('pb_admin_token');
          }
        })
        .catch(() => {
          setAdminUser(null);
          localStorage.removeItem('pb_admin_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await api.adminLogin({ email, password });
    if (res.success) {
      // Cookies are automatically set by server; store token temporarily for transition fallback
      if (res.token) localStorage.setItem('pb_admin_token', res.token);
      setAdminUser(res.user);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = async () => {
    try {
      await api.adminLogout();
    } catch (e) {
      // ignore network errors on logout
    }
    localStorage.removeItem('pb_admin_token');
    setAdminUser(null);
  };

  const hasPermission = (permCode) => {
    if (!adminUser) return false;
    if (adminUser.role === 'Super Admin') return true;
    return adminUser.permissions?.includes(permCode);
  };

  return (
    <AuthContext.Provider
      value={{
        adminUser,
        isAuthenticated: !!adminUser,
        loading,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
