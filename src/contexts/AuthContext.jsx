import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { fetchVipStatus } from '../gemini';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Quem é VIP é decidido pelo servidor (/api/me). A lista de emails não vem
  // para o navegador, então ela não aparece no JavaScript público do site.
  const [isVip, setIsVip] = useState(false);

  const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
  };

  const logout = () => {
    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setIsVip(false);
      return;
    }
    let active = true;
    fetchVipStatus().then(vip => {
      if (active) setIsVip(vip);
    });
    return () => { active = false; };
  }, [currentUser]);

  const value = {
    currentUser,
    isVip,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
