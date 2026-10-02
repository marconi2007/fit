import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { TelaAcesso } from '@/components/tela-acesso';
import { Botao, BotaoTexto, Campo, Segmentado, Texto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { mensagemDeErro, supabase } from '@/lib/supabase';
import { useCores } from '@/theme';

export default function Entrar() {
  const c = useCores();
  const { sessao } = useAuth();
  const [quem, setQuem] = useState<'prof' | 'aluno'>('prof');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (sessao) return <Redirect href="/" />;

  async function entrar() {
    setErro(null);
    if (!email.trim() || !senha) return setErro('Preencha e-mail e senha.');
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) setErro(mensagemDeErro(error));
  }

  return (
    <TelaAcesso>
      <Texto variante="suave">Entre para continuar.</Texto>
      <Segmentado
        opcoes={[
          { valor: 'prof', rotulo: 'Sou professor' },
          { valor: 'aluno', rotulo: 'Sou aluno' },
        ]}
        valor={quem}
        aoMudar={setQuem}
      />
      <Campo rotulo="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="password" onSubmitEditing={entrar} />
      {erro ? (
        <Texto cor={c.critico} variante="forte">
          {erro}
        </Texto>
      ) : null}
      <Botao titulo="Entrar" tipo="primario" carregando={enviando} onPress={entrar} bloco />
      <View style={{ alignItems: 'center' }}>
        <BotaoTexto titulo="Esqueci minha senha" onPress={() => router.push('/recuperar-senha')} />
      </View>
      {quem === 'prof' ? (
        <>
          <Texto variante="pequeno" style={{ textAlign: 'center' }}>
            ou
          </Texto>
          <Botao titulo="Criar conta de professor" onPress={() => router.push('/criar-conta')} bloco />
        </>
      ) : (
        <View style={{ gap: 10, marginTop: 6 }}>
          <Texto variante="suave" style={{ textAlign: 'center' }}>
            Primeiro acesso? Abra o link de convite que seu professor mandou, ou digite o código abaixo.
          </Texto>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <Campo rotulo="Código do convite" value={codigo} onChangeText={(t) => setCodigo(t.toUpperCase())} autoCapitalize="characters" />
            <Botao titulo="Usar" desativado={codigo.trim().length < 6} onPress={() => router.push(`/convite/${codigo.trim()}`)} />
          </View>
        </View>
      )}
    </TelaAcesso>
  );
}
