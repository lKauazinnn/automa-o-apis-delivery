import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { formatarTimestamp, Modal, Pill } from './ui'

const STATUS_LABEL = {
  NOVO: 'Novo',
  CONFIRMADO: 'Confirmado',
  DESPACHADO: 'Despachado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}
const STATUS_COR = (C) => ({
  NOVO: C.info,
  CONFIRMADO: C.neutral,
  DESPACHADO: C.info,
  CONCLUIDO: C.good,
  CANCELADO: C.bad,
})
const PROXIMO_STATUS = { NOVO: 'CONFIRMADO', CONFIRMADO: 'DESPACHADO', DESPACHADO: 'CONCLUIDO' }
const TIPO_LABEL = { ENTREGA: 'Entrega', RETIRADA: 'Retirada', MESA: 'Mesa' }
const brl = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`

function Campo({ C, rotulo, valor }) {
  return (
    <div>
      <p className="uppercase tracking-wider text-[10px] mb-1" style={{ color: C.text3 }}>{rotulo}</p>
      <p className="text-xs" style={{ color: C.text1 }}>{valor || '—'}</p>
    </div>
  )
}

export function DetalhesPedidoModal({ pedido, C, onClose, onAlterarStatus, alterando }) {
  const cores = STATUS_COR(C)
  const proximo = PROXIMO_STATUS[pedido.status]
  const cliente = pedido.cliente?.name || pedido.cliente?.nome || pedido.cliente?.first_name || '—'
  const itens = pedido.itens || []
  const endereco = pedido.detalhes_brutos?.endereco || pedido.detalhes_brutos?.receive_address?.poi_display_name

  return (
    <Modal titulo={`Pedido ${pedido.ifood_order_id}`} eyebrow="Detalhes do pedido" onClose={onClose} largura="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo C={C} rotulo="Cliente" valor={cliente} />
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1" style={{ color: C.text3 }}>Status</p>
            <Pill color={cores[pedido.status] || C.text2} dot>{STATUS_LABEL[pedido.status] || pedido.status}</Pill>
          </div>
          <Campo C={C} rotulo="Tipo" valor={TIPO_LABEL[pedido.tipo] || pedido.tipo} />
          <Campo C={C} rotulo="Pagamento" valor={pedido.pagamento} />
          <Campo C={C} rotulo="Recebido em" valor={formatarTimestamp(pedido.recebido_em)} />
          <Campo C={C} rotulo="Total" valor={brl(pedido.total)} />
          {endereco && <div className="col-span-2"><Campo C={C} rotulo="Endereço" valor={endereco} /></div>}
        </div>

        <div>
          <p className="text-xs font-bold mb-2" style={{ color: C.text1 }}>
            Itens do pedido {itens.length > 0 && <span style={{ color: C.text3 }}>({itens.length})</span>}
          </p>
          {itens.length === 0 ? (
            <p className="text-xs" style={{ color: C.text3 }}>Sem itens detalhados.</p>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: C.cardBorder }}>
              {itens.map((item, i) => (
                <div
                  key={item.id ?? i}
                  className="px-3 py-2 text-xs border-b last:border-0"
                  style={{ borderColor: C.rowBorder || C.cardBorder }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: C.text1 }}>
                      <span className="font-bold" style={{ color: '#F56C35' }}>{item.quantidade || 1}×</span> {item.nome}
                    </span>
                    {item.preco != null && <span className="fonte-mono flex-shrink-0" style={{ color: C.text2 }}>{brl(item.preco)}</span>}
                  </div>
                  {item.complementos?.length > 0 && (
                    <div className="mt-1 ml-4 flex flex-col gap-0.5">
                      {item.complementos.map((c, ci) => (
                        <div key={ci} className="flex items-center justify-between gap-2" style={{ color: C.text2 }}>
                          <span>+ {c.nome}{c.grupo ? <span style={{ color: C.text3 }}> ({c.grupo})</span> : ''}</span>
                          {c.preco > 0 && <span className="fonte-mono">{brl(c.preco)}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {item.obs && (
                    <div
                      className="mt-1.5 ml-4 flex items-start gap-1.5 px-2 py-1 rounded-lg font-semibold"
                      style={{ color: '#e0a44c', background: 'rgba(224,164,76,0.12)' }}
                    >
                      <AlertTriangle size={13} className="flex-shrink-0" style={{ marginTop: 1 }} />
                      <span>{item.obs}</span>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 text-xs font-bold" style={{ background: C.inputBg, color: C.text1 }}>
                <span>Total</span>
                <span className="fonte-mono">{brl(pedido.total)}</span>
              </div>
            </div>
          )}
        </div>

        {pedido.linha_do_tempo?.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: C.text1 }}>Linha do tempo</p>
            <div className="flex flex-col">
              {pedido.linha_do_tempo.map((ev, i) => {
                const ultimo = i === pedido.linha_do_tempo.length - 1
                return (
                  <div key={ev.id ?? i} className="flex items-stretch gap-2.5 text-xs">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 size={14} color={ultimo ? C.good : C.neutral} />
                      {!ultimo && <span className="w-px flex-1 my-0.5" style={{ background: C.cardBorder, minHeight: 14 }} />}
                    </div>
                    <div className="pb-3">
                      <p style={{ color: C.text1 }}>{ev.tipo}</p>
                      <p style={{ color: C.text3 }}>{formatarTimestamp(ev.recebido_em)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {proximo && (
            <button
              type="button"
              disabled={alterando}
              onClick={() => onAlterarStatus(pedido, proximo)}
              className="flex-1 flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl botao-primario disabled:opacity-50"
            >
              {alterando && <Loader2 size={13} className="animate-spin" />}
              Avançar para {STATUS_LABEL[proximo]}
            </button>
          )}
          {pedido.status !== 'CANCELADO' && pedido.status !== 'CONCLUIDO' && (
            <button
              type="button"
              disabled={alterando}
              onClick={() => onAlterarStatus(pedido, 'CANCELADO')}
              className="text-xs font-semibold px-3.5 py-2.5 rounded-xl botao-perigo disabled:opacity-50"
            >
              Cancelar pedido
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
