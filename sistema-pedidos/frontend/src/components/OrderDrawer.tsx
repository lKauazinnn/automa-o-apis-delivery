import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getOrder } from '../api'
import type { OrderDetail } from '../types'
import { brl, dataHora } from '../lib/format'
import { StatusBadge } from './StatusBadge'

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null | undefined }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{rotulo}</div>
      <div className="text-sm text-zinc-200">{valor || '—'}</div>
    </div>
  )
}

export function OrderDrawer({ orderId, onClose }: { orderId: number | null; onClose: () => void }) {
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (orderId == null) return
    setCarregando(true)
    setOrder(null)
    getOrder(orderId)
      .then(setOrder)
      .finally(() => setCarregando(false))
  }, [orderId])

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [onClose])

  if (orderId == null) return null

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="drawer-in relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <div className="text-sm font-bold text-zinc-100">
              {order ? `Pedido ${order.codigo}` : carregando ? 'Carregando…' : 'Pedido'}
            </div>
            {order?.identificador_ifood && (
              <div className="mt-0.5 text-[11px] text-zinc-500">iFood: {order.identificador_ifood}</div>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200" title="Fechar (Esc)">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {carregando && <p className="text-sm text-zinc-500">Carregando detalhes…</p>}
          {order && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Status</div>
                  <div className="mt-0.5">
                    <StatusBadge status={order.status} />
                  </div>
                </div>
                <Campo rotulo="Tipo" valor={order.tipo} />
                <Campo rotulo="Pagamento" valor={order.pagamento_forma} />
                <Campo rotulo="Loja" valor={order.store?.nome} />
                <Campo rotulo="Recebido em" valor={dataHora(order.recebido_em)} />
                <Campo rotulo="Documento" valor={order.documento} />
              </div>

              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Itens do pedido</div>
                <div className="flex flex-col gap-2">
                  {order.items.map((it) => (
                    <div key={it.id} className="rounded-lg border border-line bg-ink-850 p-3">
                      <div className="flex justify-between gap-2 text-sm">
                        <span className="text-zinc-200">
                          <span className="text-gold">{it.quantidade}×</span> {it.nome}
                        </span>
                        <span className="font-mono text-zinc-300">{brl(it.preco)}</span>
                      </div>
                      {it.tag && <div className="mt-0.5 text-[11px] text-amber-400">{it.tag}</div>}
                      {it.codigo_pdv && <div className="text-[11px] text-zinc-500">PDV: {it.codigo_pdv}</div>}
                      {it.complements.map((c) => (
                        <div key={c.id} className="ml-3 mt-1 flex justify-between text-[12px] text-zinc-400">
                          <span>+ {c.nome}{c.nivel ? ` (${c.nivel})` : ''}</span>
                          <span className="font-mono">{brl(c.preco)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-line bg-ink-850 p-3 text-sm">
                <Linha rotulo="Subtotal" valor={brl(order.subtotal)} />
                <Linha rotulo="Taxa de entrega" valor={brl(order.taxa_entrega)} />
                {order.outras_taxas > 0 && <Linha rotulo="Outras taxas" valor={brl(order.outras_taxas)} />}
                <div className="mt-1 flex justify-between border-t border-line pt-2 font-bold text-zinc-100">
                  <span>Total do pedido</span>
                  <span className="font-mono">{brl(order.total)}</span>
                </div>
              </div>

              {order.observacoes && (
                <div>
                  <div className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-400">Observações</div>
                  <p className="text-sm text-zinc-300">{order.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between py-0.5 text-zinc-400">
      <span>{rotulo}</span>
      <span className="font-mono">{valor}</span>
    </div>
  )
}
