import { Abas } from '@/components/abas';

export default function AbasAluno() {
  return (
    <Abas
      abas={[
        { nome: 'index', titulo: 'Hoje', icone: 'inicio' },
        { nome: 'historico', titulo: 'Histórico', icone: 'relogio' },
        { nome: 'perfil', titulo: 'Perfil', icone: 'perfil' },
      ]}
    />
  );
}
