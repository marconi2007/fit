import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { Cartao, Linha, Selo, Texto } from './ui';
import { fmtDiaMes, fmtRelativo, minutosEntre } from '@/lib/datas';
import { fmtNum, iniciais } from '@/lib/regras';
import { ESFORCO, type Esforco, type Sessao } from '@/lib/tipos';
import { useCores } from '@/theme';

export function SeloEsforco({ esforco }: { esforco: Esforco | null }) {
  if (!esforco) return null;
  return <Selo tom={esforco === 'facil' ? 'ok' : esforco === 'dificil' ? 'warn' : 'acc'} texto={ESFORCO[esforco]} />;
}

/** Linha de uma sessão de treino. Com mostrarAluno, destaca o nome do aluno (início do professor). */
export function LinhaSessao({ sessao, mostrarAluno, onPress, ultima }: { sessao: Sessao; mostrarAluno?: boolean; onPress: () => void; ultima?: boolean }) {
  const n = sessao.series_realizadas?.filter((s) => s.feita).length;
  const dur = `${minutosEntre(sessao.iniciada_em, sessao.finalizada_em)} min`;
  const nomeAluno = sessao.alunos?.nome ?? 'Aluno';
  return (
    <Linha
      avatar={mostrarAluno ? iniciais(nomeAluno) : sessao.divisao_nome}
      titulo={mostrarAluno ? nomeAluno : `Treino ${sessao.divisao_nome}${sessao.divisao_foco ? ' · ' + sessao.divisao_foco : ''}`}
      sub={[mostrarAluno ? `Treino ${sessao.divisao_nome}` : null, dur, n != null ? `${n} ${n === 1 ? 'série' : 'séries'}` : null].filter(Boolean).join(' · ')}
      citacao={sessao.comentario}
      direita={
        <>
          <SeloEsforco esforco={sessao.esforco} />
          <Texto variante="pequeno">{fmtRelativo(sessao.finalizada_em)}</Texto>
        </>
      }
      onPress={onPress}
      ultima={ultima}
    />
  );
}

/** Detalhe de um treino feito: séries agrupadas por exercício. */
export function DetalheSessao({ sessao }: { sessao: Sessao }) {
  const c = useCores();
  const grupos: { nome: string; series: NonNullable<Sessao['series_realizadas']> }[] = [];
  for (const s of sessao.series_realizadas ?? []) {
    let g = grupos.find((x) => x.nome === (s.exercicios?.nome ?? s.exercicio_id));
    if (!g) {
      g = { nome: s.exercicios?.nome ?? 'Exercício', series: [] };
      grupos.push(g);
    }
    g.series.push(s);
  }
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Texto variante="pequeno" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {fmtDiaMes(sessao.finalizada_em)} · {minutosEntre(sessao.iniciada_em, sessao.finalizada_em)} min
        </Texto>
        <Texto variante="titulo">
          Treino {sessao.divisao_nome}
          {sessao.divisao_foco ? ` · ${sessao.divisao_foco}` : ''}
        </Texto>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <SeloEsforco esforco={sessao.esforco} />
        {sessao.comentario ? (
          <Texto variante="suave" style={{ fontStyle: 'italic', flex: 1 }}>
            “{sessao.comentario}”
          </Texto>
        ) : null}
      </View>
      <Cartao estilo={{ paddingVertical: 4 }}>
        {grupos.length === 0 ? <Texto variante="suave">Nenhuma série registrada.</Texto> : null}
        {grupos.map((g, i) => (
          <View key={g.nome} style={{ paddingVertical: 10, gap: 4, borderBottomWidth: i === grupos.length - 1 ? 0 : 1, borderBottomColor: c.linha }}>
            <Texto variante="forte">{g.nome}</Texto>
            <Texto variante="pequeno" style={{ fontVariant: ['tabular-nums'] }}>
              {g.series
                .map((s) => `${s.feita ? '' : '(não feita) '}${s.repeticoes_feitas ?? '-'} × ${Number(s.carga_kg) ? fmtNum(Number(s.carga_kg)) + ' kg' : 'peso corporal'}`)
                .join('  ·  ')}
            </Texto>
          </View>
        ))}
      </Cartao>
    </View>
  );
}

/** Gráfico de linha da maior carga por treino. */
export function GraficoCarga({ pontos }: { pontos: { data: string; carga: number }[] }) {
  const c = useCores();
  if (pontos.length < 2) return <Texto variante="suave">Faça mais treinos com este exercício para ver a evolução.</Texto>;
  const W = 340,
    H = 160,
    pl = 34,
    pr = 56,
    pt = 14,
    pb = 26;
  let lo = Math.min(...pontos.map((p) => p.carga));
  let hi = Math.max(...pontos.map((p) => p.carga));
  if (hi === lo) {
    hi += 2;
    lo -= 2;
  }
  const faixa = hi - lo;
  lo = Math.max(0, Math.floor(lo - faixa * 0.2));
  hi = Math.ceil(hi + faixa * 0.2);
  const x = (i: number) => pl + ((W - pl - pr) * i) / (pontos.length - 1);
  const y = (v: number) => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo));
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.carga).toFixed(1)}`).join('');
  const area = `${linha}L${x(pontos.length - 1).toFixed(1)},${H - pb}L${pl},${H - pb}Z`;
  const ultimo = pontos[pontos.length - 1];
  const marcas = [lo, Math.round((lo + hi) / 2), hi];
  return (
    <View accessible accessibilityLabel={`Evolução de carga: de ${fmtNum(pontos[0].carga)} para ${fmtNum(ultimo.carga)} kg`}>
      <Svg width="100%" height={undefined} viewBox={`0 0 ${W} ${H}`} style={{ aspectRatio: W / H }}>
        {marcas.map((m) => (
          <Line key={m} x1={pl} x2={W - pr} y1={y(m)} y2={y(m)} stroke={c.linha} strokeWidth={1} />
        ))}
        {marcas.map((m) => (
          <SvgText key={`t${m}`} x={pl - 6} y={y(m) + 4} fontSize={11} fill={c.suave} textAnchor="end">
            {m}
          </SvgText>
        ))}
        <Path d={area} fill={c.destaque} fillOpacity={0.12} />
        <Path d={linha} fill="none" stroke={c.destaque} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((p, i) => (
          <Circle
            key={i}
            cx={x(i)}
            cy={y(p.carga)}
            r={i === pontos.length - 1 ? 5 : 3}
            fill={i === pontos.length - 1 ? c.destaque : c.superficie}
            stroke={c.destaque}
            strokeWidth={2}
          />
        ))}
        <SvgText x={x(pontos.length - 1) + 9} y={y(ultimo.carga) + 4} fontSize={12} fontWeight="700" fill={c.texto}>
          {`${fmtNum(ultimo.carga)} kg`}
        </SvgText>
        <SvgText x={pl} y={H - 6} fontSize={11} fill={c.suave}>
          {fmtDiaMes(pontos[0].data)}
        </SvgText>
        <SvgText x={W - pr} y={H - 6} fontSize={11} fill={c.suave} textAnchor="end">
          {fmtDiaMes(ultimo.data)}
        </SvgText>
      </Svg>
    </View>
  );
}
