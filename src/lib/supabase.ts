import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const chave = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Falso enquanto o arquivo .env não tiver os dados do projeto Supabase. */
export const supabaseConfigurado = url.startsWith('http') && chave.length > 20;

export const supabase = createClient(
  supabaseConfigurado ? url : 'http://localhost:54321',
  supabaseConfigurado ? chave : 'chave-nao-configurada',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);

// No celular, renova o login só enquanto o app está aberto.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Traduz os erros mais comuns do Supabase para mensagens em português. */
export function mensagemDeErro(erro: unknown): string {
  const msg = erro instanceof Error ? erro.message : typeof erro === 'object' && erro && 'message' in erro ? String((erro as { message: unknown }).message) : String(erro);
  const mapa: [RegExp, string][] = [
    [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/Email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
    [/User already registered/i, 'Já existe uma conta com este e-mail. Tente entrar.'],
    [/Password should be at least/i, 'A senha precisa ter pelo menos 6 caracteres.'],
    [/Unable to validate email address|invalid format/i, 'Confira o e-mail digitado.'],
    [/Failed to fetch|Network request failed/i, 'Sem conexão com o servidor. Confira a internet e tente de novo.'],
    [/rate limit/i, 'Muitas tentativas seguidas. Espere um pouco e tente de novo.'],
    [/Database error saving new user/i, 'Não foi possível usar este convite. Peça um novo link ao seu professor.'],
  ];
  for (const [re, texto] of mapa) if (re.test(msg)) return texto;
  return msg || 'Algo deu errado. Tente de novo.';
}
