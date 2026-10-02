import { router } from 'expo-router';
import { useState } from 'react';

import { GraficoCarga, LinhaSessao } from '@/components/sessoes';
import { Cartao, Chips, Estado, Indicador, Indicadores, Lista, Secao, Tela, Vazio } from '@/components/ui';
import { fichaAtivaDoAluno, sessoesDoAluno } from '@/lib/api';
import { useAlunoLogado } from '@/lib/auth';
import { minutosEntre } from '@/lib/datas';
import { evolucaoCarga } from '@/lib/regras';
import { useDados } from '@/lib/use-dados';

export default function Historico() {
  const { aluno } = useAlunoLogado();
  const [exSel, setExSel] = useState<string | null>(null);
  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const [ficha, sessoes] = await Promise.all([fichaAtivaDoAluno(aluno.id), sessoesDoAluno(aluno.id, 100)]);
    return { ficha, sessoes, agora: Date.now() };
  });

  if (!dados)
    return (
      <Tela titulo="Histórico" largura="estreita">
        <Estado carregando={carregando} erro={erro} recarregar={recarregar} />
      </Tela>
    );

  const { ficha, sessoes, agora } = dados;
  const nosUltimos = (dias: number) => sessoes.filter((s) => agora - new Date(s.finalizada_em).getTime() < dias * 86400000).length;
  const media = sessoes.length ? Math.round(sessoes.reduce((t, s) => t + minutosEntre(s.iniciada_em, s.finalizada_em), 0) / sessoes.length) : 0;

  // Exercícios com carga da ficha atual que já aparecem no histórico.
  const exercicios = [
    ...new Map(
      (ficha?.divisoes ?? []).flatMap((d) => d.itens_treino.filter((i) => Number(i.carga_kg) > 0).map((i) => [i.exercicio_id, i.exercicios?.nome ?? 'Exercício'] as const))
    ).entries(),
  ].filter(([id]) => sessoes.some((s) => s.series_realizadas?.some((x) => x.exercicio_id === id)));
  const selecionado = exercicios.find(([id]) => id === exSel)?.[0] ?? exercicios[0]?.[0];

  return (
    <Tela titulo="Histórico" largura="estreita">
      <Indicadores>
        <Indicador rotulo="Treinos em 30 dias" valor={nosUltimos(30)} />
        <Indicador rotulo="Últimos 7 dias" valor={nosUltimos(7)} />
        <Indicador rotulo="Média min" valor={media} />
      </Indicadores>
      {selecionado ? (
        <Secao titulo="Evolução de carga">
          <Chips opcoes={exercicios.map(([id, nome]) => ({ valor: id, rotulo: nome }))} valor={selecionado} aoMudar={setExSel} />
          <Cartao>
            <GraficoCarga pontos={evolucaoCarga(sessoes, selecionado)} />
          </Cartao>
        </Secao>
      ) : null}
      <Secao titulo="Treinos feitos">
        {sessoes.length ? (
          <Lista>
            {sessoes.map((s, i) => (
              <LinhaSessao key={s.id} sessao={s} onPress={() => router.push(`/aluno/sessao/${s.id}`)} ultima={i === sessoes.length - 1} />
            ))}
          </Lista>
        ) : (
          <Vazio texto="Seus treinos aparecem aqui depois que você finalizar o primeiro." />
        )}
      </Secao>
    </Tela>
  );
}
