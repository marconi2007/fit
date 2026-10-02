import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { carregarPerfil, type Perfil } from './api';
import { mensagemDeErro, supabase, supabaseConfigurado } from './supabase';

type Auth = {
  carregando: boolean;
  sessao: Session | null;
  perfil: Perfil | null;
  erro: string | null;
  recarregarPerfil: () => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(supabaseConfigurado);
  const [erro, setErro] = useState<string | null>(null);

  const buscarPerfil = useCallback(async (s: Session | null) => {
    if (!s) {
      setPerfil(null);
      return;
    }
    try {
      setErro(null);
      setPerfil(await carregarPerfil(s.user.id));
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado) return;
    let ativo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      await buscarPerfil(data.session);
      if (ativo) setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'INITIAL_SESSION' || evento === 'TOKEN_REFRESHED') {
        setSessao(s);
        return;
      }
      setSessao(s);
      // Fora do callback, para não travar o cliente do Supabase.
      setTimeout(async () => {
        setCarregando(true);
        await buscarPerfil(s);
        setCarregando(false);
      }, 0);
    });
    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, [buscarPerfil]);

  const recarregarPerfil = useCallback(() => buscarPerfil(sessao), [buscarPerfil, sessao]);
  const sair = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ carregando, sessao, perfil, erro, recarregarPerfil, sair }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}

export function useProfessor() {
  const { perfil } = useAuth();
  if (perfil?.tipo !== 'professor') throw new Error('Tela de professor sem professor logado');
  return perfil.professor;
}

export function useAlunoLogado() {
  const { perfil } = useAuth();
  if (perfil?.tipo !== 'aluno') throw new Error('Tela de aluno sem aluno logado');
  return perfil;
}
