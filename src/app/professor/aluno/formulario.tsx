import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Botao, Campo, Chips, Estado, Tela, Texto, useToast } from '@/components/ui';
import { obterAluno, salvarAluno } from '@/lib/api';
import { brParaIso, isoParaBr, mascaraData } from '@/lib/datas';
import { mensagemDeErro } from '@/lib/supabase';
import { OBJETIVOS } from '@/lib/tipos';
import { useCores } from '@/theme';

/** Cadastro de aluno novo (sem id) ou edição (com ?id=). */
export default function FormularioAluno() {
  const c = useCores();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [carregando, setCarregando] = useState(!!id);
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [objetivo, setObjetivo] = useState<string>('Hipertrofia');
  const [restricoes, setRestricoes] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) return;
    obterAluno(id)
      .then((a) => {
        setNome(a.nome);
        setContato(a.telefone ?? a.email ?? '');
        setNascimento(isoParaBr(a.data_nascimento));
        setObjetivo(a.objetivo ?? 'Hipertrofia');
        setRestricoes(a.restricoes ?? '');
      })
      .catch((e) => setErro(mensagemDeErro(e)))
      .finally(() => setCarregando(false));
  }, [id]);

  async function salvar() {
    setErro(null);
    if (!nome.trim()) return setErro('Escreva o nome do aluno para salvar.');
    const nasc = nascimento.trim() ? brParaIso(nascimento) : null;
    if (nascimento.trim() && !nasc) return setErro('Data de nascimento inválida. Use DD/MM/AAAA.');
    const ehEmail = contato.includes('@');
    setSalvando(true);
    try {
      const novoId = await salvarAluno(
        {
          nome: nome.trim(),
          email: ehEmail ? contato.trim() : null,
          telefone: !ehEmail && contato.trim() ? contato.trim() : null,
          data_nascimento: nasc,
          objetivo,
          restricoes: restricoes.trim() || null,
        },
        id
      );
      if (id) {
        toast('Alterações salvas.');
        router.back();
      } else {
        toast(`${nome.trim()} cadastrado. Agora envie o convite.`);
        router.replace({ pathname: '/professor/aluno/[id]', params: { id: novoId, convite: '1' } });
      }
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Tela titulo={id ? 'Editar aluno' : 'Novo aluno'} voltar largura="estreita">
      {carregando ? (
        <Estado carregando erro={null} />
      ) : (
        <>
          <Campo rotulo="Nome completo" value={nome} onChangeText={setNome} placeholder="Ex.: Gabriel Alves" autoComplete="name" />
          <Campo rotulo="Telefone ou e-mail" value={contato} onChangeText={setContato} placeholder="(11) 90000-0000" autoCapitalize="none" />
          <Campo
            rotulo="Data de nascimento"
            value={nascimento}
            onChangeText={(t) => setNascimento(mascaraData(t))}
            placeholder="DD/MM/AAAA"
            keyboardType="number-pad"
            maxLength={10}
          />
          <View style={{ gap: 6 }}>
            <Texto variante="rotulo">Objetivo</Texto>
            <Chips quebrar opcoes={OBJETIVOS.map((o) => ({ valor: o as string, rotulo: o }))} valor={objetivo} aoMudar={setObjetivo} />
          </View>
          <Campo rotulo="Restrições e lesões" value={restricoes} onChangeText={setRestricoes} multiline placeholder="Ex.: hérnia de disco L5, evitar impacto" />
          {erro ? (
            <Texto cor={c.critico} variante="forte">
              {erro}
            </Texto>
          ) : null}
          <Botao titulo={id ? 'Salvar alterações' : 'Salvar e enviar convite'} tipo="primario" carregando={salvando} onPress={salvar} bloco />
          {!id ? <Texto variante="suave">Depois de salvar, você envia o link de convite pelo WhatsApp. O aluno entra e já vê a ficha.</Texto> : null}
        </>
      )}
    </Tela>
  );
}
