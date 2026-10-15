import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, CheckCircle2, ClipboardList, Clock, Pause, Play, Tag, Zap } from 'lucide-react'
import { Botao, Cartao, CabecalhoCartao, Contador, EstadoVazio, Esqueleto, MONO, tons } from '../ds'
import { palavrasChave, tempoDesde, tempoRestante } from '../pausas'
import { descreverAuditoria, iniciaisDe } from '../ui'

const ACOES_PAUSA = new Set(['pausar', 'pausar_em_massa', 'pausar_opcao'])
const ACOES_REATIVA = new Set(['despausar', 'despausar_em_massa', 'despausar_opcao', 'reativar_automatico', 'reativar_opcao_automatico'])

// Tons terrosos pros quadradinhos de iniciais de item sem foto — branco passa de 4,5:1 em todos.
const TONS_ITEM = ['#7E3F2A', '#8A5A2E', '#7A5A1E', '#2E5A5E', '#74485A', '#4F4136', '#3F4F6E']

export function tomDoItem(texto) {
  let h = 0
  for (const ch of String(texto || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return TONS_ITEM[h % TONS_ITEM.length]
}

export function MiniaturaItem({ item, tamanho = 40, apagada = false }) {
  if (item.foto) {
    return (
      <img
        src={item.foto}
        alt=""
        loading="lazy"
        style={{ width: tamanho, height: tamanho, borderRadius: 7, objectFit: 'cover', flexShrink: 0, opacity: apagada ? 0.55 : 1, border: '1px solid var(--linha)' }}
      />
    )
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: 7,
        background: tomDoItem(item.categoria || item.nome),
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        opacity: apagada ? 0.55 : 1,
      }}
    >
      {iniciaisDe(String(item.nome || '').replace(/[()0-9]/g, ''))}
    </div>
  )
}

const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Agrupa pausados que compartilham uma palavra do nome ("Com/Fam/Exec Ancho Black"): é uma
// ruptura de insumo só, não N problemas. Guloso: a palavra que junta mais itens primeiro.
function agruparRupturas(pausados) {
  const restantes = new Map(pausados.map((i) => [i.itemId, i]))
  const grupos = []
  for (;;) {
    const contagem = new Map()
    for (const i of restantes.values()) {
      for (const p of new Set(palavrasChave(i.nome))) contagem.set(p, (contagem.get(p) || 0) + 1)
    }
    const [palavra, n] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0] || []
    if (!palavra || n < 2) break
    const membros = [...restantes.values()].filter((i) => palavrasChave(i.nome).includes(palavra))
    membros.forEach((m) => restantes.delete(m.itemId))
    grupos.push({ palavra, itens: membros })
  }
  for (const i of restantes.values()) grupos.push({ palavra: null, itens: [i] })
  return grupos.sort((a, b) => b.itens.length - a.itens.length)
}

function chaveDia(d) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function LinhaPausado({ item, pausa, borda, executando, onReativar }) {
  const restante = pausa?.volta_em ? tempoRestante(pausa.volta_em) : null
  const prazo = restante
    ? { texto: restante.startsWith('em ') ? `volta ${restante}` : restante, ...tons('info') }
    : { texto: pausa ? 'Até reativar' : 'Sem prazo', fg: 'var(--t2)', bg: 'var(--input)', bd: 'var(--borda)' }
  const linhaSub = pausa
    ? [pausa.motivo, (pausa.pausado_por || 'alguém').split(' ')[0], tempoDesde(pausa.pausado_em)].filter(Boolean).join(' · ')
    : 'pausado no portal ou antes do registro de motivo'
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 14px', padding: '10px 12px', borderTop: borda ? '1px solid var(--linha)' : 0 }}>
      <MiniaturaItem item={item} />
      <div style={{ minWidth: 160, flex: '1 1 200px' }}>
        <div title={item.nome} style={{ fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--t1)' }}>
          {item.nome}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{linhaSub}</div>
      </div>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          height: 24,
          padding: '0 9px',
          borderRadius: 99,
          background: prazo.bg,
          border: `1px solid ${prazo.bd}`,
          color: prazo.fg,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        <Clock size={13} />
        {prazo.texto}
      </span>
      <Botao variante="secundario" tamanho="sm" disabled={executando} onClick={onReativar} className="ds-btn--reativar-hover" aria-label={`Reativar ${item.nome}`}>
        <span style={{ color: 'var(--good)', display: 'flex' }}>
          <Play size={16} />
        </span>
        Reativar
      </Botao>
    </div>
  )
}

export function DashboardView({
  itens,
  categorias,
  totalDisponiveis,
  totalPausados,
  auditoria,
  pausasPorItem = {},
  carregando,
  executando,
  apiFetch,
  chaveLoja,
  onIrAuditoria,
  onAbrirRupturas,
  onReativar,
}) {
  const [pedidosHoje, setPedidosHoje] = useState(null) // null = carregando; { n, total } | { erro }

  useEffect(() => {
    let cancelado = false
    setPedidosHoje(null)
    apiFetch('/pedidos')
      .then((lista) => {
        if (cancelado) return
        const hoje = chaveDia(new Date())
        const validos = (lista || []).filter((p) => p.recebido_em && chaveDia(new Date(p.recebido_em)) === hoje && p.status !== 'CANCELADO')
        setPedidosHoje({ n: validos.length, total: validos.reduce((s, p) => s + Number(p.total || 0), 0) })
      })
      .catch(() => !cancelado && setPedidosHoje({ erro: true }))
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveLoja])

  const pausados = useMemo(() => itens.filter((i) => i.status === 'UNAVAILABLE'), [itens])
  const grupos = useMemo(() => agruparRupturas(pausados), [pausados])
  const maiorGrupo = grupos.find((g) => g.itens.length > 1)

  const { barras, totPausas, totReativ } = useMemo(() => {
    const dias = []
    const hoje = new Date()
    for (let k = 13; k >= 0; k--) {
      const d = new Date(hoje)
      d.setDate(hoje.getDate() - k)
      dias.push({ chave: chaveDia(d), rotulo: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), p: 0, r: 0 })
    }
    const porChave = new Map(dias.map((d) => [d.chave, d]))
    for (const a of auditoria) {
      const d = porChave.get(chaveDia(new Date(a.timestamp)))
      if (!d) continue
      if (ACOES_PAUSA.has(a.acao)) d.p += 1
      else if (ACOES_REATIVA.has(a.acao)) d.r += 1
    }
    const mx = Math.max(1, ...dias.map((d) => Math.max(d.p, d.r)))
    return {
      barras: dias.map((d) => ({ ...d, hp: `${(d.p / mx) * 100}%`, hr: `${(d.r / mx) * 100}%` })),
      totPausas: dias.reduce((s, d) => s + d.p, 0),
      totReativ: dias.reduce((s, d) => s + d.r, 0),
    }
  }, [auditoria])

  const recorrentes = useMemo(() => {
    const limite = Date.now() - 30 * 86400000
    const cont = new Map()
    for (const a of auditoria) {
      if (!ACOES_PAUSA.has(a.acao) || !a.nome || new Date(a.timestamp).getTime() < limite) continue
      cont.set(a.nome, (cont.get(a.nome) || 0) + 1)
    }
    const lista = [...cont.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const mx = Math.max(1, ...lista.map(([, n]) => n))
    return lista.map(([nome, n]) => ({ nome, n, w: `${(n / mx) * 100}%` }))
  }, [auditoria])

  const alvo = (i) => ({ tipo: 'item', id: i.itemId, nome: i.nome, codigo_pdv: i.codigo_pdv || '' })
  const pct = itens.length ? Math.round((totalDisponiveis / itens.length) * 100) : 0

  const stats = [
    { label: 'Itens no cardápio', value: itens.length, sub: `${categorias.length} ${categorias.length === 1 ? 'categoria' : 'categorias'}`, Icon: Tag, icc: 'var(--t2)' },
    { label: 'Disponíveis', value: totalDisponiveis, sub: `${pct}% do cardápio`, Icon: CheckCircle2, icc: 'var(--good)' },
    {
      label: 'Pausados agora',
      value: totalPausados,
      sub: maiorGrupo ? `${maiorGrupo.itens.length} são a mesma ruptura` : totalPausados ? 'nenhum agrupamento' : 'tudo no cardápio',
      Icon: Pause,
      icc: 'var(--warn)',
      fg: 'var(--warn)',
      bd: totalPausados ? 'var(--warn-bd)' : undefined,
    },
    {
      label: 'Pedidos hoje',
      value: pedidosHoje === null ? null : pedidosHoje.erro ? '—' : pedidosHoje.n,
      sub: pedidosHoje === null ? '' : pedidosHoje.erro ? 'não deu pra carregar' : `${brl(pedidosHoje.total)} em pedidos válidos`,
      Icon: ClipboardList,
      icc: 'var(--t2)',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1480 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: 'var(--card)', border: `1px solid ${s.bd || 'var(--borda)'}`, borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>
              <span style={{ color: s.icc, display: 'flex' }}>
                <s.Icon size={16} />
              </span>
              {s.label}
            </div>
            {(carregando && s.label !== 'Pedidos hoje') || s.value === null ? (
              <Esqueleto w="45%" h={30} />
            ) : (
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: s.fg || 'var(--t1)' }}>{s.value}</div>
            )}
            <div style={{ fontSize: 12.5, color: 'var(--t3)', minHeight: 17 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: 20, alignItems: 'start' }}>
        <Cartao>
          <CabecalhoCartao
            icone={
              <span style={{ color: 'var(--warn)', display: 'flex' }}>
                <Pause size={18} />
              </span>
            }
            titulo="Pausados agora"
            extra={<Contador tipo="warn">{totalPausados}</Contador>}
            style={{ padding: '18px 24px' }}
          >
            <Botao variante="link" onClick={onAbrirRupturas}>
              Ver rupturas <ArrowRight size={16} />
            </Botao>
          </CabecalhoCartao>

          {carregando && !itens.length ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1, 2].map((k) => (
                <Esqueleto key={k} h={44} r={9} />
              ))}
            </div>
          ) : pausados.length === 0 ? (
            <EstadoVazio icone={<Check size={22} />} tipo="good" titulo="Tudo no cardápio" texto="Nenhum item pausado nesta loja agora." />
          ) : (
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
              {grupos.map((g) => {
                const multi = g.itens.length > 1
                return (
                  <div
                    key={g.palavra || g.itens[0].itemId}
                    style={{
                      border: `1px solid ${multi ? 'var(--warn-bd)' : 'var(--linha)'}`,
                      background: multi ? 'var(--warn-bg)' : 'transparent',
                      borderRadius: 12,
                      padding: multi ? 4 : 0,
                    }}
                  >
                    {multi && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 12px', padding: '8px 10px 10px' }}>
                        <span style={{ width: 30, height: 30, borderRadius: 7, background: 'var(--card)', border: '1px solid var(--warn-bd)', color: 'var(--warn)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Zap size={16} />
                        </span>
                        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>
                            Provável ruptura: <span style={{ textTransform: 'capitalize' }}>{g.palavra}</span>
                          </div>
                          <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>{g.itens.length} itens pausados juntos — trate como um insumo só</div>
                        </div>
                        <Botao variante="secundario" tamanho="sm" disabled={executando} onClick={() => onReativar(g.itens.map(alvo))} style={{ color: 'var(--good)', borderColor: 'var(--good-bd)' }}>
                          <Play size={16} /> Reativar os {g.itens.length}
                        </Botao>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--card)', borderRadius: 9 }}>
                      {g.itens.map((i, k) => (
                        <LinhaPausado key={i.itemId} item={i} pausa={pausasPorItem[i.itemId]} borda={k > 0} executando={executando} onReativar={() => onReativar([alvo(i)])} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Cartao>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Cartao style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--t1)' }}>Pausas x reativações</h2>
              <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Últimos 14 dias</span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12.5, color: 'var(--t2)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--warn)' }} />
                Pausas <b style={{ fontFamily: MONO, color: 'var(--t1)' }}>{totPausas}</b>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--good)' }} />
                Reativações <b style={{ fontFamily: MONO, color: 'var(--t1)' }}>{totReativ}</b>
              </span>
            </div>
            <div role="img" aria-label={`Nos últimos 14 dias: ${totPausas} pausas e ${totReativ} reativações`} style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 132, marginTop: 16, borderBottom: '1px solid var(--borda)' }}>
              {barras.map((b) => (
                <div key={b.chave} title={`${b.rotulo}: ${b.p} pausas · ${b.r} reativações`} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: '100%' }}>
                  <div style={{ width: '42%', height: b.hp, minHeight: b.p ? 3 : 0, background: 'var(--warn)', borderRadius: '3px 3px 0 0' }} />
                  <div style={{ width: '42%', height: b.hr, minHeight: b.r ? 3 : 0, background: 'var(--good)', borderRadius: '3px 3px 0 0' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: MONO, fontSize: 12, color: 'var(--t3)' }}>
              <span>{barras[0]?.rotulo}</span>
              <span>{barras[7]?.rotulo}</span>
              <span>Hoje</span>
            </div>
          </Cartao>

          <Cartao style={{ padding: '20px 24px' }}>
            <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--t1)' }}>Mais pausados no mês</h2>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', marginTop: 2 }}>Pausa recorrente costuma ser estoque mal dimensionado</div>
            {recorrentes.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--t2)', marginTop: 16 }}>Nenhum item foi pausado mais de uma vez nos últimos 30 dias.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                {recorrentes.map((r) => (
                  <div key={r.nome} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,150px) minmax(0,1fr) 34px', alignItems: 'center', gap: 12 }}>
                    <span title={r.nome} style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--t1)' }}>
                      {r.nome}
                    </span>
                    <div style={{ height: 10, borderRadius: 99, background: 'var(--input)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: r.w, background: 'var(--warn)', borderRadius: 99 }} />
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--t2)', textAlign: 'right' }}>{r.n}×</span>
                  </div>
                ))}
              </div>
            )}
          </Cartao>
        </div>
      </div>

      <Cartao>
        <CabecalhoCartao titulo="Atividade recente" style={{ padding: '18px 24px' }}>
          <Botao variante="link" onClick={onIrAuditoria}>
            Ver histórico <ArrowRight size={16} />
          </Botao>
        </CabecalhoCartao>
        {auditoria.length === 0 ? (
          <EstadoVazio compacto titulo="Nada registrado ainda" texto="Toda pausa, preço e item criado aparece aqui, com quem fez e quando." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', columnGap: 32, padding: '4px 24px 8px' }}>
            {auditoria.slice(0, 6).map((a, idx) => {
              const f = descreverAuditoria(a)
              return (
                <div key={idx} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--linha)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 99, background: 'var(--marca-suave)', color: 'var(--marca-tinta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {iniciaisDe(a.operador)}
                  </div>
                  <div style={{ minWidth: 0, fontSize: 13.5, lineHeight: 1.45, color: 'var(--t2)' }}>
                    <div style={{ textWrap: 'pretty' }}>
                      <b style={{ fontWeight: 600, color: 'var(--t1)' }}>{a.operador || 'Alguém'}</b> {f.verbo}{' '}
                      {f.alvo && <b style={{ fontWeight: 600, color: 'var(--t1)' }}>{f.alvo}</b>}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: 'var(--t3)' }}>
                      {new Date(a.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Cartao>
    </div>
  )
}
