import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';

import { TelaAcesso } from '@/components/tela-acesso';
import { Aviso, Botao, Campo, Texto } from '@/components/ui';
import { mensagemDeErro, supabase } from '@/lib/supabase';
import { useCores } from '@/theme';

export default function RecuperarSenha() {
  const c = useCores();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErro(null);
    if (!email.trim()) return setErro('Escreva seu e-mail.');
    setEnviando(true);
    const base = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, '');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: base ? `${base}/nova-senha` : Linking.createURL('/nova-senha'),
    });
    setEnviando(false);
    if (error) return setErro(mensagemDeErro(error));
    setEnviado(true);
  }

  return (
    <TelaAcesso>
      <Texto variante="grande">Esqueci minha senha</Texto>
      {enviado ? (
        <Aviso tom="ok" texto="Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha." />
      ) : (
        <>
          <Texto variante="suave">Enviamos um link para você criar uma nova senha.</Texto>
          <Campo rotulo="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          {erro ? (
            <Texto cor={c.critico} variante="forte">
              {erro}
            </Texto>
          ) : null}
          <Botao titulo="Enviar link" tipo="primario" carregando={enviando} onPress={enviar} bloco />
        </>
      )}
      <Botao titulo="Voltar ao login" tipo="fantasma" onPress={() => router.replace('/entrar')} />
    </TelaAcesso>
  );
}
