import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { LinhaSessao } from '@/components/sessoes';
import { EscolherAluno, LinhaAluno } from '@/components/alunos';
import { Botao, DuasColunas, Estado, Indicador, Indicadores, Lista, Secao, Tela, Texto, Vazio } from '@/components/ui';
import { contarSessoesDesde, listarAlunos, ultimasSessoes } from '@/lib/api';
import { useProfessor } from '@/lib/auth';
import { fmtHojeLongo } from '@/lib/datas';
import { precisaAtencao, primeiroNome } from '@/lib/regras';
import { useDados } from '@/lib/use-dados';

export default function InicioProfessor() {
  const professor = useProfessor();
  const [escolher, setEscolher] = useState(false);
  const { dados, erro, carregando, recarregar } = useDados(async () => {
    const seteDias = new Date(Date.now() - 6 * 86400000);
    seteDias.setHours(0, 0, 0, 0);
    const [alunos, sessoes, semana] = await Promise.all([listarAlunos(), ultimasSessoes(6), contarSessoesDesde(seteDias.toISOString())]);
    return { alunos, sessoes, semana };
  });

  const ativos = dados?.alunos.filter((a) => a.status === 'ativo') ?? [];
  const atencao = ativos.filter((a) => precisaAtencao(a.fichaAtiva));

  return (
    <Tela titulo="Início">
      <View>
        <Texto variante="pequeno" style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {fmtHojeLongo()}
        </Texto>
        <Texto variante="titulo">Olá, {primeiroNome(professor.nome)}</Texto>
      </View>
      {!dados ? (
        <Estado carregando={carregando} erro={erro} recarregar={recarregar} />
      ) : (
        <>
          <Indicadores>
            <Indicador rotulo="Alunos ativos" valor={ativos.length} />
            <Indicador rotulo="Fichas vencendo" valor={ativos.filter((a) => a.fichaAtiva && precisaAtencao(a.fichaAtiva)).length} tom="warn" />
            <Indicador rotulo="Sem ficha" valor={ativos.filter((a) => !a.fichaAtiva).length} tom="crit" />
            <Indicador rotulo="Treinos em 7 dias" valor={dados.semana} />
          </Indicadores>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Botao titulo="Novo aluno" icone="mais" tipo="primario" onPress={() => router.push('/professor/aluno/formulario')} estilo={{ flexGrow: 1 }} />
            <Botao titulo="Montar ficha" icone="camadas" onPress={() => setEscolher(true)} estilo={{ flexGrow: 1 }} desativado={!ativos.length} />
          </View>
          {ativos.length === 0 ? (
            <Vazio texto="Você ainda não tem alunos. Comece cadastrando o primeiro em Novo aluno." />
          ) : (
            <DuasColunas>
              <Secao titulo="Precisa de atenção">
                {atencao.length ? (
                  <Lista>
                    {atencao.map((a, i) => (
                      <LinhaAluno key={a.id} aluno={a} ultima={i === atencao.length - 1} />
                    ))}
                  </Lista>
                ) : (
                  <Vazio texto="Tudo em dia." />
                )}
              </Secao>
              <Secao titulo="Últimos treinos dos alunos">
                {dados.sessoes.length ? (
                  <Lista>
                    {dados.sessoes.map((s, i) => (
                      <LinhaSessao key={s.id} sessao={s} mostrarAluno onPress={() => router.push(`/professor/sessao/${s.id}`)} ultima={i === dados.sessoes.length - 1} />
                    ))}
                  </Lista>
                ) : (
                  <Vazio texto="Quando seus alunos registrarem treinos, eles aparecem aqui." />
                )}
              </Secao>
            </DuasColunas>
          )}
        </>
      )}
      <EscolherAluno
        visivel={escolher}
        alunos={ativos}
        titulo="Montar ficha para qual aluno?"
        aoFechar={() => setEscolher(false)}
        aoEscolher={(a) => {
          setEscolher(false);
          router.push({ pathname: '/professor/ficha', params: a.fichaAtiva ? { fichaId: a.fichaAtiva.id } : { alunoId: a.id } });
        }}
      />
    </Tela>
  );
}
