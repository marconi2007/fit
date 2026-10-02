import { useState } from 'react';
import { View } from 'react-native';

import { Avatar, Botao, Campo, Tela, Texto, useToast } from './ui';
import { atualizarMeuPerfil } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { iniciais } from '@/lib/regras';
import { mensagemDeErro } from '@/lib/supabase';
import { useCores } from '@/theme';

/** Perfil do professor ou do aluno: nome, telefone e sair. */
export function TelaPerfil() {
  const c = useCores();
  const toast = useToast();
  const { perfil, sessao, recarregarPerfil, sair } = useAuth();
  const dados = perfil?.tipo === 'professor' ? perfil.professor : perfil?.tipo === 'aluno' ? perfil.aluno : null;
  const [nome, setNome] = useState(dados?.nome ?? '');
  const [telefone, setTelefone] = useState(dados?.telefone ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const descricao = perfil?.tipo === 'professor' ? 'Professor' : perfil?.tipo === 'aluno' ? `Aluno de ${perfil.professorNome}` : '';

  async function salvar() {
    setErro(null);
    if (!nome.trim()) return setErro('Escreva seu nome.');
    setSalvando(true);
    try {
      await atualizarMeuPerfil(nome.trim(), telefone.trim());
      await recarregarPerfil();
      toast('Perfil salvo.');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Tela titulo="Perfil" largura="estreita">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar texto={iniciais(dados?.nome ?? '?')} grande />
        <View>
          <Texto variante="grande">{dados?.nome}</Texto>
          <Texto variante="suave">{descricao}</Texto>
        </View>
      </View>
      <Campo rotulo="Nome" value={nome} onChangeText={setNome} autoComplete="name" />
      <Campo rotulo="E-mail" value={sessao?.user.email ?? ''} editable={false} style={{ opacity: 0.6 }} />
      <Campo rotulo="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" placeholder="(11) 90000-0000" />
      {erro ? (
        <Texto cor={c.critico} variante="forte">
          {erro}
        </Texto>
      ) : null}
      <Botao titulo="Salvar alterações" tipo="primario" carregando={salvando} onPress={salvar} bloco />
      <Botao titulo="Sair" onPress={sair} bloco />
    </Tela>
  );
}
