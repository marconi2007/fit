import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, Text, TextInput, Vibration, View } from 'react-native';

import { LinkVideo } from '@/components/biblioteca';
import { Icone } from '@/components/icone';
import { Botao, BotaoTexto, Campo, confirmar, Estado, Indicador, Indicadores, Secao, Segmentado, Tela, Texto, useToast } from '@/components/ui';
import { fichaAtivaDoAluno, registrarSessao, sessoesDoAluno } from '@/lib/api';
import { useAlunoLogado } from '@/lib/auth';
import { fmtDiaMes } from '@/lib/datas';
import { ehTempo, fmtKg, fmtNum, ultimoDesempenho } from '@/lib/regras';
import { mensagemDeErro } from '@/lib/supabase';
import { apagarTreino, guardarTreino, lerTreino, type TreinoEmAndamento } from '@/lib/treino-em-andamento';
import { ESFORCO, type Divisao, type Esforco, type Sessao } from '@/lib/tipos';
import { useCores, useTelaLarga } from '@/theme';

type Descanso = { fim: number; total: number };

export default function Treino() {
  const c = useCores();
  const larga = useTelaLarga();
  const toast = useToast();
  const { aluno, professorNome } = useAlunoLogado();
  const { divisaoId } = useLocalSearchParams<{ divisaoId: string }>();
  const [divisao, setDivisao] = useState<Divisao | null>(null);
  const [historico, setHistorico] = useState<Sessao[]>([]);
  const [t, setT] = useState<TreinoEmAndamento | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<'treino' | 'resumo'>('treino');
  const [descanso, setDescanso] = useState<Descanso | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const vibrou = useRef(false);

  // Carrega a divisão e retoma o treino guardado no aparelho, se for o mesmo.
  useEffect(() => {
    (async () => {
      try {
        const [ficha, sessoes, guardado] = await Promise.all([fichaAtivaDoAluno(aluno.id), sessoesDoAluno(aluno.id, 30), lerTreino(aluno.id)]);
        const d = ficha?.divisoes.find((x) => x.id === divisaoId);
        if (!d) throw new Error('Este treino não está mais na sua ficha. Volte e escolha outro.');
        setDivisao(d);
        setHistorico(sessoes);
        if (guardado && guardado.divisaoId === d.id && guardado.series.length === d.itens_treino.length) {
          setT(guardado);
        } else {
          setT({
            divisaoId: d.id,
            iniciadoEm: new Date().toISOString(),
            indice: 0,
            esforco: 'ok',
            comentario: '',
            series: d.itens_treino.map((it) =>
              Array.from({ length: Math.max(1, it.series || 1) }, () => ({
                reps: ehTempo(it.repeticoes) ? it.repeticoes : String(parseInt(it.repeticoes, 10) || ''),
                carga: it.carga_kg == null ? '' : fmtNum(Number(it.carga_kg)),
                feita: false,
              }))
            ),
          });
        }
      } catch (e) {
        setErroCarga(mensagemDeErro(e));
      }
    })();
  }, [aluno.id, divisaoId]);

  useEffect(() => {
    if (t) guardarTreino(aluno.id, t);
  }, [t, aluno.id]);

  // Relógio do descanso.
  useEffect(() => {
    if (!descanso) return;
    vibrou.current = false;
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, [descanso]);
  const restante = descanso ? Math.max(0, descanso.fim - agora) : 0;
  useEffect(() => {
    if (descanso && restante === 0 && !vibrou.current) {
      vibrou.current = true;
      if (Platform.OS !== 'web') Vibration.vibrate(400);
    }
  }, [descanso, restante]);

  if (!divisao || !t)
    return (
      <Tela titulo="Treino" voltar>
        <Estado carregando={!erroCarga} erro={erroCarga} />
      </Tela>
    );

  const itens = divisao.itens_treino;
  const idx = Math.min(t.indice, itens.length - 1);
  const it = itens[idx];
  const series = t.series[idx];
  const tempo = ehTempo(it.repeticoes);
  const ultimo = Number(it.carga_kg) > 0 ? ultimoDesempenho(historico, it.exercicio_id) : null;

  const atualizar = (fn: (x: TreinoEmAndamento) => TreinoEmAndamento) => setT((x) => (x ? fn(x) : x));
  const irPara = (i: number) => atualizar((x) => ({ ...x, indice: Math.max(0, Math.min(itens.length - 1, i)) }));
  const mudarSerie = (si: number, campo: 'reps' | 'carga', valor: string) =>
    atualizar((x) => ({ ...x, series: x.series.map((l, i) => (i === idx ? l.map((s, j) => (j === si ? { ...s, [campo]: valor } : s)) : l)) }));

  function marcar(si: number) {
    const feita = !series[si].feita;
    atualizar((x) => ({ ...x, series: x.series.map((l, i) => (i === idx ? l.map((s, j) => (j === si ? { ...s, feita } : s)) : l)) }));
    const seg = Number(it.descanso_seg) || 0;
    if (feita && seg > 0) {
      setAgora(Date.now());
      setDescanso({ fim: Date.now() + seg * 1000, total: seg * 1000 });
    }
  }

  const todas = t.series.flat();
  const feitas = todas.filter((s) => s.feita);
  const kg = feitas.reduce((soma, s) => soma + (Number(s.reps) || 0) * (Number(s.carga.replace(',', '.')) || 0), 0);
  const minutos = Math.max(1, Math.round((agora - new Date(t.iniciadoEm).getTime()) / 60000));
  const irParaResumo = () => {
    setAgora(Date.now());
    setEtapa('resumo');
  };

  async function concluir() {
    if (!t || !divisao) return;
    setErro(null);
    if (!feitas.length && !(await confirmar('Nenhuma série marcada', 'Enviar o treino mesmo assim?', 'Enviar'))) return;
    setEnviando(true);
    try {
      await registrarSessao({
        divisao_id: divisao.id,
        iniciada_em: t.iniciadoEm,
        finalizada_em: new Date().toISOString(),
        esforco: t.esforco,
        comentario: t.comentario,
        series: divisao.itens_treino.flatMap((item, i) =>
          t.series[i].map((s, j) => ({
            item_treino_id: item.id,
            numero: j + 1,
            repeticoes_feitas: s.reps,
            carga_kg: s.carga.trim() === '' ? null : Number(s.carga.replace(',', '.')) || 0,
            feita: s.feita,
          }))
        ),
      });
      await apagarTreino(aluno.id);
      toast(`Treino salvo. ${professorNome} já pode ver como foi.`);
      router.replace('/aluno');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  async function descartar() {
    if (!(await confirmar('Descartar este treino?', 'As séries marcadas não serão salvas.', 'Descartar'))) return;
    await apagarTreino(aluno.id);
    router.replace('/aluno');
  }

  if (etapa === 'resumo')
    return (
      <Tela titulo="Resumo do treino" largura="estreita">
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: c.ok, alignItems: 'center', justifyContent: 'center' }}>
            <Icone nome="check" tamanho={30} cor={c.superficie} />
          </View>
          <Texto variante="titulo" style={{ textAlign: 'center' }}>
            Treino {divisao.nome} finalizado
          </Texto>
          {divisao.foco ? <Texto variante="suave">{divisao.foco}</Texto> : null}
        </View>
        <Indicadores>
          <Indicador rotulo="Minutos" valor={minutos} />
          <Indicador rotulo="Séries feitas" valor={`${feitas.length}/${todas.length}`} />
          <Indicador rotulo="Kg levantados" valor={Math.round(kg).toLocaleString('pt-BR')} />
        </Indicadores>
        <Secao titulo="Como foi o esforço?">
          <Segmentado<Esforco>
            grande
            opcoes={(['facil', 'ok', 'dificil'] as Esforco[]).map((e) => ({ valor: e, rotulo: ESFORCO[e] }))}
            valor={t.esforco}
            aoMudar={(e) => atualizar((x) => ({ ...x, esforco: e }))}
          />
        </Secao>
        <Campo
          rotulo="Comentário para o professor"
          value={t.comentario}
          onChangeText={(v) => atualizar((x) => ({ ...x, comentario: v }))}
          multiline
          placeholder="Ex.: senti o ombro na elevação lateral"
        />
        {erro ? (
          <Texto cor={c.critico} variante="forte">
            {erro}
          </Texto>
        ) : null}
        <Botao titulo="Concluir e enviar" tipo="primario" carregando={enviando} onPress={concluir} estilo={{ minHeight: 52 }} />
        <Botao titulo="Voltar ao treino" tipo="fantasma" onPress={() => setEtapa('treino')} />
      </Tela>
    );

  const barraDescanso = descanso ? (
    <View style={{ backgroundColor: restante === 0 ? c.ok : c.texto, paddingHorizontal: 16, paddingBottom: larga ? 14 : 26, paddingTop: 0 }}>
      <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: -16, marginBottom: 12 }}>
        <View style={{ height: 4, width: `${descanso.total ? (100 * restante) / descanso.total : 0}%`, backgroundColor: c.destaque }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Icone nome="relogio" tamanho={22} cor={c.superficie} />
        <Text style={{ flex: 1, color: c.superficie, fontWeight: '600' }}>{restante ? 'Descanso' : 'Pode ir para a próxima série'}</Text>
        <Text style={{ color: c.superficie, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
          {Math.floor(Math.ceil(restante / 1000) / 60)}:{String(Math.ceil(restante / 1000) % 60).padStart(2, '0')}
        </Text>
        <BotaoClaro titulo="+15 s" onPress={() => setDescanso((d) => (d ? { fim: Math.max(d.fim, Date.now()) + 15000, total: d.total + 15000 } : d))} />
        <BotaoClaro titulo={restante ? 'Pular' : 'Ok'} onPress={() => setDescanso(null)} />
      </View>
    </View>
  ) : null;

  return (
    <Tela titulo={`Treino ${divisao.nome}`} voltar largura="estreita" direita={<BotaoTexto titulo="Finalizar" onPress={irParaResumo} />} rodape={barraDescanso}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 5 }}>
          {itens.map((_, i) => {
            const completo = t.series[i].every((s) => s.feita);
            return (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`Ir para o exercício ${i + 1}`}
                onPress={() => irPara(i)}
                hitSlop={{ top: 10, bottom: 10 }}
                style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i === idx ? c.destaque : completo ? c.ok : c.linha }}
              />
            );
          })}
        </View>
        <Texto variante="pequeno" style={{ fontWeight: '600' }}>
          Exercício {idx + 1} de {itens.length} · Treino {divisao.nome}
        </Texto>
      </View>

      <Texto variante="titulo" style={{ fontSize: 34, lineHeight: 38 }}>
        {it.exercicios?.nome ?? 'Exercício'}
      </Texto>
      <Texto variante="forte" style={{ marginTop: -10, fontVariant: ['tabular-nums'] }}>
        {it.series} × {it.repeticoes} · {fmtKg(it.carga_kg)}
        {Number(it.descanso_seg) ? ` · descanso ${it.descanso_seg} s` : ''}
      </Texto>
      {it.observacao ? (
        <View style={{ backgroundColor: c.avisoSuave, borderRadius: 12, padding: 12 }}>
          <Text style={{ color: c.texto, fontSize: 14 }}>
            <Text style={{ color: c.aviso, fontWeight: '700' }}>{professorNome}: </Text>
            {it.observacao}
          </Text>
        </View>
      ) : null}
      {it.exercicios?.youtube_url ? (
        <View style={{ alignSelf: 'flex-start' }}>
          <LinkVideo url={it.exercicios.youtube_url} rotulo="Ver execução no YouTube" />
        </View>
      ) : null}
      {ultimo ? (
        <Texto variante="pequeno" style={{ marginTop: -8 }}>
          Última vez ({fmtDiaMes(ultimo.data)}): {ultimo.repeticoes ?? '-'} × {fmtKg(ultimo.carga)}
        </Texto>
      ) : null}

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 6 }}>
          {['Série', tempo ? 'Tempo' : 'Reps', 'Carga kg', 'Feita'].map((h, i) => (
            <Texto key={h} variante="secao" style={{ fontSize: 11, textAlign: 'center', width: i === 0 ? 40 : i === 3 ? 56 : undefined, flex: i === 1 || i === 2 ? 1 : undefined }}>
              {h}
            </Texto>
          ))}
        </View>
        {series.map((s, si) => (
          <View
            key={si}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 6,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: s.feita ? 'transparent' : c.linha,
              backgroundColor: s.feita ? c.okSuave : c.superficie,
            }}>
            <Text style={{ width: 40, textAlign: 'center', fontSize: 22, fontWeight: '800', color: c.texto }}>{si + 1}</Text>
            <EntradaSerie valor={s.reps} aoMudar={(v) => mudarSerie(si, 'reps', v)} rotulo={`Repetições da série ${si + 1}`} teclado={tempo ? 'default' : 'number-pad'} />
            <EntradaSerie valor={s.carga} aoMudar={(v) => mudarSerie(si, 'carga', v)} rotulo={`Carga da série ${si + 1} em kg`} teclado="decimal-pad" />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.feita }}
              accessibilityLabel={`Marcar série ${si + 1} como feita`}
              onPress={() => marcar(si)}
              style={{
                width: 56,
                height: 46,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: s.feita ? c.ok : c.linha,
                backgroundColor: s.feita ? c.ok : c.superficie,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icone nome="check" tamanho={22} cor={s.feita ? c.superficie : c.suave} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Botao titulo="Anterior" icone="esquerda" desativado={idx === 0} onPress={() => irPara(idx - 1)} estilo={{ flex: 1, minHeight: 50 }} />
        {idx < itens.length - 1 ? (
          <Botao titulo="Próximo" tipo="primario" onPress={() => irPara(idx + 1)} estilo={{ flex: 1, minHeight: 50 }} />
        ) : (
          <Botao titulo="Finalizar treino" tipo="primario" onPress={irParaResumo} estilo={{ flex: 1, minHeight: 50 }} />
        )}
      </View>
      <Botao titulo="Descartar treino" tipo="fantasma" onPress={descartar} />
    </Tela>
  );
}

function EntradaSerie({ valor, aoMudar, rotulo, teclado }: { valor: string; aoMudar: (v: string) => void; rotulo: string; teclado: 'number-pad' | 'decimal-pad' | 'default' }) {
  const c = useCores();
  return (
    <TextInput
      value={valor}
      onChangeText={aoMudar}
      keyboardType={teclado}
      accessibilityLabel={rotulo}
      selectTextOnFocus
      style={{
        flex: 1,
        minWidth: 0,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: c.linha,
        backgroundColor: c.superficie,
        borderRadius: 10,
        paddingVertical: 9,
        fontSize: 18,
        fontWeight: '600',
        color: c.texto,
        fontVariant: ['tabular-nums'],
      }}
    />
  );
}

function BotaoClaro({ titulo, onPress }: { titulo: string; onPress: () => void }) {
  const c = useCores();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 10, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' }}>
      <Text style={{ color: c.superficie, fontWeight: '700', fontSize: 13.5 }}>{titulo}</Text>
    </Pressable>
  );
}
