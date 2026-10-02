import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Esforco } from './tipos';

/** Treino em andamento, guardado no aparelho para não se perder se o app fechar. */
export type TreinoEmAndamento = {
  divisaoId: string;
  iniciadoEm: string;
  indice: number;
  series: { reps: string; carga: string; feita: boolean }[][];
  esforco: Esforco;
  comentario: string;
};

const chave = (alunoId: string) => `treino-em-andamento:${alunoId}`;

export async function lerTreino(alunoId: string): Promise<TreinoEmAndamento | null> {
  try {
    const t = await AsyncStorage.getItem(chave(alunoId));
    return t ? (JSON.parse(t) as TreinoEmAndamento) : null;
  } catch {
    return null;
  }
}

export async function guardarTreino(alunoId: string, t: TreinoEmAndamento) {
  try {
    await AsyncStorage.setItem(chave(alunoId), JSON.stringify(t));
  } catch {
    // Sem espaço ou sem armazenamento: o treino continua na memória.
  }
}

export async function apagarTreino(alunoId: string) {
  try {
    await AsyncStorage.removeItem(chave(alunoId));
  } catch {
    // ignora
  }
}
