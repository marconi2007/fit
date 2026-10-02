import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useCores } from '@/theme';

/** Só deixa entrar na área quem tem o perfil certo; os outros voltam ao início. */
export function AreaProtegida({ tipo }: { tipo: 'professor' | 'aluno' }) {
  const { carregando, perfil } = useAuth();
  const c = useCores();
  if (carregando)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.superficie2 }}>
        <ActivityIndicator color={c.destaque} size="large" />
      </View>
    );
  if (perfil?.tipo !== tipo) return <Redirect href="/" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
