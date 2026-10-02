import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { mensagemDeErro } from './supabase';

/**
 * Carrega dados sempre que a tela ganha foco (assim, ao voltar de uma edição,
 * a lista já aparece atualizada).
 */
export function useDados<T>(carregar: () => Promise<T>) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const fn = useRef(carregar);
  useEffect(() => {
    fn.current = carregar;
  });

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      setDados(await fn.current());
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar])
  );

  return { dados, setDados, erro, carregando, recarregar };
}
