import { useEffect, useRef, useState } from 'react'
import { Bike, ChevronRight, ClipboardList, RefreshCw, Search, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { BotaoIcone, CampoBusca, EstadoVazio, Esqueleto, MONO, Segmentado, tons } from '../ds'
import { codigoCurto, rotularPagamento, STATUS_LABEL, TIPO_LABEL } from '../rotulos'
import { DetalhesPedidoModal } from '../DetalhesPedidoModal'

const INTERVALO_ATUALIZACAO_MS = 15000
const GRADE = 'minmax(130px,1fr) minmax(150px,1.2fr) 120px minmax(140px,1.1fr) 150px 120px 116px 40px'
const TOM_STATUS = { NOVO: 'info', CONFIRMADO: 'warn', DESPACHADO: 'info', CONCLUIDO: 'good', CANCELADO: 'bad' }
const ICONE_TIPO = { ENTREGA: Bike, RETIRADA: ShoppingBag, MESA: UtensilsCrossed }
const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function recebido(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(hoje.getDate() - 1)
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === hoje.toDateString()) return `Hoje ${hora}`
  if (d.toDateString() === ontem.toDateString()) return `Ontem ${hora}`
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`
}

export function PedidosView({ apiFetch, notificar, lojaNome, plataforma, celular = false }) {
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
    setCarregando(true)
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

  const termo = busca.trim().toLowerCase()
  const filtrados = pedidos.filter((p) => !termo || String(p.ifood_order_id || '').toLowerCase().includes(termo))

  return (
    <div>
      <section style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--linha)', flexWrap: 'wrap' }}>
          <CampoBusca valor={busca} onChange={setBusca} onLimpar={() => setBusca('')} placeholder="Buscar pelo ID do pedido" icone={<Search size={16} />} aria-label="Buscar pedido" style={{ flex: '0 1 300px' }} />
          <Segmentado
            rotulo="Filtrar por status"
            valor={filtroStatus}
            onChange={setFiltroStatus}
            opcoes={[{ valor: 'TODOS', rotulo: 'Todos' }, ...['NOVO', 'CONFIRMADO', 'DESPACHADO', 'CONCLUIDO', 'CANCELADO'].map((s) => ({ valor: s, rotulo: STATUS_LABEL[s] }))]}
          />
          <span style={{ flex: 1 }} />
          {plataforma !== '99food' && (
            <BotaoIcone rotulo="Buscar pedidos novos no iFood agora" onClick={() => atualizarDoIfood(true)} disabled={atualizando} style={{ border: '1px solid var(--borda)', background: 'var(--card)', width: 40, height: 40 }}>
              <RefreshCw size={16} className={atualizando ? 'animate-spin' : ''} />
            </BotaoIcone>
          )}
        </div>

        {celular ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8, padding: 12 }}>
            {carregando && [0, 1, 2, 3].map((k) => <Esqueleto key={k} h={64} r={12} />)}
            {!carregando && filtrados.length === 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <EstadoVazio icone={<ClipboardList size={22} />} titulo="Nenhum pedido aqui" texto="Troque o status ou tire a busca." />
              </div>
            )}
            {!carregando &&
              filtrados.map((p) => {
                const t = tons(TOM_STATUS[p.status] || 'neutro')
                return (
                  <button key={p.id} type="button" onClick={() => abrirDetalhes(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--borda)', minHeight: 64, textAlign: 'left', cursor: 'pointer', color: 'var(--t1)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 600 }}>#{codigoCurto(p.ifood_order_id)}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {[recebido(p.recebido_em), TIPO_LABEL[p.tipo] || p.tipo, rotularPagamento(p.pagamento)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', height: 22, padding: '0 8px', borderRadius: 99, background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[p.status] || p.status}</span>
                      <span style={{ fontFamily: MONO, fontSize: 13 }}>{p.total != null ? brl(p.total) : ''}</span>
                    </div>
                  </button>
                )
              })}
          </div>
        ) : (
        <div role="table" aria-label="Pedidos">
          <div
            role="row"
            style={{
              display: 'grid',
              gridTemplateColumns: GRADE,
              alignItems: 'center',
              height: 40,
              padding: '0 20px',
              background: 'var(--card2)',
              borderBottom: '1px solid var(--linha)',
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: '.08em',
              textTransform: 'uppercase',
              color: 'var(--t3)',
              position: 'sticky',
              top: -24,
              zIndex: 2,
            }}
          >
            <div>Pedido</div>
            <div>Loja</div>
            <div>Tipo</div>
            <div>Pagamento</div>
            <div>Status</div>
            <div>Recebido</div>
            <div style={{ textAlign: 'right' }}>Total</div>
            <div />
          </div>

          {carregando &&
            Array.from({ length: 8 }).map((_, k) => (
              <div key={k} style={{ display: 'grid', gridTemplateColumns: GRADE, alignItems: 'center', minHeight: 56, padding: '0 20px', borderBottom: '1px solid var(--linha)', gap: 8 }}>
                <Esqueleto w="70%" h={13} />
                <Esqueleto w="60%" h={12} />
                <Esqueleto w={70} h={12} />
                <Esqueleto w="55%" h={12} />
                <Esqueleto w={96} h={24} r={99} />
                <Esqueleto w={80} h={12} />
                <Esqueleto w={70} h={12} style={{ marginLeft: 'auto' }} />
                <span />
              </div>
            ))}

          {!carregando && filtrados.length === 0 && (
            <EstadoVazio
              icone={<ClipboardList size={22} />}
              titulo={termo || filtroStatus !== 'TODOS' ? 'Nenhum pedido com esse filtro' : 'Nenhum pedido ainda'}
              texto={termo || filtroStatus !== 'TODOS' ? 'Tire a busca ou troque o status pra ver os outros.' : 'Os pedidos da loja aparecem aqui assim que chegam da plataforma.'}
            />
          )}

          {!carregando &&
            filtrados.map((p) => {
              const t = tons(TOM_STATUS[p.status] || 'neutro')
              const IconeTipo = ICONE_TIPO[p.tipo] || ShoppingBag
              const eh99 = String(p.ifood_order_id || '').startsWith('99-')
              return (
                <button
                  key={p.id}
                  type="button"
                  role="row"
                  onClick={() => abrirDetalhes(p)}
                  className="ds-linha"
                  style={{ display: 'grid', gridTemplateColumns: GRADE, alignItems: 'center', minHeight: 56, padding: '0 20px', borderBottom: '1px solid var(--linha)', width: '100%', border: 0, borderBottomStyle: 'solid', borderBottomWidth: 1, borderBottomColor: 'var(--linha)', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--t1)' }}
                >
                  <div title={p.ifood_order_id} style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    #{codigoCurto(p.ifood_order_id)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lojaNome || '—'}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>{eh99 ? '99Food' : 'iFood'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--t2)' }}>
                    <IconeTipo size={16} />
                    {TIPO_LABEL[p.tipo] || p.tipo || '—'}
                  </div>
                  <div style={{ fontSize: 13.5, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{rotularPagamento(p.pagamento)}</div>
                  <div>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 24, padding: '0 10px', borderRadius: 99, background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, fontSize: 12.5, fontWeight: 600 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: t.fg }} />
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 13, color: 'var(--t2)' }}>{recebido(p.recebido_em)}</div>
                  <div style={{ fontFamily: MONO, fontSize: 14, textAlign: 'right' }}>{p.total != null ? brl(p.total) : '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', color: 'var(--t3)' }}>
                    <ChevronRight size={16} />
                  </div>
                </button>
              )
            })}

          {!carregando && (
            <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--t3)' }}>
              {filtrados.length} {filtrados.length === 1 ? 'pedido' : 'pedidos'}
              {filtrados.length < pedidos.length ? ` de ${pedidos.length} · busca ativa` : ''} · atualiza sozinho a cada 15s
            </div>
          )}
        </div>
        )}
      </section>

      {pedidoSelecionado && (
        <DetalhesPedidoModal
          pedido={pedidoSelecionado}
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
