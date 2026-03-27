import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // Full profile data (name, photoUrl, etc)
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkProfile = async (currentUser) => {
    console.log('Checking profile for user:', currentUser?._id);
    if (!currentUser) {
      setHasProfile(false);
      setProfile(null);
      return;
    }
    try {
      const { data } = await api.get('/profile/me');
      console.log('Profile result:', data ? 'Found' : 'Not Found', data?.name);
      if (data && data.name) {
        setHasProfile(true);
        setProfile(data);
      } else {
        console.warn('Profile exists but missing name field');
        setHasProfile(false);
        setProfile(null);
      }
    } catch (error) {
      console.error('Profile check failed:', error.response?.status, error.message);
      setHasProfile(false);
      setProfile(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const parsedUser = JSON.parse(userInfo);
        setUser(parsedUser);
        await checkProfile(parsedUser);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      await checkProfile(data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const googleLogin = async (tokenId) => {
    try {
      const { data } = await api.post('/auth/google', { tokenId });
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      await checkProfile(data);
      return { success: true, isNew: data.isNew };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Google login failed' 
      };
    }
  };

  const register = async (email, password) => {
    try {
      const { data } = await api.post('/auth/register', { email, password });
      localStorage.setItem('userInfo', JSON.stringify(data));
      setUser(data);
      setHasProfile(false);
      setProfile(null);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('skill-trade-wallpaper');
    localStorage.removeItem('skill-trade-theme');
    localStorage.removeItem('skwap_chat_open');
    localStorage.removeItem('skwap_active_session_id');
    setUser(null);
    setProfile(null);
    setHasProfile(false);
  };

  const value = {
    user,
    profile,
    setProfile,
    hasProfile,
    setHasProfile,
    login,
    register,
    googleLogin,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
