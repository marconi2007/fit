import { router } from 'expo-router';

import { Folha, Linha, Lista, Selo, Texto } from './ui';
import type { AlunoResumo } from '@/lib/api';
import { iniciais, situacaoFicha } from '@/lib/regras';

export function LinhaAluno({ aluno, ultima }: { aluno: AlunoResumo; ultima?: boolean }) {
  const s = situacaoFicha(aluno, aluno.fichaAtiva);
  return (
    <Linha
      avatar={iniciais(aluno.nome)}
      titulo={aluno.nome}
      sub={aluno.objetivo ?? undefined}
      direita={<Selo tom={s.tom} texto={s.texto} />}
      onPress={() => router.push(`/professor/aluno/${aluno.id}`)}
      ultima={ultima}
    />
  );
}

export function EscolherAluno({
  visivel,
  alunos,
  titulo,
  aviso,
  aoFechar,
  aoEscolher,
}: {
  visivel: boolean;
  alunos: AlunoResumo[];
  titulo: string;
  aviso?: string;
  aoFechar: () => void;
  aoEscolher: (a: AlunoResumo) => void;
}) {
  return (
    <Folha visivel={visivel} aoFechar={aoFechar} titulo={titulo}>
      {aviso ? <Texto variante="suave">{aviso}</Texto> : null}
      <Lista>
        {alunos.map((a, i) => {
          const s = situacaoFicha(a, a.fichaAtiva);
          return (
            <Linha
              key={a.id}
              avatar={iniciais(a.nome)}
              titulo={a.nome}
              sub={a.objetivo ?? undefined}
              direita={<Selo tom={s.tom} texto={s.texto} />}
              onPress={() => aoEscolher(a)}
              ultima={i === alunos.length - 1}
            />
          );
        })}
      </Lista>
    </Folha>
  );
}
