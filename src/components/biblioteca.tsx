import { useMemo, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { Icone } from './icone';
import { Botao, Busca, Campo, Chips, Folha, Selo, Texto, Vazio, useToast } from './ui';
import { criarExercicio } from '@/lib/api';
import { mensagemDeErro } from '@/lib/supabase';
import { GRUPOS, type Exercicio } from '@/lib/tipos';
import { useCores } from '@/theme';

type Props = {
  exercicios: Exercicio[];
  professorId: string;
  aoCriar: (e: Exercicio) => void;
  /** Modo de escolha (editor de ficha): mostra "Adicionar" em cada exercício. */
  aoEscolher?: (e: Exercicio) => void;
  jaNoTreino?: Set<string>;
  tituloEscolha?: string;
};

export function Biblioteca({ exercicios, professorId, aoCriar, aoEscolher, jaNoTreino, tituloEscolha }: Props) {
  const c = useCores();
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState<string>('Todos');
  const [criando, setCriando] = useState(false);

  const grupos = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtrados = exercicios.filter((e) => (grupo === 'Todos' || e.grupo_muscular === grupo) && (!q || e.nome.toLowerCase().includes(q)));
    const ordem = (g: string) => {
      const i = (GRUPOS as readonly string[]).indexOf(g);
      return i === -1 ? 99 : i;
    };
    const mapa = new Map<string, Exercicio[]>();
    filtrados
      .sort((a, b) => ordem(a.grupo_muscular) - ordem(b.grupo_muscular) || a.nome.localeCompare(b.nome))
      .forEach((e) => mapa.set(e.grupo_muscular, [...(mapa.get(e.grupo_muscular) ?? []), e]));
    return [...mapa.entries()];
  }, [exercicios, busca, grupo]);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Texto variante="secao" style={{ flex: 1 }}>
          {tituloEscolha ?? 'Biblioteca de exercícios'}
        </Texto>
        <Botao titulo="Criar exercício" icone="mais" pequeno onPress={() => setCriando(true)} />
      </View>
      <Busca valor={busca} aoMudar={setBusca} dica="Buscar exercício" />
      <Chips opcoes={['Todos', ...GRUPOS].map((g) => ({ valor: g, rotulo: g }))} valor={grupo} aoMudar={setGrupo} />
      {grupos.length === 0 ? <Vazio texto="Nenhum exercício encontrado. Crie um novo com o botão acima." /> : null}
      {grupos.map(([g, lista]) => (
        <View key={g}>
          <Texto variante="secao" style={{ marginTop: 6, marginBottom: 2, fontSize: 11.5 }}>
            {g}
          </Texto>
          {lista.map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.linha }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Texto variante="forte" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {e.nome}
                  </Texto>
                  {e.professor_id ? <Selo tom="acc" texto="Seu" /> : null}
                </View>
                {e.equipamento ? <Texto variante="pequeno">{e.equipamento}</Texto> : null}
              </View>
              {e.youtube_url ? <LinkVideo url={e.youtube_url} /> : null}
              {aoEscolher ? (
                jaNoTreino?.has(e.id) ? (
                  <Selo tom="ok" texto="No treino" />
                ) : (
                  <Botao titulo="Adicionar" tipo="primario" pequeno onPress={() => aoEscolher(e)} />
                )
              ) : null}
            </View>
          ))}
        </View>
      ))}
      <NovoExercicio
        visivel={criando}
        professorId={professorId}
        aoFechar={() => setCriando(false)}
        aoCriar={(e) => {
          setCriando(false);
          aoCriar(e);
        }}
      />
    </View>
  );
}

export function LinkVideo({ url, rotulo = 'Vídeo' }: { url: string; rotulo?: string }) {
  const c = useCores();
  return (
    <Pressable accessibilityRole="link" onPress={() => Linking.openURL(url)} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}>
      <Icone nome="play" tamanho={14} cor={c.destaque} />
      <Text style={{ color: c.destaque, fontWeight: '600', fontSize: 13 }}>{rotulo}</Text>
    </Pressable>
  );
}

function NovoExercicio({ visivel, professorId, aoFechar, aoCriar }: { visivel: boolean; professorId: string; aoFechar: () => void; aoCriar: (e: Exercicio) => void }) {
  const c = useCores();
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState<string>(GRUPOS[0]);
  const [equipamento, setEquipamento] = useState('');
  const [video, setVideo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    setErro(null);
    if (!nome.trim()) return setErro('Escreva o nome do exercício.');
    if (video.trim() && !/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(video.trim())) return setErro('Cole um link do YouTube (youtube.com ou youtu.be).');
    setSalvando(true);
    try {
      const e = await criarExercicio(professorId, {
        nome: nome.trim(),
        grupo_muscular: grupo,
        equipamento: equipamento.trim() || null,
        youtube_url: video.trim() || null,
      });
      setNome('');
      setEquipamento('');
      setVideo('');
      toast(`${e.nome} criado na sua biblioteca.`);
      aoCriar(e);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Folha visivel={visivel} aoFechar={aoFechar} titulo="Criar exercício">
      <Texto variante="suave">Fica só na sua biblioteca, marcado como Seu.</Texto>
      <Campo rotulo="Nome" value={nome} onChangeText={setNome} placeholder="Ex.: Hip thrust na máquina" />
      <View style={{ gap: 6 }}>
        <Texto variante="rotulo">Grupo muscular</Texto>
        <Chips quebrar opcoes={GRUPOS.map((g) => ({ valor: g, rotulo: g }))} valor={grupo} aoMudar={setGrupo} />
      </View>
      <Campo rotulo="Equipamento" value={equipamento} onChangeText={setEquipamento} placeholder="Ex.: Máquina" />
      <Campo rotulo="Link do vídeo no YouTube" value={video} onChangeText={setVideo} autoCapitalize="none" keyboardType="url" placeholder="https://youtube.com/watch?v=..." />
      {erro ? (
        <Texto cor={c.critico} variante="forte">
          {erro}
        </Texto>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Botao titulo="Cancelar" onPress={aoFechar} estilo={{ flex: 1 }} />
        <Botao titulo="Criar exercício" tipo="primario" carregando={salvando} onPress={salvar} estilo={{ flex: 1 }} />
      </View>
    </Folha>
  );
}
