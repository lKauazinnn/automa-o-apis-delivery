import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, CalendarClock, Clock, Handshake, LayoutGrid, Loader2, Plus, RefreshCw, X } from 'lucide-react'
import { Esqueleto, Modal } from '../ui'
import { codigoCurto, PROXIMO_STATUS, STATUS_COR, TIPO_LABEL } from '../rotulos'
import { DetalhesPedidoModal } from '../DetalhesPedidoModal'

const INTERVALO_ATUALIZACAO_MS = 10000

// Só o trabalho ATIVO ganha faixa larga. Concluído e cancelado vão pro trilho estreito de
// "Finalizados" à direita — antes as cinco colunas tinham a mesma largura, e as duas que
// ninguém precisa olhar durante o serviço comiam 2/5 da tela.
const LANES_ATIVAS = [
  { status: 'NOVO', titulo: 'Novo' },
  { status: 'CONFIRMADO', titulo: 'Confirmado' },
  { status: 'DESPACHADO', titulo: 'Despachado' },
]
const STATUS_FINALIZADOS = ['CONCLUIDO', 'CANCELADO']
const ACAO_PROXIMA = { NOVO: 'Confirmar', CONFIRMADO: 'Despachar', DESPACHADO: 'Concluir' }
// Retirada/mesa não "despacha": no iFood vira readyToPickup ("pronto pra retirada").
const acaoProxima = (p) => (p.status === 'CONFIRMADO' && p.tipo !== 'ENTREGA' ? 'Pronto p/ retirada' : ACAO_PROXIMA[p.status])

function horaCurta(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Cronômetro de preparo: tempo desde que o pedido chegou. `mm:ss` só faz sentido dentro da
// primeira hora — num pedido de teste parado há semanas o formato antigo imprimia coisas como
// "60653:53" (42 dias contados em minutos), que não diz nada pra quem olha o quadro.
function tempoDecorrido(iso, agora) {
  if (!iso) return null
  const seg = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 1000))
  const min = Math.floor(seg / 60)
  let texto
  if (min < 60) texto = `${String(min).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`
  else if (min < 1440) texto = `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
  else texto = `${Math.floor(min / 1440)}d`
  return { min, texto }
}

// Cor do cronômetro — alerta de atraso: >=20min vermelho, >=10min âmbar, antes neutro.
function corTempo(min, C) {
  if (min >= 20) return C.bad
  if (min >= 10) return C.neutral
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

  async function alterarStatus(pedido, novo, extra = {}) {
    const anterior = pedido.status
    moverStatusLocal(pedido.id, novo, true) // instantâneo
    try {
      await apiFetchRef.current(`/pedidos/${pedido.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novo, ...extra }),
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
  const finalizados = visiveis.filter((p) => STATUS_FINALIZADOS.includes(p.status))
  const catalogoFiltrado = catalogo
    .filter((it) => (it.nome || '').toLowerCase().includes(buscaItem.trim().toLowerCase()))
    .slice(0, 80)
  const totalEscolhidos = Object.values(escolhidos).reduce((s, v) => s + (v.qtd || 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <LayoutGrid size={17} color={C.marcaTinta} />
          <h2 className="font-bold" style={{ color: C.text1, fontSize: 15.5, letterSpacing: '-0.01em' }}>
            Quadro de preparo
          </h2>
        </div>
        <div className="flex items-center gap-2.5">
          {onAbrirHistorico && (
            <button
              type="button"
              onClick={onAbrirHistorico}
              className="font-semibold px-4 rounded-xl"
              style={{ color: C.text1, background: C.inputBg, border: `1px solid ${C.cardBorder}`, height: 40, fontSize: 14 }}
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
              className="flex items-center gap-2 font-semibold px-4 rounded-xl disabled:opacity-60"
              style={{ color: C.neutral, background: C.neutralBg, border: `1px solid ${C.neutralBd}`, height: 40, fontSize: 14 }}
            >
              {criandoTeste ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Pedido teste
            </button>
          )}
          <button
            type="button"
            onClick={atualizarDoIfood}
            disabled={atualizando}
            className="botao-primario flex items-center gap-2 font-semibold px-4 rounded-xl disabled:opacity-60"
            style={{ height: 40, fontSize: 14 }}
          >
            <RefreshCw size={15} className={atualizando ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) 300px' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border p-3" style={{ background: C.bg2, borderColor: C.cardBorder, minHeight: 220 }}>
              <div className="flex items-center gap-2.5 pb-3 mb-3 border-b" style={{ borderColor: C.rowBorder }}>
                <Esqueleto w={9} h={9} style={{ borderRadius: 999 }} />
                <Esqueleto w={80} h={13} />
                <div className="ml-auto">
                  <Esqueleto w={26} h={24} style={{ borderRadius: 8 }} />
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                {[0, 1].map((k) => (
                  <div key={k} className="rounded-xl border p-3.5" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
                    <div className="flex justify-between mb-3">
                      <Esqueleto w={90} h={15} />
                      <Esqueleto w={58} h={17} style={{ borderRadius: 8 }} />
                    </div>
                    <Esqueleto w="60%" h={12} />
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: C.cardBorder }}>
                      <Esqueleto w="88%" h={12} />
                      <div className="mt-2">
                        <Esqueleto w="64%" h={12} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3.5 items-start" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) 300px' }}>
          {LANES_ATIVAS.map((col) => {
            const doColuna = visiveis.filter((p) => p.status === col.status)
            const cor = STATUS_COR(C)[col.status]
            return (
              <div
                key={col.status}
                className="rounded-2xl border p-3 flex flex-col gap-2.5"
                style={{ background: C.bg2, borderColor: C.cardBorder, minHeight: 220 }}
              >
                <div className="flex items-center gap-2.5 pb-2.5 border-b" style={{ borderColor: C.rowBorder }}>
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cor }} />
                  <h4 className="font-bold" style={{ color: C.text1, fontSize: 14.5, letterSpacing: '-0.01em' }}>
                    {col.titulo}
                  </h4>
                  <span
                    className="ml-auto font-bold rounded-lg px-2 inline-flex items-center justify-center"
                    style={{ background: cor + '24', color: cor, minWidth: 26, height: 24, fontSize: 14 }}
                  >
                    {doColuna.length}
                  </span>
                </div>

                {doColuna.length === 0 && (
                  <p className="text-center py-8" style={{ color: C.text3, fontSize: 13 }}>
                    Nenhum pedido
                  </p>
                )}

                {doColuna.map((p) => {
                  const itensCard = itensNormalizados(p)
                  const t = tempoDecorrido(p.recebido_em, agora)
                  const atrasado = t && t.min >= 20
                  const proximo = PROXIMO_STATUS[p.status]
                  return (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => abrirDetalhes(p)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          abrirDetalhes(p)
                        }
                      }}
                      className="rounded-xl border transition-all hover:brightness-110 cursor-pointer"
                      style={{
                        background: C.cardBg,
                        borderColor: atrasado ? C.badBd : C.cardBorder,
                        borderLeft: `4px solid ${atrasado ? C.bad : cor}`,
                      }}
                    >
                      <div className="p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="fonte-mono font-bold"
                            style={{ color: C.text1, fontSize: 17, letterSpacing: '-0.02em' }}
                            title={p.ifood_order_id}
                          >
                            {codigoCurto(p.ifood_order_id)}
                          </span>
                          {t ? (
                            <span
                              className="fonte-mono font-bold inline-flex items-center gap-1.5 flex-shrink-0 rounded-lg"
                              style={{
                                color: corTempo(t.min, C),
                                fontSize: 19,
                                padding: t.min >= 10 ? '2px 8px' : '2px 2px',
                                background: t.min >= 10 ? corTempo(t.min, C) + '24' : 'transparent',
                                border: `1px solid ${t.min >= 10 ? corTempo(t.min, C) + '55' : 'transparent'}`,
                              }}
                              title={`Há ${t.min} min no quadro`}
                            >
                              {atrasado ? <AlertTriangle size={15} /> : <Clock size={15} />}
                              {t.texto}
                            </span>
                          ) : (
                            <span className="fonte-mono flex-shrink-0" style={{ color: C.text3, fontSize: 14 }}>
                              {horaCurta(p.recebido_em)}
                            </span>
                          )}
                        </div>

                        <p className="mt-2 font-semibold truncate" style={{ color: C.text1, fontSize: 14.5 }}>
                          {p.cliente?.name || p.cliente?.nome || 'Cliente'}{' '}
                          <span style={{ color: C.text3, fontWeight: 400 }}>· {TIPO_LABEL[p.tipo] || p.tipo}</span>
                        </p>

                        {p.detalhes_brutos?.disputa?.id && (
                          <div
                            className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-bold"
                            style={{ color: C.bad, background: C.bad + '1f', border: `1px solid ${C.bad}55`, fontSize: 13 }}
                          >
                            <Handshake size={14} /> Cliente pediu cancelamento — responder
                          </div>
                        )}
                        {p.detalhes_brutos?.orderTiming === 'SCHEDULED' && (
                          <div
                            className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold"
                            style={{ color: C.info, background: C.info + '1f', fontSize: 13 }}
                          >
                            <CalendarClock size={14} /> Agendado · {horaCurta(p.detalhes_brutos?.schedule?.deliveryDateTimeStart)}
                          </div>
                        )}

                        {itensCard.length > 0 && (
                          <div className="mt-3 pt-3 flex flex-col gap-2 border-t" style={{ borderColor: C.cardBorder }}>
                            {itensCard.slice(0, 4).map((it, idx) => (
                              <div key={idx} style={{ fontSize: 14.5, lineHeight: 1.35, color: C.text1 }}>
                                <span className="font-bold" style={{ color: C.marcaTinta }}>
                                  {it.quantidade || 1}×
                                </span>{' '}
                                {it.nome}
                                {it.complementos?.length > 0 && (
                                  <div style={{ color: C.text3, fontSize: 13, marginTop: 2 }}>
                                    + {it.complementos.map((c) => c.nome).join(', ')}
                                  </div>
                                )}
                                {it.obs && (
                                  <div
                                    className="flex items-start gap-2 mt-1.5 rounded-lg px-2.5 py-2 font-semibold"
                                    style={{
                                      color: C.neutral,
                                      background: C.neutralBg,
                                      border: `1px solid ${C.neutralBd}`,
                                      fontSize: 13.5,
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    <AlertTriangle size={15} className="flex-shrink-0" style={{ marginTop: 1 }} />
                                    <span>{it.obs}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            {itensCard.length > 4 && (
                              <div style={{ color: C.text3, fontSize: 13 }}>+{itensCard.length - 4} item(ns)</div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2.5 mt-3.5">
                          {p.total != null && (
                            <span className="fonte-mono font-semibold" style={{ color: C.text2, fontSize: 15 }}>
                              R$ {Number(p.total).toFixed(2).replace('.', ',')}
                            </span>
                          )}
                          {proximo && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                alterarStatus(p, proximo)
                              }}
                              className="botao-primario ml-auto flex items-center gap-1.5 font-semibold px-3.5 rounded-lg"
                              style={{ height: 36, fontSize: 13.5 }}
                            >
                              {acaoProxima(p)}
                              <ArrowRight size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Trilho de finalizados: concluído e cancelado não disputam mais largura com o que
              está em preparo. Nada some do sistema — só para de ocupar 2/5 da tela. */}
          <div
            className="rounded-2xl border p-3 flex flex-col gap-2.5"
            style={{ background: C.bg2, borderColor: C.cardBorder, minHeight: 220 }}
          >
            <div className="flex items-center gap-2.5 pb-2.5 border-b" style={{ borderColor: C.rowBorder }}>
              <h4 className="font-bold" style={{ color: C.text2, fontSize: 14.5, letterSpacing: '-0.01em' }}>
                Finalizados
              </h4>
              <span className="ml-auto font-semibold" style={{ color: C.text3, fontSize: 13 }}>
                {finalizados.length}
              </span>
            </div>

            {finalizados.length === 0 && (
              <p className="text-center py-8" style={{ color: C.text3, fontSize: 13 }}>
                Nada finalizado ainda
              </p>
            )}

            {finalizados.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => abrirDetalhes(p)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    abrirDetalhes(p)
                  }
                }}
                className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer hover:brightness-110"
                style={{ background: C.cardBg, borderColor: C.cardBorder }}
              >
                <span className="w-1 rounded-full flex-shrink-0" style={{ height: 28, background: STATUS_COR(C)[p.status] }} />
                <div className="min-w-0 flex-1">
                  <div className="fonte-mono font-semibold truncate" style={{ color: C.text1, fontSize: 14 }} title={p.ifood_order_id}>
                    {codigoCurto(p.ifood_order_id)}
                  </div>
                  <div className="truncate" style={{ color: C.text3, fontSize: 12.5 }}>
                    {p.cliente?.name || p.cliente?.nome || '—'}
                    {p.status === 'CANCELADO' ? ' · cancelado' : ''}
                  </div>
                </div>
                <span className="fonte-mono flex-shrink-0" style={{ color: C.text3, fontSize: 13 }}>
                  {horaCurta(p.recebido_em)}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    pedirLimparCard(p)
                  }}
                  title="Limpar do quadro"
                  aria-label={`Limpar ${p.ifood_order_id} do quadro`}
                  className="botao-icone-fantasma w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0"
                  style={{ color: C.text3 }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selecionado && (
        <DetalhesPedidoModal
          pedido={selecionado}
          C={C}
          onClose={() => setSelecionado(null)}
          onAlterarStatus={alterarStatus}
          alterando={false}
          apiFetch={apiFetchRef.current}
          notificar={notificar}
          onAtualizado={() => {
            carregarPedidos()
            const id = selecionado.id
            apiFetchRef.current(`/pedidos/${id}`)
              .then((completo) => setSelecionado((atual) => (atual && atual.id === id ? completo : atual)))
              .catch(() => {})
          }}
        />
      )}

      {mostrarPicker && (
        <Modal titulo="Criar pedido de teste" eyebrow="99Food" onClose={() => setMostrarPicker(false)} largura="max-w-lg">
          <div className="flex flex-col gap-3.5">
            <p style={{ color: C.text2, fontSize: 13.5, lineHeight: 1.55 }}>
              Escolha itens do cardápio real da loja, ou use "Aleatório" pra um item real qualquer.
            </p>
            <input
              value={buscaItem}
              onChange={(e) => setBuscaItem(e.target.value)}
              placeholder="Buscar item do cardápio..."
              className="w-full px-3.5 rounded-xl outline-none"
              style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}`, color: C.text1, height: 44, fontSize: 14.5 }}
            />
            <div className="max-h-72 overflow-y-auto rounded-xl border" style={{ borderColor: C.cardBorder }}>
              {carregandoCat ? (
                <div className="flex flex-col gap-3 p-3.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1">
                        <Esqueleto w="60%" h={13} />
                        <div className="mt-2">
                          <Esqueleto w={70} h={11} />
                        </div>
                      </div>
                      <Esqueleto w={92} h={26} style={{ borderRadius: 8 }} />
                    </div>
                  ))}
                </div>
              ) : (
                catalogoFiltrado.map((it) => {
                  const q = escolhidos[it.itemId]?.qtd || 0
                  return (
                    <div
                      key={it.itemId}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 border-b last:border-0"
                      style={{ borderColor: C.cardBorder, background: q > 0 ? C.marca + '14' : 'transparent' }}
                    >
                      <div className="min-w-0">
                        <p className="truncate" style={{ color: C.text1, fontSize: 14 }}>
                          {it.nome}
                        </p>
                        <p className="fonte-mono" style={{ color: C.text3, fontSize: 13 }}>
                          R$ {Number(it.preco).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => mudarQtd(it, -1)}
                          disabled={q === 0}
                          aria-label="Diminuir quantidade"
                          className="w-8 h-8 rounded-lg disabled:opacity-30"
                          style={{ background: C.inputBg, color: C.text1, border: `1px solid ${C.cardBorder}` }}
                        >
                          −
                        </button>
                        <span className="w-5 text-center font-bold" style={{ color: C.text1, fontSize: 14 }}>
                          {q}
                        </span>
                        <button
                          type="button"
                          onClick={() => mudarQtd(it, +1)}
                          aria-label="Aumentar quantidade"
                          className="w-8 h-8 rounded-lg"
                          style={{ background: C.inputBg, color: C.text1, border: `1px solid ${C.cardBorder}` }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
              {!carregandoCat && catalogoFiltrado.length === 0 && (
                <p className="text-center py-8" style={{ color: C.text3, fontSize: 13.5 }}>
                  Nenhum item encontrado.
                </p>
              )}
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={criandoTeste || totalEscolhidos === 0}
                onClick={() =>
                  criarPedido(Object.entries(escolhidos).map(([id, v]) => ({ item_id: id, nome: v.nome, preco: v.preco, qtd: v.qtd })))
                }
                className="botao-primario flex-1 flex items-center justify-center gap-2 font-semibold px-4 rounded-xl disabled:opacity-50"
                style={{ height: 46, fontSize: 14.5 }}
              >
                {criandoTeste && <Loader2 size={15} className="animate-spin" />}
                Criar pedido{totalEscolhidos > 0 ? ` (${totalEscolhidos} item(ns))` : ''}
              </button>
              <button
                type="button"
                disabled={criandoTeste}
                onClick={() => criarPedido([])}
                title="Cria com um item real aleatório do cardápio"
                className="font-semibold px-4 rounded-xl disabled:opacity-50"
                style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}`, height: 46, fontSize: 14 }}
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
