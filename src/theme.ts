import { useColorScheme, useWindowDimensions } from 'react-native';

const claro = {
  fundo: '#e9ecf3',
  superficie: '#ffffff',
  superficie2: '#f4f6fa',
  texto: '#121827',
  suave: '#5b6478',
  linha: '#dce1ea',
  destaque: '#2347d4',
  sobreDestaque: '#ffffff',
  destaqueSuave: '#e2e8fd',
  ok: '#1c7f47',
  okSuave: '#dcf1e4',
  aviso: '#9a5b00',
  avisoSuave: '#fbecd2',
  critico: '#b8322a',
  criticoSuave: '#fadfdc',
  escurecer: 'rgba(14,18,30,0.45)',
};

const escuro: typeof claro = {
  fundo: '#0c0f16',
  superficie: '#161a24',
  superficie2: '#10141c',
  texto: '#e7eaf2',
  suave: '#98a1b5',
  linha: '#283044',
  destaque: '#7d95ff',
  sobreDestaque: '#0b1030',
  destaqueSuave: '#1f2a55',
  ok: '#5fcf8e',
  okSuave: '#173527',
  aviso: '#f0b357',
  avisoSuave: '#3a2a10',
  critico: '#ff8a7f',
  criticoSuave: '#3d1b19',
  escurecer: 'rgba(0,0,0,0.6)',
};

export type Cores = typeof claro;

export function useCores(): Cores {
  return useColorScheme() === 'dark' ? escuro : claro;
}

/** Tela larga (computador ou tablet deitado): menu lateral e painéis lado a lado. */
export const LARGURA_COMPUTADOR = 900;

export function useTelaLarga(): boolean {
  return useWindowDimensions().width >= LARGURA_COMPUTADOR;
}
