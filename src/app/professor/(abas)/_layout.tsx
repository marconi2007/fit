import { Abas } from '@/components/abas';

export default function AbasProfessor() {
  return (
    <Abas
      abas={[
        { nome: 'index', titulo: 'Início', icone: 'inicio' },
        { nome: 'alunos', titulo: 'Alunos', icone: 'alunos' },
        { nome: 'modelos', titulo: 'Modelos', icone: 'camadas' },
        { nome: 'exercicios', titulo: 'Exercícios', icone: 'halter' },
        { nome: 'perfil', titulo: 'Perfil', icone: 'perfil' },
      ]}
    />
  );
}
