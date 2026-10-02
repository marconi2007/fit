import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EscolherAluno } from '@/components/alunos';
import { Botao, Cartao, confirmar, Estado, Letra, Tela, Texto, useToast, Vazio } from '@/components/ui';
import { excluirModelo, listarAlunos, listarModelos, type AlunoResumo } from '@/lib/api';
import { mensagemDeErro } from '@/lib/supabase';
import type { Ficha } from '@/lib/tipos';
import { useDados } from '@/lib/use-dados';
import { useTelaLarga } from '@/theme';

export default function Modelos() {
  const larga = useTelaLarga();
  const toast = useToast();
  const [aplicar, setAplicar] = useState<{ modelo: Ficha; alunos: AlunoResumo[] } | null>(null);
  const { dados, erro, carregando, recarregar } = useDados(listarModelos);

  async function escolherAluno(modelo: Ficha) {
    try {
      const alunos = (await listarAlunos()).filter((a) => a.status === 'ativo');
      if (!alunos.length) return toast('Cadastre um aluno antes de aplicar um modelo.');
      setAplicar({ modelo, alunos });
    } catch (e) {
      toast(mensagemDeErro(e));
    }
  }

  async function excluir(m: Ficha) {
    if (!(await confirmar(`Excluir o modelo ${m.nome}?`, 'As fichas que já foram aplicadas aos alunos não mudam.', 'Excluir modelo'))) return;
    try {
      await excluirModelo(m.id);
      toast('Modelo excluído.');
      recarregar();
    } catch (e) {
      toast(mensagemDeErro(e));
    }
  }

  return (
    <Tela titulo="Modelos de ficha" direita={<Botao titulo="Novo modelo" icone="mais" pequeno onPress={() => router.push('/professor/ficha')} />}>
      <Texto variante="suave">Modelos são fichas prontas para aplicar a qualquer aluno. Ao aplicar, você ainda pode ajustar cargas e exercícios.</Texto>
      {!dados ? (
        <Estado carregando={carregando} erro={erro} recarregar={recarregar} />
      ) : dados.length === 0 ? (
        <Vazio texto="Nenhum modelo ainda. Crie um em Novo modelo, ou use Salvar como modelo no editor de ficha de um aluno." />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {dados.map((m) => {
            const total = m.divisoes.reduce((t, d) => t + d.itens_treino.length, 0);
            return (
              <Cartao key={m.id} estilo={{ gap: 10, flexBasis: larga ? 300 : '100%', flexGrow: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {m.divisoes.map((d) => (
                    <Letra key={d.id} letra={d.nome} pequena />
                  ))}
                </View>
                <Texto variante="subtitulo">{m.nome}</Texto>
                <Texto variante="suave">{m.divisoes.map((d) => d.foco || `Treino ${d.nome}`).join(' · ')}</Texto>
                <Texto variante="suave">
                  {m.divisoes.length} {m.divisoes.length === 1 ? 'divisão' : 'divisões'} · {total} exercícios
                </Texto>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Botao titulo="Aplicar a um aluno" tipo="primario" pequeno onPress={() => escolherAluno(m)} estilo={{ flexGrow: 1 }} />
                  <Botao titulo="Editar" pequeno onPress={() => router.push({ pathname: '/professor/ficha', params: { fichaId: m.id } })} />
                  <Botao titulo="Duplicar" pequeno onPress={() => router.push({ pathname: '/professor/ficha', params: { base: m.id } })} />
                  <Botao titulo="Excluir" tipo="perigo" pequeno onPress={() => excluir(m)} />
                </View>
              </Cartao>
            );
          })}
        </View>
      )}
      <EscolherAluno
        visivel={!!aplicar}
        alunos={aplicar?.alunos ?? []}
        titulo="Aplicar modelo a qual aluno?"
        aviso="A ficha atual do aluno é substituída quando você salvar."
        aoFechar={() => setAplicar(null)}
        aoEscolher={(a) => {
          const modelo = aplicar!.modelo;
          setAplicar(null);
          router.push({ pathname: '/professor/ficha', params: { alunoId: a.id, base: modelo.id } });
        }}
      />
    </Tela>
  );
}
