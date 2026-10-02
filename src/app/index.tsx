import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Botao, Campo, Cartao, Tela, Texto } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { supabaseConfigurado } from '@/lib/supabase';
import { useCores } from '@/theme';

/** Porta de entrada: manda cada pessoa para a área certa conforme o login. */
export default function Inicio() {
  const { carregando, sessao, perfil, erro, recarregarPerfil, sair } = useAuth();
  const c = useCores();
  const [codigo, setCodigo] = useState('');

  if (!supabaseConfigurado) return <FaltaConfigurar />;
  if (carregando)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.superficie2 }}>
        <ActivityIndicator color={c.destaque} size="large" />
      </View>
    );
  if (!sessao) return <Redirect href="/entrar" />;
  if (erro)
    return (
      <Tela titulo="App Academia" largura="estreita">
        <Texto cor={c.critico} variante="forte">
          {erro}
        </Texto>
        <Botao titulo="Tentar de novo" onPress={recarregarPerfil} />
        <Botao titulo="Sair" tipo="fantasma" onPress={sair} />
      </Tela>
    );
  if (perfil?.tipo === 'professor') return <Redirect href="/professor" />;
  if (perfil?.tipo === 'aluno') return <Redirect href="/aluno" />;

  // Conta criada, mas ainda sem ligação com um professor ou aluno.
  return (
    <Tela titulo="Quase lá" largura="estreita">
      <Texto variante="corpo">
        Sua conta ({sessao.user.email}) ainda não está ligada a um professor. Se você é aluno, digite o código do convite que seu professor enviou.
      </Texto>
      <Cartao estilo={{ gap: 12 }}>
        <Campo rotulo="Código do convite" value={codigo} onChangeText={(t) => setCodigo(t.toUpperCase())} autoCapitalize="characters" placeholder="Ex.: K7P3Q9AB" />
        <Botao titulo="Usar convite" tipo="primario" desativado={codigo.trim().length < 6} onPress={() => router.push(`/convite/${codigo.trim()}`)} />
      </Cartao>
      <Botao titulo="Sair" tipo="fantasma" onPress={sair} />
    </Tela>
  );
}

function FaltaConfigurar() {
  return (
    <Tela titulo="Configuração pendente" largura="estreita">
      <Texto variante="corpo">
        O app ainda não sabe qual projeto do Supabase usar. Copie o arquivo .env.exemplo para .env, preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY e
        reinicie com npx expo start.
      </Texto>
      <Texto variante="suave">O passo a passo completo está no README do projeto.</Texto>
    </Tela>
  );
}
