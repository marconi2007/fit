import * as Linking from 'expo-linking';

import { ordenarFicha } from './regras';
import { supabase } from './supabase';
import type { Aluno, Esforco, Exercicio, Ficha, Professor, Sessao } from './tipos';

function ok<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error;
  return r.data as T;
}

const SELECT_FICHA = '*, divisoes(*, itens_treino(*, exercicios(*)))';

// ------------------------------------------------------------------ perfil

export type Perfil =
  | { tipo: 'professor'; professor: Professor }
  | { tipo: 'aluno'; aluno: Aluno; professorNome: string }
  | { tipo: 'sem_vinculo' };

export async function carregarPerfil(usuarioId: string): Promise<Perfil> {
  const prof = ok(await supabase.from('professores').select('*').eq('id', usuarioId).maybeSingle());
  if (prof) return { tipo: 'professor', professor: prof as Professor };
  const aluno = ok(await supabase.from('alunos').select('*, professores(nome)').eq('usuario_id', usuarioId).maybeSingle()) as
    | (Aluno & { professores: { nome: string } | null })
    | null;
  if (aluno) return { tipo: 'aluno', aluno, professorNome: aluno.professores?.nome ?? 'seu professor' };
  return { tipo: 'sem_vinculo' };
}

export async function atualizarMeuPerfil(nome: string, telefone: string) {
  ok(await supabase.rpc('atualizar_meu_perfil', { p_nome: nome, p_telefone: telefone }));
}

// ------------------------------------------------------------------ alunos

export type AlunoResumo = Aluno & {
  fichaAtiva: Pick<Ficha, 'id' | 'nome' | 'validade'> | null;
  ultimaSessao: Pick<Sessao, 'finalizada_em' | 'divisao_nome'> | null;
};

export async function listarAlunos(): Promise<AlunoResumo[]> {
  const [alunos, sessoes] = await Promise.all([
    supabase.from('alunos').select('*, fichas(id, nome, validade, ativa)').order('nome'),
    supabase.from('sessoes').select('aluno_id, finalizada_em, divisao_nome').order('finalizada_em', { ascending: false }).limit(500),
  ]);
  const ultimas = new Map<string, Pick<Sessao, 'finalizada_em' | 'divisao_nome'>>();
  for (const s of ok(sessoes) as Sessao[]) if (!ultimas.has(s.aluno_id)) ultimas.set(s.aluno_id, s);
  return (ok(alunos) as (Aluno & { fichas: (Ficha & { ativa: boolean })[] })[]).map(({ fichas, ...a }) => ({
    ...a,
    fichaAtiva: fichas.find((f) => f.ativa) ?? null,
    ultimaSessao: ultimas.get(a.id) ?? null,
  }));
}

export async function obterAluno(id: string): Promise<Aluno> {
  return ok(await supabase.from('alunos').select('*').eq('id', id).single()) as Aluno;
}

export type DadosAluno = Pick<Aluno, 'nome' | 'email' | 'telefone' | 'data_nascimento' | 'objetivo' | 'restricoes'>;

export async function salvarAluno(dados: DadosAluno, id?: string): Promise<string> {
  if (id) {
    ok(await supabase.from('alunos').update(dados).eq('id', id));
    return id;
  }
  const novo = ok(await supabase.from('alunos').insert(dados).select('id').single()) as { id: string };
  return novo.id;
}

export async function mudarStatusAluno(id: string, status: Aluno['status']) {
  ok(await supabase.from('alunos').update({ status }).eq('id', id));
}

// ------------------------------------------------------------------ convites

export async function gerarConvite(alunoId: string): Promise<string> {
  return ok(await supabase.rpc('gerar_convite', { p_aluno: alunoId })) as string;
}

export async function convitePendente(alunoId: string): Promise<{ codigo: string; expira_em: string } | null> {
  const r = ok(
    await supabase
      .from('convites')
      .select('codigo, expira_em')
      .eq('aluno_id', alunoId)
      .is('usado_em', null)
      .gt('expira_em', new Date().toISOString())
      .order('criado_em', { ascending: false })
      .limit(1)
  ) as { codigo: string; expira_em: string }[];
  return r[0] ?? null;
}

/** Link que o aluno abre para criar a senha. */
export function linkDoConvite(codigo: string): string {
  const base = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '');
  return base ? `${base}/convite/${codigo}` : Linking.createURL(`/convite/${codigo}`);
}

export async function validarConvite(codigo: string): Promise<{ aluno_nome: string; professor_nome: string } | null> {
  const r = ok(await supabase.rpc('validar_convite', { p_codigo: codigo })) as { aluno_nome: string; professor_nome: string }[];
  return r[0] ?? null;
}

export async function aceitarConvite(codigo: string) {
  ok(await supabase.rpc('aceitar_convite', { p_codigo: codigo }));
}

// ------------------------------------------------------------------ exercícios

export async function listarExercicios(): Promise<Exercicio[]> {
  return ok(await supabase.from('exercicios').select('*').order('nome')) as Exercicio[];
}

export async function criarExercicio(professorId: string, dados: Pick<Exercicio, 'nome' | 'grupo_muscular' | 'equipamento' | 'youtube_url'>): Promise<Exercicio> {
  return ok(await supabase.from('exercicios').insert({ ...dados, professor_id: professorId }).select('*').single()) as Exercicio;
}

// ------------------------------------------------------------------ fichas

export async function obterFicha(id: string): Promise<Ficha> {
  return ordenarFicha(ok(await supabase.from('fichas').select(SELECT_FICHA).eq('id', id).single()) as Ficha);
}

export async function fichaAtivaDoAluno(alunoId: string): Promise<Ficha | null> {
  const f = ok(await supabase.from('fichas').select(SELECT_FICHA).eq('aluno_id', alunoId).eq('ativa', true).maybeSingle()) as Ficha | null;
  return f ? ordenarFicha(f) : null;
}

export async function listarModelos(): Promise<Ficha[]> {
  const l = ok(await supabase.from('fichas').select(SELECT_FICHA).eq('eh_modelo', true).order('nome')) as Ficha[];
  return l.map(ordenarFicha);
}

export async function excluirModelo(id: string) {
  ok(await supabase.from('fichas').delete().eq('id', id).eq('eh_modelo', true));
}

export async function salvarFicha(f: Ficha): Promise<string> {
  const payload = {
    id: f.id,
    aluno_id: f.aluno_id,
    eh_modelo: f.eh_modelo,
    nome: f.nome,
    data_inicio: f.data_inicio,
    validade: f.validade,
    criada_a_partir_de: f.criada_a_partir_de,
    divisoes: f.divisoes.map((d) => ({
      id: d.id,
      nome: d.nome,
      foco: d.foco,
      itens: d.itens_treino.map((it) => ({
        id: it.id,
        exercicio_id: it.exercicio_id,
        series: it.series,
        repeticoes: it.repeticoes,
        carga_kg: it.carga_kg,
        descanso_seg: it.descanso_seg,
        observacao: it.observacao,
      })),
    })),
  };
  return ok(await supabase.rpc('salvar_ficha', { p: payload })) as string;
}

// ------------------------------------------------------------------ sessões

const SELECT_SESSAO = '*, series_realizadas(*, exercicios(nome))';

export async function ultimasSessoes(limite = 8): Promise<Sessao[]> {
  return ok(await supabase.from('sessoes').select('*, alunos(nome)').order('finalizada_em', { ascending: false }).limit(limite)) as Sessao[];
}

export async function contarSessoesDesde(desde: string): Promise<number> {
  const r = await supabase.from('sessoes').select('id', { count: 'exact', head: true }).gte('finalizada_em', desde);
  if (r.error) throw r.error;
  return r.count ?? 0;
}

/** Sessões de um aluno, mais recentes primeiro (o RLS limita ao que a pessoa pode ver). */
export async function sessoesDoAluno(alunoId: string, limite = 60): Promise<Sessao[]> {
  return ok(
    await supabase.from('sessoes').select(SELECT_SESSAO).eq('aluno_id', alunoId).order('finalizada_em', { ascending: false }).limit(limite)
  ) as Sessao[];
}

export async function obterSessao(id: string): Promise<Sessao> {
  const s = ok(await supabase.from('sessoes').select(`${SELECT_SESSAO}, alunos(nome)`).eq('id', id).single()) as Sessao;
  s.series_realizadas?.sort((a, b) => a.numero - b.numero);
  return s;
}

export type NovaSessao = {
  divisao_id: string;
  iniciada_em: string;
  finalizada_em: string;
  esforco: Esforco;
  comentario: string;
  series: { item_treino_id: string; numero: number; repeticoes_feitas: string; carga_kg: number | null; feita: boolean }[];
};

export async function registrarSessao(s: NovaSessao): Promise<string> {
  return ok(await supabase.rpc('registrar_sessao', { p: s })) as string;
}
