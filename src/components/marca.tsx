import { Text, View } from 'react-native';

import { Icone } from './icone';
import { useCores } from '@/theme';

export function Marca({ tamanho = 'normal' }: { tamanho?: 'normal' | 'grande' }) {
  const c = useCores();
  const g = tamanho === 'grande';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: g ? 40 : 34, height: g ? 40 : 34, borderRadius: 10, backgroundColor: c.destaque, alignItems: 'center', justifyContent: 'center' }}>
        <Icone nome="halter" tamanho={g ? 24 : 20} cor={c.sobreDestaque} />
      </View>
      <Text style={{ fontSize: g ? 28 : 21, fontWeight: '800', color: c.texto, letterSpacing: -0.3 }}>App Academia</Text>
    </View>
  );
}
