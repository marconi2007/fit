import { Biblioteca } from '@/components/biblioteca';
import { Estado, Tela } from '@/components/ui';
import { listarExercicios } from '@/lib/api';
import { useProfessor } from '@/lib/auth';
import { useDados } from '@/lib/use-dados';

export default function Exercicios() {
  const professor = useProfessor();
  const { dados, setDados, erro, carregando, recarregar } = useDados(listarExercicios);
  return (
    <Tela titulo="Exercícios" largura="estreita">
      {!dados ? (
        <Estado carregando={carregando} erro={erro} recarregar={recarregar} />
      ) : (
        <Biblioteca exercicios={dados} professorId={professor.id} aoCriar={(e) => setDados([...dados, e])} />
      )}
    </Tela>
  );
}
