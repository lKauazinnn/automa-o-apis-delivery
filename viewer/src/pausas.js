// Motivos e prazos da pausa de item/complemento — o mesmo menu nas três portas de entrada
// (toggle da linha, seleção em massa e pausa por insumo).

export const MOTIVOS_PAUSA = ['Acabou o estoque', 'Insumo em falta', 'Cozinha sobrecarregada', 'Problema no preparo']

function minutosAteFimDoDia() {
  const agora = new Date()
  const fim = new Date(agora)
  fim.setHours(23, 59, 0, 0)
  return Math.max(1, Math.round((fim - agora) / 60000))
}

// `minutos: null` = pausa manual (só volta quando alguém reativar) — é o padrão, igual ao
// comportamento de antes desta tela existir.
export const PRAZOS_PAUSA = [
  { chave: 'manual', label: 'Até eu reativar', minutos: () => null },
  { chave: '30', label: '30 min', minutos: () => 30 },
  { chave: '60', label: '1 hora', minutos: () => 60 },
  { chave: '120', label: '2 horas', minutos: () => 120 },
  { chave: '240', label: '4 horas', minutos: () => 240 },
  { chave: '720', label: '12 horas', minutos: () => 720 },
  { chave: 'fim_dia', label: 'Até o fim do dia', minutos: minutosAteFimDoDia },
]

export function normalizar(texto) {
  // Mesmo critério da busca de itens parecidos em App.jsx: NFD separa a letra do acento e
  // descartamos os code points de marca combinante (0x0300–0x036F).
  return Array.from(String(texto || '').toLowerCase().normalize('NFD'))
    .filter((ch) => {
      const codigo = ch.codePointAt(0)
      return codigo < 0x0300 || codigo > 0x036f
    })
    .join('')
    .trim()
}

export function horaCurta(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// "volta 14:30" quando é hoje, "volta 14/10 08:00" quando passa da meia-noite.
export function rotuloVolta(iso) {
  const data = new Date(iso)
  const hoje = new Date()
  if (data.toDateString() === hoje.toDateString()) return `volta ${horaCurta(iso)}`
  return `volta ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${horaCurta(iso)}`
}

export function tempoRestante(iso) {
  const min = Math.ceil((new Date(iso).getTime() - Date.now()) / 60000)
  if (min <= 0) return 'reativando...'
  if (min < 60) return `em ${min} min`
  const h = Math.floor(min / 60)
  return `em ${h}h${String(min % 60).padStart(2, '0')}`
}

export function tempoDesde(iso) {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
  return `há ${Math.floor(min / 1440)} dia(s)`
}
