import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Icone } from '@/components/icone';
import { TelaAcesso } from '@/components/tela-acesso';
import { Aviso, Botao, Campo, Texto } from '@/components/ui';
import { aceitarConvite, validarConvite } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { primeiroNome } from '@/lib/regras';
import { mensagemDeErro, supabase } from '@/lib/supabase';
import { useCores } from '@/theme';

/** Tela que o aluno abre pelo link do convite para criar a senha. */
export default function Convite() {
  const c = useCores();
  const { codigo: bruto } = useLocalSearchParams<{ codigo: string }>();
  const codigo = String(bruto ?? '').toUpperCase();
  const { sessao, perfil, recarregarPerfil, sair } = useAuth();
  const [convite, setConvite] = useState<{ aluno_nome: string; professor_nome: string } | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarEmail, setConfirmarEmail] = useState(false);

  useEffect(() => {
    validarConvite(codigo)
      .then(setConvite)
      .catch((e) => {
        setConvite(null);
        setErro(mensagemDeErro(e));
      });
  }, [codigo]);

  async function criarConta() {
    setErro(null);
    if (!email.trim()) return setErro('Escreva seu e-mail.');
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.');
    if (!aceito) return setErro('Para continuar, aceite o uso dos seus dados de treino e saúde.');
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: { data: { codigo_convite: codigo } },
    });
    setEnviando(false);
    if (error) return setErro(mensagemDeErro(error));
    if (!data.session) return setConfirmarEmail(true);
    router.replace('/');
  }

  async function aceitarComContaAtual() {
    setErro(null);
    setEnviando(true);
    try {
      await aceitarConvite(codigo);
      await recarregarPerfil();
      router.replace('/');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (convite === undefined)
    return (
      <TelaAcesso>
        <ActivityIndicator color={c.destaque} />
      </TelaAcesso>
    );

  if (!convite)
    return (
      <TelaAcesso>
        <Texto variante="grande">Convite inválido</Texto>
        <Texto variante="suave">{erro ?? 'Este convite expirou ou já foi usado. Peça um novo link ao seu professor.'}</Texto>
        <Botao titulo="Ir para o login" onPress={() => router.replace('/entrar')} bloco />
      </TelaAcesso>
    );

  if (confirmarEmail)
    return (
      <TelaAcesso>
        <Aviso tom="ok" texto={`Conta criada. Enviamos um link de confirmação para ${email.trim()}.`} />
        <Texto variante="suave">Confirme o e-mail e depois entre com sua senha para ver seu treino.</Texto>
        <Botao titulo="Ir para o login" tipo="primario" onPress={() => router.replace('/entrar')} bloco />
      </TelaAcesso>
    );

  const titulo = `Olá, ${primeiroNome(convite.aluno_nome)}!`;
  const sub = `${convite.professor_nome} convidou você para ver seus treinos no App Academia.`;

  // Já está logado: aceita com a conta atual (se ela ainda não for de professor ou de outro aluno).
  if (sessao)
    return (
      <TelaAcesso>
        <Texto variante="grande">{titulo}</Texto>
        <Texto variante="suave">{sub}</Texto>
        {perfil?.tipo === 'sem_vinculo' ? (
          <>
            <Texto variante="corpo">Você está conectado como {sessao.user.email}. Usar esta conta?</Texto>
            {erro ? (
              <Texto cor={c.critico} variante="forte">
                {erro}
              </Texto>
            ) : null}
            <Botao titulo="Aceitar convite" tipo="primario" carregando={enviando} onPress={aceitarComContaAtual} bloco />
          </>
        ) : (
          <Texto variante="corpo">Você está conectado como {sessao.user.email}, que já tem outro acesso. Saia para criar a conta do aluno.</Texto>
        )}
        <Botao titulo="Sair e usar outra conta" tipo="fantasma" onPress={sair} />
      </TelaAcesso>
    );

  return (
    <TelaAcesso>
      <Texto variante="grande">{titulo}</Texto>
      <Texto variante="suave">{sub} Crie sua senha para entrar.</Texto>
      <Campo rotulo="Seu e-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      <Campo rotulo="Crie uma senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="new-password" placeholder="Pelo menos 6 caracteres" />
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: aceito }} onPress={() => setAceito(!aceito)} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            borderWidth: 1.5,
            borderColor: aceito ? c.destaque : c.linha,
            backgroundColor: aceito ? c.destaque : c.superficie,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
          }}>
          {aceito ? <Icone nome="check" tamanho={16} cor={c.sobreDestaque} /> : null}
        </View>
        <Texto variante="suave" style={{ flex: 1 }}>
          Concordo que meu professor guarde e veja meus dados de treino e as restrições de saúde que eu informar. Posso pedir a exclusão da conta quando quiser.
        </Texto>
      </Pressable>
      {erro ? (
        <Texto cor={c.critico} variante="forte">
          {erro}
        </Texto>
      ) : null}
      <Botao titulo="Criar senha e entrar" tipo="primario" carregando={enviando} onPress={criarConta} bloco />
      <Botao titulo="Já tenho conta" tipo="fantasma" onPress={() => router.replace('/entrar')} />
    </TelaAcesso>
  );
}
