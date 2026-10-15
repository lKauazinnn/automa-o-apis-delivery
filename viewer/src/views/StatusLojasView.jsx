import { useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, History, Loader2, Power, PowerOff, RefreshCw, Store } from 'lucide-react'
import { Esqueleto, formatarTimestamp, Pill } from '../ui'

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

function corEstado(loja, C) {
  if (loja.aberta === true) return C.good
  if (loja.aberta === false) return C.bad
  return C.text3
}

function CartaoLoja({ loja, C, podeGerenciar, apiFetch, notificar, onMudou }) {
  const [duracao, setDuracao] = useState(30)
  const [executando, setExecutando] = useState(null)
  const cor = corEstado(loja, C)
  const ehIfood = loja.plataforma === 'ifood'
  const qs = `?loja=${encodeURIComponent(loja.merchant_id)}`

  async function fecharAgora() {
    setExecutando('fechar')
    try {
      const inicio = new Date()
      const fim = new Date(inicio.getTime() + duracao * 60000)
      await apiFetch(`/interrupcoes${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: `Fechada pelo painel por ${duracao} min`, inicio: inicio.toISOString(), fim: fim.toISOString() }),
      })
      notificar('sucesso', `${loja.nome} fechada por ${duracao} min no iFood.`)
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
        notificar('erro', 'Não há interrupção ativa pra remover — o motivo do fechamento é outro (veja abaixo).')
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

  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ background: C.cardBg, borderColor: loja.aberta === false ? C.badBd : C.cardBorder }}>
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: cor + '20', border: `1px solid ${cor}4D` }}
        >
          {loja.aberta ? <Power size={18} color={cor} /> : <PowerOff size={18} color={cor} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate" style={{ color: C.text1, fontSize: 15 }}>{loja.nome}</p>
          <p style={{ color: C.text3, fontSize: 12.5 }}>
            {PLATAFORMA_LABEL[loja.plataforma] || loja.plataforma} · <span className="fonte-mono">{loja.merchant_id.slice(0, 13)}…</span>
          </p>
        </div>
        <Pill color={cor} dot>
          {loja.aberta === true ? 'Aberta' : loja.aberta === false ? 'Fechada' : 'Sem informação'}
        </Pill>
      </div>

      {loja.motivo && (
        <p className="text-xs" style={{ color: loja.aberta === false ? C.text1 : C.text2 }}>{loja.motivo}</p>
      )}
      {loja.problemas?.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {loja.problemas.map((p, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs" style={{ background: C.badBg, color: C.text1 }}>
              <AlertTriangle size={13} className="flex-shrink-0" style={{ color: C.bad, marginTop: 1 }} />
              <div>
                {/* Normalmente o problema é um objeto {id, titulo, detalhe} da validação do iFood.
                    Aceita string também: quando vinha assim, a caixa de alerta aparecia vazia —
                    um aviso sem texto é pior que aviso nenhum. */}
                <p className="font-semibold">{typeof p === 'string' ? p : p.titulo || p.id}</p>
                {p.detalhe && <p style={{ color: C.text2 }}>{p.detalhe}</p>}
                {p.id === 'is-connected' && (
                  <p className="mt-0.5" style={{ color: C.neutral }}>
                    → O iFood só considera a loja conectada enquanto o monitor faz polling a cada 30s.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ color: C.text3, fontSize: 11.5 }}>
        {loja.mudou_em ? `Neste estado ${tempoDesde(loja.mudou_em)} · ` : ''}verificado {tempoDesde(loja.verificado_em)}
      </p>

      {podeGerenciar && ehIfood && (
        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: C.rowBorder }}>
          <select
            value={duracao}
            onChange={(e) => setDuracao(Number(e.target.value))}
            className="rounded-lg px-2 text-xs outline-none"
            style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}`, color: C.text1, height: 32 }}
            aria-label="Duração do fechamento"
          >
            {DURACOES_FECHAMENTO.map((d) => (
              <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60}h`}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!!executando}
            onClick={fecharAgora}
            className="botao-perigo text-xs font-bold px-3 rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
            style={{ height: 32 }}
          >
            {executando === 'fechar' && <Loader2 size={12} className="animate-spin" />}
            Fechar agora
          </button>
          <button
            type="button"
            disabled={!!executando}
            onClick={reabrir}
            className="text-xs font-semibold px-3 rounded-lg ml-auto disabled:opacity-50 inline-flex items-center gap-1.5"
            style={{ height: 32, color: C.text1, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
          >
            {executando === 'reabrir' && <Loader2 size={12} className="animate-spin" />}
            Reabrir
          </button>
        </div>
      )}
    </div>
  )
}

export function StatusLojasView({ apiFetch, C, notificar, podeGerenciar }) {
  const [dados, setDados] = useState(null)
  const [historico, setHistorico] = useState([])
  const [verificando, setVerificando] = useState(false)
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
      setHistorico(hist)
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
  const nomePorLoja = Object.fromEntries(lojas.map((l) => [l.merchant_id, l.nome]))

  return (
    <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 1100 }}>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Store size={17} color={C.marcaTinta} />
          <h2 className="font-bold" style={{ color: C.text1, fontSize: 18, letterSpacing: '-0.02em' }}>Status das lojas</h2>
        </div>
        {dados && (
          <span style={{ color: C.text2, fontSize: 13.5 }}>
            <strong style={{ color: C.good }}>{abertas}</strong> aberta{abertas === 1 ? '' : 's'} ·{' '}
            <strong style={{ color: fechadas ? C.bad : C.text2 }}>{fechadas}</strong> fechada{fechadas === 1 ? '' : 's'}
          </span>
        )}
        <button
          type="button"
          onClick={() => carregar(true)}
          disabled={verificando}
          className="ml-auto text-xs font-semibold px-3.5 rounded-xl inline-flex items-center gap-1.5 disabled:opacity-50"
          style={{ height: 36, color: C.text1, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
        >
          <RefreshCw size={13} className={verificando ? 'animate-spin' : ''} />
          Verificar agora
        </button>
      </div>

      {monitor && (
        <div
          className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-xs"
          style={{
            background: monitor.ativo ? C.goodBg : C.neutralBg,
            border: `1px solid ${monitor.ativo ? C.goodBd : C.neutralBd}`,
            color: C.text1,
          }}
        >
          {monitor.ativo ? (
            <CheckCircle2 size={16} color={C.good} className="flex-shrink-0" />
          ) : (
            <Activity size={16} color={C.neutral} className="flex-shrink-0" />
          )}
          <div>
            {monitor.ativo ? (
              <>
                <p className="font-bold">Monitor ativo — último sinal {tempoDesde(monitor.ultimo_ping)}</p>
                <p style={{ color: C.text2 }}>
                  Pedidos do iFood consultados a cada 30s e status das lojas a cada 1 min, mesmo com o painel fechado.
                  {monitor.info?.pedidos_novos_total != null && ` ${monitor.info.pedidos_novos_total} pedido(s) recebido(s) desde que iniciou.`}
                </p>
                {monitor.info?.ultimo_erro && <p style={{ color: C.bad }}>Último erro: {monitor.info.ultimo_erro}</p>}
              </>
            ) : (
              <>
                <p className="font-bold">Monitor parado{monitor.ultimo_ping ? ` (último sinal ${tempoDesde(monitor.ultimo_ping)})` : ''}</p>
                <p style={{ color: C.text2 }}>
                  Sem ele, a loja só fica conectada no iFood enquanto alguém está com as telas de Pedidos/Cozinha abertas — fora
                  disso aparece "Gestor de Pedidos desconectado" e a loja fecha. Rode <span className="fonte-mono">iniciar_monitor.bat</span>{' '}
                  num computador que fica ligado, ou suba o <span className="fonte-mono">Dockerfile.monitor</span> num servidor.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {!dados ? (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border p-4" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
              <Esqueleto w="55%" h={15} />
              <div className="mt-3"><Esqueleto w="85%" h={12} /></div>
            </div>
          ))}
        </div>
      ) : lojas.length === 0 ? (
        <p className="text-sm py-10 text-center" style={{ color: C.text3 }}>Nenhuma loja cadastrada.</p>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {lojas.map((loja) => (
            <CartaoLoja
              key={loja.merchant_id}
              loja={loja}
              C={C}
              podeGerenciar={podeGerenciar}
              apiFetch={apiFetchRef.current}
              notificar={notificar}
              onMudou={() => setTimeout(() => carregar(true), 1500)}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: C.cardBorder }}>
          <History size={16} color={C.marcaTinta} />
          <h3 className="font-bold" style={{ color: C.text1, fontSize: 15.5 }}>Histórico de abre/fecha</h3>
        </div>
        <div className="px-5 py-2">
          {historico.length === 0 && (
            <p className="text-sm py-8" style={{ color: C.text3 }}>
              Nenhuma mudança registrada ainda. O histórico é gravado a cada mudança de estado (precisa da migration 009).
            </p>
          )}
          {historico.map((h) => {
            const cor = corEstado(h, C)
            return (
              <div key={h.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 text-xs" style={{ borderColor: C.rowBorder }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cor }} />
                <span className="font-semibold flex-shrink-0" style={{ color: cor, width: 64 }}>
                  {h.aberta === true ? 'Abriu' : h.aberta === false ? 'Fechou' : 'Sem info'}
                </span>
                <span className="font-semibold truncate" style={{ color: C.text1, maxWidth: 200 }}>{nomePorLoja[h.merchant_id] || h.merchant_id}</span>
                <span className="truncate flex-1" style={{ color: C.text2 }}>{h.motivo}</span>
                <span className="flex-shrink-0" style={{ color: C.text3 }}>{formatarTimestamp(h.em)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
