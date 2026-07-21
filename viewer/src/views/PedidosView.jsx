import { useEffect, useRef, useState } from 'react'
import { Loader2, PackageSearch, RefreshCw, Search } from 'lucide-react'
import { formatarTimestamp, Modal, Pill } from '../ui'

const INTERVALO_ATUALIZACAO_MS = 15000

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

function DetalhesPedidoModal({ pedido, C, onClose, onAlterarStatus, alterando }) {
  const cores = STATUS_COR(C)
  const proximo = PROXIMO_STATUS[pedido.status]
  return (
    <Modal titulo={`Pedido ${pedido.ifood_order_id}`} eyebrow="Detalhes" onClose={onClose} largura="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1" style={{ color: C.text3 }}>Status</p>
            <Pill color={cores[pedido.status] || C.text2} dot>{STATUS_LABEL[pedido.status] || pedido.status}</Pill>
          </div>
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1" style={{ color: C.text3 }}>Tipo</p>
            <p style={{ color: C.text1 }}>{TIPO_LABEL[pedido.tipo] || pedido.tipo}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1" style={{ color: C.text3 }}>Pagamento</p>
            <p style={{ color: C.text1 }}>{pedido.pagamento || '—'}</p>
          </div>
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1" style={{ color: C.text3 }}>Recebido em</p>
            <p style={{ color: C.text1 }}>{formatarTimestamp(pedido.recebido_em)}</p>
          </div>
        </div>

        {pedido.itens?.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: C.text1 }}>Itens do pedido</p>
            <div className="rounded-xl border divide-y" style={{ borderColor: C.cardBorder }}>
              {pedido.itens.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2 text-xs">
                  <span style={{ color: C.text1 }}>
                    {item.quantidade}× {item.nome}
                  </span>
                  {item.preco != null && <span style={{ color: C.text2 }}>R$ {Number(item.preco).toFixed(2)}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {pedido.linha_do_tempo?.length > 0 && (
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: C.text1 }}>Linha do tempo</p>
            <div className="flex flex-col gap-2.5">
              {pedido.linha_do_tempo.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: C.neutral }} />
                  <div>
                    <p style={{ color: C.text1 }}>{ev.tipo}</p>
                    <p style={{ color: C.text3 }}>{formatarTimestamp(ev.recebido_em)}</p>
                  </div>
                </div>
              ))}
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

export function PedidosView({ apiFetch, C, notificar, inputStyle, lojaNome }) {
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null)
  const [alterandoStatus, setAlterandoStatus] = useState(false)
  const apiFetchRef = useRef(apiFetch)
  apiFetchRef.current = apiFetch

  async function carregarPedidos() {
    try {
      const qs = filtroStatus !== 'TODOS' ? `?status=${filtroStatus}` : ''
      setPedidos(await apiFetchRef.current(`/pedidos${qs}`))
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCarregando(false)
    }
  }

  async function atualizarDoIfood(mostrarToast) {
    setAtualizando(true)
    try {
      const resultado = await apiFetchRef.current('/pedidos/buscar', { method: 'POST' })
      await carregarPedidos()
      if (mostrarToast && resultado.novosPedidos > 0) {
        notificar('sucesso', `${resultado.novosPedidos} pedido(s) novo(s) recebido(s).`)
      }
    } catch (e) {
      if (mostrarToast) notificar('erro', e.message)
    } finally {
      setAtualizando(false)
    }
  }

  useEffect(() => {
    carregarPedidos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroStatus])

  useEffect(() => {
    const intervalo = setInterval(() => atualizarDoIfood(false), INTERVALO_ATUALIZACAO_MS)
    return () => clearInterval(intervalo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function abrirDetalhes(pedido) {
    try {
      setPedidoSelecionado(await apiFetchRef.current(`/pedidos/${pedido.id}`))
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  async function alterarStatusPedido(pedido, novoStatus) {
    setAlterandoStatus(true)
    try {
      await apiFetchRef.current(`/pedidos/${pedido.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      notificar('sucesso', `Pedido atualizado para ${STATUS_LABEL[novoStatus]}.`)
      setPedidoSelecionado(null)
      await carregarPedidos()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setAlterandoStatus(false)
    }
  }

  const cores = STATUS_COR(C)
  const filtrados = pedidos.filter((p) => !busca || p.ifood_order_id.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="rounded-2xl border overflow-hidden min-w-0" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
      <div className="px-6 py-4 flex items-center justify-between border-b flex-wrap gap-3" style={{ borderColor: C.cardBorder }}>
        <div className="flex items-center gap-2">
          <PackageSearch size={15} color="#F56C35" />
          <h2 className="text-sm font-bold" style={{ color: C.text1 }}>Pedidos</h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ color: C.text2, background: C.inputBg }}>
            atualiza sozinho a cada 15s
          </span>
        </div>
        <button
          type="button"
          onClick={() => atualizarDoIfood(true)}
          disabled={atualizando}
          className="botao-primario flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
        >
          <RefreshCw size={13} className={atualizando ? 'animate-spin' : ''} />
          Atualizar do iFood
        </button>
      </div>

      <div className="px-6 py-3.5 border-b flex flex-col md:flex-row gap-2 md:items-center" style={{ borderColor: C.cardBorder }}>
        <div className="relative w-full md:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.text2 }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pedido..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
            style={inputStyle}
          />
        </div>
        <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}>
          {['TODOS', 'NOVO', 'CONFIRMADO', 'DESPACHADO', 'CONCLUIDO', 'CANCELADO'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFiltroStatus(s)}
              className="text-xs px-2.5 py-1.5 rounded-md font-semibold"
              style={filtroStatus === s ? { background: C.cardBg, color: C.text1, boxShadow: C.shSm } : { color: C.text2, background: 'transparent' }}
            >
              {s === 'TODOS' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 290px)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider border-b sticky top-0" style={{ color: C.text3, borderColor: C.cardBorder, background: C.cardBg }}>
              <th className="px-4 py-3 text-left">Pedido</th>
              <th className="px-4 py-3 text-left">Loja</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Pagamento</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-left">Recebido</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-xs" style={{ color: C.text2 }}>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Carregando pedidos...
                  </div>
                </td>
              </tr>
            )}
            {!carregando && filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-xs" style={{ color: C.text2 }}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
            {!carregando &&
              filtrados.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: C.rowBorder }}>
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: '#F56C35' }}>{p.ifood_order_id}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: C.text2 }}>{lojaNome || '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: C.text2 }}>{TIPO_LABEL[p.tipo] || p.tipo}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: C.text2 }}>{p.pagamento || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Pill color={cores[p.status] || C.text2} dot>{STATUS_LABEL[p.status] || p.status}</Pill>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: C.text2 }}>{formatarTimestamp(p.recebido_em)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => abrirDetalhes(p)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={{ color: C.text1, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!carregando && (
        <div className="px-6 py-3 flex items-center justify-between text-[11px] border-t" style={{ borderColor: C.cardBorder, color: C.text3 }}>
          <span>
            {filtrados.length === 0 ? 'Nenhum registro' : `Mostrando 1 até ${filtrados.length} de ${filtrados.length} registros`}
          </span>
        </div>
      )}

      {pedidoSelecionado && (
        <DetalhesPedidoModal
          pedido={pedidoSelecionado}
          C={C}
          onClose={() => setPedidoSelecionado(null)}
          onAlterarStatus={alterarStatusPedido}
          alterando={alterandoStatus}
        />
      )}
    </div>
  )
}
