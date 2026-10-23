import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { fetchVipStatus } from '../gemini';
import { confirmIdentity, deleteEverything, clearLocalUserData } from '../services/account';

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
  // Exclusão de conta em andamento. Fica aqui, e não na tela de Perfil, porque
  // este componente nunca sai da tela: o App usa este estado para desligar a
  // sincronização com o Firestore enquanto os dados são apagados.
  // null | { status: 'running', step } | { status: 'error', code, stage, options }
  const [deletion, setDeletion] = useState(null);

  const loginWithGoogle = () => {
    return signInWithPopup(auth, googleProvider);
  };

  const logout = async () => {
    // O token da agenda e o rascunho da Memória RAM não podem passar para a
    // próxima pessoa que entrar neste aparelho
    clearLocalUserData();
    await signOut(auth);
  };

  // Chamar DIRETO do toque (sem await antes): o popup do Google só abre a
  // partir de um gesto do usuário.
  const deleteAccount = async (options = {}) => {
    const withCalendar = !!options.deleteCalendarEvents;
    let accessToken;
    try {
      accessToken = await confirmIdentity({ withCalendar });
    } catch (e) {
      // Nesta tentativa nada foi apagado. Se ela veio do "Tentar de novo" da
      // tela de erro, a tela continua dizendo o que já tinha sido apagado antes.
      setDeletion(prev => (prev ? { ...prev, status: 'error', code: e.code || '' } : prev));
      return { ok: false, code: e.code, stage: 'antes' };
    }
    setDeletion({ status: 'running', step: 'Preparando…' });
    // Um instante para o App desligar os listeners do Firestore antes de apagar
    await new Promise(resolve => setTimeout(resolve, 50));
    try {
      await deleteEverything({
        accessToken,
        deleteCalendarEvents: withCalendar,
        onStep: step => setDeletion({ status: 'running', step }),
      });
      // Recarrega do zero: nada do usuário excluído fica na memória da página
      window.location.replace('/?conta-excluida=1');
      return { ok: true };
    } catch (e) {
      console.error('Falha ao excluir a conta', e);
      setDeletion({ status: 'error', code: e.code || '', stage: e.stage || 'antes', options });
      return { ok: false, code: e.code, stage: e.stage };
    }
  };

  const cancelDeletion = () => setDeletion(null);

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
    logout,
    deletion,
    deleteAccount,
    cancelDeletion,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
