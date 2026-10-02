const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Data local no formato AAAA-MM-DD. */
export function hojeISO(base = new Date()): string {
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
}

export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const data = new Date(a, m - 1, d, 12);
  data.setDate(data.getDate() + dias);
  return hojeISO(data);
}

/** Dias de hoje até a data (negativo = já passou). */
export function diasAte(iso: string): number {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const [ha, hm, hd] = hojeISO().split('-').map(Number);
  return Math.round((Date.UTC(a, m - 1, d) - Date.UTC(ha, hm - 1, hd)) / 86400000);
}

/** Converte um instante (timestamptz) para a data local AAAA-MM-DD. */
export function dataLocal(instante: string): string {
  return hojeISO(new Date(instante));
}

export function fmtCurta(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}`;
}

export function fmtDiaMes(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
}

export function fmtRelativo(instante: string): string {
  const n = diasAte(dataLocal(instante));
  if (n === 0) return 'Hoje';
  if (n === -1) return 'Ontem';
  return fmtDiaMes(dataLocal(instante));
}

export function fmtHojeLongo(base = new Date()): string {
  return `${DIAS[base.getDay()]}, ${base.getDate()} de ${MESES_LONGOS[base.getMonth()]}`;
}

/** AAAA-MM-DD → DD/MM/AAAA (para campos de texto). */
export function isoParaBr(iso: string | null | undefined): string {
  if (!iso) return '';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

/** DD/MM/AAAA → AAAA-MM-DD, ou null se a data não for válida. */
export function brParaIso(br: string): string | null {
  const m = br.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const data = new Date(a, mes - 1, d);
  if (data.getFullYear() !== a || data.getMonth() !== mes - 1 || data.getDate() !== d) return null;
  return `${a}-${pad(mes)}-${pad(d)}`;
}

/** Aplica a máscara DD/MM/AAAA enquanto a pessoa digita. */
export function mascaraData(texto: string): string {
  const n = texto.replace(/\D/g, '').slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
}

export function idade(nascimento: string | null): number | null {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split('-').map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  if (hoje.getMonth() + 1 < m || (hoje.getMonth() + 1 === m && hoje.getDate() < d)) anos--;
  return anos;
}

export function minutosEntre(inicio: string, fim: string): number {
  return Math.max(1, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000));
}
