import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Avatar, Botao, Busca, Chips, Estado, Linha, Lista, Selo, Tela, Texto, Vazio } from '@/components/ui';
import { listarAlunos, type AlunoResumo } from '@/lib/api';
import { fmtRelativo } from '@/lib/datas';
import { iniciais, precisaAtencao, situacaoFicha } from '@/lib/regras';
import { useDados } from '@/lib/use-dados';
import { useCores, useTelaLarga } from '@/theme';

type Filtro = 'todos' | 'vencendo' | 'sem' | 'arquivados';

export default function Alunos() {
  const larga = useTelaLarga();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const { dados, erro, carregando, recarregar } = useDados(listarAlunos);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let l = (dados ?? []).filter((a) => (filtro === 'arquivados' ? a.status === 'arquivado' : a.status === 'ativo'));
    if (filtro === 'vencendo') l = l.filter((a) => a.fichaAtiva && precisaAtencao(a.fichaAtiva));
    if (filtro === 'sem') l = l.filter((a) => !a.fichaAtiva);
    if (q) l = l.filter((a) => a.nome.toLowerCase().includes(q));
    return l;
  }, [dados, busca, filtro]);

  return (
    <Tela titulo="Alunos">
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Busca valor={busca} aoMudar={setBusca} dica="Buscar aluno" />
        </View>
        <Botao titulo="Adicionar" icone="mais" tipo="primario" onPress={() => router.push('/professor/aluno/formulario')} />
      </View>
      <Chips<Filtro>
        opcoes={[
          { valor: 'todos', rotulo: 'Todos ativos' },
          { valor: 'vencendo', rotulo: 'Ficha vencendo' },
          { valor: 'sem', rotulo: 'Sem ficha' },
          { valor: 'arquivados', rotulo: 'Arquivados' },
        ]}
        valor={filtro}
        aoMudar={setFiltro}
      />
      {!dados ? (
        <Estado carregando={carregando} erro={erro} recarregar={recarregar} />
      ) : lista.length === 0 ? (
        <Vazio texto={dados.length === 0 ? 'Nenhum aluno ainda. Toque em Adicionar para cadastrar o primeiro.' : 'Nenhum aluno encontrado.'} />
      ) : larga ? (
        <Tabela alunos={lista} />
      ) : (
        <Lista>
          {lista.map((a, i) => {
            const s = situacaoFicha(a, a.fichaAtiva);
            return (
              <Linha
                key={a.id}
                avatar={iniciais(a.nome)}
                titulo={a.nome}
                sub={!a.usuario_id && a.status === 'ativo' ? 'Convite pendente' : (a.objetivo ?? undefined)}
                direita={<Selo tom={s.tom} texto={s.texto} />}
                onPress={() => router.push(`/professor/aluno/${a.id}`)}
                ultima={i === lista.length - 1}
              />
            );
          })}
        </Lista>
      )}
    </Tela>
  );
}

/** Na tela larga, a lista vira tabela com objetivo e último treino. */
function Tabela({ alunos }: { alunos: AlunoResumo[] }) {
  const c = useCores();
  const col = { aluno: 2.2, objetivo: 1.3, ultimo: 1.4, ficha: 1.2 };
  return (
    <Lista>
      <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.superficie2, borderBottomWidth: 1, borderBottomColor: c.linha, gap: 12 }}>
        <Texto variante="secao" style={{ flex: col.aluno, fontSize: 11 }}>
          Aluno
        </Texto>
        <Texto variante="secao" style={{ flex: col.objetivo, fontSize: 11 }}>
          Objetivo
        </Texto>
        <Texto variante="secao" style={{ flex: col.ultimo, fontSize: 11 }}>
          Último treino
        </Texto>
        <Texto variante="secao" style={{ flex: col.ficha, fontSize: 11 }}>
          Ficha
        </Texto>
      </View>
      {alunos.map((a, i) => {
        const s = situacaoFicha(a, a.fichaAtiva);
        return (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            onPress={() => router.push(`/professor/aluno/${a.id}`)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: pressed ? c.superficie2 : 'transparent',
              borderBottomWidth: i === alunos.length - 1 ? 0 : 1,
              borderBottomColor: c.linha,
            })}>
            <View style={{ flex: col.aluno, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <Avatar texto={iniciais(a.nome)} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Texto variante="forte" numberOfLines={1}>
                  {a.nome}
                </Texto>
                {!a.usuario_id && a.status === 'ativo' ? <Texto variante="pequeno">Convite pendente</Texto> : null}
              </View>
            </View>
            <Texto variante="suave" style={{ flex: col.objetivo }} numberOfLines={1}>
              {a.objetivo ?? '-'}
            </Texto>
            <Texto variante="suave" style={{ flex: col.ultimo }} numberOfLines={1}>
              {a.ultimaSessao ? `${fmtRelativo(a.ultimaSessao.finalizada_em)} · Treino ${a.ultimaSessao.divisao_nome}` : 'Nenhum ainda'}
            </Texto>
            <View style={{ flex: col.ficha }}>
              <Selo tom={s.tom} texto={s.texto} />
            </View>
          </Pressable>
        );
      })}
    </Lista>
  );
}
