import { router } from 'expo-router';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from './icone';
import type { Tom } from '@/lib/regras';
import { useCores, useTelaLarga } from '@/theme';

// ------------------------------------------------------------------ texto

type Variante = 'titulo' | 'grande' | 'subtitulo' | 'corpo' | 'forte' | 'suave' | 'pequeno' | 'secao' | 'rotulo';

export function Texto({ variante = 'corpo', cor, style, ...props }: TextProps & { variante?: Variante; cor?: string }) {
  const c = useCores();
  const base: Record<Variante, object> = {
    titulo: { fontSize: 30, fontWeight: '800', letterSpacing: -0.3, color: c.texto },
    grande: { fontSize: 22, fontWeight: '700', color: c.texto },
    subtitulo: { fontSize: 17, fontWeight: '700', color: c.texto },
    corpo: { fontSize: 15, color: c.texto, lineHeight: 21 },
    forte: { fontSize: 15, fontWeight: '600', color: c.texto },
    suave: { fontSize: 14, color: c.suave, lineHeight: 20 },
    pequeno: { fontSize: 12.5, color: c.suave },
    secao: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase', color: c.suave },
    rotulo: { fontSize: 12.5, fontWeight: '600', color: c.suave },
  };
  return <Text style={[base[variante], cor ? { color: cor } : null, style]} {...props} />;
}

// ------------------------------------------------------------------ tela

type TelaProps = {
  titulo?: string;
  voltar?: boolean | (() => void);
  direita?: ReactNode;
  children: ReactNode;
  rolagem?: boolean;
  largura?: 'normal' | 'estreita' | 'total';
  rodape?: ReactNode;
};

/** Estrutura padrão das telas: cabeçalho, conteúdo com largura máxima e rodapé opcional. */
export function Tela({ titulo, voltar, direita, children, rolagem = true, largura = 'normal', rodape }: TelaProps) {
  const c = useCores();
  const larga = useTelaLarga();
  const max = largura === 'estreita' ? 560 : largura === 'total' ? undefined : 1100;
  const conteudo = (
    <View style={[{ padding: larga ? 28 : 16, gap: larga ? 22 : 18, width: '100%', alignSelf: 'center' }, max ? { maxWidth: max } : null]}>{children}</View>
  );
  const aoVoltar = typeof voltar === 'function' ? voltar : () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: c.superficie }}>
      {titulo !== undefined && (
        <View style={[s.cabecalho, { borderBottomColor: c.linha, paddingHorizontal: larga ? 24 : 10, minHeight: larga ? 64 : 54 }]}>
          {voltar ? <BotaoIcone icone="esquerda" rotulo="Voltar" onPress={aoVoltar} /> : null}
          <Text numberOfLines={1} style={{ flex: 1, fontSize: larga ? 24 : 18, fontWeight: '800', color: c.texto, marginLeft: voltar ? 2 : 6 }}>
            {titulo}
          </Text>
          {direita}
        </View>
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.superficie2 }}>
        {rolagem ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
            {conteudo}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
        {rodape}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Mostra carregamento ou erro no lugar do conteúdo enquanto os dados não chegam. */
export function Estado({ carregando, erro, recarregar }: { carregando: boolean; erro: string | null; recarregar?: () => void }) {
  const c = useCores();
  if (erro)
    return (
      <View style={{ gap: 12, alignItems: 'flex-start' }}>
        <Texto cor={c.critico} variante="forte">
          {erro}
        </Texto>
        {recarregar ? <Botao titulo="Tentar de novo" onPress={recarregar} pequeno /> : null}
      </View>
    );
  if (carregando) return <ActivityIndicator color={c.destaque} style={{ marginVertical: 32 }} />;
  return null;
}

// ------------------------------------------------------------------ botões

type BotaoProps = {
  titulo: string;
  onPress?: () => void;
  tipo?: 'primario' | 'normal' | 'fantasma' | 'perigo';
  icone?: NomeIcone;
  pequeno?: boolean;
  carregando?: boolean;
  desativado?: boolean;
  bloco?: boolean;
  estilo?: StyleProp<ViewStyle>;
};

export function Botao({ titulo, onPress, tipo = 'normal', icone, pequeno, carregando, desativado, bloco, estilo }: BotaoProps) {
  const c = useCores();
  const fundo = tipo === 'primario' ? c.destaque : tipo === 'fantasma' || tipo === 'perigo' ? 'transparent' : c.superficie;
  const borda = tipo === 'primario' ? c.destaque : tipo === 'normal' ? c.linha : 'transparent';
  const corTexto = tipo === 'primario' ? c.sobreDestaque : tipo === 'perigo' ? c.critico : tipo === 'fantasma' ? c.suave : c.texto;
  const inativo = desativado || carregando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inativo }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        s.botao,
        {
          backgroundColor: fundo,
          borderColor: borda,
          minHeight: pequeno ? 36 : 46,
          paddingHorizontal: pequeno ? 12 : 16,
          borderRadius: pequeno ? 10 : 12,
          opacity: inativo ? 0.5 : pressed ? 0.8 : 1,
        },
        bloco ? { alignSelf: 'stretch' } : null,
        estilo,
      ]}>
      {carregando ? <ActivityIndicator color={corTexto} size="small" /> : icone ? <Icone nome={icone} tamanho={pequeno ? 16 : 18} cor={corTexto} /> : null}
      <Text style={{ color: corTexto, fontWeight: '700', fontSize: pequeno ? 13.5 : 15 }}>{titulo}</Text>
    </Pressable>
  );
}

export function BotaoIcone({ icone, rotulo, onPress, desativado, cor }: { icone: NomeIcone; rotulo: string; onPress: () => void; desativado?: boolean; cor?: string }) {
  const c = useCores();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      disabled={desativado}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [s.botaoIcone, { opacity: desativado ? 0.3 : 1, backgroundColor: pressed ? c.superficie2 : 'transparent' }]}>
      <Icone nome={icone} tamanho={20} cor={cor ?? c.texto} />
    </Pressable>
  );
}

export function BotaoTexto({ titulo, onPress }: { titulo: string; onPress: () => void }) {
  const c = useCores();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8} style={{ padding: 6 }}>
      <Text style={{ color: c.destaque, fontWeight: '700', fontSize: 15 }}>{titulo}</Text>
    </Pressable>
  );
}

// ------------------------------------------------------------------ campos

export function Campo({ rotulo, erro, style, multiline, ...props }: TextInputProps & { rotulo: string; erro?: string | null }) {
  const c = useCores();
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 6, flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
      <Texto variante="rotulo">{rotulo}</Texto>
      <TextInput
        placeholderTextColor={c.suave}
        accessibilityLabel={rotulo}
        multiline={multiline}
        onFocus={(e) => {
          setFoco(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFoco(false);
          props.onBlur?.(e);
        }}
        style={[
          s.campo,
          {
            borderColor: erro ? c.critico : foco ? c.destaque : c.linha,
            backgroundColor: c.superficie,
            color: c.texto,
            minHeight: multiline ? 84 : 46,
            textAlignVertical: multiline ? 'top' : 'center',
          },
          style,
        ]}
        {...props}
      />
      {erro ? (
        <Texto variante="pequeno" cor={c.critico} style={{ fontWeight: '600' }}>
          {erro}
        </Texto>
      ) : null}
    </View>
  );
}

export function Busca({ valor, aoMudar, dica }: { valor: string; aoMudar: (v: string) => void; dica: string }) {
  const c = useCores();
  return (
    <View style={[s.busca, { borderColor: c.linha, backgroundColor: c.superficie }]}>
      <Icone nome="busca" tamanho={18} cor={c.suave} />
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        placeholder={dica}
        accessibilityLabel={dica}
        placeholderTextColor={c.suave}
        style={{ flex: 1, paddingVertical: 11, color: c.texto, fontSize: 15, minWidth: 0 }}
      />
      {valor ? <BotaoIcone icone="fechar" rotulo="Limpar busca" onPress={() => aoMudar('')} cor={c.suave} /> : null}
    </View>
  );
}

// ------------------------------------------------------------------ seleção

export function Chips<T extends string>({ opcoes, valor, aoMudar, quebrar }: { opcoes: { valor: T; rotulo: string }[]; valor: T; aoMudar: (v: T) => void; quebrar?: boolean }) {
  const c = useCores();
  const itens = opcoes.map((o) => {
    const on = o.valor === valor;
    return (
      <Pressable
        key={o.valor}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => aoMudar(o.valor)}
        style={[s.chip, { backgroundColor: on ? c.texto : c.superficie, borderColor: on ? c.texto : c.linha }]}>
        <Text style={{ color: on ? c.superficie : c.suave, fontWeight: '600', fontSize: 13.5 }}>{o.rotulo}</Text>
      </Pressable>
    );
  });
  if (quebrar) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{itens}</View>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {itens}
    </ScrollView>
  );
}

export function Segmentado<T extends string | number>({ opcoes, valor, aoMudar, grande, desativado }: { opcoes: { valor: T; rotulo: string }[]; valor: T; aoMudar: (v: T) => void; grande?: boolean; desativado?: boolean }) {
  const c = useCores();
  return (
    <View style={[s.seg, { backgroundColor: c.superficie2, borderColor: c.linha }]}>
      {opcoes.map((o) => {
        const on = o.valor === valor;
        return (
          <Pressable
            key={String(o.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: desativado }}
            disabled={desativado}
            onPress={() => aoMudar(o.valor)}
            style={[s.segItem, { backgroundColor: on ? c.destaque : 'transparent', paddingVertical: grande ? 13 : 9, opacity: desativado && !on ? 0.45 : 1 }]}>
            <Text style={{ color: on ? c.sobreDestaque : c.suave, fontWeight: '700', fontSize: 14 }}>{o.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ------------------------------------------------------------------ blocos

export function Selo({ tom, texto }: { tom: Tom; texto: string }) {
  const c = useCores();
  const mapa: Record<Tom, [string, string]> = {
    ok: [c.okSuave, c.ok],
    warn: [c.avisoSuave, c.aviso],
    crit: [c.criticoSuave, c.critico],
    muted: [c.superficie2, c.suave],
    acc: [c.destaqueSuave, c.destaque],
  };
  const [fundo, cor] = mapa[tom];
  return (
    <View style={[s.selo, { backgroundColor: fundo }]}>
      <Text style={{ color: cor, fontSize: 12, fontWeight: '700' }} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

export function Cartao({ children, estilo, semPadding }: { children: ReactNode; estilo?: StyleProp<ViewStyle>; semPadding?: boolean }) {
  const c = useCores();
  return <View style={[s.cartao, { backgroundColor: c.superficie, borderColor: c.linha, padding: semPadding ? 0 : 16 }, estilo]}>{children}</View>;
}

export function Secao({ titulo, acao, children }: { titulo: string; acao?: ReactNode; children: ReactNode }) {
  return (
    <View style={{ gap: 10, minWidth: 0 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 }}>
        <Texto variante="secao">{titulo}</Texto>
        {acao}
      </View>
      {children}
    </View>
  );
}

export function Avatar({ texto, grande }: { texto: string; grande?: boolean }) {
  const c = useCores();
  const t = grande ? 56 : 40;
  return (
    <View style={{ width: t, height: t, borderRadius: t / 2, backgroundColor: c.destaqueSuave, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.destaque, fontWeight: '800', fontSize: grande ? 19 : 14 }}>{texto}</Text>
    </View>
  );
}

/** Linha de lista clicável: avatar, título, subtítulo e algo à direita. */
export function Linha({ avatar, titulo, sub, citacao, direita, onPress, ultima }: { avatar?: string; titulo: string; sub?: string; citacao?: string | null; direita?: ReactNode; onPress?: () => void; ultima?: boolean }) {
  const c = useCores();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [s.linha, { borderBottomColor: c.linha, borderBottomWidth: ultima ? 0 : StyleSheet.hairlineWidth, backgroundColor: pressed ? c.superficie2 : 'transparent' }]}>
      {avatar !== undefined ? <Avatar texto={avatar} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texto variante="forte" numberOfLines={1}>
          {titulo}
        </Texto>
        {sub ? <Texto variante="pequeno" numberOfLines={1}>{sub}</Texto> : null}
        {citacao ? (
          <Texto variante="pequeno" cor={c.texto} style={{ fontStyle: 'italic', marginTop: 3 }} numberOfLines={2}>
            “{citacao}”
          </Texto>
        ) : null}
      </View>
      {direita ? <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>{direita}</View> : null}
    </Pressable>
  );
}

/** Letra da divisão (A, B, C) em quadrado escuro. */
export function Letra({ letra, pequena }: { letra: string; pequena?: boolean }) {
  const c = useCores();
  const t = pequena ? 28 : 34;
  return (
    <View style={{ width: t, height: t, borderRadius: 9, backgroundColor: c.texto, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: c.superficie, fontWeight: '800', fontSize: pequena ? 15 : 18 }}>{letra}</Text>
    </View>
  );
}

export function Lista({ children }: { children: ReactNode }) {
  const c = useCores();
  return <View style={[s.cartao, { backgroundColor: c.superficie, borderColor: c.linha, overflow: 'hidden' }]}>{children}</View>;
}

export function Vazio({ texto }: { texto: string }) {
  const c = useCores();
  return (
    <View style={[s.vazio, { borderColor: c.linha }]}>
      <Texto variante="suave" style={{ textAlign: 'center' }}>
        {texto}
      </Texto>
    </View>
  );
}

export function Indicador({ rotulo, valor, tom }: { rotulo: string; valor: string | number; tom?: 'warn' | 'crit' }) {
  const c = useCores();
  return (
    <View style={[s.indicador, { backgroundColor: c.superficie, borderColor: c.linha }]}>
      <Text style={{ fontSize: 30, fontWeight: '800', color: tom === 'warn' ? c.aviso : tom === 'crit' ? c.critico : c.texto, fontVariant: ['tabular-nums'] }}>{valor}</Text>
      <Texto variante="pequeno" style={{ fontWeight: '600' }}>
        {rotulo}
      </Texto>
    </View>
  );
}

/** Grade de indicadores: 2 por linha no celular, todos lado a lado na tela larga. */
export function Indicadores({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View>;
}

/** Duas colunas na tela larga, uma no celular. */
export function DuasColunas({ children }: { children: [ReactNode, ReactNode] }) {
  const larga = useTelaLarga();
  if (!larga) return <>{children}</>;
  return (
    <View style={{ flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}>
      <View style={{ flex: 1, minWidth: 0, gap: 18 }}>{children[0]}</View>
      <View style={{ flex: 1, minWidth: 0, gap: 18 }}>{children[1]}</View>
    </View>
  );
}

export function Aviso({ texto, tom = 'acc', acao }: { texto: string; tom?: 'ok' | 'acc' | 'warn'; acao?: ReactNode }) {
  const c = useCores();
  const [fundo, cor] = tom === 'ok' ? [c.okSuave, c.ok] : tom === 'warn' ? [c.avisoSuave, c.aviso] : [c.destaqueSuave, c.destaque];
  return (
    <View style={[s.aviso, { backgroundColor: fundo }]}>
      <Text style={{ color: cor, fontWeight: '600', fontSize: 14, flex: 1 }}>{texto}</Text>
      {acao}
    </View>
  );
}

// ------------------------------------------------------------------ janelas

/** Janela que sobe de baixo no celular e aparece no centro na tela larga. */
export function Folha({ visivel, aoFechar, titulo, children, alta }: { visivel: boolean; aoFechar: () => void; titulo: string; children: ReactNode; alta?: boolean }) {
  const c = useCores();
  const larga = useTelaLarga();
  return (
    <Modal visible={visivel} transparent animationType={larga ? 'fade' : 'slide'} onRequestClose={aoFechar}>
      <View style={{ flex: 1, justifyContent: larga ? 'center' : 'flex-end', alignItems: larga ? 'center' : 'stretch' }}>
        <Pressable accessibilityLabel="Fechar" onPress={aoFechar} style={[StyleSheet.absoluteFill, { backgroundColor: c.escurecer }]} />
        <SafeAreaView
          edges={['bottom']}
          style={[
            {
              backgroundColor: c.superficie,
              maxHeight: '90%',
              width: larga ? 520 : '100%',
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              borderBottomLeftRadius: larga ? 22 : 0,
              borderBottomRightRadius: larga ? 22 : 0,
            },
            alta ? { height: '90%' } : null,
          ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 }}>
            <Texto variante="subtitulo" style={{ flex: 1 }}>
              {titulo}
            </Texto>
            <BotaoIcone icone="fechar" rotulo="Fechar" onPress={aoFechar} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 14 }} style={alta ? { flex: 1 } : undefined}>
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/** Pergunta de confirmação (diálogo nativo no celular, confirm no navegador). */
export function confirmar(titulo: string, mensagem: string, botao = 'Confirmar'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensagem}`));
  return new Promise((resolve) =>
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: botao, style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

// ------------------------------------------------------------------ aviso rápido

const ToastContext = createContext<(texto: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const c = useCores();
  const [texto, setTexto] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrar = useCallback((t: string) => {
    setTexto(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTexto(null), 2800);
  }, []);
  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      {texto ? (
        <View pointerEvents="none" style={s.toastArea}>
          <View accessibilityLiveRegion="polite" style={[s.toast, { backgroundColor: c.texto }]}>
            <Text style={{ color: c.superficie, fontWeight: '600', fontSize: 14, textAlign: 'center' }}>{texto}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ------------------------------------------------------------------ estilos

const s = StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  botao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  botaoIcone: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  campo: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  busca: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingLeft: 12, paddingRight: 4 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  seg: { flexDirection: 'row', padding: 3, gap: 3, borderRadius: 12, borderWidth: 1 },
  segItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9, paddingHorizontal: 8 },
  selo: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  cartao: { borderWidth: 1, borderRadius: 16 },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  vazio: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 22 },
  indicador: { flexGrow: 1, flexBasis: 140, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14 },
  toastArea: { position: 'absolute', left: 0, right: 0, bottom: 96, alignItems: 'center', paddingHorizontal: 24 },
  toast: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, maxWidth: 420 },
});
