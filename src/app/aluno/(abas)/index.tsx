import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Botao, Cartao, Estado, Secao, Segmentado, Tela, Texto, Vazio } from '@/components/ui';
import { fichaAtivaDoAluno, sessoesDoAluno } from '@/lib/api';
import { useAlunoLogado } from '@/lib/auth';
import { fmtCurta, fmtHojeLongo } from '@/lib/datas';
import { divisaoSugerida, minutosEstimados, primeiroNome } from '@/lib/regras';
import { lerTreino } from '@/lib/treino-em-andamento';
import { useDados } from '@/lib/use-dados';
import { useCores } from '@/theme';

export default function Hoje() {
  const c = useCores();
  const { aluno, professorNome } = useAlunoLogado();
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const [ficha, sessoes, andamento] = await Promise.all([fichaAtivaDoAluno(aluno.id), sessoesDoAluno(aluno.id, 10), lerTreino(aluno.id)]);
    return { ficha, sessoes, andamento };
  });

  const cabecalho = (
    <View>
      <Texto variante="pequeno" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {fmtHojeLongo()}
      </Texto>
      <Texto variante="titulo">Olá, {primeiroNome(aluno.nome)}</Texto>
    </View>
  );

  if (!dados)
    return (
      <Tela titulo="Hoje" largura="estreita">
        {cabecalho}
        <Estado carregando={carregando} erro={erro} recarregar={recarregar} />
      </Tela>
    );

  const { ficha, sessoes, andamento } = dados;
  if (!ficha || !ficha.divisoes.length)
    return (
      <Tela titulo="Hoje" largura="estreita">
        {cabecalho}
        <Vazio texto={`${professorNome} ainda não montou sua ficha. Assim que montar, ela aparece aqui.`} />
      </Tela>
    );

  const emAndamento = andamento ? ficha.divisoes.findIndex((d) => d.id === andamento.divisaoId) : -1;
  const sugerida = divisaoSugerida(ficha, sessoes);
  const indice = emAndamento >= 0 ? emAndamento : (escolhida ?? sugerida);
  const d = ficha.divisoes[Math.min(indice, ficha.divisoes.length - 1)];

  return (
    <Tela titulo="Hoje" largura="estreita">
      {cabecalho}
      <View style={{ backgroundColor: c.texto, borderRadius: 20, padding: 20, gap: 8 }}>
        <Text style={{ color: c.superficie, opacity: 0.7, fontSize: 12, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' }}>
          {emAndamento >= 0 ? 'Treino em andamento' : 'Treino de hoje'}
        </Text>
        <Text style={{ color: c.superficie, fontSize: 48, fontWeight: '800', lineHeight: 50 }}>Treino {d.nome}</Text>
        {d.foco ? <Text style={{ color: c.superficie, fontSize: 17, fontWeight: '600' }}>{d.foco}</Text> : null}
        <Text style={{ color: c.superficie, opacity: 0.75, fontSize: 13.5 }}>
          {d.itens_treino.length} {d.itens_treino.length === 1 ? 'exercício' : 'exercícios'} · cerca de {minutosEstimados(d)} min
        </Text>
        <View style={{ marginTop: 6, marginBottom: 8 }}>
          {d.itens_treino.map((it) => (
            <View key={it.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }}>
              <Text style={{ color: c.superficie, fontSize: 14, flex: 1 }}>{it.exercicios?.nome ?? 'Exercício'}</Text>
              <Text style={{ color: c.superficie, opacity: 0.75, fontSize: 13, fontVariant: ['tabular-nums'] }}>
                {it.series} × {it.repeticoes}
              </Text>
            </View>
          ))}
        </View>
        <Botao
          titulo={emAndamento >= 0 ? 'Continuar treino' : 'Começar treino'}
          icone="play"
          tipo="primario"
          desativado={!d.itens_treino.length}
          onPress={() => router.push({ pathname: '/aluno/treino', params: { divisaoId: d.id } })}
          estilo={{ minHeight: 52 }}
        />
      </View>
      {ficha.divisoes.length > 1 ? (
        <Secao titulo="Trocar divisão">
          <Segmentado
            opcoes={ficha.divisoes.map((x, i) => ({ valor: i, rotulo: `Treino ${x.nome}` }))}
            valor={indice}
            aoMudar={setEscolhida}
            desativado={emAndamento >= 0}
          />
          <Texto variante="suave">
            {emAndamento >= 0
              ? 'Termine ou descarte o treino em andamento para trocar.'
              : `Pela sequência, hoje é o Treino ${ficha.divisoes[sugerida].nome}. Você pode trocar se precisar.`}
          </Texto>
        </Secao>
      ) : null}
      <Secao titulo="Sua ficha">
        <Cartao estilo={{ gap: 4 }}>
          <Texto variante="forte">{ficha.nome}</Texto>
          <Texto variante="suave">
            {ficha.validade ? `Válida até ${fmtCurta(ficha.validade)} · ` : ''}montada por {professorNome}
          </Texto>
        </Cartao>
      </Secao>
    </Tela>
  );
}
