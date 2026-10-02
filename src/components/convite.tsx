import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';

import { Botao, Folha, Texto, useToast } from './ui';
import { convitePendente, gerarConvite, linkDoConvite } from '@/lib/api';
import { fmtDiaMes } from '@/lib/datas';
import { linkWhatsApp, primeiroNome } from '@/lib/regras';
import { mensagemDeErro } from '@/lib/supabase';
import type { Aluno } from '@/lib/tipos';
import { useCores } from '@/theme';

/** Janela com o link de convite do aluno, pronta para copiar ou mandar no WhatsApp. */
export function FolhaConvite({ aluno, professorNome, visivel, aoFechar }: { aluno: Aluno; professorNome: string; visivel: boolean; aoFechar: () => void }) {
  return (
    <Folha visivel={visivel} aoFechar={aoFechar} titulo={`Convite para ${primeiroNome(aluno.nome)}`}>
      {visivel ? <ConteudoConvite aluno={aluno} professorNome={professorNome} /> : null}
    </Folha>
  );
}

function ConteudoConvite({ aluno, professorNome }: { aluno: Aluno; professorNome: string }) {
  const c = useCores();
  const toast = useToast();
  const [convite, setConvite] = useState<{ codigo: string; expira_em: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const atual = await convitePendente(aluno.id);
        if (atual) {
          if (ativo) setConvite(atual);
          return;
        }
        const codigo = await gerarConvite(aluno.id);
        if (ativo) setConvite(await convitePendente(aluno.id) ?? { codigo, expira_em: '' });
      } catch (e) {
        if (ativo) setErro(mensagemDeErro(e));
      }
    })();
    return () => {
      ativo = false;
    };
  }, [aluno.id]);

  async function novoLink() {
    setGerando(true);
    try {
      await gerarConvite(aluno.id);
      setConvite(await convitePendente(aluno.id));
      toast('Novo link gerado. O anterior deixou de valer.');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setGerando(false);
    }
  }

  const link = convite ? linkDoConvite(convite.codigo) : '';
  const nome = primeiroNome(aluno.nome);
  const mensagem = `Oi, ${nome}! Aqui é ${professorNome}. Entre por este link para ver seu treino no App Academia: ${link}\nSe pedir, o código do convite é ${convite?.codigo ?? ''}.`;

  return (
    <>
      <Texto variante="suave">
        Envie o link. Ao abrir, {nome} cria uma senha e já entra vendo a ficha. O link vale 7 dias e só funciona uma vez.
      </Texto>
      {erro ? (
        <Texto cor={c.critico} variante="forte">
          {erro}
        </Texto>
      ) : !convite ? (
        <ActivityIndicator color={c.destaque} />
      ) : (
        <>
          <View style={{ backgroundColor: c.superficie2, borderColor: c.linha, borderWidth: 1, borderRadius: 10, padding: 12, gap: 4 }}>
            <Text selectable style={{ color: c.texto, fontFamily: 'monospace', fontSize: 14 }}>
              {link}
            </Text>
            <Texto variante="pequeno">
              Código {convite.codigo}
              {convite.expira_em ? ` · vale até ${fmtDiaMes(convite.expira_em)}` : ''}
            </Texto>
          </View>
          <View style={{ backgroundColor: c.okSuave, borderRadius: 14, borderBottomLeftRadius: 4, padding: 12 }}>
            <Text style={{ color: c.texto, fontSize: 14 }}>{mensagem}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Botao
              titulo="Copiar mensagem"
              estilo={{ flex: 1 }}
              onPress={async () => {
                await Clipboard.setStringAsync(mensagem);
                toast('Mensagem copiada.');
              }}
            />
            <Botao titulo="Enviar no WhatsApp" tipo="primario" estilo={{ flex: 1 }} onPress={() => Linking.openURL(linkWhatsApp(mensagem, aluno.telefone))} />
          </View>
          <Botao titulo="Gerar novo link" tipo="fantasma" carregando={gerando} onPress={novoLink} />
        </>
      )}
    </>
  );
}
