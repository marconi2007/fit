import { useLocalSearchParams } from 'expo-router';

import { DetalheSessao } from '@/components/sessoes';
import { Estado, Tela } from '@/components/ui';
import { obterSessao } from '@/lib/api';
import { fmtDiaMes } from '@/lib/datas';
import { useDados } from '@/lib/use-dados';

export default function Sessao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dados, erro, carregando, recarregar } = useDados(() => obterSessao(id));
  const titulo = dados ? `Treino de ${fmtDiaMes(dados.finalizada_em)}` : 'Treino';
  return (
    <Tela titulo={titulo} voltar largura="estreita">
      {dados ? <DetalheSessao sessao={dados} /> : <Estado carregando={carregando} erro={erro} recarregar={recarregar} />}
    </Tela>
  );
}
