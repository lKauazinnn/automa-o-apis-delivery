import { useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, ArrowRight, Check, Loader2, RefreshCw, Store, X } from 'lucide-react'
import { Botao, EstadoVazio, Esqueleto, Etiqueta, MONO, Segmentado, tons, useLarguraConteudo } from '../ds'

const INTERVALO_ATUALIZACAO_MS = 30000
const DURACOES_FECHAMENTO = [15, 30, 60, 120, 240]
const PLATAFORMA_LABEL = { ifood: 'iFood', '99food': '99Food' }

function tempoDesde(iso) {
  if (!iso) return ''
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 1) return 'agora há pouco'
  if (min < 60) return `há ${min} min`
  if (min < 1440) return `há ${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
  return `há ${Math.floor(min / 1440)} dia(s)`
}

function duracao(ms) {
  const min = Math.max(0, Math.round(ms / 60000))
  if (min < 60) return `${min} min`
  if (min < 1440) return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}`
  return `${Math.floor(min / 1440)} d`
}

const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
const tipoEstado = (aberta) => (aberta === true ? 'good' : aberta === false ? 'bad' : 'neutro')
const textoEstado = (aberta) => (aberta === true ? 'Aberta' : aberta === false ? 'Fechada' : 'Sem informação')

// Faixa do dia (00h → agora) montada com as mudanças gravadas em status_lojas_historico. Antes da
// primeira mudança de hoje vale o estado anterior a ela; sem nenhum registro, a faixa fica vazia.
function faixaDoDia(loja, historico) {
  const inicio = new Date()
  inicio.setHours(0, 0, 0, 0)
  const ini = inicio.getTime()
  const fimDia = ini + 86400000
  const agora = Date.now()
  const daLoja = historico
    .filter((h) => h.merchant_id === loja.merchant_id)
    .map((h) => ({ t: new Date(h.em).getTime(), aberta: h.aberta, motivo: h.motivo }))
    .sort((a, b) => a.t - b.t)
  const antes = daLoja.filter((h) => h.t < ini).pop()
  const hoje = daLoja.filter((h) => h.t >= ini && h.t <= agora)
  let estado = antes ? antes.aberta : hoje.length ? null : loja.aberta
  let t = ini
  const segs = []
  for (const h of hoje) {
    segs.push({ de: t, ate: h.t, aberta: estado })
    t = h.t
    estado = h.aberta
  }
  segs.push({ de: t, ate: agora, aberta: estado })
  const pct = (v) => `${((v - ini) / (fimDia - ini)) * 100}%`
  return {
    segmentos: segs
      .filter((s) => s.ate > s.de)
      .map((s) => ({ w: `${((s.ate - s.de) / (fimDia - ini)) * 100}%`, cor: s.aberta === true ? 'var(--good)' : s.aberta === false ? 'var(--bad)' : 'var(--borda)', titulo: `${textoEstado(s.aberta)} · ${hora(new Date(s.de).toISOString())}–${hora(new Date(s.ate).toISOString())}` })),
    agora: pct(agora),
    temDado: daLoja.length > 0,
  }
}

function CartaoCanal({ loja, historico, podeGerenciar, apiFetch, notificar, onMudou }) {
  const [minutos, setMinutos] = useState(30)
  const [executando, setExecutando] = useState(null)
  const t = tons(tipoEstado(loja.aberta))
  const ehIfood = loja.plataforma === 'ifood'
  const qs = `?loja=${encodeURIComponent(loja.merchant_id)}`
  const faixa = faixaDoDia(loja, historico)
  const fechada = loja.aberta === false

  async function fecharAgora() {
    setExecutando('fechar')
    try {
      const inicio = new Date()
      const fim = new Date(inicio.getTime() + minutos * 60000)
      await apiFetch(`/interrupcoes${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: `Fechada pelo painel por ${minutos} min`, inicio: inicio.toISOString(), fim: fim.toISOString() }),
      })
      notificar('sucesso', `${loja.nome} fechada por ${minutos} min no iFood.`)
      onMudou()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setExecutando(null)
    }
  }

  async function reabrir() {
    setExecutando('reabrir')
    try {
      const interrupcoes = await apiFetch(`/interrupcoes${qs}`)
      const agora = Date.now()
      const ativas = (interrupcoes || []).filter((i) => new Date(i.end).getTime() > agora)
      if (ativas.length === 0) {
        notificar('erro', 'Não há interrupção ativa pra remover — o motivo do fechamento é outro (veja no cartão).')
        return
      }
      for (const i of ativas) {
        await apiFetch(`/interrupcoes/${i.id}${qs}`, { method: 'DELETE' })
      }
      notificar('sucesso', `${loja.nome}: ${ativas.length} interrupção(ões) removida(s).`)
      onMudou()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setExecutando(null)
    }
  }

  const problemas = (loja.problemas || []).map((p) => (typeof p === 'string' ? { titulo: p } : p))

  return (
    <section style={{ background: 'var(--card)', border: `${fechada ? 2 : 1}px solid ${fechada ? 'var(--bad)' : 'var(--borda)'}`, borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px 14px', padding: '18px 20px 14px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', overflowWrap: 'anywhere' }}>{loja.nome}</span>
            <Etiqueta>{PLATAFORMA_LABEL[loja.plataforma] || loja.plataforma}</Etiqueta>
          </div>
          <div title={loja.merchant_id} style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--t3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loja.merchant_id}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px', borderRadius: 99, background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, fontSize: 13.5, fontWeight: 700 }}>
            {loja.aberta === true ? <Check size={14} /> : loja.aberta === false ? <X size={14} /> : null}
            {textoEstado(loja.aberta)}
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
            {loja.mudou_em ? `desde ${hora(loja.mudou_em)} · ${tempoDesde(loja.mudou_em)}` : `verificado ${tempoDesde(loja.verificado_em)}`}
          </span>
        </div>
      </div>

      {(loja.motivo || problemas.length > 0) && (
        <div style={{ margin: '0 20px 14px', padding: '10px 12px', borderRadius: 9, background: fechada ? 'var(--bad-bg)' : 'var(--card2)', border: `1px solid ${fechada ? 'var(--bad-bd)' : 'var(--linha)'}`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: fechada ? 'var(--bad)' : 'var(--t2)', display: 'flex', paddingTop: 1 }}>
            <AlertTriangle size={16} />
          </span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loja.motivo && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{loja.motivo}</div>}
            {problemas.map((p, i) => (
              <div key={i}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' }}>{p.titulo || p.id}</div>
                {p.detalhe && <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.45 }}>{p.detalhe}</div>}
                {p.id === 'is-connected' && (
                  <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.45, marginTop: 2 }}>O iFood só considera a loja conectada enquanto o monitor consulta pedidos a cada 30s.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '0 20px 16px', marginTop: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t3)', marginBottom: 6 }}>
          <span>Hoje</span>
          <span>{faixa.temDado ? `verificado ${tempoDesde(loja.verificado_em)}` : 'sem mudanças registradas'}</span>
        </div>
        <div role="img" aria-label="Linha do tempo de hoje" style={{ position: 'relative', height: 14, borderRadius: 5, background: 'var(--input)', overflow: 'hidden', display: 'flex' }}>
          {faixa.segmentos.map((s, i) => (
            <div key={i} title={s.titulo} style={{ width: s.w, background: s.cor, borderRight: '1px solid var(--card)' }} />
          ))}
          <div style={{ position: 'absolute', top: -2, bottom: -2, left: faixa.agora, width: 2, background: 'var(--t1)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11.5, color: 'var(--t3)', marginTop: 4 }}>
          <span>00h</span>
          <span>06h</span>
          <span>12h</span>
          <span>18h</span>
          <span>24h</span>
        </div>
      </div>

      {podeGerenciar && ehIfood && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderTop: '1px solid var(--linha)', background: 'var(--card2)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--t2)' }}>Fechar por</span>
          <select value={minutos} onChange={(e) => setMinutos(Number(e.target.value))} className="ds-input" style={{ width: 'auto', height: 34, background: 'var(--card)' }} aria-label="Duração do fechamento">
            {DURACOES_FECHAMENTO.map((d) => (
              <option key={d} value={d}>
                {d < 60 ? `${d} min` : `${d / 60}h`}
              </option>
            ))}
          </select>
          <Botao variante="secundario" tamanho="sm" disabled={!!executando} onClick={fecharAgora} style={{ color: 'var(--bad)', borderColor: 'var(--bad-bd)' }}>
            {executando === 'fechar' && <Loader2 size={14} className="animate-spin" />}
            Fechar agora
          </Botao>
          <span style={{ flex: 1 }} />
          <Botao variante="secundario" tamanho="sm" disabled={!!executando} onClick={reabrir}>
            {executando === 'reabrir' && <Loader2 size={14} className="animate-spin" />}
            Reabrir já
          </Botao>
        </div>
      )}
    </section>
  )
}

export function StatusLojasView({ apiFetch, notificar, podeGerenciar }) {
  const largura = useLarguraConteudo()
  const [dados, setDados] = useState(null)
  const [historico, setHistorico] = useState([])
  const [verificando, setVerificando] = useState(false)
  const [filtro, setFiltro] = useState('todos')
  const apiFetchRef = useRef(apiFetch)
  apiFetchRef.current = apiFetch

  async function carregar(aoVivo = false) {
    if (aoVivo) setVerificando(true)
    try {
      const [status, hist] = await Promise.all([
        apiFetchRef.current(`/lojas/status${aoVivo ? '?ao_vivo=1' : ''}`),
        apiFetchRef.current('/lojas/status/historico?limite=50').catch(() => []),
      ])
      setDados(status)
      setHistorico(hist || [])
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setVerificando(false)
    }
  }

  useEffect(() => {
    carregar()
    const intervalo = setInterval(() => carregar(), INTERVALO_ATUALIZACAO_MS)
    return () => clearInterval(intervalo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lojas = dados?.lojas || []
  const abertas = lojas.filter((l) => l.aberta === true).length
  const fechadas = lojas.filter((l) => l.aberta === false).length
  const monitor = dados?.monitor
  const nomePorLoja = Object.fromEntries(lojas.map((l) => [l.merchant_id, `${l.nome} · ${PLATAFORMA_LABEL[l.plataforma] || l.plataforma}`]))

  // Mudanças com "de → para" e quanto durou cada estado (até a mudança seguinte da mesma loja).
  const mudancas = [...historico]
    .sort((a, b) => new Date(b.em) - new Date(a.em))
    .map((h, i, lista) => {
      const anterior = lista.slice(i + 1).find((x) => x.merchant_id === h.merchant_id)
      const seguinte = lista.slice(0, i).reverse().find((x) => x.merchant_id === h.merchant_id)
      const fim = seguinte ? new Date(seguinte.em).getTime() : Date.now()
      return { ...h, de: anterior ? anterior.aberta : undefined, duracao: duracao(fim - new Date(h.em).getTime()), emCurso: !seguinte }
    })
    .filter((h) => filtro === 'todos' || (filtro === 'fechou' ? h.aberta === false : h.aberta === true))

  const resumoTom = fechadas ? 'bad' : 'good'
  const estreito = largura < 820

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16 }}>
        <section style={{ background: 'var(--card)', border: `1px solid ${fechadas ? 'var(--bad-bd)' : 'var(--borda)'}`, borderRadius: 12, padding: estreito ? 16 : '20px 24px', display: 'flex', alignItems: 'center', gap: estreito ? 14 : 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: 0 }}>
            <div style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>Lojas recebendo pedidos agora</div>
            {dados ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--t1)' }}>{abertas}</span>
                  <span style={{ fontSize: 16, color: 'var(--t3)', fontWeight: 500 }}>de {lojas.length}</span>
                </div>
                <div style={{ fontSize: 13.5, color: tons(resumoTom).fg, fontWeight: 600, marginTop: 4 }}>
                  {fechadas ? `${fechadas} ${fechadas === 1 ? 'loja fechada' : 'lojas fechadas'} — confira o motivo abaixo` : lojas.length ? 'Tudo aberto' : 'Nenhuma loja cadastrada'}
                </div>
              </>
            ) : (
              <Esqueleto w="40%" h={34} style={{ marginTop: 6 }} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {lojas.map((l) => (
              <div key={l.merchant_id} title={nomePorLoja[l.merchant_id]} style={{ width: 14, height: 44, borderRadius: 5, background: tons(tipoEstado(l.aberta)).fg }} />
            ))}
          </div>
          <Botao variante="secundario" tamanho="sm" onClick={() => carregar(true)} disabled={verificando} title="Consultar as plataformas agora">
            <RefreshCw size={14} className={verificando ? 'animate-spin' : ''} /> Verificar agora
          </Botao>
        </section>

        {monitor && (
          <section style={{ background: 'var(--card)', border: `1px solid ${monitor.ativo ? 'var(--borda)' : 'var(--warn-bd)'}`, borderRadius: 12, padding: estreito ? 16 : '20px 24px', display: 'flex', gap: estreito ? 12 : 16, alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, borderRadius: 9, background: monitor.ativo ? 'var(--good-bg)' : 'var(--warn-bg)', border: `1px solid ${monitor.ativo ? 'var(--good-bd)' : 'var(--warn-bd)'}`, color: monitor.ativo ? 'var(--good)' : 'var(--warn)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Activity size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--t1)' }}>{monitor.ativo ? 'Monitor ativo' : 'Monitor parado'}</span>
                {monitor.ultimo_ping && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, height: 22, padding: '0 8px', borderRadius: 99, background: monitor.ativo ? 'var(--good-bg)' : 'var(--warn-bg)', border: `1px solid ${monitor.ativo ? 'var(--good-bd)' : 'var(--warn-bd)'}`, color: monitor.ativo ? 'var(--good)' : 'var(--warn)', fontSize: 12, fontWeight: 600 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }} />
                    último sinal {tempoDesde(monitor.ultimo_ping)}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--t2)', marginTop: 4, lineHeight: 1.5, textWrap: 'pretty' }}>
                {monitor.ativo ? (
                  <>
                    Consulta os pedidos do iFood a cada 30s e o status das lojas a cada 1 min, mesmo com o painel fechado.
                    {monitor.info?.pedidos_novos_total != null && ` ${monitor.info.pedidos_novos_total} pedido(s) recebido(s) desde que iniciou.`}
                    {monitor.info?.ultimo_erro && <span style={{ display: 'block', color: 'var(--bad)', marginTop: 4 }}>Último erro: {monitor.info.ultimo_erro}</span>}
                  </>
                ) : (
                  <>
                    Sem ele, a loja só fica conectada no iFood enquanto alguém está com Pedidos ou Cozinha abertos — fora disso aparece “Gestor de Pedidos desconectado” e a loja fecha. Rode{' '}
                    <span style={{ fontFamily: MONO, color: 'var(--t1)' }}>iniciar_monitor.bat</span> num computador que fica ligado, ou suba o{' '}
                    <span style={{ fontFamily: MONO, color: 'var(--t1)' }}>Dockerfile.monitor</span> num servidor.
                  </>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {!dados ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 1fr))', gap: 16 }}>
          {[0, 1].map((k) => (
            <section key={k} style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Esqueleto w="45%" h={16} />
              <Esqueleto w="70%" h={12} />
              <Esqueleto h={14} r={5} />
            </section>
          ))}
        </div>
      ) : lojas.length === 0 ? (
        <section style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12 }}>
          <EstadoVazio icone={<Store size={22} />} titulo="Nenhuma loja cadastrada" texto="Cadastre a loja em Administração › Lojas para acompanhar se ela está aberta." />
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 520px), 1fr))', gap: 16 }}>
          {lojas.map((loja) => (
            <CartaoCanal key={loja.merchant_id} loja={loja} historico={historico} podeGerenciar={podeGerenciar} apiFetch={apiFetchRef.current} notificar={notificar} onMudou={() => setTimeout(() => carregar(true), 1500)} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--t2)' }}>
        {[
          ['var(--good)', 'Aberta'],
          ['var(--bad)', 'Fechada'],
          ['var(--borda)', 'Sem informação'],
        ].map(([cor, l]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: cor }} />
            {l}
          </span>
        ))}
      </div>

      <section style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--linha)', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>Mudanças recentes</h2>
          <Segmentado
            rotulo="Filtrar mudanças"
            valor={filtro}
            onChange={setFiltro}
            altura={30}
            opcoes={[
              { valor: 'todos', rotulo: 'Tudo' },
              { valor: 'fechou', rotulo: 'Fechamentos' },
              { valor: 'abriu', rotulo: 'Aberturas' },
            ]}
          />
        </div>
        {mudancas.length === 0 ? (
          <EstadoVazio compacto titulo="Nenhuma mudança registrada" texto="O histórico é gravado toda vez que uma loja abre ou fecha." />
        ) : (
          estreito ? (
          <div>
            {mudancas.map((h) => {
              const para = tons(tipoEstado(h.aberta))
              const hoje = new Date(h.em).toDateString() === new Date().toDateString()
              return (
                <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px', borderBottom: '1px solid var(--linha)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nomePorLoja[h.merchant_id] || h.merchant_id}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--t3)', flexShrink: 0 }}>{hoje ? hora(h.em) : new Date(h.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13 }}>
                    {h.de !== undefined && (
                      <>
                        <span style={{ color: 'var(--t2)', fontWeight: 600 }}>{textoEstado(h.de)}</span>
                        <ArrowRight size={13} style={{ color: 'var(--t3)' }} />
                      </>
                    )}
                    <span style={{ color: para.fg, fontWeight: 700 }}>{textoEstado(h.aberta)}</span>
                    <span style={{ color: 'var(--t3)' }}>·</span>
                    <span style={{ fontFamily: MONO, color: h.emCurso ? para.fg : 'var(--t2)', fontWeight: h.emCurso ? 600 : 400 }}>
                      {h.duracao}
                      {h.emCurso ? ' · em curso' : ''}
                    </span>
                  </div>
                  {h.motivo && <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.4 }}>{h.motivo}</div>}
                </div>
              )
            })}
          </div>
          ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 760 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '110px minmax(160px,1fr) minmax(190px,1.1fr) minmax(200px,1.6fr) 130px', alignItems: 'center', height: 40, padding: '0 20px', background: 'var(--card2)', borderBottom: '1px solid var(--linha)', fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>
                <div>Quando</div>
                <div>Loja</div>
                <div>Mudança</div>
                <div>Motivo</div>
                <div style={{ textAlign: 'right' }}>Duração</div>
              </div>
              {mudancas.map((h) => {
                const para = tons(tipoEstado(h.aberta))
                const hoje = new Date(h.em).toDateString() === new Date().toDateString()
                return (
                  <div key={h.id} style={{ display: 'grid', gridTemplateColumns: '110px minmax(160px,1fr) minmax(190px,1.1fr) minmax(200px,1.6fr) 130px', alignItems: 'center', minHeight: 52, padding: '0 20px', borderBottom: '1px solid var(--linha)' }}>
                    <div style={{ fontFamily: MONO, fontSize: 13, color: 'var(--t2)' }}>{hoje ? hora(h.em) : new Date(h.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nomePorLoja[h.merchant_id] || h.merchant_id}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      {h.de !== undefined && (
                        <>
                          <span style={{ color: 'var(--t2)', fontWeight: 600 }}>{textoEstado(h.de)}</span>
                          <span style={{ color: 'var(--t3)', display: 'flex' }}>
                            <ArrowRight size={14} />
                          </span>
                        </>
                      )}
                      <span style={{ color: para.fg, fontWeight: 700 }}>{textoEstado(h.aberta)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>{h.motivo || '—'}</div>
                    <div style={{ fontFamily: MONO, fontSize: 13, textAlign: 'right', color: h.emCurso ? para.fg : 'var(--t2)', fontWeight: h.emCurso ? 600 : 400 }}>
                      {h.duracao}
                      {h.emCurso ? ' · em curso' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          )
        )}
      </section>
    </div>
  )
}
