import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Ban, Download, Landmark, Loader2, Receipt, ShoppingBag, Wallet } from 'lucide-react'
import { Esqueleto, formatarTimestamp, StatCard } from '../ui'

const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const TIPO_LABEL = { ENTREGA: 'Entrega', RETIRADA: 'Retirada', MESA: 'Mesa' }
const STATUS_VENDA = { CONCLUDED: 'Concluída', CANCELLED: 'Cancelada', CONFIRMED: 'Confirmada', DISPATCHED: 'Despachada', PLACED: 'Recebida' }

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

function Cartao({ C, titulo, Icone, acao, children }) {
  return (
    <div className="rounded-2xl border min-w-0" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
      <div className="px-5 py-3.5 border-b flex items-center gap-2" style={{ borderColor: C.cardBorder }}>
        {Icone && <Icone size={15} color={C.marcaTinta} />}
        <h3 className="font-bold" style={{ color: C.text1, fontSize: 14.5 }}>{titulo}</h3>
        {acao && <div className="ml-auto">{acao}</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

function TabelaAgrupada({ C, linhas, rotulo, formatarChave = (k) => k }) {
  if (!linhas?.length) return <p className="text-xs px-5 py-6" style={{ color: C.text3 }}>Sem dados no período.</p>
  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ color: C.text3 }}>
          <th className="text-left font-semibold px-5 py-2">{rotulo}</th>
          <th className="text-right font-semibold px-3 py-2">Pedidos</th>
          <th className="text-right font-semibold px-3 py-2">Faturamento</th>
          <th className="text-right font-semibold px-3 py-2">Ticket médio</th>
          <th className="text-right font-semibold px-5 py-2">Cancelados</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.chave} className="border-t" style={{ borderColor: C.rowBorder, color: C.text1 }}>
            <td className="px-5 py-2">{formatarChave(l.chave)}</td>
            <td className="text-right px-3 py-2 fonte-mono">{l.pedidos}</td>
            <td className="text-right px-3 py-2 fonte-mono font-semibold">{brl(l.faturamento)}</td>
            <td className="text-right px-3 py-2 fonte-mono" style={{ color: C.text2 }}>{l.pedidos ? brl(l.faturamento / l.pedidos) : '—'}</td>
            <td className="text-right px-5 py-2 fonte-mono" style={{ color: l.cancelados ? C.bad : C.text3 }}>
              {l.cancelados ? `${l.cancelados} · ${brl(l.valor_cancelado)}` : '0'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Tabela genérica pros blocos da Financial API cujos campos ainda não vimos com dado real
// (repasses e eventos financeiros): mostra os campos simples de cada linha.
function TabelaCrua({ C, linhas }) {
  if (!linhas?.length) return <p className="text-xs px-5 py-6" style={{ color: C.text3 }}>Nada no período.</p>
  const colunas = [...new Set(linhas.flatMap((l) => Object.keys(l).filter((k) => l[k] == null || typeof l[k] !== 'object')))].slice(0, 8)
  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ color: C.text3 }}>
          {colunas.map((c) => <th key={c} className="text-left font-semibold px-4 py-2 whitespace-nowrap">{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l, i) => (
          <tr key={i} className="border-t" style={{ borderColor: C.rowBorder, color: C.text1 }}>
            {colunas.map((c) => <td key={c} className="px-4 py-2 whitespace-nowrap">{String(l[c] ?? '—')}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function FinanceiroView({ apiFetch, C, notificar, lojaAtual }) {
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
  const inputStyle = { background: C.inputBg, border: `1px solid ${C.cardBorder}`, color: C.text1, height: 34 }

  return (
    <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 1200 }}>
      <div className="flex items-center gap-2.5 flex-wrap">
        <Wallet size={17} color={C.marcaTinta} />
        <h2 className="font-bold mr-2" style={{ color: C.text1, fontSize: 18, letterSpacing: '-0.02em' }}>Financeiro</h2>
        {[['hoje', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['mes', 'Este mês']].map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            onClick={() => {
              setPreset(chave)
              setPeriodo(periodoPreset(chave))
            }}
            className="text-xs font-semibold px-3 rounded-lg"
            style={{
              height: 34,
              color: preset === chave ? C.marcaTexto : C.text1,
              background: preset === chave ? C.marca : C.inputBg,
              border: `1px solid ${preset === chave ? C.marca : C.cardBorder}`,
            }}
          >
            {rotulo}
          </button>
        ))}
        <input
          type="date"
          value={periodo.inicio}
          max={periodo.fim}
          onChange={(e) => {
            setPreset('custom')
            setPeriodo((p) => ({ ...p, inicio: e.target.value }))
          }}
          className="rounded-lg px-2 text-xs outline-none"
          style={inputStyle}
          aria-label="Data inicial"
        />
        <span style={{ color: C.text3 }}>até</span>
        <input
          type="date"
          value={periodo.fim}
          min={periodo.inicio}
          onChange={(e) => {
            setPreset('custom')
            setPeriodo((p) => ({ ...p, fim: e.target.value }))
          }}
          className="rounded-lg px-2 text-xs outline-none"
          style={inputStyle}
          aria-label="Data final"
        />
        <label className="ml-auto flex items-center gap-2 text-xs cursor-pointer" style={{ color: C.text1 }}>
          <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} />
          Somar todas as lojas
        </label>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {carregando && !t ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border p-5" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
              <Esqueleto w="50%" h={26} />
              <div className="mt-2"><Esqueleto w="70%" h={12} /></div>
            </div>
          ))
        ) : (
          <>
            <StatCard icon={Wallet} value={brl(t?.faturamento)} label="Faturamento (pedidos válidos)" color={C.good} destaque />
            <StatCard icon={ShoppingBag} value={t?.pedidos ?? 0} label="Pedidos" color={C.info} />
            <StatCard icon={Receipt} value={brl(t?.ticket_medio)} label="Ticket médio" color={C.marcaTinta} />
            <StatCard
              icon={Ban}
              value={`${t?.cancelados ?? 0}`}
              label={`Cancelados · ${t?.taxa_cancelamento ?? 0}% · ${brl(t?.valor_cancelado)}`}
              color={C.bad}
            />
          </>
        )}
      </div>
      <p className="text-[12px] -mt-1" style={{ color: C.text3 }}>
        Valores acima = o que o cliente pagou nos pedidos que entraram no painel (iFood + 99Food), {todas ? 'todas as lojas' : `loja ${lojaAtual?.nome || 'atual'}`}.
        O que a plataforma efetivamente repassa (descontadas comissão e taxas) está no extrato oficial abaixo.
      </p>

      <Cartao
        C={C}
        titulo="Por dia"
        Icone={Receipt}
        acao={
          resumo?.por_dia?.length > 0 && (
            <button
              type="button"
              onClick={() =>
                baixarCsv(`financeiro_${periodo.inicio}_${periodo.fim}.csv`, [
                  ['Dia', 'Pedidos', 'Faturamento', 'Cancelados', 'Valor cancelado'],
                  ...resumo.por_dia.map((l) => [l.chave, l.pedidos, l.faturamento.toFixed(2).replace('.', ','), l.cancelados, l.valor_cancelado.toFixed(2).replace('.', ',')]),
                ])
              }
              className="text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 rounded-lg"
              style={{ height: 28, color: C.text1, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              <Download size={12} /> CSV
            </button>
          )
        }
      >
        <TabelaAgrupada C={C} linhas={resumo?.por_dia} rotulo="Dia" formatarChave={diaCurto} />
      </Cartao>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
        <Cartao C={C} titulo="Por plataforma">
          <TabelaAgrupada C={C} linhas={resumo?.por_plataforma} rotulo="Plataforma" />
        </Cartao>
        <Cartao C={C} titulo="Por forma de pagamento">
          <TabelaAgrupada C={C} linhas={resumo?.por_pagamento} rotulo="Pagamento" />
        </Cartao>
        <Cartao C={C} titulo="Por tipo de pedido">
          <TabelaAgrupada C={C} linhas={resumo?.por_tipo} rotulo="Tipo" formatarChave={(k) => TIPO_LABEL[k] || k} />
        </Cartao>
        {todas && (
          <Cartao C={C} titulo="Por loja">
            <TabelaAgrupada C={C} linhas={resumo?.por_loja} rotulo="Loja" />
          </Cartao>
        )}
      </div>

      {ehIfood && !todas && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <Landmark size={16} color={C.marcaTinta} />
            <h3 className="font-bold" style={{ color: C.text1, fontSize: 16 }}>Extrato oficial iFood</h3>
            <span className="text-[12px]" style={{ color: C.text3 }}>Financial API · {lojaAtual?.nome}</span>
            {carregandoIfood && <Loader2 size={14} className="animate-spin" style={{ color: C.text2 }} />}
          </div>

          {ifood?.erros && Object.keys(ifood.erros).length > 0 && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs" style={{ background: C.neutralBg, border: `1px solid ${C.neutralBd}`, color: C.text1 }}>
              <AlertTriangle size={14} color={C.neutral} className="flex-shrink-0" style={{ marginTop: 1 }} />
              <div>
                {Object.entries(ifood.erros).map(([k, v]) => (
                  <p key={k}><strong>{k}:</strong> {String(v).slice(0, 220)}</p>
                ))}
              </div>
            </div>
          )}

          {ifood?.totais && (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <StatCard icon={ShoppingBag} value={ifood.totais.vendas} label={`Vendas no iFood${ifood.totais.canceladas ? ` · ${ifood.totais.canceladas} cancelada(s)` : ''}`} color={C.info} />
              <StatCard icon={Wallet} value={brl(ifood.totais.bruto)} label={`Bruto (itens + entrega) · entrega ${brl(ifood.totais.taxa_entrega)}`} color={C.good} />
              <StatCard icon={Receipt} value={brl(ifood.totais.saldo_vendas)} label="Saldo das vendas (após comissão/taxas)" color={C.marcaTinta} />
              <StatCard icon={Landmark} value={brl(ifood.totais.saldo_repasses)} label={`Repasses no período · ${ifood.totais.qtd_repasses} pagamento(s)`} color={C.neutral} />
            </div>
          )}

          <Cartao C={C} titulo={`Vendas (${ifood?.vendas?.length || 0})`} Icone={ShoppingBag}>
            {!ifood?.vendas?.length ? (
              <p className="text-xs px-5 py-6" style={{ color: C.text3 }}>{carregandoIfood ? 'Carregando…' : 'Nenhuma venda no período.'}</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: C.text3 }}>
                    {['Pedido', 'Data', 'Status', 'Itens', 'Entrega', 'Cupons', 'Bruto', 'Saldo', 'Pagamento'].map((c) => (
                      <th key={c} className={`font-semibold px-3 py-2 whitespace-nowrap ${['Itens', 'Entrega', 'Cupons', 'Bruto', 'Saldo'].includes(c) ? 'text-right' : 'text-left'}`}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ifood.vendas.map((v) => (
                    <tr key={v.id} className="border-t" style={{ borderColor: C.rowBorder, color: v.status === 'CANCELLED' ? C.text3 : C.text1 }}>
                      <td className="px-3 py-2 fonte-mono">#{v.codigo}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatarTimestamp(v.data)}</td>
                      <td className="px-3 py-2">{STATUS_VENDA[v.status] || v.status}</td>
                      <td className="px-3 py-2 text-right fonte-mono">{brl(v.itens)}</td>
                      <td className="px-3 py-2 text-right fonte-mono">{brl(v.taxa_entrega)}</td>
                      <td className="px-3 py-2 text-right fonte-mono">{v.beneficios ? `− ${brl(v.beneficios)}` : '—'}</td>
                      <td className="px-3 py-2 text-right fonte-mono font-semibold">{brl(v.bruto)}</td>
                      <td className="px-3 py-2 text-right fonte-mono">{brl(v.saldo)}</td>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: C.text2 }}>{v.pagamentos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Cartao>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
            <Cartao C={C} titulo="Repasses (pagamentos do iFood pra loja)" Icone={Landmark}>
              <TabelaCrua C={C} linhas={ifood?.repasses?.settlements} />
            </Cartao>
            <Cartao C={C} titulo="Eventos financeiros (comissão, taxas, ajustes)" Icone={Receipt}>
              <TabelaCrua C={C} linhas={ifood?.eventos} />
            </Cartao>
          </div>
        </>
      )}
      {!ehIfood && !todas && (
        <p className="text-xs" style={{ color: C.text3 }}>
          Extrato oficial: a API aberta do 99Food não tem endpoint financeiro — os valores acima vêm dos pedidos recebidos.
        </p>
      )}
    </div>
  )
}
