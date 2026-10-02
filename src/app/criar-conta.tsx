import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { TelaAcesso } from '@/components/tela-acesso';
import { Aviso, Botao, Campo, Texto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { mensagemDeErro, supabase } from '@/lib/supabase';
import { useCores } from '@/theme';

export default function CriarConta() {
  const c = useCores();
  const { sessao } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  if (sessao) return <Redirect href="/" />;

  async function criar() {
    setErro(null);
    if (!nome.trim()) return setErro('Escreva seu nome.');
    if (!email.trim()) return setErro('Escreva seu e-mail.');
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { tipo: 'professor', nome: nome.trim() } },
    });
    setEnviando(false);
    if (error) return setErro(mensagemDeErro(error));
    if (!data.session) setConfirmarEmail(true);
  }

  if (confirmarEmail)
    return (
      <TelaAcesso>
        <Aviso tom="ok" texto={`Conta criada. Enviamos um link de confirmação para ${email.trim()}.`} />
        <Texto variante="suave">Abra o e-mail, confirme e depois entre com sua senha.</Texto>
        <Botao titulo="Ir para o login" tipo="primario" onPress={() => router.replace('/entrar')} bloco />
      </TelaAcesso>
    );

  return (
    <TelaAcesso>
      <Texto variante="grande">Criar conta de professor</Texto>
      <Texto variante="suave">Com a conta você cadastra seus alunos e monta as fichas. Cada professor vê só os próprios alunos.</Texto>
      <Campo rotulo="Seu nome" value={nome} onChangeText={setNome} autoComplete="name" placeholder="Ex.: Marconi Silva" />
      <Campo rotulo="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="new-password" placeholder="Pelo menos 6 caracteres" />
      {erro ? (
        <Texto cor={c.critico} variante="forte">
          {erro}
        </Texto>
      ) : null}
      <Botao titulo="Criar conta" tipo="primario" carregando={enviando} onPress={criar} bloco />
      <Botao titulo="Já tenho conta" tipo="fantasma" onPress={() => router.replace('/entrar')} />
    </TelaAcesso>
  );
}
