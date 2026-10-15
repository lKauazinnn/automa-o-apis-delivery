import { useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, ArrowRight, Ban, Bike, CalendarClock, CheckCircle2, Clock, Handshake, Maximize2, MessageSquareWarning, Minus, Plus, RefreshCw, Search, ShoppingBag, UtensilsCrossed, X } from 'lucide-react'
import { Botao, BotaoIcone, CampoBusca, Dialogo, Esqueleto, Etiqueta, MONO, Segmentado, tons } from '../ds'
import { MarcaContext, tokensDaMarca } from '../marca'
import { SimboloPausaFast } from '../Logo'
import { codigoCurto, PROXIMO_STATUS, TIPO_LABEL } from '../rotulos'
import { DetalhesPedidoModal } from '../DetalhesPedidoModal'

const INTERVALO_ATUALIZACAO_MS = 10000

// Só o trabalho ATIVO ganha coluna larga. Concluído e cancelado vão pro trilho estreito de
// "Finalizados" à direita — ninguém precisa olhar pra eles durante o serviço.
const LANES_ATIVAS = [
  { status: 'NOVO', titulo: 'Novo', tipo: 'info', vazio: 'Pedidos novos aparecem aqui' },
  { status: 'CONFIRMADO', titulo: 'Em preparo', tipo: 'warn', vazio: 'Nada no fogo' },
  { status: 'DESPACHADO', titulo: 'Pronto / Despachado', tipo: 'good', vazio: 'Nada esperando' },
]
const STATUS_FINALIZADOS = ['CONCLUIDO', 'CANCELADO']
const ACAO_PROXIMA = { NOVO: 'Confirmar', CONFIRMADO: 'Despachar', DESPACHADO: 'Concluir' }
// Retirada/mesa não "despacha": no iFood vira readyToPickup ("pronto pra retirada").
const acaoProxima = (p) => (p.status === 'CONFIRMADO' && p.tipo !== 'ENTREGA' ? 'Pronto p/ retirada' : ACAO_PROXIMA[p.status])
const ICONE_TIPO = { ENTREGA: Bike, RETIRADA: ShoppingBag, MESA: UtensilsCrossed }

// Pedido parado há mais de 3h numa coluna ativa quase sempre é um teste ou um pedido que a
// plataforma já encerrou sem avisar — vira "esquecido?" com botão de arquivar, em vez de
// gritar em vermelho pra sempre.
const MIN_ESQUECIDO = 180

function horaCurta(iso) {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Cronômetro de preparo: tempo desde que o pedido chegou. `mm:ss` só na primeira hora; depois
// "1h05" e, passando de um dia, "3 d" — um pedido parado há semanas não vira "60653:53".
function tempoDecorrido(iso, agora) {
  if (!iso) return null
  const seg = Math.max(0, Math.floor((agora - new Date(iso).getTime()) / 1000))
  const min = Math.floor(seg / 60)
  let texto
  if (min < 60) texto = `${String(min).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`
  else if (min < 1440) texto = `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
  else texto = `${Math.floor(min / 1440)} d`
  return { min, texto }
}

// Semáforo: < 10 min normal, ≥ 10 âmbar ("atenção"), ≥ 20 vermelho ("ATRASADO"), ≥ 3h "esquecido?".
function nivelTempo(min) {
  if (min >= MIN_ESQUECIDO) return 'esq'
  if (min >= 20) return 'bad'
  if (min >= 10) return 'warn'
  return 'ok'
}

const COR_TEMPO = {
  ok: { bg: 'var(--input)', bd: 'var(--borda)', fg: 'var(--t1)' },
  warn: { bg: 'var(--warn-bg)', bd: 'var(--warn-bd)', fg: 'var(--warn)' },
  bad: { bg: 'var(--bad)', bd: 'var(--bad)', fg: 'var(--card)' },
  esq: { bg: 'var(--input)', bd: 'var(--borda)', fg: 'var(--t3)' },
}

const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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

export function KDSView({ apiFetch, C, notificar, setConfirmacao, plataforma, lojaNome, celular = false, compacto = false }) {
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


  const { marca } = useContext(MarcaContext)
  const [tv, setTv] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('TODOS')
  const [laneEscolhida, setLaneCelular] = useState(null)

  // Esc sai do modo cozinha (tela cheia).
  useEffect(() => {
    if (!tv) return undefined
    function aoTeclar(e) {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) setTv(false)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [tv])

  const visiveis = pedidos.filter((p) => !p.oculto_kds)
  const ativos = visiveis.filter((p) => !STATUS_FINALIZADOS.includes(p.status))
  const filtrados = ativos.filter((p) => filtroTipo === 'TODOS' || p.tipo === filtroTipo)
  const finalizados = visiveis.filter((p) => STATUS_FINALIZADOS.includes(p.status))
  const atrasados = ativos.filter((p) => {
    const t = tempoDecorrido(p.recebido_em, agora)
    return t && t.min >= 20 && t.min < MIN_ESQUECIDO
  }).length
  const catalogoFiltrado = catalogo.filter((it) => (it.nome || '').toLowerCase().includes(buscaItem.trim().toLowerCase())).slice(0, 80)
  const totalEscolhidos = Object.values(escolhidos).reduce((s, v) => s + (v.qtd || 0), 0)
  const relogio = new Date(agora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const resumo = [{ n: ativos.length, l: 'ativos', ...tons('neutro'), bg: 'var(--card)' }]
  if (atrasados) resumo.push({ n: atrasados, l: atrasados > 1 ? 'atrasados' : 'atrasado', ...tons('bad') })

  // No modo TV o quadro tem tema próprio (escuro por padrão) — a tinta da marca precisa ser a
  // do tema do quadro, não a do painel.
  const temaTv = 'escuro'
  const tintaTv = tokensDaMarca(marca.cor, temaTv).marcaTinta

  function cartao(p) {
    const itens = itensNormalizados(p)
    const t = tempoDecorrido(p.recebido_em, agora)
    const nivel = t ? nivelTempo(t.min) : 'ok'
    const cor = COR_TEMPO[nivel]
    const proximo = PROXIMO_STATUS[p.status]
    const eh99 = String(p.ifood_order_id || '').startsWith('99-')
    const IconeTipo = ICONE_TIPO[p.tipo] || ShoppingBag
    const subTipo = p.status === 'DESPACHADO' ? (p.tipo === 'ENTREGA' ? 'saiu para entrega' : 'aguardando retirada') : ''
    const observacoes = itens.filter((it) => it.obs)
    const flag = nivel === 'bad' ? { t: 'ATRASADO', c: 'var(--bad)' } : nivel === 'warn' ? { t: 'atenção', c: 'var(--warn)' } : nivel === 'esq' ? { t: 'esquecido?', c: 'var(--t3)' } : null
    return (
      <article
        key={p.id}
        style={{
          background: 'var(--card)',
          border: `${nivel === 'bad' ? 2 : 1}px solid ${nivel === 'bad' ? 'var(--bad)' : nivel === 'warn' ? 'var(--warn-bd)' : 'var(--borda)'}`,
          borderRadius: 12,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--sh-sm)',
        }}
      >
        <button
          type="button"
          onClick={() => abrirDetalhes(p)}
          aria-label={`Ver detalhes do pedido ${codigoCurto(p.ifood_order_id)}`}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px 12px', background: nivel === 'bad' ? 'var(--bad-bg)' : 'transparent', border: 0, textAlign: 'left', cursor: 'pointer', color: 'var(--t1)' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div title={p.ifood_order_id} style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.2 }}>
              #{codigoCurto(p.ifood_order_id)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 13.5, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <Etiqueta>{eh99 ? '99Food' : 'iFood'}</Etiqueta>
              <span style={{ fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.cliente?.name || p.cliente?.nome || 'Cliente'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            {t ? (
              <div title={`Há ${t.min} min no quadro`} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 10px', borderRadius: 9, background: cor.bg, border: `1px solid ${cor.bd}`, color: cor.fg, fontFamily: MONO, fontSize: 22, fontWeight: 600 }}>
                {nivel === 'bad' && <AlertTriangle size={16} />}
                {nivel === 'esq' && <Clock size={16} />}
                {t.texto}
              </div>
            ) : (
              <span style={{ fontFamily: MONO, color: 'var(--t3)', fontSize: 14 }}>{horaCurta(p.recebido_em)}</span>
            )}
            {flag && <span style={{ fontSize: 12, fontWeight: 700, color: flag.c, letterSpacing: '.02em' }}>{flag.t}</span>}
          </div>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderTop: '1px solid var(--linha)', borderBottom: '1px solid var(--linha)', fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>
          <span style={{ color: 'var(--t2)', display: 'flex' }}>
            <IconeTipo size={16} />
          </span>
          {TIPO_LABEL[p.tipo] || p.tipo || '—'}
          {subTipo && <span style={{ color: 'var(--t3)', fontWeight: 500 }}>· {subTipo}</span>}
        </div>

        {p.detalhes_brutos?.disputa?.id && (
          <div style={{ margin: '12px 12px 0', padding: '8px 10px', borderRadius: 9, background: 'var(--bad-bg)', border: '1px solid var(--bad-bd)', color: 'var(--bad)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700 }}>
            <Handshake size={16} /> Cliente pediu cancelamento — responder
          </div>
        )}
        {p.detalhes_brutos?.orderTiming === 'SCHEDULED' && (
          <div style={{ margin: '12px 12px 0', padding: '8px 10px', borderRadius: 9, background: 'var(--info-bg)', border: '1px solid var(--info-bd)', color: 'var(--info)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600 }}>
            <CalendarClock size={16} /> Agendado · {horaCurta(p.detalhes_brutos?.schedule?.deliveryDateTimeStart)}
          </div>
        )}

        {itens.length > 0 && (
          <ul style={{ listStyle: 'none', margin: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {itens.slice(0, 6).map((it) => (
              <li key={it.id} style={{ display: 'grid', gridTemplateColumns: '36px minmax(0,1fr)', gap: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, color: 'var(--marca-tinta)' }}>{it.quantidade}×</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.3, color: 'var(--t1)' }}>{it.nome}</div>
                  {it.complementos?.length > 0 && (
                    <div style={{ fontSize: 14, color: 'var(--t2)', marginTop: 2, lineHeight: 1.4 }}>{it.complementos.map((c) => c.nome).join(' · ')}</div>
                  )}
                </div>
              </li>
            ))}
            {itens.length > 6 && <li style={{ fontSize: 13.5, color: 'var(--t3)' }}>+{itens.length - 6} item(ns) — ver detalhes</li>}
          </ul>
        )}

        {observacoes.length > 0 && (
          <div style={{ margin: '0 12px 12px', padding: '10px 12px', borderRadius: 9, background: 'var(--warn-bg)', border: '1px solid var(--warn-bd)', display: 'flex', gap: 10 }}>
            <span style={{ color: 'var(--warn)', display: 'flex', paddingTop: 2 }}>
              <MessageSquareWarning size={16} />
            </span>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--warn)' }}>Observação do cliente</div>
              {observacoes.map((it) => (
                <div key={it.id} style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.4, marginTop: 2, color: 'var(--t1)', textWrap: 'pretty' }}>
                  {observacoes.length > 1 || itens.length > 1 ? <span style={{ color: 'var(--t2)', fontWeight: 500 }}>{it.nome}: </span> : null}
                  {it.obs}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderTop: '1px solid var(--linha)', marginTop: 'auto' }}>
          <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 500, color: 'var(--t2)', flex: 1, whiteSpace: 'nowrap' }}>{p.total != null ? brl(p.total) : ''}</span>
          {nivel === 'esq' && (
            <Botao variante="secundario" tamanho="lg" onClick={() => pedirLimparCard(p)}>
              Arquivar
            </Botao>
          )}
          {proximo && (
            <Botao variante="primario" tamanho="lg" onClick={() => alterarStatus(p, proximo)} style={{ fontSize: 15 }}>
              {acaoProxima(p)}
              <ArrowRight size={16} />
            </Botao>
          )}
        </div>
      </article>
    )
  }

  function linhaFinalizado(p) {
    const cancelado = p.status === 'CANCELADO'
    return (
      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 9, background: 'var(--card)', border: '1px solid var(--linha)' }}>
        <span style={{ color: cancelado ? 'var(--bad)' : 'var(--good)', display: 'flex' }}>{cancelado ? <Ban size={16} /> : <CheckCircle2 size={16} />}</span>
        <button type="button" onClick={() => abrirDetalhes(p)} title={p.ifood_order_id} style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--t1)' }}>
          <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: cancelado ? 'line-through' : 'none' }}>#{codigoCurto(p.ifood_order_id)}</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.cliente?.name || p.cliente?.nome || '—'}
            {cancelado ? ' · cancelado' : ''}
          </div>
        </button>
        <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--t3)' }}>{horaCurta(p.recebido_em)}</span>
        <BotaoIcone rotulo={`Tirar ${codigoCurto(p.ifood_order_id)} do quadro`} tamanho={28} onClick={() => pedirLimparCard(p)}>
          <X size={14} />
        </BotaoIcone>
      </div>
    )
  }

  const colunas = LANES_ATIVAS.map((col) => ({
    ...col,
    pedidos: filtrados
      .filter((p) => p.status === col.status)
      .sort((a, b) => new Date(a.recebido_em || 0).getTime() - new Date(b.recebido_em || 0).getTime()),
  }))

  // Sem escolha da pessoa, abre na primeira coluna que tem pedido (senão em "Novo").
  const laneCelular = laneEscolhida || colunas.find((c) => c.pedidos.length)?.status || 'NOVO'
  const emLanes = (celular || compacto) && !tv

  const quadroCelular = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 4, background: 'var(--bg)', padding: '6px 0 8px' }}>
        <Segmentado
          rotulo="Coluna da cozinha"
          valor={laneCelular}
          onChange={setLaneCelular}
          altura={44}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
          opcoes={[
            ...colunas.map((c) => ({ valor: c.status, rotulo: c.status === 'DESPACHADO' ? 'Pronto' : c.titulo, contagem: c.pedidos.length, cheio: true })),
            { valor: 'FEITOS', rotulo: 'Feitos', contagem: finalizados.length, cheio: true },
          ]}
        />
      </div>
      {carregando ? (
        [0, 1].map((k) => <Esqueleto key={k} h={180} r={12} />)
      ) : laneCelular === 'FEITOS' ? (
        finalizados.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--t3)', padding: '32px 4px', textAlign: 'center' }}>Nada finalizado ainda</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>{finalizados.map(linhaFinalizado)}</div>
        )
      ) : (colunas.find((c) => c.status === laneCelular)?.pedidos || []).length === 0 ? (
        <div style={{ minHeight: 160, border: '1.5px dashed var(--borda)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--t3)', fontSize: 14, textAlign: 'center', padding: 16 }}>
          <CheckCircle2 size={22} />
          {colunas.find((c) => c.status === laneCelular)?.vazio}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: celular ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, alignItems: 'start' }}>
          {colunas.find((c) => c.status === laneCelular).pedidos.map(cartao)}
        </div>
      )}
    </div>
  )

  const quadro = emLanes ? quadroCelular : (
    <div style={{ flex: 1, display: 'flex', gap: 16, padding: tv ? '20px 24px' : 0, alignItems: 'stretch', zoom: tv ? 1.18 : 1, minHeight: 0 }}>
      {carregando
        ? [0, 1, 2].map((k) => (
            <section key={k} style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--card2)', border: '1px solid var(--borda)', borderRadius: 12, padding: 12, minHeight: 260 }}>
              <Esqueleto w={120} h={16} />
              <Esqueleto h={180} r={12} />
              <Esqueleto h={140} r={12} />
            </section>
          ))
        : colunas.map((c) => {
            const t = tons(c.tipo)
            const n = c.pedidos.length
            return (
              <section
                key={c.status}
                aria-label={`${c.titulo}: ${n} pedidos`}
                style={{ flex: n ? `${n} 1 300px` : '0 0 200px', minWidth: n ? 300 : 200, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--card2)', border: '1px solid var(--borda)', borderRadius: 12, padding: 12 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 2px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: t.fg }} />
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, flex: 1, whiteSpace: 'nowrap', color: 'var(--t1)' }}>{c.titulo}</h2>
                  <span style={{ fontFamily: MONO, minWidth: 28, height: 26, padding: '0 8px', borderRadius: 7, background: 'var(--card)', border: '1px solid var(--borda)', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t1)' }}>{n}</span>
                </div>
                {n === 0 ? (
                  <div style={{ flex: tv ? 1 : 'none', minHeight: 160, border: '1.5px dashed var(--borda)', borderRadius: 9, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--t3)', fontSize: 13.5, textAlign: 'center', padding: 16 }}>
                    <CheckCircle2 size={22} />
                    {c.vazio}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, alignItems: 'start' }}>{c.pedidos.map(cartao)}</div>
                )}
              </section>
            )
          })}

      {!tv && (
        <aside aria-label="Pedidos finalizados" style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--card2)', border: '1px solid var(--borda)', borderRadius: 12, padding: 12, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 2px' }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1, color: 'var(--t2)' }}>Finalizados</h2>
            <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--t3)' }}>{finalizados.length}</span>
          </div>
          {finalizados.length === 0 && <div style={{ fontSize: 13, color: 'var(--t3)', padding: '16px 4px', textAlign: 'center' }}>Nada finalizado ainda</div>}
          {finalizados.map(linhaFinalizado)}
        </aside>
      )}
    </div>
  )

  return (
    <div
      data-tema={tv ? temaTv : undefined}
      style={
        tv
          ? { position: 'fixed', inset: 0, zIndex: 70, background: 'var(--bg)', color: 'var(--t1)', display: 'flex', flexDirection: 'column', overflow: 'auto', '--marca-tinta': tintaTv }
          : { display: 'flex', flexDirection: 'column', gap: 16, margin: '-8px -4px 0' }
      }
    >
      {tv ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '16px 28px', background: 'var(--card)', borderBottom: '1px solid var(--borda)', flexWrap: 'wrap' }}>
          <SimboloPausaFast cor={marca.cor} tamanho={40} />
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Cozinha</div>
            <div style={{ fontSize: 15, color: 'var(--t2)' }}>{[marca.nome, lojaNome].filter(Boolean).join(' · ')}</div>
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            {resumo.map((k) => (
              <div key={k.l} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 48, padding: '0 16px', borderRadius: 9, background: k.bg, border: `1px solid ${k.bd}`, color: k.fg, fontSize: 18, fontWeight: 600 }}>
                <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600 }}>{k.n}</span>
                {k.l}
              </div>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em', padding: '0 8px' }}>{relogio}</div>
          <Botao variante="secundario" tamanho="xl" onClick={() => setTv(false)} style={{ background: 'var(--card2)', fontSize: 16 }}>
            <X size={20} /> Sair <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--t3)' }}>Esc</span>
          </Botao>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {resumo.map((k) => (
              <div key={k.l} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, padding: '0 12px', borderRadius: 9, background: k.bg, border: `1px solid ${k.bd}`, color: k.fg, fontSize: 13.5, fontWeight: 600 }}>
                <span style={{ fontFamily: MONO, fontSize: 15 }}>{k.n}</span>
                {k.l}
              </div>
            ))}
          </div>
          <Segmentado
            rotulo="Filtrar por tipo de pedido"
            valor={filtroTipo}
            onChange={setFiltroTipo}
            altura={30}
            opcoes={[
              { valor: 'TODOS', rotulo: 'Todos' },
              { valor: 'ENTREGA', rotulo: 'Entrega' },
              { valor: 'RETIRADA', rotulo: 'Retirada' },
              { valor: 'MESA', rotulo: 'Mesa' },
            ]}
          />
          <span style={{ flex: 1 }} />
          {!celular && <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 600, color: 'var(--t2)' }}>{relogio}</span>}
          {ehNoveNove && (
            <Botao variante="secundario" onClick={abrirPicker} disabled={criandoTeste} title="Cria um pedido de teste com itens reais do cardápio (mesmo fluxo do webhook)" style={{ borderStyle: 'dashed', color: 'var(--t2)' }}>
              <Plus size={16} /> Pedido teste 99Food
            </Botao>
          )}
          <BotaoIcone rotulo={ehNoveNove ? 'Reler pedidos agora' : 'Buscar pedidos no iFood agora'} onClick={atualizarDoIfood} disabled={atualizando} style={{ border: '1px solid var(--borda)', background: 'var(--card)', width: 40, height: 40 }}>
            <RefreshCw size={16} className={atualizando ? 'animate-spin' : ''} />
          </BotaoIcone>
          {!celular && (
            <Botao variante="primario" onClick={() => setTv(true)}>
              <Maximize2 size={16} /> Modo cozinha
            </Botao>
          )}
        </div>
      )}

      {quadro}

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
        <Dialogo
          largura={560}
          eyebrow="99Food"
          titulo="Criar pedido de teste"
          descricao="Escolha itens do cardápio real da loja, ou use “Aleatório” pra um item real qualquer."
          onClose={() => setMostrarPicker(false)}
          rodape={
            <>
              <span style={{ flex: 1 }} />
              <Botao variante="secundario" tamanho="lg" disabled={criandoTeste} onClick={() => criarPedido([])} title="Cria com um item real aleatório do cardápio">
                Aleatório
              </Botao>
              <Botao
                variante="primario"
                tamanho="lg"
                disabled={criandoTeste || totalEscolhidos === 0}
                onClick={() => criarPedido(Object.entries(escolhidos).map(([id, v]) => ({ item_id: id, nome: v.nome, preco: v.preco, qtd: v.qtd })))}
              >
                Criar pedido{totalEscolhidos > 0 ? ` (${totalEscolhidos})` : ''}
              </Botao>
            </>
          }
        >
          <CampoBusca valor={buscaItem} onChange={setBuscaItem} onLimpar={() => setBuscaItem('')} placeholder="Buscar item do cardápio…" icone={<Search size={16} />} autoFocus />
          <div style={{ border: '1px solid var(--borda)', borderRadius: 9, overflow: 'hidden', maxHeight: 340, overflowY: 'auto' }}>
            {carregandoCat
              ? [0, 1, 2, 3].map((k) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--linha)' }}>
                    <Esqueleto w="55%" h={13} />
                    <Esqueleto w={90} h={28} r={7} style={{ marginLeft: 'auto' }} />
                  </div>
                ))
              : catalogoFiltrado.map((it) => {
                  const q = escolhidos[it.itemId]?.qtd || 0
                  return (
                    <div key={it.itemId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--linha)', background: q > 0 ? 'var(--marca-suave)' : 'var(--card)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.nome}</div>
                        <div style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--t3)' }}>{brl(it.preco)}</div>
                      </div>
                      <BotaoIcone rotulo="Diminuir quantidade" tamanho={32} disabled={q === 0} onClick={() => mudarQtd(it, -1)} style={{ border: '1px solid var(--borda)' }}>
                        <Minus size={14} />
                      </BotaoIcone>
                      <span style={{ width: 20, textAlign: 'center', fontFamily: MONO, fontWeight: 700, color: 'var(--t1)' }}>{q}</span>
                      <BotaoIcone rotulo="Aumentar quantidade" tamanho={32} onClick={() => mudarQtd(it, +1)} style={{ border: '1px solid var(--borda)' }}>
                        <Plus size={14} />
                      </BotaoIcone>
                    </div>
                  )
                })}
            {!carregandoCat && catalogoFiltrado.length === 0 && <div style={{ padding: 24, textAlign: 'center', fontSize: 13.5, color: 'var(--t3)' }}>Nenhum item encontrado.</div>}
          </div>
        </Dialogo>
      )}
    </div>
  )
}
