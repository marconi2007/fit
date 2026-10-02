import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from './icone';
import { useCores, useTelaLarga } from '@/theme';

type Aba = { nome: string; titulo: string; icone: NomeIcone };

/** Abas embaixo no celular e menu lateral na tela larga. */
export function Abas({ abas }: { abas: Aba[] }) {
  const c = useCores();
  const larga = useTelaLarga();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: larga ? 'left' : 'bottom',
        tabBarVariant: larga ? 'material' : 'uikit',
        tabBarActiveTintColor: c.destaque,
        tabBarInactiveTintColor: c.suave,
        tabBarActiveBackgroundColor: larga ? c.destaqueSuave : undefined,
        tabBarLabelPosition: larga ? 'beside-icon' : 'below-icon',
        tabBarLabelStyle: { fontWeight: '600', fontSize: larga ? 14 : 11 },
        tabBarItemStyle: larga ? { borderRadius: 10, marginHorizontal: 10, marginVertical: 1, paddingHorizontal: 6, justifyContent: 'flex-start' } : undefined,
        tabBarStyle: larga
          ? { width: 220, backgroundColor: c.superficie, borderRightColor: c.linha, paddingTop: insets.top + 12 }
          : { backgroundColor: c.superficie, borderTopColor: c.linha },
        sceneStyle: { backgroundColor: c.superficie2 },
      }}>
      {abas.map((a) => (
        <Tabs.Screen
          key={a.nome}
          name={a.nome}
          options={{
            title: a.titulo,
            tabBarIcon: ({ color }) => <Icone nome={a.icone} tamanho={22} cor={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
