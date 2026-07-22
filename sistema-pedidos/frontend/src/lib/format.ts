import type { OrderStatus } from '../types'

export function brl(n: number): string {
  return `R$ ${Number(n || 0).toFixed(2).replace('.', ',')}`
}

export function dataHora(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Cronômetro mm:ss (ou h:mm:ss) desde um instante ISO. */
export function decorrido(iso: string, agora: number): string {
  const inicio = new Date(iso).getTime()
  if (Number.isNaN(inicio)) return '00:00'
  let s = Math.max(0, Math.floor((agora - inicio) / 1000))
  const h = Math.floor(s / 3600)
  s -= h * 3600
  const m = Math.floor(s / 60)
  s -= m * 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

interface Cor {
  bg: string
  fg: string
  dot: string
}

// Verde = sucesso/ativo · vermelho = cancelado · amarelo = atenção · azul = em trânsito.
export const STATUS_COR: Record<OrderStatus, Cor> = {
  Pendente: { bg: 'bg-amber-500/15', fg: 'text-amber-300', dot: 'bg-amber-400' },
  Confirmado: { bg: 'bg-emerald-500/15', fg: 'text-emerald-300', dot: 'bg-emerald-400' },
  Pronto: { bg: 'bg-sky-500/15', fg: 'text-sky-300', dot: 'bg-sky-400' },
  'Saiu para entrega': { bg: 'bg-blue-500/15', fg: 'text-blue-300', dot: 'bg-blue-400' },
  Retirado: { bg: 'bg-teal-500/15', fg: 'text-teal-300', dot: 'bg-teal-400' },
  Concluído: { bg: 'bg-emerald-500/15', fg: 'text-emerald-300', dot: 'bg-emerald-400' },
  Cancelado: { bg: 'bg-rose-500/15', fg: 'text-rose-300', dot: 'bg-rose-400' },
}
