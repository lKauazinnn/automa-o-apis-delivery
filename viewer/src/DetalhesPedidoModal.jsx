import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Ban, Bike, CalendarClock, Handshake, Loader2, MessageSquareWarning, ShoppingBag, UtensilsCrossed } from 'lucide-react'
import { Botao, Etiqueta, Gaveta, MONO, Rotulo, tons } from './ds'
import { formatarTimestamp } from './ui'
import { codigoCurto, METODO_LABEL, PROXIMO_STATUS, rotularPagamento, STATUS_LABEL, TIPO_LABEL } from './rotulos'

const ACAO_DISPUTA_LABEL = {
  CANCELLATION: 'Cancelamento total',
  PARTIAL_CANCELLATION: 'Cancelamento parcial',
  PROP_REFUND: 'Reembolso parcial',
}
const brl = (v) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`
const num = (v) => (v && typeof v === 'object' ? v.value : v)

// "Despachar" de pedido de retirada/mesa é "pronto pra retirada" no iFood (readyToPickup).
function rotuloProximo(status, tipo) {
  if (status === 'DESPACHADO' && tipo !== 'ENTREGA') return 'Pronto para retirada'
  return { CONFIRMADO: 'Confirmar', DESPACHADO: 'Despachar', CONCLUIDO: 'Concluir' }[status] || STATUS_LABEL[status]
}

// Informações do pedido iFood que precisam aparecer pra loja (vêm cruas da Order API em
// detalhes_brutos): agendamento, troco, cobrança na entrega, cupons, código de coleta,
// localizador do telefone, documento na nota, observações de entrega.
export function resumoIfood(db) {
  if (!db || !db.orderType) return null
  const pagamentos = db.payments?.methods || []
  const entrega = db.delivery || {}
  const end = entrega.deliveryAddress || {}
  const endereco = [
    end.formattedAddress || [end.streetName, end.streetNumber].filter(Boolean).join(', '),
    end.complement,
    end.neighborhood,
    end.city,
  ]
    .filter(Boolean)
    .join(' · ')
  return {
    codigo: db.displayId,
    teste: !!db.isTest,
    agendado: db.orderTiming === 'SCHEDULED',
    agendadoPara: db.schedule?.deliveryDateTimeStart,
    agendadoAte: db.schedule?.deliveryDateTimeEnd,
    previsaoEntrega: entrega.deliveryDateTime || db.takeout?.takeoutDateTime,
    entregaPor: entrega.deliveredBy === 'MERCHANT' ? 'Entrega própria' : entrega.deliveredBy === 'IFOOD' ? 'Entregador iFood' : null,
    codigoColeta: entrega.pickupCode,
    endereco,
    referencia: end.reference,
    obsEntrega: entrega.observations,
    telefone: db.customer?.phone?.number,
    localizador: db.customer?.phone?.localizer,
    documento: db.customer?.documentNumber,
    pedidosNaLoja: db.customer?.ordersCountOnMerchant,
    pagamentos: pagamentos.map((m) => ({
      metodo: METODO_LABEL[m.method] || m.method,
      bandeira: m.card?.brand,
      online: m.type === 'ONLINE' || m.prepaid,
      valor: m.value,
      troco: m.cash?.changeFor,
    })),
    cobrarNaEntrega: db.payments?.pending || 0,
    subtotal: db.total?.subTotal,
    taxaEntrega: db.total?.deliveryFee,
    taxasAdicionais: db.total?.additionalFees,
    descontos: db.total?.benefits,
    totalPedido: db.total?.orderAmount,
    beneficios: (db.benefits || []).map((b) => ({
      valor: num(b.value),
      alvo: b.target,
      patrocinadores: (b.sponsorshipValues || []).filter((s) => num(s.value) > 0).map((s) => `${s.description || s.name}: ${brl(num(s.value))}`),
    })),
  }
}

function Caixa({ rotulo, valor, destaque, largo }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 9, background: 'var(--card2)', border: '1px solid var(--linha)', gridColumn: largo ? '1 / -1' : undefined, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--t3)' }}>{rotulo}</div>
      <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 2, color: destaque ? 'var(--marca-tinta)' : 'var(--t1)', fontFamily: destaque ? MONO : undefined, overflowWrap: 'anywhere' }}>
        {valor || '—'}
      </div>
    </div>
  )
}

function Aviso({ tipo, Icone, children }) {
  const t = tons(tipo)
  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 9, background: t.bg, border: `1px solid ${t.bd}`, fontSize: 13.5, lineHeight: 1.45, color: 'var(--t1)' }}>
      <span style={{ color: t.fg, display: 'flex', paddingTop: 2 }}>
        <Icone size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

function PainelDisputa({ pedido, disputa, apiFetch, notificar, onAtualizado }) {
  const [recusando, setRecusando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function responder(acao) {
    setEnviando(true)
    try {
      await apiFetch(`/pedidos/${pedido.id}/disputa/${acao}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(acao === 'recusar' ? { motivo: motivo.trim() } : {}),
      })
      notificar('sucesso', acao === 'aceitar' ? 'Negociação aceita.' : 'Negociação recusada.')
      onAtualizado?.()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Aviso tipo="bad" Icone={Handshake}>
      <div style={{ fontWeight: 700 }}>Cliente pediu: {ACAO_DISPUTA_LABEL[disputa.acao] || disputa.acao || 'negociação'}</div>
      {disputa.mensagem && <div style={{ marginTop: 2 }}>“{disputa.mensagem}”</div>}
      {disputa.expira_em && (
        <div style={{ marginTop: 2, color: 'var(--t2)' }}>
          Responda até {formatarTimestamp(disputa.expira_em)}
          {disputa.acao_se_expirar ? ` — se não responder: ${disputa.acao_se_expirar === 'ACCEPT_CANCELLATION' ? 'aceita automaticamente' : disputa.acao_se_expirar}` : ''}
        </div>
      )}
      {recusando ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo da recusa (obrigatório)" className="ds-input" style={{ height: 36, background: 'var(--card)' }} />
          <Botao variante="perigo" tamanho="sm" disabled={enviando || !motivo.trim()} onClick={() => responder('recusar')}>
            Recusar
          </Botao>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <Botao variante="primario" tamanho="sm" disabled={enviando} onClick={() => responder('aceitar')}>
            {enviando && <Loader2 size={14} className="animate-spin" />}
            Aceitar
          </Botao>
          <Botao variante="secundario" tamanho="sm" disabled={enviando} onClick={() => setRecusando(true)}>
            Recusar…
          </Botao>
        </div>
      )}
    </Aviso>
  )
}

function PainelCancelamento({ pedido, apiFetch, notificar, onConfirmar, onVoltar, alterando }) {
  const [motivos, setMotivos] = useState(null)
  const [escolhido, setEscolhido] = useState('')

  useEffect(() => {
    let vivo = true
    apiFetch(`/pedidos/${pedido.id}/motivos-cancelamento`)
      .then((lista) => {
        if (!vivo) return
        setMotivos(lista)
        if (lista.length === 1) setEscolhido(lista[0].codigo)
      })
      .catch((e) => {
        if (vivo) setMotivos([])
        notificar('erro', e.message)
      })
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido.id])

  const motivo = (motivos || []).find((m) => m.codigo === escolhido)
  return (
    <div style={{ borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, background: 'var(--bad-bg)', border: '1px solid var(--bad-bd)' }}>
      <Rotulo cor="var(--bad)">Cancelar pedido</Rotulo>
      {motivos === null ? (
        <div style={{ fontSize: 13.5, color: 'var(--t2)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Loader2 size={14} className="animate-spin" /> Buscando motivos válidos para este pedido…
        </div>
      ) : motivos.length === 0 ? (
        <div style={{ fontSize: 13.5, color: 'var(--t1)' }}>A plataforma não oferece nenhum motivo agora — este pedido não pode mais ser cancelado pela loja.</div>
      ) : (
        <select value={escolhido} onChange={(e) => setEscolhido(e.target.value)} className="ds-input" style={{ background: 'var(--card)' }} aria-label="Motivo do cancelamento">
          <option value="">Escolha o motivo…</option>
          {motivos.map((m) => (
            <option key={m.codigo} value={m.codigo}>
              {m.descricao}
            </option>
          ))}
        </select>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Botao variante="secundario" tamanho="sm" onClick={onVoltar}>
          Voltar
        </Botao>
        <Botao variante="perigo" tamanho="sm" disabled={!motivo || alterando} onClick={() => onConfirmar({ motivo_codigo: motivo.codigo, motivo: motivo.descricao })}>
          {alterando && <Loader2 size={14} className="animate-spin" />}
          Confirmar cancelamento
        </Botao>
      </div>
    </div>
  )
}

const TOM_STATUS = { NOVO: 'info', CONFIRMADO: 'warn', DESPACHADO: 'info', CONCLUIDO: 'good', CANCELADO: 'bad' }
const ICONE_TIPO = { ENTREGA: Bike, RETIRADA: ShoppingBag, MESA: UtensilsCrossed }

export function DetalhesPedidoModal({ pedido, onClose, onAlterarStatus, alterando, apiFetch, notificar, onAtualizado }) {
  const [cancelando, setCancelando] = useState(false)
  const proximo = PROXIMO_STATUS[pedido.status]
  const cliente = pedido.cliente?.name || pedido.cliente?.nome || pedido.cliente?.first_name || '—'
  const itens = pedido.itens || []
  const db = pedido.detalhes_brutos || {}
  const r = resumoIfood(db)
  const endereco = r?.endereco || db.endereco || db.receive_address?.poi_display_name
  const disputa = db.disputa
  const motivoCancelamento = db.motivo_cancelamento
  const eh99 = String(pedido.ifood_order_id || '').startsWith('99-')
  const IconeTipo = ICONE_TIPO[pedido.tipo] || ShoppingBag
  const tom = tons(TOM_STATUS[pedido.status] || 'neutro')
  const pagamentoTexto = r?.pagamentos?.length
    ? r.pagamentos.map((p) => `${p.metodo}${p.bandeira ? ` ${p.bandeira}` : ''} · ${p.online ? 'online' : 'na entrega'}`).join(' + ')
    : rotularPagamento(pedido.pagamento)
  const observacoes = itens.filter((it) => it.obs)
  const encerrado = pedido.status === 'CANCELADO' || pedido.status === 'CONCLUIDO'

  return (
    <Gaveta
      eyebrow="Pedido"
      titulo={<span style={{ fontFamily: MONO }}>#{r?.codigo || codigoCurto(pedido.ifood_order_id)}</span>}
      onClose={onClose}
      rodape={
        cancelando ? null : (
          <>
            {!encerrado && apiFetch && (
              <Botao variante="perigo-fantasma" tamanho="lg" disabled={alterando} onClick={() => setCancelando(true)}>
                <Ban size={16} /> Cancelar pedido
              </Botao>
            )}
            <span style={{ flex: 1 }} />
            <Botao variante="secundario" tamanho="lg" onClick={onClose}>
              Fechar
            </Botao>
            {proximo && (
              <Botao variante="primario" tamanho="lg" disabled={alterando} onClick={() => onAlterarStatus(pedido, proximo)}>
                {alterando && <Loader2 size={16} className="animate-spin" />}
                {rotuloProximo(proximo, pedido.tipo)}
                <ArrowRight size={16} />
              </Botao>
            )}
          </>
        )
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 99, background: tom.bg, border: `1px solid ${tom.bd}`, color: tom.fg, fontSize: 13, fontWeight: 600 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: tom.fg }} />
          {STATUS_LABEL[pedido.status] || pedido.status}
        </span>
        <Etiqueta>{eh99 ? '99Food' : 'iFood'}</Etiqueta>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--t2)' }}>
          <IconeTipo size={16} />
          {[TIPO_LABEL[pedido.tipo] || pedido.tipo, r?.entregaPor].filter(Boolean).join(' · ')}
        </span>
        {r?.teste && <Etiqueta tipo="info">Pedido de teste</Etiqueta>}
        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 12.5, color: 'var(--t3)' }} title={pedido.ifood_order_id}>
          {formatarTimestamp(pedido.recebido_em)}
        </span>
      </div>

      {disputa?.id && apiFetch && <PainelDisputa pedido={pedido} disputa={disputa} apiFetch={apiFetch} notificar={notificar} onAtualizado={onAtualizado} />}
      {r?.agendado && (
        <Aviso tipo="info" Icone={CalendarClock}>
          <div style={{ fontWeight: 700 }}>Pedido agendado</div>
          Entregar entre {formatarTimestamp(r.agendadoPara)}
          {r.agendadoAte ? ` e ${formatarTimestamp(r.agendadoAte)}` : ''} — não comece o preparo antes da hora.
        </Aviso>
      )}
      {r && r.cobrarNaEntrega > 0 && (
        <Aviso tipo="warn" Icone={AlertTriangle}>
          <div style={{ fontWeight: 700 }}>Cobrar na entrega: {brl(r.cobrarNaEntrega)}</div>
          {r.pagamentos
            .filter((p) => p.troco)
            .map((p, i) => (
              <div key={i}>
                Troco para {brl(p.troco)} (levar {brl(p.troco - p.valor)})
              </div>
            ))}
        </Aviso>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Caixa rotulo="Cliente" valor={cliente} />
        <Caixa rotulo="Pagamento" valor={pagamentoTexto} />
        {r?.codigoColeta && <Caixa rotulo="Código de coleta" valor={r.codigoColeta} destaque />}
        {r?.previsaoEntrega && !r.agendado && <Caixa rotulo="Previsão" valor={formatarTimestamp(r.previsaoEntrega)} />}
        {r?.telefone && <Caixa rotulo="Telefone" valor={`${r.telefone}${r.localizador ? ` · localizador ${r.localizador}` : ''}`} />}
        {r?.documento && <Caixa rotulo="Documento na nota" valor={r.documento} />}
        {endereco && <Caixa largo rotulo="Endereço" valor={[endereco, r?.referencia && `Ref.: ${r.referencia}`].filter(Boolean).join(' — ')} />}
        {r?.obsEntrega && <Caixa largo rotulo="Observação de entrega" valor={r.obsEntrega} />}
        {motivoCancelamento?.descricao && <Caixa largo rotulo="Motivo do cancelamento" valor={motivoCancelamento.descricao} />}
      </div>

      <div>
        <Rotulo style={{ marginBottom: 10 }}>Itens {itens.length > 0 && `· ${itens.length}`}</Rotulo>
        {itens.length === 0 ? (
          <div style={{ fontSize: 13.5, color: 'var(--t3)' }}>Sem itens detalhados.</div>
        ) : (
          <div style={{ border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden' }}>
            {itens.map((item, i) => (
              <div key={item.id ?? i} style={{ display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto', gap: 6, padding: '12px 14px', borderBottom: '1px solid var(--linha)' }}>
                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700, color: 'var(--marca-tinta)' }}>{item.quantidade || 1}×</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{item.nome}</div>
                  {item.complementos?.length > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 2, lineHeight: 1.45 }}>
                      {item.complementos.map((c) => `${c.nome}${c.preco > 0 ? ` (+${brl(c.preco)})` : ''}`).join(' · ')}
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 13.5, color: 'var(--t1)' }}>{item.preco != null ? brl(item.preco) : ''}</span>
              </div>
            ))}
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--card2)' }}>
              {r?.subtotal != null && <LinhaConta rotulo="Subtotal" valor={brl(r.subtotal)} />}
              {r?.taxaEntrega > 0 && <LinhaConta rotulo="Taxa de entrega" valor={brl(r.taxaEntrega)} />}
              {r?.taxasAdicionais > 0 && <LinhaConta rotulo="Taxas adicionais" valor={brl(r.taxasAdicionais)} />}
              {r?.descontos > 0 && <LinhaConta rotulo="Descontos / cupons" valor={`− ${brl(r.descontos)}`} />}
              {(r?.beneficios || []).map((b, bi) => (
                <div key={bi} style={{ fontSize: 12, color: 'var(--t3)' }}>
                  Cupom {b.alvo ? `(${b.alvo})` : ''} {brl(b.valor)}
                  {b.patrocinadores.length ? ` — ${b.patrocinadores.join(', ')}` : ''}
                </div>
              ))}
              <LinhaConta rotulo="Total" valor={brl(r?.totalPedido ?? pedido.total)} forte />
            </div>
          </div>
        )}
      </div>

      {observacoes.length > 0 && (
        <Aviso tipo="warn" Icone={MessageSquareWarning}>
          <Rotulo cor="var(--warn)">Observação do cliente</Rotulo>
          {observacoes.map((it) => (
            <div key={it.id} style={{ fontSize: 14.5, fontWeight: 600, marginTop: 2, lineHeight: 1.45 }}>
              {observacoes.length > 1 || itens.length > 1 ? <span style={{ color: 'var(--t2)', fontWeight: 500 }}>{it.nome}: </span> : null}
              {it.obs}
            </div>
          ))}
        </Aviso>
      )}

      {pedido.linha_do_tempo?.length > 0 && (
        <div>
          <Rotulo style={{ marginBottom: 10 }}>Linha do tempo</Rotulo>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {pedido.linha_do_tempo.map((ev, i) => {
              const ultimo = i === pedido.linha_do_tempo.length - 1
              return (
                <div key={ev.id ?? i} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1fr) auto', gap: 12, minHeight: 40 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ width: 12, height: 12, borderRadius: 99, background: ultimo ? 'var(--marca)' : 'var(--good)', border: `2px solid ${ultimo ? 'var(--marca-anel)' : 'var(--good-bd)'}`, marginTop: 4, flexShrink: 0 }} />
                    {!ultimo && <span style={{ flex: 1, width: 2, background: 'var(--borda)' }} />}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: ultimo ? 600 : 500, color: 'var(--t1)', paddingBottom: 12 }}>{ev.tipo}</div>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--t3)' }}>{horaDe(ev.recebido_em)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {cancelando && apiFetch && (
        <PainelCancelamento
          pedido={pedido}
          apiFetch={apiFetch}
          notificar={notificar}
          alterando={alterando}
          onVoltar={() => setCancelando(false)}
          onConfirmar={(motivo) => {
            setCancelando(false)
            onAlterarStatus(pedido, 'CANCELADO', motivo)
          }}
        />
      )}
    </Gaveta>
  )
}

function LinhaConta({ rotulo, valor, forte }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, color: forte ? 'var(--t1)' : 'var(--t2)', fontWeight: forte ? 700 : 400 }}>
      <span>{rotulo}</span>
      <span style={{ fontFamily: MONO }}>{valor}</span>
    </div>
  )
}

function horaDe(iso) {
  try {
    const d = new Date(iso)
    const hoje = new Date()
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return d.toDateString() === hoje.toDateString() ? hora : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`
  } catch {
    return ''
  }
}
