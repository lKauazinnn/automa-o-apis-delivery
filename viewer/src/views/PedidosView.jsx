import { useEffect, useRef, useState } from 'react'
import { Loader2, PackageSearch, RefreshCw, Search } from 'lucide-react'
import { formatarTimestamp, Pill } from '../ui'
import { codigoCurto, rotularPagamento, STATUS_COR, STATUS_LABEL, TIPO_LABEL } from '../rotulos'
import { DetalhesPedidoModal } from '../DetalhesPedidoModal'

const INTERVALO_ATUALIZACAO_MS = 15000

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

  async function alterarStatusPedido(pedido, novoStatus, extra = {}) {
    setAlterandoStatus(true)
    try {
      await apiFetchRef.current(`/pedidos/${pedido.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, ...extra }),
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
          <PackageSearch size={15} color={C.marcaTinta} />
          <h2 className="font-bold" style={{ color: C.text1, fontSize: 15.5, letterSpacing: '-0.01em' }}>Pedidos</h2>
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
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.text3 }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pedido..."
            aria-label="Buscar pedido"
            className="w-full pl-10 pr-3 rounded-xl text-sm outline-none"
            style={{ ...inputStyle, height: 42 }}
          />
        </div>
        <div role="radiogroup" aria-label="Filtrar por status" className="flex rounded-xl p-1 gap-1" style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}>
          {['TODOS', 'NOVO', 'CONFIRMADO', 'DESPACHADO', 'CONCLUIDO', 'CANCELADO'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFiltroStatus(s)}
              role="radio"
              aria-checked={filtroStatus === s}
              className="px-3.5 rounded-lg font-semibold"
              style={
                filtroStatus === s
                  ? { background: C.card2, color: C.text1, boxShadow: C.shSm, height: 32, fontSize: 13.5 }
                  : { color: C.text2, background: 'transparent', height: 32, fontSize: 13.5 }
              }
            >
              {s === 'TODOS' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 290px)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11.5px] font-semibold uppercase tracking-wider border-b sticky top-0" style={{ color: C.text3, borderColor: C.cardBorder, background: C.cardBg }}>
              <th className="px-4 py-3.5 text-left">Pedido</th>
              <th className="px-4 py-3.5 text-left">Loja</th>
              <th className="px-4 py-3.5 text-left">Tipo</th>
              <th className="px-4 py-3.5 text-left">Pagamento</th>
              <th className="px-4 py-4 text-center">Status</th>
              <th className="px-4 py-3.5 text-left">Recebido</th>
              <th className="px-4 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-sm" style={{ color: C.text2 }}>
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    Carregando pedidos...
                  </div>
                </td>
              </tr>
            )}
            {!carregando && filtrados.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-sm" style={{ color: C.text2 }}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
            {!carregando &&
              filtrados.map((p) => (
                <tr key={p.id} className="border-t" style={{ borderColor: C.rowBorder }}>
                  <td className="px-4 py-4 fonte-mono text-sm font-semibold" style={{ color: C.marcaTinta }} title={p.ifood_order_id}>
                    {codigoCurto(p.ifood_order_id)}
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: C.text2 }}>{lojaNome || '—'}</td>
                  <td className="px-4 py-4 text-sm" style={{ color: C.text2 }}>{TIPO_LABEL[p.tipo] || p.tipo}</td>
                  <td className="px-4 py-4 text-sm" style={{ color: C.text2 }}>{rotularPagamento(p.pagamento)}</td>
                  <td className="px-4 py-4 text-center">
                    <Pill color={cores[p.status] || C.text2} dot>{STATUS_LABEL[p.status] || p.status}</Pill>
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: C.text2 }}>{formatarTimestamp(p.recebido_em)}</td>
                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => abrirDetalhes(p)}
                      className="font-semibold px-3.5 rounded-lg"
                      style={{
                        color: C.text1,
                        background: C.inputBg,
                        border: `1px solid ${C.cardBorder}`,
                        height: 34,
                        fontSize: 13.5,
                      }}
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
        <div className="px-6 py-3.5 flex items-center justify-between text-[13px] border-t" style={{ borderColor: C.cardBorder, color: C.text3 }}>
          <span>
            {/* A tabela rola inteira dentro do card — não há paginação, então o antigo
                "Mostrando 1 até N de N registros" só repetia o mesmo número duas vezes.
                O que falta saber é quanto o filtro escondeu. */}
            {filtrados.length === 0
              ? 'Nenhum pedido encontrado'
              : `${filtrados.length} ${filtrados.length === 1 ? 'pedido' : 'pedidos'}${
                  filtrados.length < pedidos.length ? ` de ${pedidos.length} · filtro ativo` : ''
                }`}
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
          apiFetch={apiFetchRef.current}
          notificar={notificar}
          onAtualizado={() => {
            carregarPedidos()
            abrirDetalhes(pedidoSelecionado)
          }}
        />
      )}
    </div>
  )
}
