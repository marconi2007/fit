import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Marca } from './marca';
import { useCores, useTelaLarga } from '@/theme';

/** Moldura das telas de login, cadastro e convite (com painel azul na tela larga). */
export function TelaAcesso({ children }: { children: ReactNode }) {
  const c = useCores();
  const larga = useTelaLarga();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.superficie, flexDirection: 'row' }}>
      {larga ? (
        <View style={{ width: '44%', backgroundColor: c.destaque, padding: 48, justifyContent: 'flex-end', gap: 12 }}>
          <Text style={{ color: c.sobreDestaque, fontSize: 56, fontWeight: '800', lineHeight: 56, letterSpacing: -1 }}>A ficha do aluno, no bolso dele.</Text>
          <Text style={{ color: c.sobreDestaque, fontSize: 17, opacity: 0.9, maxWidth: 420 }}>
            Você monta o treino no celular ou no computador. O aluno abre na academia e registra cada série.
          </Text>
        </View>
      ) : null}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: larga ? 64 : 24 }}>
          <View style={{ width: '100%', maxWidth: 440, alignSelf: 'center', gap: 14 }}>
            <Marca tamanho="grande" />
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
