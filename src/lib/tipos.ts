export type Objetivo = 'Hipertrofia' | 'Emagrecimento' | 'Condicionamento' | 'Saúde e mobilidade';
export const OBJETIVOS: Objetivo[] = ['Hipertrofia', 'Emagrecimento', 'Condicionamento', 'Saúde e mobilidade'];
export const GRUPOS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Cardio'] as const;
export type Esforco = 'facil' | 'ok' | 'dificil';
export const ESFORCO: Record<Esforco, string> = { facil: 'Fácil', ok: 'Ok', dificil: 'Difícil' };

export type Professor = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
};

export type Aluno = {
  id: string;
  professor_id: string;
  usuario_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  data_nascimento: string | null;
  objetivo: string | null;
  restricoes: string | null;
  status: 'ativo' | 'arquivado';
  criado_em: string;
};

export type Exercicio = {
  id: string;
  professor_id: string | null;
  nome: string;
  grupo_muscular: string;
  equipamento: string | null;
  youtube_url: string | null;
};

export type ItemTreino = {
  id: string;
  divisao_id?: string;
  exercicio_id: string;
  ordem: number;
  series: number;
  repeticoes: string;
  carga_kg: number | null;
  descanso_seg: number | null;
  observacao: string | null;
  exercicios?: Exercicio | null;
};

export type Divisao = {
  id: string;
  ficha_id?: string;
  nome: string;
  foco: string | null;
  ordem: number;
  itens_treino: ItemTreino[];
};

export type Ficha = {
  id: string;
  professor_id?: string;
  aluno_id: string | null;
  nome: string;
  data_inicio: string | null;
  validade: string | null;
  ativa: boolean;
  eh_modelo: boolean;
  criada_a_partir_de: string | null;
  divisoes: Divisao[];
};

export type SerieRealizada = {
  id: string;
  sessao_id: string;
  item_treino_id: string | null;
  exercicio_id: string;
  numero: number;
  repeticoes_feitas: string | null;
  carga_kg: number | null;
  feita: boolean;
  exercicios?: { nome: string } | null;
};

export type Sessao = {
  id: string;
  professor_id: string;
  aluno_id: string;
  divisao_id: string | null;
  divisao_nome: string;
  divisao_foco: string | null;
  iniciada_em: string;
  finalizada_em: string;
  esforco: Esforco | null;
  comentario: string | null;
  series_realizadas?: SerieRealizada[];
  alunos?: { nome: string } | null;
};
