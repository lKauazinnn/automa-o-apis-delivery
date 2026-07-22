import type { OrderDetail, OrderStatus, Paginated } from './types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'
export const WS_URL = BASE.replace(/^http/, 'ws') + '/ws'

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!resp.ok) {
    let detalhe = `HTTP ${resp.status}`
    try {
      const body = await resp.json()
      detalhe = body.detail ?? detalhe
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(detalhe)
  }
  return resp.status === 204 ? (undefined as T) : ((await resp.json()) as T)
}

export interface OrderQuery {
  q?: string
  status?: string[]
  tipo?: string[]
  pagamento?: string
  documento?: string
  recebido_de?: string
  recebido_ate?: string
  page?: number
  per_page?: number
  order_by?: string
  order_dir?: 'asc' | 'desc'
  incluir_ocultos?: boolean
}

export function listOrders(query: OrderQuery): Promise<Paginated> {
  const p = new URLSearchParams()
  if (query.q) p.set('q', query.q)
  query.status?.forEach((s) => p.append('status', s))
  query.tipo?.forEach((t) => p.append('tipo', t))
  if (query.pagamento) p.set('pagamento', query.pagamento)
  if (query.documento) p.set('documento', query.documento)
  if (query.recebido_de) p.set('recebido_de', query.recebido_de)
  if (query.recebido_ate) p.set('recebido_ate', query.recebido_ate)
  if (query.page) p.set('page', String(query.page))
  if (query.per_page) p.set('per_page', String(query.per_page))
  if (query.order_by) p.set('order_by', query.order_by)
  if (query.order_dir) p.set('order_dir', query.order_dir)
  if (query.incluir_ocultos !== undefined) p.set('incluir_ocultos', String(query.incluir_ocultos))
  return req<Paginated>(`/api/orders?${p.toString()}`)
}

export function getOrder(id: number): Promise<OrderDetail> {
  return req<OrderDetail>(`/api/orders/${id}`)
}

export function transitionOrder(id: number, novo_status: OrderStatus, motivo?: string): Promise<OrderDetail> {
  return req<OrderDetail>(`/api/orders/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ novo_status, motivo }),
  })
}
