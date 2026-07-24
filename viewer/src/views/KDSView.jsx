import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Clock, LayoutGrid, Loader2, Plus, RefreshCw, X } from 'lucide-react'
import { Modal, Pill } from '../ui'
import { DetalhesPedidoModal } from '../DetalhesPedidoModal'

const INTERVALO_ATUALIZACAO_MS = 10000

const COLUNAS = [
  { status: 'NOVO', titulo: 'Novo' },
  { status: 'CONFIRMADO', titulo: 'Confirmado' },
  { status: 'DESPACHADO', titulo: 'Despachado' },
  { status: 'CONCLUIDO', titulo: 'Concluído' },
  { status: 'CANCELADO', titulo: 'Cancelado' },
]
const TIPO_LABEL = { ENTREGA: 'Entrega', RETIRADA: 'Retirada', MESA: 'Mesa' }
const STATUS_LABEL = { NOVO: 'Novo', CONFIRMADO: 'Confirmado', DESPACHADO: 'Despachado', CONCLUIDO: 'Concluído', CANCELADO: 'Cancelado' }
// Cor por status: novo=azul, em preparo=âmbar, a caminho=azul, concluído=verde, cancelado=vermelho.
const STATUS_COR = (C) => ({ NOVO: C.info, CONFIRMADO: C.neutral, DESPACHADO: C.info, CONCLUIDO: C.good, CANCELADO: C.bad })
const STATUS_ATIVO = { NOVO: true, CONFIRMADO: true, DESPACHADO: true }

function horaCurta(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Cronômetro de preparo: tempo decorrido desde que o pedido chegou (mm:ss).
function tempoDecorrido(iso, agora) {
  if (!iso) return null
  const seg = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 1000))
  const min = Math.floor(seg / 60)
  return { min, texto: `${String(min).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}` }
}

// Cor do cronômetro — alerta de atraso: >=20min vermelho, >=10min âmbar, antes neutro.
function corTempo(min, C) {
  if (min >= 20) return C.bad
  if (min >= 10) return '#e0a44c'
  return C.text2
}

// Itens do pedido no formato do KDS, respeitando a API de CADA plataforma (não misturar):
// 99Food guarda em detalhes_brutos.itens (nome/qtd/complementos); iFood em
// detalhes_brutos.items (name/quantity/options — shape da Order API do iFood).
function itensNormalizados(p) {
  const db = p.detalhes_brutos || {}
  const eh99 = String(p.ifood_order_id || '').startsWith('99-')
  if (eh99) {
    return (db.itens || []).map((it, i) => ({
      id: i,
      quantidade: it.qtd || 1,
      nome: it.nome,
      preco: it.preco,
      complementos: it.complementos || [],
      obs: it.obs || '',
    }))
  }
  return (db.items || []).map((it, i) => ({
    id: i,
    quantidade: it.quantity || 1,
    nome: it.name,
    preco: it.totalPrice ?? it.price ?? it.unitPrice,
    complementos: (it.options || []).map((o) => ({ nome: o.name, preco: o.price, grupo: o.groupName || '' })),
    obs: it.observations || '',
  }))
}

export function KDSView({ apiFetch, C, notificar, setConfirmacao, onAbrirHistorico, plataforma }) {
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [criandoTeste, setCriandoTeste] = useState(false)
  const [selecionado, setSelecionado] = useState(null)
  const [agora, setAgora] = useState(() => Date.now())
  const [mostrarPicker, setMostrarPicker] = useState(false)
  const [catalogo, setCatalogo] = useState([])
  const [carregandoCat, setCarregandoCat] = useState(false)
  const [buscaItem, setBuscaItem] = useState('')
  const [escolhidos, setEscolhidos] = useState({}) // itemId -> { nome, preco, qtd }
  const ehNoveNove = plataforma === '99food'

  function montarDetalheLocal(p) {
    // Monta o detalhe a partir do que JÁ veio no /pedidos (instantâneo, sem ida ao servidor).
    const db = p.detalhes_brutos || {}
    const rot = {
      NOVO: 'Novo pedido recebido',
      CONFIRMADO: 'Pedido confirmado',
      DESPACHADO: 'Saiu para entrega / despachado',
      CONCLUIDO: 'Pedido concluído',
      CANCELADO: 'Pedido cancelado',
    }
    return {
      ...p,
      itens: itensNormalizados(p),
      linha_do_tempo: (db.timeline || []).map((t, i) => ({ id: i, tipo: rot[t.status] || t.status, recebido_em: t.em })),
    }
  }

  function abrirDetalhes(pedido) {
    setSelecionado(montarDetalheLocal(pedido)) // abre na hora com os dados já carregados
    // Enriquece em segundo plano (ex: pedido iFood com itens/eventos em tabelas separadas).
    apiFetchRef.current(`/pedidos/${pedido.id}`)
      .then((completo) => setSelecionado((atual) => (atual && atual.id === pedido.id ? completo : atual)))
      .catch(() => {})
  }

  // Move o pedido de status na tela NA HORA (otimista); o servidor sincroniza depois.
  function moverStatusLocal(id, status, registrarTimeline) {
    const rot = {
      NOVO: 'Novo pedido recebido',
      CONFIRMADO: 'Pedido confirmado',
      DESPACHADO: 'Saiu para entrega / despachado',
      CONCLUIDO: 'Pedido concluído',
      CANCELADO: 'Pedido cancelado',
    }
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
    setSelecionado((s) => {
      if (!s || s.id !== id) return s
      if (!registrarTimeline) return { ...s, status }
      const linha = s.linha_do_tempo || []
      return {
        ...s,
        status,
        linha_do_tempo: [...linha, { id: `l${linha.length}`, tipo: rot[status] || status, recebido_em: new Date().toISOString() }],
      }
    })
  }

  async function alterarStatus(pedido, novo) {
    const anterior = pedido.status
    moverStatusLocal(pedido.id, novo, true) // instantâneo
    try {
      await apiFetchRef.current(`/pedidos/${pedido.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novo }),
      })
    } catch (e) {
      moverStatusLocal(pedido.id, anterior, false) // desfaz se o servidor recusar
      notificar('erro', e.message)
    }
  }
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
      // 99Food não tem polling — os pedidos chegam via webhook, então só relê do banco.
      // iFood puxa os eventos pendentes antes de reler.
      if (!ehNoveNove) {
        await apiFetchRef.current('/pedidos/buscar', { method: 'POST' })
      }
      await carregarPedidos()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setAtualizando(false)
    }
  }

  async function abrirPicker() {
    setMostrarPicker(true)
    if (catalogo.length === 0) {
      setCarregandoCat(true)
      try {
        setCatalogo((await apiFetchRef.current('/99food/catalogo')).itens || [])
      } catch (e) {
        notificar('erro', e.message)
      } finally {
        setCarregandoCat(false)
      }
    }
  }

  function mudarQtd(item, delta) {
    setEscolhidos((prev) => {
      const q = Math.max(0, (prev[item.itemId]?.qtd || 0) + delta)
      const next = { ...prev }
      if (q === 0) delete next[item.itemId]
      else next[item.itemId] = { nome: item.nome, preco: item.preco, qtd: q }
      return next
    })
  }

  async function criarPedido(items) {
    setCriandoTeste(true)
    try {
      const r = await apiFetchRef.current('/99food/pedido-teste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items || [] }),
      })
      notificar('sucesso', `Pedido de teste criado (${r.order_id}).`)
      setMostrarPicker(false)
      setEscolhidos({})
      setBuscaItem('')
      await carregarPedidos()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCriandoTeste(false)
    }
  }

  useEffect(() => {
    carregarPedidos()
    const intervalo = setInterval(() => atualizarDoIfood(), INTERVALO_ATUALIZACAO_MS)
    const relogio = setInterval(() => setAgora(Date.now()), 1000) // cronômetro dos cards
    return () => {
      clearInterval(intervalo)
      clearInterval(relogio)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
  const catalogoFiltrado = catalogo
    .filter((it) => (it.nome || '').toLowerCase().includes(buscaItem.trim().toLowerCase()))
    .slice(0, 80)
  const totalEscolhidos = Object.values(escolhidos).reduce((s, v) => s + (v.qtd || 0), 0)

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
          {ehNoveNove && (
            <button
              type="button"
              onClick={abrirPicker}
              disabled={criandoTeste}
              title="Cria um pedido de teste com itens reais do seu cardápio (via o mesmo fluxo do webhook)"
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
              style={{ color: '#e0a44c', background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              {criandoTeste ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Criar pedido teste
            </button>
          )}
          <button
            type="button"
            onClick={atualizarDoIfood}
            disabled={atualizando}
            className="botao-primario flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
          >
            <RefreshCw size={13} className={atualizando ? 'animate-spin' : ''} />
            {ehNoveNove ? 'Atualizar' : 'Atualizar pedidos'}
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
                    const podeLimpar = p.status === 'CONCLUIDO' || p.status === 'CANCELADO'
                    // Preview dos itens no card, normalizado pela API de CADA plataforma (iFood lê
                    // detalhes_brutos.items; 99, detalhes_brutos.itens) — ver itensNormalizados.
                    const itensCard = itensNormalizados(p)
                    return (
                      <div
                        key={p.id}
                        role="button"
                        onClick={() => abrirDetalhes(p)}
                        className="rounded-xl border p-3 transition-all hover:brightness-110"
                        style={{
                          background: C.cardBg,
                          borderColor: C.cardBorder,
                          borderLeft: `3px solid ${STATUS_COR(C)[p.status] || C.cardBorder}`,
                          cursor: 'pointer',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold" style={{ color: C.text1 }}>{p.ifood_order_id}</span>
                          {(() => {
                            const t = STATUS_ATIVO[p.status] ? tempoDecorrido(p.recebido_em, agora) : null
                            return t ? (
                              <span
                                className="text-[11px] font-bold fonte-mono inline-flex items-center gap-1 flex-shrink-0"
                                style={{ color: corTempo(t.min, C) }}
                                title={`Há ${t.min} min no quadro`}
                              >
                                <Clock size={11} />{t.texto}
                                {t.min >= 20 && <AlertTriangle size={11} />}
                              </span>
                            ) : (
                              <span className="text-[11px] flex-shrink-0" style={{ color: C.text3 }}>{horaCurta(p.recebido_em)}</span>
                            )
                          })()}
                        </div>
                        {p.cliente?.name && (
                          <p className="text-[11px] mt-1 font-semibold truncate" style={{ color: C.text1 }}>{p.cliente.name}</p>
                        )}
                        <p className="text-[11px] mt-0.5 flex items-center justify-between gap-2" style={{ color: C.text2 }}>
                          <span>{TIPO_LABEL[p.tipo] || p.tipo}</span>
                          {p.total != null && (
                            <span className="fonte-mono">R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                          )}
                        </p>
                        {itensCard.length > 0 && (
                          <div className="mt-2 pt-2 flex flex-col gap-0.5 border-t" style={{ borderColor: C.cardBorder }}>
                            {itensCard.slice(0, 4).map((it, idx) => (
                              <div key={idx} className="text-[11px] leading-snug" style={{ color: C.text1 }}>
                                <span className="font-bold" style={{ color: '#F56C35' }}>{it.quantidade || 1}×</span> {it.nome}
                                {it.complementos?.length > 0 && (
                                  <span style={{ color: C.text3 }}> · {it.complementos.map((c) => c.nome).join(', ')}</span>
                                )}
                                {it.obs && (
                                  <div className="flex items-start gap-1 mt-0.5 font-semibold" style={{ color: '#e0a44c' }}>
                                    <AlertTriangle size={11} className="flex-shrink-0" style={{ marginTop: 1 }} />
                                    <span>{it.obs}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            {itensCard.length > 4 && (
                              <div className="text-[10px]" style={{ color: C.text3 }}>+{itensCard.length - 4} item(ns)</div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 gap-1.5">
                          <Pill color={STATUS_COR(C)[p.status] || C.text2} dot>{STATUS_LABEL[p.status] || p.status}</Pill>
                          {!podeLimpar && (
                            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: C.text3 }}>ver detalhes →</span>
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

      {selecionado && (
        <DetalhesPedidoModal
          pedido={selecionado}
          C={C}
          onClose={() => setSelecionado(null)}
          onAlterarStatus={alterarStatus}
          alterando={false}
        />
      )}

      {mostrarPicker && (
        <Modal titulo="Criar pedido de teste" eyebrow="99Food" onClose={() => setMostrarPicker(false)} largura="max-w-lg">
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: C.text2 }}>
              Escolha itens do cardápio real da loja (ou clique em "Aleatório" pra um item real qualquer).
            </p>
            <input
              value={buscaItem}
              onChange={(e) => setBuscaItem(e.target.value)}
              placeholder="Buscar item do cardápio..."
              className="w-full text-sm px-3 py-2 rounded-xl"
              style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}`, color: C.text1 }}
            />
            <div className="max-h-72 overflow-y-auto rounded-xl border" style={{ borderColor: C.cardBorder }}>
              {carregandoCat ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs" style={{ color: C.text2 }}>
                  <Loader2 size={14} className="animate-spin" /> Carregando cardápio...
                </div>
              ) : (
                catalogoFiltrado.map((it) => {
                  const q = escolhidos[it.itemId]?.qtd || 0
                  return (
                    <div
                      key={it.itemId}
                      className="flex items-center justify-between gap-2 px-3 py-2 text-xs border-b last:border-0"
                      style={{ borderColor: C.cardBorder, background: q > 0 ? 'rgba(245,108,53,0.08)' : 'transparent' }}
                    >
                      <div className="min-w-0">
                        <p className="truncate" style={{ color: C.text1 }}>{it.nome}</p>
                        <p className="fonte-mono" style={{ color: C.text3 }}>R$ {Number(it.preco).toFixed(2).replace('.', ',')}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button type="button" onClick={() => mudarQtd(it, -1)} disabled={q === 0} className="w-6 h-6 rounded-lg disabled:opacity-30" style={{ background: C.inputBg, color: C.text1 }}>−</button>
                        <span className="w-4 text-center font-bold" style={{ color: C.text1 }}>{q}</span>
                        <button type="button" onClick={() => mudarQtd(it, +1)} className="w-6 h-6 rounded-lg" style={{ background: C.inputBg, color: C.text1 }}>+</button>
                      </div>
                    </div>
                  )
                })
              )}
              {!carregandoCat && catalogoFiltrado.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: C.text3 }}>Nenhum item encontrado.</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={criandoTeste || totalEscolhidos === 0}
                onClick={() =>
                  criarPedido(Object.entries(escolhidos).map(([id, v]) => ({ item_id: id, nome: v.nome, preco: v.preco, qtd: v.qtd })))
                }
                className="botao-primario flex-1 flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50"
              >
                {criandoTeste && <Loader2 size={13} className="animate-spin" />}
                Criar pedido{totalEscolhidos > 0 ? ` (${totalEscolhidos} item(ns))` : ''}
              </button>
              <button
                type="button"
                disabled={criandoTeste}
                onClick={() => criarPedido([])}
                title="Cria com um item real aleatório do cardápio"
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl disabled:opacity-50"
                style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
              >
                Aleatório
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
