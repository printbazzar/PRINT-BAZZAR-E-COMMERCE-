import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const CustomerAuthContext = createContext();

export function CustomerAuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pb_customer_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt profile fetch via secure HttpOnly cookie (or fallback token)
    fetchCustomerProfile();
  }, []);

  const fetchCustomerProfile = async () => {
    try {
      const res = await api.getCustomerProfile();
      if (res.success && res.data) {
        setCustomer(res.data.customer);
      } else {
        setCustomer(null);
        setToken(null);
        localStorage.removeItem('pb_customer_token');
      }
    } catch (err) {
      setCustomer(null);
      setToken(null);
      localStorage.removeItem('pb_customer_token');
    } finally {
      setLoading(false);
    }
  };

  const loginCustomer = async (identifier, password) => {
    const res = await api.customerLogin({ identifier, password });
    if (res.success) {
      if (res.token) {
        localStorage.setItem('pb_customer_token', res.token);
        setToken(res.token);
      }
      setCustomer(res.customer);
      return res;
    }
    throw new Error(res.message || 'Login failed');
  };

  const signupCustomer = async (formData) => {
    const res = await api.customerSignup(formData);
    if (res.success) {
      if (res.token) {
        localStorage.setItem('pb_customer_token', res.token);
        setToken(res.token);
      }
      setCustomer(res.customer);
      return res;
    }
    throw new Error(res.message || 'Signup failed');
  };

  const logoutCustomer = async () => {
    try {
      await api.customerLogout();
    } catch (e) {
      // ignore network errors on logout
    }
    localStorage.removeItem('pb_customer_token');
    setToken(null);
    setCustomer(null);
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        loading,
        isAuthenticated: !!customer,
        isCorporate: customer?.accountType === 'B2B_CORPORATE',
        loginCustomer,
        signupCustomer,
        logoutCustomer,
        refreshProfile: fetchCustomerProfile,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}
