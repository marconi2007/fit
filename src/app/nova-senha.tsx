import { router } from 'expo-router';
import { useState } from 'react';

import { TelaAcesso } from '@/components/tela-acesso';
import { Botao, Campo, Texto, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { mensagemDeErro, supabase } from '@/lib/supabase';
import { useCores } from '@/theme';

/** Aberta pelo link do e-mail de recuperação: o link já deixa a pessoa logada. */
export default function NovaSenha() {
  const c = useCores();
  const { sessao } = useAuth();
  const toast = useToast();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setErro(null);
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) return setErro(mensagemDeErro(error));
    toast('Senha alterada.');
    router.replace('/');
  }

  return (
    <TelaAcesso>
      <Texto variante="grande">Criar nova senha</Texto>
      {sessao ? (
        <>
          <Campo rotulo="Nova senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="new-password" />
          {erro ? (
            <Texto cor={c.critico} variante="forte">
              {erro}
            </Texto>
          ) : null}
          <Botao titulo="Salvar senha" tipo="primario" carregando={enviando} onPress={salvar} bloco />
        </>
      ) : (
        <>
          <Texto variante="suave">Este link expirou ou já foi usado. Peça um novo na tela de login.</Texto>
          <Botao titulo="Ir para o login" onPress={() => router.replace('/entrar')} bloco />
        </>
      )}
    </TelaAcesso>
  );
}
