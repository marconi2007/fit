import { randomUUID } from 'expo-crypto';

import { diasAte, fmtCurta, hojeISO, somarDias } from './datas';
import type { Aluno, Divisao, Ficha, Sessao } from './tipos';

export type Tom = 'ok' | 'warn' | 'crit' | 'muted' | 'acc';

/** Situação da ficha do aluno, como aparece nas listas do professor. */
export function situacaoFicha(aluno: Pick<Aluno, 'status'>, ficha: Pick<Ficha, 'validade'> | null | undefined): { tom: Tom; texto: string } {
  if (aluno.status === 'arquivado') return { tom: 'muted', texto: 'Arquivado' };
  if (!ficha) return { tom: 'crit', texto: 'Sem ficha' };
  if (!ficha.validade) return { tom: 'ok', texto: 'Ficha ativa' };
  const d = diasAte(ficha.validade);
  if (d < 0) return { tom: 'crit', texto: 'Ficha vencida' };
  if (d === 0) return { tom: 'warn', texto: 'Vence hoje' };
  if (d === 1) return { tom: 'warn', texto: 'Vence amanhã' };
  if (d <= 7) return { tom: 'warn', texto: `Vence em ${d} dias` };
  return { tom: 'ok', texto: `Válida até ${fmtCurta(ficha.validade)}` };
}

export function precisaAtencao(ficha: Pick<Ficha, 'validade'> | null | undefined): boolean {
  return !ficha || (!!ficha.validade && diasAte(ficha.validade) <= 7);
}

/** Próxima divisão pela sequência: a seguinte à do último treino feito. */
export function divisaoSugerida(ficha: Ficha, sessoes: Sessao[]): number {
  if (!ficha.divisoes.length) return 0;
  const ultima = sessoes.find((s) => ficha.divisoes.some((d) => d.id === s.divisao_id));
  if (!ultima) return 0;
  const i = ficha.divisoes.findIndex((d) => d.id === ultima.divisao_id);
  return (i + 1) % ficha.divisoes.length;
}

export function ordenarFicha<T extends Ficha>(ficha: T): T {
  return {
    ...ficha,
    divisoes: [...(ficha.divisoes ?? [])]
      .sort((a, b) => a.ordem - b.ordem)
      .map((d) => ({ ...d, itens_treino: [...(d.itens_treino ?? [])].sort((a, b) => a.ordem - b.ordem) })),
  };
}

/** Tempo estimado de um treino, em minutos (arredondado de 5 em 5). */
export function minutosEstimados(d: Divisao): number {
  const seg = d.itens_treino.reduce((t, it) => t + (it.series || 1) * (45 + (it.descanso_seg || 0)), 0);
  return Math.max(15, Math.round(seg / 60 / 5) * 5);
}

export const ehTempo = (repeticoes: string) => /\d\s*(s|seg|min)\b/i.test(repeticoes);

export function fmtKg(carga: number | null | undefined): string {
  if (carga == null || Number(carga) === 0) return 'peso corporal';
  return `${String(Number(carga)).replace('.', ',')} kg`;
}

export const fmtNum = (n: number | string) => String(n).replace('.', ',');

export function iniciais(nome: string): string {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export const primeiroNome = (nome: string) => nome.split(' ')[0];

/** Ficha nova em branco para um aluno (validade padrão de 6 semanas). */
export function fichaEmBranco(alunoId: string | null): Ficha {
  const hoje = hojeISO();
  return {
    id: randomUUID(),
    aluno_id: alunoId,
    nome: alunoId ? 'Nova ficha' : 'Novo modelo',
    data_inicio: alunoId ? hoje : null,
    validade: alunoId ? somarDias(hoje, 42) : null,
    ativa: false,
    eh_modelo: !alunoId,
    criada_a_partir_de: null,
    divisoes: [{ id: randomUUID(), nome: 'A', foco: '', ordem: 0, itens_treino: [] }],
  };
}

/**
 * Copia uma ficha com ids novos (para aplicar um modelo, criar uma ficha a
 * partir de outra ou salvar como modelo). A original não muda.
 */
export function copiarFicha(origem: Ficha, destino: { alunoId: string | null; nome?: string }): Ficha {
  const hoje = hojeISO();
  return {
    id: randomUUID(),
    aluno_id: destino.alunoId,
    nome: destino.nome ?? origem.nome,
    data_inicio: destino.alunoId ? hoje : null,
    validade: destino.alunoId ? somarDias(hoje, 42) : null,
    ativa: false,
    eh_modelo: !destino.alunoId,
    criada_a_partir_de: origem.id,
    divisoes: origem.divisoes.map((d, i) => ({
      id: randomUUID(),
      nome: d.nome,
      foco: d.foco,
      ordem: i,
      itens_treino: d.itens_treino.map((it, j) => ({ ...it, id: randomUUID(), divisao_id: undefined, ordem: j })),
    })),
  };
}

/** Próxima letra livre para uma divisão nova (A, B, C...). */
export function proximaLetra(divisoes: { nome: string }[]): string {
  for (let i = 0; i < 26; i++) {
    const l = String.fromCharCode(65 + i);
    if (!divisoes.some((d) => d.nome === l)) return l;
  }
  return String(divisoes.length + 1);
}

/** Maior carga por exercício em cada sessão, da mais antiga para a mais recente. */
export function evolucaoCarga(sessoes: Sessao[], exercicioId: string): { data: string; carga: number }[] {
  return [...sessoes]
    .sort((a, b) => a.finalizada_em.localeCompare(b.finalizada_em))
    .map((s) => {
      const cargas = (s.series_realizadas ?? []).filter((x) => x.exercicio_id === exercicioId && x.feita).map((x) => Number(x.carga_kg) || 0);
      return cargas.length ? { data: s.finalizada_em, carga: Math.max(...cargas) } : null;
    })
    .filter((x): x is { data: string; carga: number } => x !== null);
}

/** Melhor série do exercício no último treino em que ele apareceu. */
export function ultimoDesempenho(sessoes: Sessao[], exercicioId: string) {
  for (const s of sessoes) {
    const series = (s.series_realizadas ?? []).filter((x) => x.exercicio_id === exercicioId && x.feita);
    if (series.length) {
      const melhor = series.reduce((m, x) => (Number(x.carga_kg) > Number(m.carga_kg) ? x : m), series[0]);
      return { data: s.finalizada_em, carga: melhor.carga_kg, repeticoes: melhor.repeticoes_feitas };
    }
  }
  return null;
}

/** Link do WhatsApp com a mensagem pronta (com o número, se for um telefone). */
export function linkWhatsApp(mensagem: string, contato?: string | null): string {
  let numero = (contato ?? '').replace(/\D/g, '');
  if (numero.length === 10 || numero.length === 11) numero = '55' + numero;
  const base = numero.length >= 12 ? `https://wa.me/${numero}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(mensagem)}`;
}
