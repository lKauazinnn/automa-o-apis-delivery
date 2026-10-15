import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, Landmark, Loader2, Wallet } from 'lucide-react'
import { Botao, EstadoVazio, Esqueleto, MONO, Segmentado } from '../ds'
import { formatarTimestamp } from '../ui'
import { rotularPagamento, TIPO_LABEL } from '../rotulos'

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const STATUS_VENDA = { CONCLUDED: 'Concluída', CANCELLED: 'Cancelada', CONFIRMED: 'Confirmada', DISPATCHED: 'Despachada', PLACED: 'Recebida' }
const CORES_QUEBRA = ['var(--marca)', 'var(--info)', 'var(--warn)', 'var(--t3)', 'var(--good)', 'var(--bad)']

function isoLocal(d) {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

function periodoPreset(chave) {
  const hoje = new Date()
  const fim = isoLocal(hoje)
  if (chave === 'hoje') return { inicio: fim, fim }
  if (chave === '7d') return { inicio: isoLocal(new Date(hoje.getTime() - 6 * 86400000)), fim }
  if (chave === '30d') return { inicio: isoLocal(new Date(hoje.getTime() - 29 * 86400000)), fim }
  if (chave === 'mes') return { inicio: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim }
  return null
}

const br = (iso) => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '')

function diaCurto(iso) {
  const [a, m, d] = iso.split('-')
  const dt = new Date(Number(a), Number(m) - 1, Number(d))
  return `${dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')} ${d}/${m}`
}

function baixarCsv(nome, linhas) {
  const csv = linhas.map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

const cartao = { background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12 }

// Uma quebra (por pagamento, plataforma...) como barra empilhada + lista com valor e %.
function Quebra({ titulo, linhas, formatarChave = (k) => k }) {
  const total = (linhas || []).reduce((s, l) => s + Number(l.faturamento || 0), 0)
  const rows = (linhas || [])
    .filter((l) => l.faturamento > 0)
    .sort((a, b) => b.faturamento - a.faturamento)
    .map((l, i) => ({ ...l, cor: CORES_QUEBRA[i % CORES_QUEBRA.length], pct: total ? (l.faturamento / total) * 100 : 0 }))
  return (
    <section style={{ ...cartao, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--t1)' }}>{titulo}</h3>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--t3)' }}>Sem vendas no período.</div>
      ) : (
        <>
          <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
            {rows.map((r) => (
              <div key={r.chave} title={`${formatarChave(r.chave)}: ${Math.round(r.pct)}%`} style={{ width: `${r.pct}%`, background: r.cor }} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map((r) => (
              <div key={r.chave} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: r.cor, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {formatarChave(r.chave)} <span style={{ color: 'var(--t3)' }}>· {r.pedidos} ped.</span>
                </span>
                <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--t1)' }}>{brl(r.faturamento)}</span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--t3)', width: 38, textAlign: 'right' }}>{Math.round(r.pct)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

// Repasses e eventos ainda chegam com campos que variam por loja/contrato: mostra as colunas
// simples que vierem, sem inventar formato.
function TabelaCrua({ linhas, vazio }) {
  if (!linhas?.length) return <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--t3)' }}>{vazio}</div>
  const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l).filter((k) => l[k] == null || typeof l[k] !== 'object')))].slice(0, 8)
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t3)', background: 'var(--card2)', borderBottom: '1px solid var(--linha)', whiteSpace: 'nowrap' }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              {colunas.map((c) => (
                <td key={c} style={{ padding: '10px 16px', borderBottom: '1px solid var(--linha)', color: 'var(--t1)', whiteSpace: 'nowrap', fontFamily: typeof l[c] === 'number' ? MONO : undefined }}>
                  {String(l[c] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FinanceiroView({ apiFetch, notificar, lojaAtual }) {
  const [preset, setPreset] = useState('7d')
  const [periodo, setPeriodo] = useState(periodoPreset('7d'))
  const [todas, setTodas] = useState(false)
  const [resumo, setResumo] = useState(null)
  const [ifood, setIfood] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [carregandoIfood, setCarregandoIfood] = useState(false)
  const apiFetchRef = useRef(apiFetch)
  apiFetchRef.current = apiFetch
  const ehIfood = (lojaAtual?.plataforma || 'ifood') === 'ifood'

  async function carregar() {
    setCarregando(true)
    try {
      const qs = `?inicio=${periodo.inicio}&fim=${periodo.fim}${todas ? '&todas=1' : ''}`
      setResumo(await apiFetchRef.current(`/financeiro/resumo${qs}`))
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCarregando(false)
    }
    if (ehIfood && !todas) {
      setCarregandoIfood(true)
      try {
        setIfood(await apiFetchRef.current(`/financeiro/ifood?inicio=${periodo.inicio}&fim=${periodo.fim}`))
      } catch (e) {
        setIfood({ erros: { geral: e.message }, vendas: [], totais: null })
      } finally {
        setCarregandoIfood(false)
      }
    } else {
      setIfood(null)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.inicio, periodo.fim, todas, lojaAtual?.merchant_id])

  const t = resumo?.totais
  const porDia = resumo?.por_dia || []
  const mx = Math.max(1, ...porDia.map((d) => Number(d.faturamento || 0)))
  const vazio = !carregando && t && !t.pedidos && !t.cancelados
  const rotuloPeriodo = periodo.inicio === periodo.fim ? `${br(periodo.inicio)}` : `${br(periodo.inicio)} a ${br(periodo.fim)}`

  function exportar() {
    baixarCsv(`financeiro_${periodo.inicio}_${periodo.fim}.csv`, [
      ['Dia', 'Pedidos', 'Faturamento', 'Cancelados', 'Valor cancelado'],
      ...porDia.map((l) => [l.chave, l.pedidos, Number(l.faturamento).toFixed(2).replace('.', ','), l.cancelados, Number(l.valor_cancelado).toFixed(2).replace('.', ',')]),
    ])
  }

  const kpis = [
    ifood?.totais
      ? { l: 'Saldo das vendas', v: brl(ifood.totais.saldo_vendas), s: 'após comissão e taxas do iFood' }
      : { l: 'Saldo das vendas', v: '—', s: ehIfood && !todas ? (carregandoIfood ? 'buscando no iFood…' : 'sem extrato do iFood no período') : 'só no extrato do iFood (loja única)' },
    { l: 'Pedidos', v: (t?.pedidos ?? 0).toLocaleString('pt-BR'), s: 'válidos, sem cancelados' },
    { l: 'Ticket médio', v: brl(t?.ticket_medio), s: 'por pedido válido' },
    { l: 'Cancelados', v: String(t?.cancelados ?? 0), s: `${brl(t?.valor_cancelado)} · ${String(t?.taxa_cancelamento ?? 0).replace('.', ',')}% dos pedidos`, fg: t?.cancelados ? 'var(--bad)' : undefined },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Segmentado
          rotulo="Período"
          valor={preset}
          altura={34}
          onChange={(v) => {
            setPreset(v)
            if (v !== 'custom') setPeriodo(periodoPreset(v))
          }}
          opcoes={[
            { valor: 'hoje', rotulo: 'Hoje' },
            { valor: '7d', rotulo: '7 dias' },
            { valor: '30d', rotulo: '30 dias' },
            { valor: 'mes', rotulo: 'Este mês' },
            { valor: 'custom', rotulo: 'Personalizado' },
          ]}
        />
        {preset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={periodo.inicio} max={periodo.fim} onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))} className="ds-input" style={{ width: 'auto', height: 40, background: 'var(--card)' }} aria-label="Data inicial" />
            <span style={{ color: 'var(--t3)' }}>até</span>
            <input type="date" value={periodo.fim} min={periodo.inicio} onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))} className="ds-input" style={{ width: 'auto', height: 40, background: 'var(--card)' }} aria-label="Data final" />
          </div>
        )}
        <span style={{ fontSize: 13.5, color: 'var(--t2)' }}>{rotuloPeriodo}</span>
        <span style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--t1)', cursor: 'pointer' }}>
          <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--marca)' }} />
          Somar todas as lojas
        </label>
        <Botao variante="secundario" onClick={exportar} disabled={!porDia.length}>
          <Download size={16} /> Exportar CSV
        </Botao>
      </div>

      {vazio ? (
        <section style={cartao}>
          <EstadoVazio
            icone={<Wallet size={22} />}
            titulo="Nenhuma venda nesse período"
            texto={`Entre ${br(periodo.inicio)} e ${br(periodo.fim)} não houve pedido válido ${todas ? 'em nenhuma loja' : `em ${lojaAtual?.nome || 'esta loja'}`}. Os repasses e eventos do iFood também aparecem aqui quando existirem.`}
            acao={
              preset !== '7d' && (
                <Botao
                  variante="primario"
                  onClick={() => {
                    setPreset('7d')
                    setPeriodo(periodoPreset('7d'))
                  }}
                >
                  Ver últimos 7 dias
                </Botao>
              )
            }
          />
        </section>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: 16 }}>
            <section style={{ ...cartao, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>Faturamento</div>
                {carregando && !t ? (
                  <Esqueleto w="55%" h={40} style={{ marginTop: 6 }} />
                ) : (
                  <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, marginTop: 4, color: 'var(--t1)' }}>{brl(t?.faturamento)}</div>
                )}
                <div style={{ fontSize: 12.5, color: 'var(--t3)', marginTop: 4 }}>
                  O que o cliente pagou nos pedidos válidos {todas ? 'de todas as lojas' : `de ${lojaAtual?.nome || 'esta loja'}`} (iFood + 99Food)
                </div>
              </div>
              <div role="img" aria-label="Faturamento por dia" style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, borderBottom: '1px solid var(--borda)' }}>
                {porDia.map((d, i) => (
                  <div key={d.chave} title={`${diaCurto(d.chave)}: ${brl(d.faturamento)} · ${d.pedidos} pedidos`} style={{ flex: 1, minWidth: 4, height: `${(Number(d.faturamento || 0) / mx) * 100}%`, minHeight: d.faturamento ? 3 : 0, background: i === porDia.length - 1 ? 'var(--marca)' : 'var(--marca-borda)', borderRadius: '4px 4px 0 0' }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12, color: 'var(--t3)', marginTop: -6 }}>
                <span>{porDia[0] ? br(porDia[0].chave) : ''}</span>
                <span>{porDia.length ? br(porDia[porDia.length - 1].chave) : ''}</span>
              </div>
            </section>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
              {kpis.map((k) => (
                <section key={k.l} style={{ ...cartao, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>{k.l}</div>
                  {carregando && !t ? <Esqueleto w="60%" h={26} /> : <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: k.fg || 'var(--t1)' }}>{k.v}</div>}
                  <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>{k.s}</div>
                </section>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 16 }}>
            <Quebra titulo="Por forma de pagamento" linhas={resumo?.por_pagamento} formatarChave={rotularPagamento} />
            <Quebra titulo="Por plataforma" linhas={resumo?.por_plataforma} />
            {todas && <Quebra titulo="Por loja" linhas={resumo?.por_loja} />}
            <Quebra titulo="Por tipo de pedido" linhas={resumo?.por_tipo} formatarChave={(k) => TIPO_LABEL[k] || k} />
          </div>

          <section style={{ ...cartao, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--linha)' }}>
              <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>Por dia</h3>
            </div>
            {porDia.length === 0 ? (
              <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--t3)' }}>{carregando ? 'Carregando…' : 'Sem dados no período.'}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <thead>
                    <tr>
                      {['Dia', 'Pedidos', 'Faturamento', 'Ticket médio', 'Cancelados'].map((c, i) => (
                        <th key={c} style={{ textAlign: i ? 'right' : 'left', padding: '10px 20px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', background: 'var(--card2)', borderBottom: '1px solid var(--linha)' }}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {porDia.map((l) => (
                      <tr key={l.chave}>
                        <td style={{ padding: '10px 20px', borderBottom: '1px solid var(--linha)', color: 'var(--t1)' }}>{diaCurto(l.chave)}</td>
                        <td style={{ padding: '10px 20px', borderBottom: '1px solid var(--linha)', textAlign: 'right', fontFamily: MONO }}>{l.pedidos}</td>
                        <td style={{ padding: '10px 20px', borderBottom: '1px solid var(--linha)', textAlign: 'right', fontFamily: MONO, fontWeight: 600 }}>{brl(l.faturamento)}</td>
                        <td style={{ padding: '10px 20px', borderBottom: '1px solid var(--linha)', textAlign: 'right', fontFamily: MONO, color: 'var(--t2)' }}>{l.pedidos ? brl(l.faturamento / l.pedidos) : '—'}</td>
                        <td style={{ padding: '10px 20px', borderBottom: '1px solid var(--linha)', textAlign: 'right', fontFamily: MONO, color: l.cancelados ? 'var(--bad)' : 'var(--t3)' }}>{l.cancelados ? `${l.cancelados} · ${brl(l.valor_cancelado)}` : '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {ehIfood && !todas && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
            <Landmark size={18} style={{ color: 'var(--marca-tinta)' }} />
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Extrato oficial iFood</h2>
            <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>API financeira · {lojaAtual?.nome}</span>
            {carregandoIfood && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--t2)' }} />}
          </div>

          {ifood?.erros && Object.keys(ifood.erros).length > 0 && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 9, background: 'var(--warn-bg)', border: '1px solid var(--warn-bd)', fontSize: 13, color: 'var(--t1)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
              <div>
                {Object.entries(ifood.erros).map(([k, v]) => (
                  <div key={k}>
                    <b>{k}:</b> {String(v).slice(0, 220)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <section style={{ ...cartao, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--linha)', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>Vendas no iFood</h3>
              {ifood?.totais && (
                <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>
                  {ifood.totais.vendas} vendas{ifood.totais.canceladas ? ` · ${ifood.totais.canceladas} cancelada(s)` : ''} · bruto {brl(ifood.totais.bruto)} · repasses {brl(ifood.totais.saldo_repasses)} ({ifood.totais.qtd_repasses})
                </span>
              )}
            </div>
            {!ifood?.vendas?.length ? (
              <div style={{ padding: '24px 20px', fontSize: 13, color: 'var(--t3)' }}>{carregandoIfood ? 'Carregando…' : 'Nenhuma venda no período.'}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      {['Pedido', 'Data', 'Status', 'Itens', 'Entrega', 'Cupons', 'Bruto', 'Saldo', 'Pagamento'].map((c) => (
                        <th key={c} style={{ textAlign: ['Itens', 'Entrega', 'Cupons', 'Bruto', 'Saldo'].includes(c) ? 'right' : 'left', padding: '10px 14px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t3)', background: 'var(--card2)', borderBottom: '1px solid var(--linha)', whiteSpace: 'nowrap' }}>
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ifood.vendas.map((v) => {
                      const cel = { padding: '10px 14px', borderBottom: '1px solid var(--linha)', color: v.status === 'CANCELLED' ? 'var(--t3)' : 'var(--t1)', whiteSpace: 'nowrap' }
                      const num = { ...cel, textAlign: 'right', fontFamily: MONO }
                      return (
                        <tr key={v.id}>
                          <td style={{ ...cel, fontFamily: MONO }}>#{v.codigo}</td>
                          <td style={cel}>{formatarTimestamp(v.data)}</td>
                          <td style={cel}>{STATUS_VENDA[v.status] || v.status}</td>
                          <td style={num}>{brl(v.itens)}</td>
                          <td style={num}>{brl(v.taxa_entrega)}</td>
                          <td style={num}>{v.beneficios ? `− ${brl(v.beneficios)}` : '—'}</td>
                          <td style={{ ...num, fontWeight: 600 }}>{brl(v.bruto)}</td>
                          <td style={num}>{brl(v.saldo)}</td>
                          <td style={{ ...cel, color: 'var(--t2)' }}>{v.pagamentos}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 540px), 1fr))', gap: 16, alignItems: 'start' }}>
            <section style={{ ...cartao, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--linha)' }}>
                <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>Repasses</h3>
                <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>pagamentos do iFood pra loja</span>
              </div>
              <TabelaCrua linhas={ifood?.repasses?.settlements} vazio={carregandoIfood ? 'Carregando…' : 'Nenhum repasse no período.'} />
            </section>
            <section style={{ ...cartao, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--linha)' }}>
                <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>Eventos financeiros</h3>
                <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>comissões, taxas e ajustes</span>
              </div>
              <TabelaCrua linhas={ifood?.eventos} vazio={carregandoIfood ? 'Carregando…' : 'Nenhum evento no período.'} />
            </section>
          </div>
        </>
      )}
      {!ehIfood && !todas && (
        <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>Extrato oficial: a API aberta do 99Food não tem endpoint financeiro — os valores acima vêm dos pedidos recebidos.</div>
      )}
    </div>
  )
}
