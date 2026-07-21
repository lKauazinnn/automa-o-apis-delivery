import { useEffect, useRef, useState } from 'react'
import { LayoutGrid, Loader2, RefreshCw, X } from 'lucide-react'
import { Pill } from '../ui'

const INTERVALO_ATUALIZACAO_MS = 10000

const COLUNAS = [
  { status: 'NOVO', titulo: 'Novo' },
  { status: 'CONFIRMADO', titulo: 'Confirmado' },
  { status: 'DESPACHADO', titulo: 'Despachado' },
  { status: 'CONCLUIDO', titulo: 'Concluído' },
  { status: 'CANCELADO', titulo: 'Cancelado' },
]
const PROXIMO_STATUS = { NOVO: 'CONFIRMADO', CONFIRMADO: 'DESPACHADO', DESPACHADO: 'CONCLUIDO' }
const TIPO_LABEL = { ENTREGA: 'Entrega', RETIRADA: 'Retirada', MESA: 'Mesa' }
const STATUS_LABEL = { NOVO: 'Novo', CONFIRMADO: 'Confirmado', DESPACHADO: 'Despachado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' }
const STATUS_COR = (C) => ({ NOVO: C.info, CONFIRMADO: C.neutral, DESPACHADO: C.info, CONCLUIDO: C.good, CANCELADO: C.bad })

function horaCurta(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function KDSView({ apiFetch, C, notificar, setConfirmacao, onAbrirHistorico }) {
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [cardOcupado, setCardOcupado] = useState(null)
  const apiFetchRef = useRef(apiFetch)
  apiFetchRef.current = apiFetch

  async function carregarPedidos() {
    try {
      setPedidos(await apiFetchRef.current('/pedidos'))
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCarregando(false)
    }
  }

  async function atualizarDoIfood() {
    setAtualizando(true)
    try {
      await apiFetchRef.current('/pedidos/buscar', { method: 'POST' })
      await carregarPedidos()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setAtualizando(false)
    }
  }

  useEffect(() => {
    carregarPedidos()
    const intervalo = setInterval(() => atualizarDoIfood(), INTERVALO_ATUALIZACAO_MS)
    return () => clearInterval(intervalo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function avancarStatus(pedido) {
    const proximo = PROXIMO_STATUS[pedido.status]
    if (!proximo) return
    setCardOcupado(pedido.id)
    try {
      await apiFetchRef.current(`/pedidos/${pedido.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: proximo }),
      })
      await carregarPedidos()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCardOcupado(null)
    }
  }

  function pedirLimparCard(pedido) {
    setConfirmacao({
      titulo: 'Limpar pedido do quadro?',
      mensagem: `"${pedido.ifood_order_id}" sai do KDS, mas continua disponível em Pedidos e na Auditoria.`,
      textoConfirmar: 'Limpar',
      perigo: false,
      aoConfirmar: () => limparCard(pedido),
    })
  }

  async function limparCard(pedido) {
    try {
      await apiFetchRef.current(`/pedidos/${pedido.id}/ocultar`, { method: 'POST' })
      setPedidos((prev) => prev.filter((p) => p.id !== pedido.id))
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  const visiveis = pedidos.filter((p) => !p.oculto_kds)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <LayoutGrid size={15} color="#F56C35" />
          <h2 className="text-sm font-bold" style={{ color: C.text1 }}>KDS</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: C.text2, background: C.inputBg }}>
            atualiza sozinho a cada 10s
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onAbrirHistorico && (
            <button
              type="button"
              onClick={onAbrirHistorico}
              className="text-xs font-semibold px-3.5 py-2 rounded-xl"
              style={{ color: C.text1, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              Histórico
            </button>
          )}
          <button
            type="button"
            onClick={atualizarDoIfood}
            disabled={atualizando}
            className="botao-primario flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
          >
            <RefreshCw size={13} className={atualizando ? 'animate-spin' : ''} />
            Atualizar pedidos
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex items-center justify-center gap-2 py-16 text-xs" style={{ color: C.text2 }}>
          <Loader2 size={14} className="animate-spin" />
          Carregando quadro...
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
          {COLUNAS.map((col) => {
            const doColuna = visiveis.filter((p) => p.status === col.status)
            return (
              <div key={col.status} className="rounded-2xl border p-3" style={{ background: C.bg2, borderColor: C.cardBorder, minHeight: 180 }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider" style={{ color: C.text2 }}>{col.titulo}</h4>
                  <span className="text-[11px] font-bold rounded-lg px-2 py-0.5" style={{ background: C.inputBg, color: C.text1 }}>
                    {doColuna.length}
                  </span>
                </div>
                {doColuna.length === 0 && (
                  <p className="text-[11px] text-center py-6" style={{ color: C.text3 }}>Nenhum pedido</p>
                )}
                <div className="flex flex-col gap-2">
                  {doColuna.map((p) => {
                    const podeAvancar = !!PROXIMO_STATUS[p.status]
                    const podeLimpar = p.status === 'CONCLUIDO' || p.status === 'CANCELADO'
                    return (
                      <div
                        key={p.id}
                        role={podeAvancar ? 'button' : undefined}
                        onClick={() => podeAvancar && cardOcupado !== p.id && avancarStatus(p)}
                        className="rounded-xl border p-3 transition-all"
                        style={{
                          background: C.cardBg,
                          borderColor: C.cardBorder,
                          cursor: podeAvancar ? 'pointer' : 'default',
                          opacity: cardOcupado === p.id ? 0.5 : 1,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold" style={{ color: C.text1 }}>{p.ifood_order_id}</span>
                          <span className="text-[11px]" style={{ color: C.text3 }}>{horaCurta(p.recebido_em)}</span>
                        </div>
                        <p className="text-[11px] mt-1" style={{ color: C.text2 }}>{TIPO_LABEL[p.tipo] || p.tipo}</p>
                        <div className="flex items-center justify-between mt-2 gap-1.5">
                          <Pill color={STATUS_COR(C)[p.status] || C.text2} dot>{STATUS_LABEL[p.status] || p.status}</Pill>
                          {podeAvancar && (
                            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: C.text3 }}>toque p/ avançar</span>
                          )}
                          {podeLimpar && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                pedirLimparCard(p)
                              }}
                              title="Limpar do quadro"
                              className="botao-icone-fantasma w-6 h-6 rounded-lg inline-flex items-center justify-center ml-auto"
                              style={{ color: C.text3 }}
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
