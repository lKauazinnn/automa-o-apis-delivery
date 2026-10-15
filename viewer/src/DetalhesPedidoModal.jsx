import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, Handshake, Loader2 } from 'lucide-react'
import { formatarTimestamp, Modal, Pill } from './ui'
import { METODO_LABEL, PROXIMO_STATUS, STATUS_COR, STATUS_LABEL, TIPO_LABEL } from './rotulos'

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
  return STATUS_LABEL[status]
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

function Campo({ C, rotulo, valor, destaque }) {
  return (
    <div>
      <p className="uppercase tracking-wider text-[10px] mb-1" style={{ color: C.text3 }}>{rotulo}</p>
      <p className={`text-xs ${destaque ? 'font-bold' : ''}`} style={{ color: destaque ? C.marcaTinta : C.text1 }}>{valor || '—'}</p>
    </div>
  )
}

function Alerta({ cor, Icone, children }) {
  return (
    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs" style={{ color: cor, background: cor + '18', border: `1px solid ${cor}55` }}>
      <Icone size={15} className="flex-shrink-0" style={{ marginTop: 1 }} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function PainelDisputa({ pedido, disputa, C, apiFetch, notificar, onAtualizado }) {
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
    <Alerta cor={C.bad} Icone={Handshake}>
      <p className="font-bold">Cliente pediu: {ACAO_DISPUTA_LABEL[disputa.acao] || disputa.acao || 'negociação'}</p>
      {disputa.mensagem && <p className="mt-0.5" style={{ color: C.text1 }}>"{disputa.mensagem}"</p>}
      {disputa.expira_em && (
        <p className="mt-0.5" style={{ color: C.text2 }}>
          Responda até {formatarTimestamp(disputa.expira_em)}
          {disputa.acao_se_expirar ? ` — se não responder: ${disputa.acao_se_expirar === 'ACCEPT_CANCELLATION' ? 'aceita automaticamente' : disputa.acao_se_expirar}` : ''}
        </p>
      )}
      {recusando ? (
        <div className="flex gap-1.5 mt-2">
          <input
            autoFocus
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo da recusa (obrigatório)"
            className="flex-1 min-w-0 rounded-lg px-2.5 py-1.5 text-xs outline-none"
            style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}`, color: C.text1 }}
          />
          <button
            type="button"
            disabled={enviando || !motivo.trim()}
            onClick={() => responder('recusar')}
            className="botao-perigo text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            Recusar
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5 mt-2">
          <button
            type="button"
            disabled={enviando}
            onClick={() => responder('aceitar')}
            className="botao-primario text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {enviando && <Loader2 size={12} className="animate-spin" />}
            Aceitar
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={() => setRecusando(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ color: C.text1, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
          >
            Recusar…
          </button>
        </div>
      )}
    </Alerta>
  )
}

function PainelCancelamento({ pedido, C, apiFetch, notificar, onConfirmar, onVoltar, alterando }) {
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
    <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}>
      <p className="text-xs font-bold" style={{ color: C.text1 }}>Motivo do cancelamento</p>
      {motivos === null ? (
        <p className="text-xs flex items-center gap-1.5" style={{ color: C.text2 }}>
          <Loader2 size={12} className="animate-spin" /> Buscando motivos válidos para este pedido...
        </p>
      ) : motivos.length === 0 ? (
        <p className="text-xs" style={{ color: C.bad }}>
          A plataforma não oferece nenhum motivo agora — este pedido não pode mais ser cancelado pela loja.
        </p>
      ) : (
        <select
          value={escolhido}
          onChange={(e) => setEscolhido(e.target.value)}
          className="w-full rounded-lg px-2.5 py-2 text-xs outline-none"
          style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, color: C.text1 }}
        >
          <option value="">Escolha o motivo…</option>
          {motivos.map((m) => (
            <option key={m.codigo} value={m.codigo}>{m.descricao}</option>
          ))}
        </select>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!motivo || alterando}
          onClick={() => onConfirmar({ motivo_codigo: motivo.codigo, motivo: motivo.descricao })}
          className="flex-1 botao-perigo text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
        >
          {alterando && <Loader2 size={12} className="animate-spin" />}
          Confirmar cancelamento
        </button>
        <button type="button" onClick={onVoltar} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ color: C.text2 }}>
          Voltar
        </button>
      </div>
    </div>
  )
}

export function DetalhesPedidoModal({ pedido, C, onClose, onAlterarStatus, alterando, apiFetch, notificar, onAtualizado }) {
  const [cancelando, setCancelando] = useState(false)
  const cores = STATUS_COR(C)
  const proximo = PROXIMO_STATUS[pedido.status]
  const cliente = pedido.cliente?.name || pedido.cliente?.nome || pedido.cliente?.first_name || '—'
  const itens = pedido.itens || []
  const db = pedido.detalhes_brutos || {}
  const r = resumoIfood(db)
  const endereco = r?.endereco || db.endereco || db.receive_address?.poi_display_name
  const disputa = db.disputa
  const motivoCancelamento = db.motivo_cancelamento

  return (
    <Modal titulo={`Pedido ${r?.codigo ? `#${r.codigo}` : pedido.ifood_order_id}`} eyebrow="Detalhes do pedido" onClose={onClose} largura="max-w-lg">
      <div className="flex flex-col gap-4">
        {disputa?.id && apiFetch && (
          <PainelDisputa pedido={pedido} disputa={disputa} C={C} apiFetch={apiFetch} notificar={notificar} onAtualizado={onAtualizado} />
        )}
        {r?.agendado && (
          <Alerta cor={C.info} Icone={CalendarClock}>
            <p className="font-bold">Pedido AGENDADO</p>
            <p>
              Entregar entre {formatarTimestamp(r.agendadoPara)}
              {r.agendadoAte ? ` e ${formatarTimestamp(r.agendadoAte)}` : ''} — não comece o preparo antes da hora.
            </p>
          </Alerta>
        )}
        {r && r.cobrarNaEntrega > 0 && (
          <Alerta cor={C.neutral} Icone={AlertTriangle}>
            <p className="font-bold">Cobrar na entrega: {brl(r.cobrarNaEntrega)}</p>
            {r.pagamentos.filter((p) => p.troco).map((p, i) => (
              <p key={i}>Troco para {brl(p.troco)} (levar {brl(p.troco - p.valor)})</p>
            ))}
          </Alerta>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo C={C} rotulo="Cliente" valor={cliente} />
          <div>
            <p className="uppercase tracking-wider text-[10px] mb-1" style={{ color: C.text3 }}>Status</p>
            <Pill color={cores[pedido.status] || C.text2} dot>{STATUS_LABEL[pedido.status] || pedido.status}</Pill>
            {r?.teste && <span className="ml-1.5 text-[10px]" style={{ color: C.text3 }}>(pedido de teste)</span>}
          </div>
          <Campo C={C} rotulo="Tipo" valor={[TIPO_LABEL[pedido.tipo] || pedido.tipo, r?.entregaPor].filter(Boolean).join(' · ')} />
          <Campo C={C} rotulo="Recebido em" valor={formatarTimestamp(pedido.recebido_em)} />
          {r?.codigoColeta && <Campo C={C} rotulo="Código de coleta" valor={r.codigoColeta} destaque />}
          {r?.previsaoEntrega && !r.agendado && <Campo C={C} rotulo="Previsão" valor={formatarTimestamp(r.previsaoEntrega)} />}
          {r?.telefone && (
            <Campo C={C} rotulo="Telefone" valor={`${r.telefone}${r.localizador ? ` · localizador ${r.localizador}` : ''}`} />
          )}
          {r?.documento && <Campo C={C} rotulo="Documento na nota" valor={r.documento} />}
          {endereco && <div className="col-span-2"><Campo C={C} rotulo="Endereço" valor={[endereco, r?.referencia && `Ref.: ${r.referencia}`].filter(Boolean).join(' — ')} /></div>}
          {r?.obsEntrega && <div className="col-span-2"><Campo C={C} rotulo="Observação de entrega" valor={r.obsEntrega} /></div>}
          {motivoCancelamento?.descricao && (
            <div className="col-span-2"><Campo C={C} rotulo="Motivo do cancelamento" valor={motivoCancelamento.descricao} /></div>
          )}
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
                      <span className="font-bold" style={{ color: C.marcaTinta }}>{item.quantidade || 1}×</span> {item.nome}
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
                      style={{ color: C.neutral, background: C.neutralBg }}
                    >
                      <AlertTriangle size={13} className="flex-shrink-0" style={{ marginTop: 1 }} />
                      <span>{item.obs}</span>
                    </div>
                  )}
                </div>
              ))}
              {r && (
                <div className="px-3 py-2 text-xs flex flex-col gap-0.5" style={{ color: C.text2, background: C.inputBg }}>
                  {r.subtotal != null && <div className="flex justify-between"><span>Subtotal</span><span className="fonte-mono">{brl(r.subtotal)}</span></div>}
                  {r.taxaEntrega > 0 && <div className="flex justify-between"><span>Taxa de entrega</span><span className="fonte-mono">{brl(r.taxaEntrega)}</span></div>}
                  {r.taxasAdicionais > 0 && <div className="flex justify-between"><span>Taxas adicionais</span><span className="fonte-mono">{brl(r.taxasAdicionais)}</span></div>}
                  {r.descontos > 0 && <div className="flex justify-between"><span>Descontos / cupons</span><span className="fonte-mono">− {brl(r.descontos)}</span></div>}
                  {r.beneficios.map((b, bi) => (
                    <div key={bi} style={{ color: C.text3, fontSize: 11 }}>
                      Cupom {b.alvo ? `(${b.alvo})` : ''} {brl(b.valor)}{b.patrocinadores.length ? ` — ${b.patrocinadores.join(', ')}` : ''}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2 text-xs font-bold" style={{ background: C.inputBg, color: C.text1 }}>
                <span>Total</span>
                <span className="fonte-mono">{brl(r?.totalPedido ?? pedido.total)}</span>
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-bold mb-1.5" style={{ color: C.text1 }}>Pagamento</p>
          {r?.pagamentos?.length ? (
            <div className="flex flex-col gap-1">
              {r.pagamentos.map((p, i) => (
                <div key={i} className="flex justify-between text-xs" style={{ color: C.text2 }}>
                  <span>
                    {p.metodo}{p.bandeira ? ` ${p.bandeira}` : ''} · <span style={{ color: p.online ? C.good : C.neutral }}>{p.online ? 'pago online' : 'cobrar na entrega'}</span>
                  </span>
                  <span className="fonte-mono">{brl(p.valor)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: C.text2 }}>{pedido.pagamento || '—'}</p>
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

        {cancelando && apiFetch ? (
          <PainelCancelamento
            pedido={pedido}
            C={C}
            apiFetch={apiFetch}
            notificar={notificar}
            alterando={alterando}
            onVoltar={() => setCancelando(false)}
            onConfirmar={(motivo) => {
              setCancelando(false)
              onAlterarStatus(pedido, 'CANCELADO', motivo)
            }}
          />
        ) : (
          <div className="flex gap-2 pt-1">
            {proximo && (
              <button
                type="button"
                disabled={alterando}
                onClick={() => onAlterarStatus(pedido, proximo)}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl botao-primario disabled:opacity-50"
              >
                {alterando && <Loader2 size={13} className="animate-spin" />}
                Avançar para {rotuloProximo(proximo, pedido.tipo)}
              </button>
            )}
            {pedido.status !== 'CANCELADO' && pedido.status !== 'CONCLUIDO' && (
              <button
                type="button"
                disabled={alterando}
                onClick={() => setCancelando(true)}
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl botao-perigo disabled:opacity-50"
              >
                Cancelar pedido
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
