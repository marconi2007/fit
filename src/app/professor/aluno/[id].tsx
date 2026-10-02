import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { FolhaConvite } from '@/components/convite';
import { LinhaSessao } from '@/components/sessoes';
import {
  Aviso,
  Avatar,
  Botao,
  BotaoTexto,
  Cartao,
  confirmar,
  DuasColunas,
  Estado,
  Folha,
  Linha,
  Letra,
  Lista,
  Secao,
  Selo,
  Tela,
  Texto,
  useToast,
  Vazio,
} from '@/components/ui';
import { fichaAtivaDoAluno, listarModelos, mudarStatusAluno, obterAluno, sessoesDoAluno } from '@/lib/api';
import { useProfessor } from '@/lib/auth';
import { idade } from '@/lib/datas';
import { evolucaoCarga, fmtNum, iniciais, primeiroNome, situacaoFicha } from '@/lib/regras';
import { mensagemDeErro } from '@/lib/supabase';
import type { Ficha } from '@/lib/tipos';
import { useDados } from '@/lib/use-dados';
import { useCores } from '@/theme';

export default function DetalheAluno() {
  const c = useCores();
  const toast = useToast();
  const professor = useProfessor();
  const { id, convite } = useLocalSearchParams<{ id: string; convite?: string }>();
  const [verConvite, setVerConvite] = useState(false);
  const [escolherModelo, setEscolherModelo] = useState<Ficha[] | null>(null);
  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const [aluno, ficha, sessoes] = await Promise.all([obterAluno(id), fichaAtivaDoAluno(id), sessoesDoAluno(id, 30)]);
    return { aluno, ficha, sessoes };
  });

  // Logo depois do cadastro, o convite já aparece aberto.
  const [conviteVisto, setConviteVisto] = useState(false);
  const mostrarConvite = verConvite || (convite === '1' && !conviteVisto && !!dados && !dados.aluno.usuario_id);

  if (!dados)
    return (
      <Tela titulo="Aluno" voltar>
        <Estado carregando={carregando} erro={erro} recarregar={recarregar} />
      </Tela>
    );

  const { aluno, ficha, sessoes } = dados;
  const anos = idade(aluno.data_nascimento);
  const situacao = situacaoFicha(aluno, ficha);

  async function arquivar() {
    const ok = await confirmar(
      `Arquivar ${aluno.nome}?`,
      `${primeiroNome(aluno.nome)} perde o acesso ao app e sai da sua lista de ativos. O histórico de treinos continua salvo e você pode reativar depois.`,
      'Arquivar'
    );
    if (!ok) return;
    try {
      await mudarStatusAluno(aluno.id, 'arquivado');
      toast(`${aluno.nome} arquivado.`);
      recarregar();
    } catch (e) {
      toast(mensagemDeErro(e));
    }
  }

  async function reativar() {
    try {
      await mudarStatusAluno(aluno.id, 'ativo');
      toast(`${aluno.nome} reativado.`);
      recarregar();
    } catch (e) {
      toast(mensagemDeErro(e));
    }
  }

  async function abrirModelos() {
    try {
      const m = await listarModelos();
      if (!m.length) return toast('Você ainda não tem modelos. Crie um na aba Modelos.');
      setEscolherModelo(m);
    } catch (e) {
      toast(mensagemDeErro(e));
    }
  }

  // Cargas: maior carga das últimas sessões para os exercícios com peso da ficha atual.
  const exerciciosComCarga = ficha
    ? [...new Map(ficha.divisoes.flatMap((d) => d.itens_treino.filter((i) => Number(i.carga_kg) > 0).map((i) => [i.exercicio_id, i.exercicios?.nome ?? 'Exercício'] as const))).entries()].slice(0, 6)
    : [];

  return (
    <Tela titulo={aluno.nome} voltar>
      <Cartao estilo={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Avatar texto={iniciais(aluno.nome)} grande />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Texto variante="grande">{aluno.nome}</Texto>
            <Texto variante="suave">{[aluno.objetivo, anos != null ? `${anos} anos` : null].filter(Boolean).join(' · ')}</Texto>
          </View>
          <Botao titulo="Editar" pequeno onPress={() => router.push({ pathname: '/professor/aluno/formulario', params: { id: aluno.id } })} />
        </View>
        <View style={{ gap: 6 }}>
          <Info rotulo="Contato" valor={aluno.telefone ?? aluno.email ?? 'Não informado'} />
          <Info rotulo="Restrições" valor={aluno.restricoes ?? 'Nenhuma'} destaque={!!aluno.restricoes} />
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <Texto variante="suave" style={{ width: 110 }}>
              Acesso ao app
            </Texto>
            {aluno.usuario_id ? (
              <Selo tom="ok" texto="Ativo no app" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Selo tom="warn" texto="Convite pendente" />
                {aluno.status === 'ativo' ? <BotaoTexto titulo="Enviar convite" onPress={() => setVerConvite(true)} /> : null}
              </View>
            )}
          </View>
        </View>
      </Cartao>

      {aluno.status === 'arquivado' ? <Aviso texto="Aluno arquivado. O histórico continua salvo." acao={<Botao titulo="Reativar" pequeno onPress={reativar} />} /> : null}

      <DuasColunas>
        <Secao titulo="Ficha atual">
          {ficha ? (
            <Cartao estilo={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <Texto variante="subtitulo" style={{ flex: 1 }}>
                  {ficha.nome}
                </Texto>
                <Selo tom={situacao.tom} texto={situacao.texto} />
              </View>
              {ficha.divisoes.map((d) => (
                <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Letra letra={d.nome} />
                  <Texto style={{ flex: 1 }}>{d.foco || 'Sem foco definido'}</Texto>
                  <Texto variante="pequeno">{d.itens_treino.length} exerc.</Texto>
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Botao titulo="Editar ficha" tipo="primario" estilo={{ flexGrow: 1 }} onPress={() => router.push({ pathname: '/professor/ficha', params: { fichaId: ficha.id } })} />
                <Botao
                  titulo="Nova ficha a partir desta"
                  estilo={{ flexGrow: 1 }}
                  onPress={() => router.push({ pathname: '/professor/ficha', params: { alunoId: aluno.id, base: ficha.id } })}
                />
              </View>
            </Cartao>
          ) : (
            <Cartao estilo={{ gap: 10 }}>
              <Texto variante="suave">{primeiroNome(aluno.nome)} ainda não tem ficha.</Texto>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                <Botao titulo="Montar ficha" tipo="primario" estilo={{ flexGrow: 1 }} onPress={() => router.push({ pathname: '/professor/ficha', params: { alunoId: aluno.id } })} />
                <Botao titulo="Usar um modelo" estilo={{ flexGrow: 1 }} onPress={abrirModelos} />
              </View>
            </Cartao>
          )}
        </Secao>
        <Secao titulo="Cargas registradas">
          <Cartao estilo={{ gap: 8 }}>
            {!sessoes.length || !exerciciosComCarga.length ? (
              <Texto variante="suave">Os registros aparecem quando o aluno fizer os treinos.</Texto>
            ) : (
              exerciciosComCarga.map(([exId, nome]) => {
                const v = evolucaoCarga(sessoes, exId).slice(-4);
                if (!v.length) return null;
                return (
                  <View key={exId} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: 1, borderBottomColor: c.linha, borderStyle: 'dashed', paddingBottom: 7 }}>
                    <Texto style={{ flex: 1 }} numberOfLines={1}>
                      {nome}
                    </Texto>
                    <Texto variante="suave" style={{ fontVariant: ['tabular-nums'] }}>
                      {v.map((p) => fmtNum(p.carga)).join(' → ')} kg
                    </Texto>
                  </View>
                );
              })
            )}
          </Cartao>
        </Secao>
      </DuasColunas>

      <Secao titulo="Treinos feitos">
        {sessoes.length ? (
          <Lista>
            {sessoes.slice(0, 10).map((s, i, l) => (
              <LinhaSessao key={s.id} sessao={s} onPress={() => router.push(`/professor/sessao/${s.id}`)} ultima={i === l.length - 1} />
            ))}
          </Lista>
        ) : (
          <Vazio texto="Nenhum treino registrado ainda." />
        )}
      </Secao>

      {aluno.status === 'ativo' ? <Botao titulo="Arquivar aluno" tipo="perigo" onPress={arquivar} /> : null}

      <FolhaConvite aluno={aluno} professorNome={professor.nome} visivel={mostrarConvite}
        aoFechar={() => {
          setVerConvite(false);
          setConviteVisto(true);
        }} />
      <Folha visivel={!!escolherModelo} aoFechar={() => setEscolherModelo(null)} titulo={`Qual modelo usar para ${primeiroNome(aluno.nome)}?`}>
        <Lista>
          {(escolherModelo ?? []).map((m, i, l) => (
            <Linha
              key={m.id}
              avatar={String(m.divisoes.length)}
              titulo={m.nome}
              sub={m.divisoes.map((d) => d.foco || `Treino ${d.nome}`).join(' · ')}
              onPress={() => {
                setEscolherModelo(null);
                router.push({ pathname: '/professor/ficha', params: { alunoId: aluno.id, base: m.id } });
              }}
              ultima={i === l.length - 1}
            />
          ))}
        </Lista>
      </Folha>
    </Tela>
  );
}

function Info({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) {
  const c = useCores();
  return (
    <View style={{ flexDirection: 'row', gap: 14 }}>
      <Texto variante="suave" style={{ width: 110 }}>
        {rotulo}
      </Texto>
      <Texto style={{ flex: 1 }} cor={destaque ? c.aviso : undefined}>
        {valor}
      </Texto>
    </View>
  );
}
