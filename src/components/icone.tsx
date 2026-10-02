import Svg, { Circle, Path } from 'react-native-svg';

const DESENHOS = {
  inicio: ['M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'],
  alunos: ['c:9,8,3.5', 'M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5', 'M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c1.9.8 3.1 2.6 3.5 5.2'],
  camadas: ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'],
  halter: ['M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11'],
  perfil: ['c:12,8,4', 'M4 21c1-4 4.2-6 8-6s7 2 8 6'],
  relogio: ['c:12,12,9', 'M12 7v5l3 2'],
  mais: ['M12 5v14M5 12h14'],
  busca: ['c:11,11,7', 'M20 20l-4-4'],
  play: ['M8 5l11 7-11 7z'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  esquerda: ['M15 5l-7 7 7 7'],
  direita: ['M9 5l7 7-7 7'],
  fechar: ['M6 6l12 12M18 6L6 18'],
  cima: ['M12 19V5M6 11l6-6 6 6'],
  baixo: ['M12 5v14M6 13l6 6 6-6'],
  lixo: ['M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3'],
} as const;

export type NomeIcone = keyof typeof DESENHOS;

export function Icone({ nome, tamanho = 20, cor }: { nome: NomeIcone; tamanho?: number; cor: string }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      {DESENHOS[nome].map((d, i) => {
        if (d.startsWith('c:')) {
          const [cx, cy, r] = d.slice(2).split(',').map(Number);
          return <Circle key={i} cx={cx} cy={cy} r={r} />;
        }
        return <Path key={i} d={d} />;
      })}
    </Svg>
  );
}
