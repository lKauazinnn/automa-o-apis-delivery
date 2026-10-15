// Peças do "casco" do painel logado: header, avisos (toasts), banner de conexão e a barra de
// progresso das ações em massa.
import { AlertTriangle, Check, Info, Moon, PanelLeft, Pause, RefreshCw, Sun, Trash2, WifiOff, X } from 'lucide-react'
import { MONO, tons } from './ds'

export function Header({ crumb, titulo, aoVivo, conexao, tema, onAlternarTema, onAlternarSidebar }) {
  // Sem conexão o selo deixa de dizer "ao vivo": a tela está mostrando o último dado que chegou.
  const selo =
    conexao === 'offline'
      ? { tipo: 'bad', texto: 'Sem conexão', sub: '· dados parados' }
      : conexao === 'reconectando'
        ? { tipo: 'warn', texto: 'Reconectando', sub: '· tentando de novo' }
        : aoVivo
          ? { tipo: 'good', texto: 'Ao vivo', sub: `· atualiza a cada ${aoVivo}` }
          : null
  const t = selo ? tons(selo.tipo) : null
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 28px 14px 16px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--borda)',
        minHeight: 72,
        flexShrink: 0,
      }}
    >
      <button type="button" onClick={onAlternarSidebar} title="Recolher/abrir menu" aria-label="Recolher ou abrir o menu" className="ds-icone" style={{ width: 38, height: 38 }}>
        <PanelLeft size={20} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, color: 'var(--t3)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{crumb}</div>
        <h1 style={{ margin: '1px 0 0', fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, color: 'var(--t1)' }}>{titulo}</h1>
      </div>
      {selo && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            height: 34,
            padding: '0 12px',
            borderRadius: 99,
            background: t.bg,
            border: `1px solid ${t.bd}`,
            color: t.fg,
            fontSize: 12.5,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          <span className={selo.tipo === 'good' ? 'pulso-vivo' : undefined} style={{ width: 8, height: 8, borderRadius: 99, background: t.fg, boxShadow: `0 0 0 3px ${t.bd}` }} />
          <span>{selo.texto}</span>
          <span style={{ color: 'var(--t2)', fontWeight: 500 }}>{selo.sub}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onAlternarTema}
        title={tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        aria-label={tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        className="ds-btn ds-btn--secundario"
        style={{ width: 38, height: 38, padding: 0, color: 'var(--t2)' }}
      >
        {tema === 'escuro' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  )
}

export function BarraProgresso({ progresso }) {
  if (!progresso) return null
  const pct = progresso.total ? (progresso.atual / progresso.total) * 100 : 0
  const verbo = progresso.status === 'UNAVAILABLE' ? 'Pausando' : 'Reativando'
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 28px', background: 'var(--card)', borderBottom: '1px solid var(--borda)' }}>
      <span style={{ color: 'var(--marca-tinta)', display: 'flex' }}>
        <RefreshCw size={16} className="animate-spin" />
      </span>
      <span style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--t1)' }}>{verbo} itens</span>
      <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--input)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--marca)', borderRadius: 99, transition: 'width .15s linear' }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600, color: 'var(--t2)' }}>
        {progresso.atual}/{progresso.total}
      </span>
    </div>
  )
}

// Texto honesto: o painel não enfileira nada offline — o que for feito sem conexão falha e avisa.
export function BannerConexao({ conexao, onTentar }) {
  if (conexao !== 'offline' && conexao !== 'reconectando') return null
  const off = conexao === 'offline'
  const t = tons(off ? 'bad' : 'warn')
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 28px', background: t.bg, borderBottom: `1px solid ${t.bd}`, flexWrap: 'wrap' }}>
      <span style={{ color: t.fg, display: 'flex' }}>{off ? <WifiOff size={16} /> : <RefreshCw size={16} />}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t1)' }}>{off ? 'Sem conexão com o servidor' : 'Reconectando…'}</span>
      <span style={{ fontSize: 13, color: 'var(--t2)', flex: 1, minWidth: 200 }}>
        {off
          ? 'A tela mostra os últimos dados que chegaram. Pausar e editar vão falhar até a conexão voltar — o que já foi feito continua valendo no iFood e no 99Food.'
          : 'A última leitura falhou. Os números podem estar atrasados até a próxima atualização.'}
      </span>
      <button type="button" onClick={onTentar} className="ds-btn ds-btn--secundario ds-btn--xs" style={{ height: 32 }}>
        Tentar agora
      </button>
    </div>
  )
}

const TOAST = {
  sucesso: { tipo: 'good', Icon: Check },
  erro: { tipo: 'bad', Icon: AlertTriangle },
  aviso: { tipo: 'warn', Icon: AlertTriangle },
  info: { tipo: 'info', Icon: Info },
  pausa: { tipo: 'warn', Icon: Pause },
  exclusao: { tipo: 'bad', Icon: Trash2 },
}

export function Toasts({ toasts, onFechar }) {
  return (
    <div aria-live="polite" style={{ position: 'fixed', top: 16, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, width: 360, maxWidth: 'calc(100vw - 32px)', pointerEvents: 'none' }}>
      {toasts.map((t) => {
        const cfg = TOAST[t.tipo] || TOAST.sucesso
        const c = tons(cfg.tipo)
        return (
          <div
            key={t.id}
            className="toast-entrada"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 12px 12px 14px',
              borderRadius: 12,
              background: 'var(--card)',
              border: '1px solid var(--borda)',
              boxShadow: 'var(--sh)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span style={{ width: 26, height: 26, borderRadius: 7, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <cfg.Icon size={16} />
            </span>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 3 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', textWrap: 'pretty' }}>{t.mensagem}</div>
              {t.sub && <div style={{ fontSize: 12.5, color: 'var(--t2)', marginTop: 2 }}>{t.sub}</div>}
            </div>
            {t.desfazer && (
              <button
                type="button"
                onClick={() => {
                  t.desfazer()
                  onFechar(t.id)
                }}
                className="ds-btn ds-btn--secundario ds-btn--xs"
                style={{ color: 'var(--marca-tinta)' }}
              >
                Desfazer
              </button>
            )}
            <button type="button" onClick={() => onFechar(t.id)} aria-label="Fechar aviso" className="ds-icone" style={{ width: 28, height: 28, color: 'var(--t3)' }}>
              <X size={14} />
            </button>
            <div className="toast-progresso" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: c.fg, opacity: 0.6 }} />
          </div>
        )
      })}
    </div>
  )
}

// ── Celular ─────────────────────────────────────────────────────────────────────────────────
export function HeaderCelular({ simbolo, titulo, sub, conexao, aoVivo, tema, onAlternarTema }) {
  const cor = conexao === 'offline' ? 'var(--bad)' : conexao === 'reconectando' ? 'var(--warn)' : 'var(--good)'
  const status = conexao === 'offline' ? 'sem conexão' : conexao === 'reconectando' ? 'reconectando' : aoVivo ? 'ao vivo' : null
  return (
    <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', paddingTop: 'max(10px, env(safe-area-inset-top))', background: 'var(--card)', borderBottom: '1px solid var(--borda)' }}>
      {simbolo}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--t1)' }}>{titulo}</h1>
        <div style={{ fontSize: 12, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {status && <span style={{ width: 6, height: 6, borderRadius: 99, background: cor, flexShrink: 0 }} />}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{[sub, status].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      <button type="button" onClick={onAlternarTema} aria-label={tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} className="ds-icone" style={{ width: 40, height: 40 }}>
        {tema === 'escuro' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  )
}

// Cinco abas no polegar. "Mais" reúne o resto (status, financeiro, histórico, administração).
export function NavInferior({ abas, ativa, onMudar }) {
  return (
    <nav aria-label="Navegação principal" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: `repeat(${abas.length}, 1fr)`, padding: '6px 6px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', background: 'var(--card)', borderTop: '1px solid var(--borda)' }}>
      {abas.map((a) => {
        const on = a.chave === ativa
        return (
          <button
            key={a.chave}
            type="button"
            onClick={() => onMudar(a.chave)}
            aria-current={on ? 'page' : undefined}
            aria-label={a.badge ? `${a.label} ${a.badge}` : a.label}
            style={{ height: 52, border: 0, background: 'transparent', color: on ? 'var(--t1)' : 'var(--t2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 11.5, fontWeight: on ? 700 : 500, position: 'relative', cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', position: 'relative', padding: '3px 14px', borderRadius: 99, background: on ? 'var(--marca-suave)' : 'transparent', color: on ? 'var(--marca-tinta)' : undefined }}>
              <a.Icon size={20} />
              {!!a.badge && (
                <span style={{ position: 'absolute', top: -2, right: 4, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 99, background: a.badgeCor || 'var(--warn)', color: 'var(--card)', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--card)' }}>
                  {a.badge}
                </span>
              )}
            </span>
            {a.label}
          </button>
        )
      })}
    </nav>
  )
}
