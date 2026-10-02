import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Biblioteca, LinkVideo } from '@/components/biblioteca';
import { Botao, BotaoIcone, BotaoTexto, Campo, confirmar, Estado, Folha, Tela, Texto, useToast } from '@/components/ui';
import { Icone } from '@/components/icone';
import { listarExercicios, obterAluno, obterFicha, salvarFicha } from '@/lib/api';
import { useProfessor } from '@/lib/auth';
import { brParaIso, isoParaBr, mascaraData } from '@/lib/datas';
import { copiarFicha, fichaEmBranco, primeiroNome, proximaLetra } from '@/lib/regras';
import { mensagemDeErro } from '@/lib/supabase';
import type { Aluno, Exercicio, Ficha } from '@/lib/tipos';
import { useCores, useTelaLarga } from '@/theme';

// Na edição, números ficam como texto para a pessoa poder digitar "42," sem o campo pular.
type ItemEd = { id: string; exercicio_id: string; series: string; repeticoes: string; carga: string; descanso: string; observacao: string };
type DivisaoEd = { id: string; nome: string; foco: string; itens: ItemEd[] };
type Rascunho = Omit<Ficha, 'divisoes' | 'validade'> & { validade: string; divisoes: DivisaoEd[] };

function paraRascunho(f: Ficha): Rascunho {
  return {
    ...f,
    validade: isoParaBr(f.validade),
    divisoes: f.divisoes.map((d) => ({
      id: d.id,
      nome: d.nome,
      foco: d.foco ?? '',
      itens: d.itens_treino.map((it) => ({
        id: it.id,
        exercicio_id: it.exercicio_id,
        series: String(it.series ?? 3),
        repeticoes: it.repeticoes ?? '10',
        carga: it.carga_kg == null ? '' : String(it.carga_kg).replace('.', ','),
        descanso: it.descanso_seg == null ? '' : String(it.descanso_seg),
        observacao: it.observacao ?? '',
      })),
    })),
  };
}

const paraNumero = (t: string) => {
  const n = Number(t.replace(',', '.').trim());
  return t.trim() === '' || Number.isNaN(n) ? null : n;
};

function paraFicha(r: Rascunho, validadeIso: string | null): Ficha {
  return {
    ...r,
    validade: validadeIso,
    divisoes: r.divisoes.map((d, i) => ({
      id: d.id,
      nome: d.nome,
      foco: d.foco.trim() || null,
      ordem: i,
      itens_treino: d.itens.map((it, j) => ({
        id: it.id,
        exercicio_id: it.exercicio_id,
        ordem: j,
        series: Math.max(1, Math.min(20, Math.round(paraNumero(it.series) ?? 3))),
        repeticoes: it.repeticoes.trim() || '10',
        carga_kg: paraNumero(it.carga),
        descanso_seg: paraNumero(it.descanso) == null ? null : Math.round(paraNumero(it.descanso)!),
        observacao: it.observacao.trim() || null,
      })),
    })),
  };
}

/**
 * Editor de ficha. Parâmetros:
 * - fichaId: edita uma ficha ou um modelo existente;
 * - alunoId: ficha nova para o aluno (com base= para copiar de outra ficha ou de um modelo);
 * - nenhum: modelo novo em branco (ou base= para duplicar um modelo).
 */
export default function EditorFicha() {
  const c = useCores();
  const larga = useTelaLarga();
  const toast = useToast();
  const professor = useProfessor();
  const { fichaId, alunoId, base } = useLocalSearchParams<{ fichaId?: string; alunoId?: string; base?: string }>();
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [exercicios, setExercicios] = useState<Exercicio[]>([]);
  const [divAtual, setDivAtual] = useState(0);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [alterado, setAlterado] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  const [adicionados, setAdicionados] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [lista, ficha] = await Promise.all([
          listarExercicios(),
          fichaId
            ? obterFicha(fichaId)
            : base
              ? obterFicha(base).then((f) => copiarFicha(f, { alunoId: alunoId ?? null, nome: alunoId ? f.nome : `${f.nome} (cópia)` }))
              : Promise.resolve(fichaEmBranco(alunoId ?? null)),
        ]);
        setExercicios(lista);
        if (ficha.aluno_id) setAluno(await obterAluno(ficha.aluno_id));
        setRascunho(paraRascunho(ficha));
      } catch (e) {
        setErroCarga(mensagemDeErro(e));
      }
    })();
  }, [fichaId, alunoId, base]);

  const porId = useMemo(() => new Map(exercicios.map((e) => [e.id, e])), [exercicios]);

  function mudar(fn: (r: Rascunho) => Rascunho) {
    setRascunho((r) => (r ? fn(r) : r));
    setAlterado(true);
  }
  const mudarDivisao = (fn: (d: DivisaoEd) => DivisaoEd) => mudar((r) => ({ ...r, divisoes: r.divisoes.map((d, i) => (i === divAtual ? fn(d) : d)) }));
  const mudarItem = (idx: number, campo: keyof ItemEd, valor: string) =>
    mudarDivisao((d) => ({ ...d, itens: d.itens.map((it, j) => (j === idx ? { ...it, [campo]: valor } : it)) }));

  function adicionarExercicio(e: Exercicio) {
    mudarDivisao((d) => ({
      ...d,
      itens: [...d.itens, { id: randomUUID(), exercicio_id: e.id, series: '3', repeticoes: '10', carga: '', descanso: '60', observacao: '' }],
    }));
    setAdicionados((n) => n + 1);
    toast(`${e.nome} adicionado ao Treino ${rascunho?.divisoes[divAtual]?.nome ?? ''}.`);
  }

  function mover(idx: number, delta: number) {
    mudarDivisao((d) => {
      const itens = [...d.itens];
      const [it] = itens.splice(idx, 1);
      itens.splice(idx + delta, 0, it);
      return { ...d, itens };
    });
  }

  async function removerDivisao() {
    if (!rascunho) return;
    const d = rascunho.divisoes[divAtual];
    if (d.itens.length && !(await confirmar(`Remover o Treino ${d.nome}?`, `Os ${d.itens.length} exercícios deste treino saem da ficha.`, 'Remover'))) return;
    mudar((r) => ({ ...r, divisoes: r.divisoes.filter((_, i) => i !== divAtual) }));
    setDivAtual((i) => Math.max(0, i - 1));
  }

  function validar(): { ficha: Ficha } | null {
    if (!rascunho) return null;
    setErro(null);
    if (!rascunho.nome.trim()) {
      setErro('Dê um nome para a ficha.');
      return null;
    }
    let validade: string | null = null;
    if (!rascunho.eh_modelo && rascunho.validade.trim()) {
      validade = brParaIso(rascunho.validade);
      if (!validade) {
        setErro('Data de validade inválida. Use DD/MM/AAAA.');
        return null;
      }
    }
    if (!rascunho.divisoes.some((d) => d.itens.length)) {
      setErro('Adicione pelo menos um exercício.');
      return null;
    }
    return { ficha: paraFicha(rascunho, validade) };
  }

  async function salvar() {
    const v = validar();
    if (!v) return;
    setSalvando(true);
    try {
      await salvarFicha(v.ficha);
      setAlterado(false);
      toast(v.ficha.eh_modelo ? 'Modelo salvo.' : `Ficha salva. ${aluno ? primeiroNome(aluno.nome) + ' já vê a nova versão.' : ''}`);
      router.back();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarComoModelo() {
    const v = validar();
    if (!v) return;
    setSalvando(true);
    try {
      const modelo = copiarFicha(v.ficha, { alunoId: null, nome: v.ficha.nome });
      await salvarFicha(modelo);
      toast(`Modelo “${modelo.nome}” salvo. A ficha do aluno ainda não foi salva.`);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function voltar() {
    if (alterado && !(await confirmar('Sair sem salvar?', 'As mudanças nesta ficha serão perdidas.', 'Sair'))) return;
    if (router.canGoBack()) router.back();
    else router.replace('/professor');
  }

  const titulo = !rascunho ? 'Ficha' : rascunho.eh_modelo ? `Modelo: ${rascunho.nome || 'sem nome'}` : aluno ? `Ficha de ${primeiroNome(aluno.nome)}` : 'Ficha';

  if (!rascunho)
    return (
      <Tela titulo={titulo} voltar>
        <Estado carregando={!erroCarga} erro={erroCarga} />
      </Tela>
    );

  const d = rascunho.divisoes[Math.min(divAtual, rascunho.divisoes.length - 1)];
  const noTreino = new Set(d?.itens.map((i) => i.exercicio_id));

  const principal = (
    <View style={{ gap: 18 }}>
      <Texto variante="pequeno" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {rascunho.eh_modelo ? 'Modelo reutilizável' : aluno ? `Ficha de ${aluno.nome}${aluno.objetivo ? ' · ' + aluno.objetivo : ''}` : ''}
        {aluno?.restricoes ? <Text style={{ color: c.aviso }}> · {aluno.restricoes}</Text> : null}
      </Texto>
      <View style={{ flexDirection: larga ? 'row' : 'column', gap: 10 }}>
        <View style={{ flex: larga ? 1 : undefined }}>
          <Campo rotulo="Nome da ficha" value={rascunho.nome} onChangeText={(t) => mudar((r) => ({ ...r, nome: t }))} />
        </View>
        {!rascunho.eh_modelo ? (
          <View style={{ width: larga ? 200 : undefined }}>
            <Campo
              rotulo="Válida até"
              value={rascunho.validade}
              onChangeText={(t) => mudar((r) => ({ ...r, validade: mascaraData(t) }))}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {rascunho.divisoes.map((x, i) => {
          const on = i === divAtual;
          return (
            <Pressable
              key={x.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setDivAtual(i)}
              style={{ minWidth: 74, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: on ? c.texto : c.linha, backgroundColor: on ? c.texto : c.superficie }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: on ? c.superficie : c.texto }}>{x.nome}</Text>
              <Text style={{ fontSize: 11.5, color: on ? c.superficie : c.suave, opacity: on ? 0.8 : 1 }}>{x.itens.length} exerc.</Text>
            </Pressable>
          );
        })}
        {rascunho.divisoes.length < 7 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              mudar((r) => ({ ...r, divisoes: [...r.divisoes, { id: randomUUID(), nome: proximaLetra(r.divisoes), foco: '', itens: [] }] }));
              setDivAtual(rascunho.divisoes.length);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: c.linha }}>
            <Icone nome="mais" tamanho={16} cor={c.destaque} />
            <Text style={{ color: c.destaque, fontWeight: '700' }}>Divisão</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {d ? (
        <>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <View style={{ flex: 1, minWidth: 180 }}>
              <Campo rotulo={`Foco do Treino ${d.nome}`} value={d.foco} onChangeText={(t) => mudarDivisao((x) => ({ ...x, foco: t }))} placeholder="Ex.: Peito e tríceps" />
            </View>
            {rascunho.divisoes.length > 1 ? <Botao titulo={`Remover Treino ${d.nome}`} tipo="fantasma" pequeno onPress={removerDivisao} /> : null}
          </View>

          <View style={{ gap: 10 }}>
            {d.itens.length === 0 ? (
              <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: c.linha, borderRadius: 14, padding: 20 }}>
                <Texto variante="suave" style={{ textAlign: 'center' }}>
                  Treino {d.nome} sem exercícios. {larga ? 'Escolha na biblioteca ao lado.' : 'Toque em Adicionar exercício.'}
                </Texto>
              </View>
            ) : null}
            {d.itens.map((it, idx) => {
              const ex = porId.get(it.exercicio_id);
              return (
                <View key={it.id} style={{ backgroundColor: c.superficie, borderColor: c.linha, borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ width: 24, textAlign: 'center', fontSize: 20, fontWeight: '800', color: c.suave }}>{idx + 1}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Texto variante="forte">{ex?.nome ?? 'Exercício'}</Texto>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        <Texto variante="pequeno">{[ex?.grupo_muscular, ex?.equipamento].filter(Boolean).join(' · ')}</Texto>
                        {ex?.youtube_url ? <LinkVideo url={ex.youtube_url} rotulo="vídeo" /> : null}
                      </View>
                    </View>
                    <BotaoIcone icone="cima" rotulo="Subir exercício" desativado={idx === 0} onPress={() => mover(idx, -1)} />
                    <BotaoIcone icone="baixo" rotulo="Descer exercício" desativado={idx === d.itens.length - 1} onPress={() => mover(idx, 1)} />
                    <BotaoIcone
                      icone="fechar"
                      rotulo="Remover exercício"
                      cor={c.critico}
                      onPress={() => mudarDivisao((x) => ({ ...x, itens: x.itens.filter((_, j) => j !== idx) }))}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <CampoNumero rotulo="Séries" valor={it.series} aoMudar={(v) => mudarItem(idx, 'series', v)} teclado="number-pad" />
                    <CampoNumero rotulo="Reps" valor={it.repeticoes} aoMudar={(v) => mudarItem(idx, 'repeticoes', v)} teclado="default" />
                    <CampoNumero rotulo="Carga kg" valor={it.carga} aoMudar={(v) => mudarItem(idx, 'carga', v)} teclado="decimal-pad" />
                    <CampoNumero rotulo="Descanso s" valor={it.descanso} aoMudar={(v) => mudarItem(idx, 'descanso', v)} teclado="number-pad" />
                  </View>
                  <TextInput
                    value={it.observacao}
                    onChangeText={(t) => mudarItem(idx, 'observacao', t)}
                    placeholder="Observação para o aluno (opcional)"
                    placeholderTextColor={c.suave}
                    accessibilityLabel="Observação para o aluno"
                    style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: c.linha, backgroundColor: c.superficie2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: c.texto }}
                  />
                </View>
              );
            })}
          </View>
          {!larga ? <Botao titulo={`Adicionar exercício ao Treino ${d.nome}`} icone="mais" onPress={() => { setAdicionados(0); setEscolhendo(true); }} estilo={{ borderStyle: 'dashed', minHeight: 52 }} /> : null}
        </>
      ) : null}

      {erro ? (
        <Texto cor={c.critico} variante="forte">
          {erro}
        </Texto>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, justifyContent: larga ? 'flex-end' : 'flex-start', flexWrap: 'wrap' }}>
        {!rascunho.eh_modelo ? <Botao titulo="Salvar como modelo" onPress={salvarComoModelo} desativado={salvando} estilo={larga ? undefined : { flexGrow: 1 }} /> : null}
        <Botao titulo={rascunho.eh_modelo ? 'Salvar modelo' : 'Salvar ficha'} tipo="primario" carregando={salvando} onPress={salvar} estilo={larga ? undefined : { flexGrow: 1 }} />
      </View>
    </View>
  );

  const biblioteca = (
    <Biblioteca
      exercicios={exercicios}
      professorId={professor.id}
      aoCriar={(e) => {
        setExercicios((l) => [...l, e]);
        adicionarExercicio(e);
      }}
      aoEscolher={adicionarExercicio}
      jaNoTreino={noTreino}
      tituloEscolha={d ? `Adicionar ao Treino ${d.nome}` : undefined}
    />
  );

  return (
    <Tela titulo={titulo} voltar={voltar} rolagem={!larga} direita={!larga ? <BotaoTexto titulo="Salvar" onPress={salvar} /> : null}>
      {larga ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 28, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
            <View style={{ maxWidth: 820, width: '100%', alignSelf: 'center' }}>{principal}</View>
          </ScrollView>
          <ScrollView style={{ width: 380, flexGrow: 0, backgroundColor: c.superficie, borderLeftWidth: 1, borderLeftColor: c.linha }} contentContainerStyle={{ padding: 20 }}>
            {biblioteca}
          </ScrollView>
        </View>
      ) : (
        principal
      )}
      <Folha
        visivel={escolhendo}
        aoFechar={() => setEscolhendo(false)}
        titulo={adicionados ? `Concluir (${adicionados} adicionado${adicionados > 1 ? 's' : ''})` : 'Adicionar exercício'}
        alta>
        {biblioteca}
      </Folha>
    </Tela>
  );
}

function CampoNumero({ rotulo, valor, aoMudar, teclado }: { rotulo: string; valor: string; aoMudar: (v: string) => void; teclado: 'number-pad' | 'decimal-pad' | 'default' }) {
  const c = useCores();
  return (
    <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
      <Texto variante="pequeno" style={{ fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
        {rotulo}
      </Texto>
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        keyboardType={teclado}
        accessibilityLabel={rotulo}
        selectTextOnFocus
        style={{ borderWidth: 1, borderColor: c.linha, backgroundColor: c.superficie, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 6, textAlign: 'center', fontSize: 15, color: c.texto, fontVariant: ['tabular-nums'], minWidth: 0 }}
      />
    </View>
  );
}
