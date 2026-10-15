// Componentes do redesign (Claude Design · "PausaFast Painel"). Cor sempre por variável CSS
// (var(--card), var(--t1), var(--warn-bg)...) definida em index.css nos dois temas — nada de
// literal, nada de `C` por prop. As classes .ds-* (index.css) cuidam do hover, que estilo inline
// não consegue expressar.
import { useEffect, useRef } from 'react'
import { Check, Minus, X } from 'lucide-react'

export const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

// Status → trio de cores (texto, fundo, borda). `neutro` é o cinza de "sem estado".
export function tons(tipo) {
  if (tipo === 'neutro') return { fg: 'var(--t2)', bg: 'var(--input)', bd: 'var(--borda)' }
  return { fg: `var(--${tipo})`, bg: `var(--${tipo}-bg)`, bd: `var(--${tipo}-bd)` }
}

export function Botao({ variante = 'secundario', tamanho = 'md', className = '', children, ...props }) {
  const cls = `ds-btn ds-btn--${variante}${tamanho !== 'md' ? ` ds-btn--${tamanho}` : ''} ${className}`
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  )
}

export function BotaoIcone({ rotulo, perigo = false, className = '', children, tamanho = 36, style, ...props }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      className={`ds-icone${perigo ? ' ds-icone--perigo' : ''} ${className}`}
      style={{ width: tamanho, height: tamanho, ...style }}
      {...props}
    >
      {children}
    </button>
  )
}

// Rótulo de seção/campo em caixa-alta (11,5px/700, 0.08em).
export function Rotulo({ children, cor = 'var(--t3)', style, className = '', as: Tag = 'div' }) {
  return (
    <Tag
      className={className}
      style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: cor, ...style }}
    >
      {children}
    </Tag>
  )
}

// Pílula de status: ponto, ícone ou nada à esquerda.
export function Selo({ tipo = 'neutro', icone = null, ponto = false, children, altura = 24, style }) {
  const t = tons(tipo)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: altura,
        padding: '0 10px',
        borderRadius: 99,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.fg,
        fontSize: 12.5,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {icone}
      {ponto && !icone && <span style={{ width: 6, height: 6, borderRadius: 99, background: t.fg, flexShrink: 0 }} />}
      {children}
    </span>
  )
}

// Contador redondo (badge da sidebar, do título de card...).
export function Contador({ tipo = 'warn', children, style }) {
  const t = tons(tipo)
  return (
    <span
      style={{
        minWidth: 22,
        height: 20,
        padding: '0 6px',
        borderRadius: 99,
        fontSize: 11.5,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: t.bg,
        color: t.fg,
        border: `1px solid ${t.bd}`,
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// Etiqueta pequena caixa-alta (plataforma, "em breve", "Complemento").
export function Etiqueta({ children, tipo = null, style }) {
  const t = tipo ? tons(tipo) : { fg: 'var(--t2)', bg: 'var(--input)', bd: 'var(--borda)' }
  return (
    <span
      style={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 5,
        background: t.bg,
        border: `1px solid ${t.bd}`,
        color: t.fg,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function Cartao({ children, style, className = '', borda = 'var(--borda)', as: Tag = 'section', ...props }) {
  return (
    <Tag
      className={className}
      style={{ background: 'var(--card)', border: `1px solid ${borda}`, borderRadius: 12, overflow: 'hidden', ...style }}
      {...props}
    >
      {children}
    </Tag>
  )
}

// Cabeçalho de cartão: título 15,5px/700 + o que vier à direita.
export function CabecalhoCartao({ icone, titulo, extra, children, style }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 20px',
        borderBottom: '1px solid var(--linha)',
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {icone}
      <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--t1)' }}>{titulo}</h2>
      {extra}
      {children && <span style={{ flex: 1 }} />}
      {children}
    </div>
  )
}

// Controle segmentado (radiogroup). `opcoes`: [{ valor, rotulo, contagem? }]
export function Segmentado({ opcoes, valor, onChange, rotulo, altura = 32, style }) {
  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      style={{
        display: 'flex',
        padding: 3,
        borderRadius: 9,
        background: 'var(--input)',
        border: '1px solid var(--borda)',
        gap: 2,
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.valor)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              height: altura,
              padding: '0 12px',
              borderRadius: 7,
              border: 0,
              background: ativo ? 'var(--card)' : 'transparent',
              boxShadow: ativo ? 'var(--sh-sm)' : 'none',
              color: ativo ? 'var(--t1)' : 'var(--t2)',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flex: o.cheio ? 1 : undefined,
            }}
          >
            {o.icone}
            {o.rotulo}
            {o.contagem != null && (
              <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 500, color: 'var(--t3)' }}>{o.contagem}</span>
            )}
            {o.sub && <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--t3)' }}>{o.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}

// Caixa de seleção visual (20px). `estado`: true | false | 'parcial'.
export function Marcador({ estado, tamanho = 20 }) {
  const on = !!estado
  return (
    <span
      aria-hidden="true"
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: 5,
        border: `1.5px solid ${on ? 'var(--marca)' : 'var(--borda)'}`,
        background: on ? 'var(--marca)' : 'var(--card)',
        color: 'var(--marca-texto)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {estado === 'parcial' ? <Minus size={13} strokeWidth={3} /> : on ? <Check size={13} strokeWidth={3} /> : null}
    </span>
  )
}

// Interruptor 40×24 (turno, dia aberto...).
export function Interruptor({ ligado, onChange, rotulo, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={disabled}
      onClick={onChange}
      style={{
        width: 40,
        height: 24,
        borderRadius: 99,
        background: ligado ? 'var(--good)' : 'var(--borda)',
        position: 'relative',
        flexShrink: 0,
        border: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: ligado ? 19 : 3,
          width: 18,
          height: 18,
          borderRadius: 99,
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,.25)',
          transition: 'left .15s',
        }}
      />
    </button>
  )
}

export function CampoBusca({ valor, onChange, placeholder, icone, onLimpar, inputRef, style, ...props }) {
  return (
    <div className="ds-campo" style={style}>
      <span style={{ color: 'var(--t3)', display: 'flex' }}>{icone}</span>
      <input ref={inputRef} value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} {...props} />
      {valor && onLimpar && (
        <button
          type="button"
          onClick={onLimpar}
          aria-label="Limpar busca"
          style={{ border: 0, background: 'transparent', color: 'var(--t3)', display: 'flex', cursor: 'pointer', padding: 2 }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

// Campo rotulado (rótulo caixa-alta em cima).
export function Campo({ rotulo, dica, children, style }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <Rotulo as="span">{rotulo}</Rotulo>
      {children}
      {dica && <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>{dica}</span>}
    </label>
  )
}

// Estado vazio/erro centralizado: ícone num quadrado, título, texto, ação.
export function EstadoVazio({ icone, tipo = 'neutro', titulo, texto, acao, compacto = false }) {
  const t = tipo === 'neutro' ? { fg: 'var(--t2)', bg: 'var(--input)' } : tons(tipo)
  return (
    <div
      style={{
        padding: compacto ? '32px 20px' : '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        textAlign: 'center',
      }}
    >
      {icone && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: t.bg,
            color: t.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icone}
        </div>
      )}
      {titulo && <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>{titulo}</div>}
      {texto && <div style={{ fontSize: 13.5, color: 'var(--t2)', maxWidth: 440, textWrap: 'pretty' }}>{texto}</div>}
      {acao && <div style={{ marginTop: 6 }}>{acao}</div>}
    </div>
  )
}

// Fecha com Esc e trava a rolagem do fundo enquanto um painel sobreposto está aberto.
function useSobreposicao(onClose) {
  const fechar = useRef(onClose)
  fechar.current = onClose
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === 'Escape') fechar.current?.()
    }
    window.addEventListener('keydown', aoTeclar)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = anterior
    }
  }, [])
}

function CabecalhoSobreposto({ eyebrow, titulo, descricao, onClose }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '20px 24px 16px',
        borderBottom: '1px solid var(--linha)',
        flexShrink: 0,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && <Rotulo cor="var(--marca-tinta)">{eyebrow}</Rotulo>}
        <h2 style={{ margin: '4px 0 0', fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--t1)' }}>
          {titulo}
        </h2>
        {descricao && (
          <div style={{ fontSize: 13.5, color: 'var(--t2)', marginTop: 4, lineHeight: 1.45, textWrap: 'pretty' }}>
            {descricao}
          </div>
        )}
      </div>
      <BotaoIcone rotulo="Fechar" onClick={onClose}>
        <X size={20} />
      </BotaoIcone>
    </div>
  )
}

export function Rodape({ children, style }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '16px 24px',
        borderTop: '1px solid var(--linha)',
        background: 'var(--card2)',
        flexShrink: 0,
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// Diálogo central. `rodape` fica fixo embaixo; o corpo rola.
export function Dialogo({ eyebrow, titulo, descricao, onClose, children, rodape, largura = 620, alerta = false }) {
  useSobreposicao(onClose)
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--veu)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 80,
        padding: 24,
      }}
    >
      <div
        role={alerta ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={typeof titulo === 'string' ? titulo : undefined}
        onClick={(e) => e.stopPropagation()}
        className="modal-entrada"
        style={{
          width: largura,
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card)',
          border: '1px solid var(--borda)',
          borderRadius: 12,
          boxShadow: 'var(--sh)',
          overflow: 'hidden',
        }}
      >
        <CabecalhoSobreposto eyebrow={eyebrow} titulo={titulo} descricao={descricao} onClose={onClose} />
        <div className="ds-corpo" style={{ overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {children}
        </div>
        {rodape && <Rodape>{rodape}</Rodape>}
      </div>
    </div>
  )
}

// Painel lateral (drawer) que entra pela direita.
export function Gaveta({ eyebrow, titulo, descricao, onClose, children, rodape, largura = 560 }) {
  useSobreposicao(onClose)
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'var(--veu)', display: 'flex', justifyContent: 'flex-end', zIndex: 80 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof titulo === 'string' ? titulo : undefined}
        onClick={(e) => e.stopPropagation()}
        className="drawer-entrada"
        style={{
          width: largura,
          maxWidth: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card)',
          borderLeft: '1px solid var(--borda)',
          boxShadow: 'var(--sh)',
        }}
      >
        <CabecalhoSobreposto eyebrow={eyebrow} titulo={titulo} descricao={descricao} onClose={onClose} />
        <div className="ds-corpo" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {children}
        </div>
        {rodape && <Rodape>{rodape}</Rodape>}
      </div>
    </div>
  )
}

// Opção marcável em lista (insumo, lojas da pausa, sugestões).
export function OpcaoMarcavel({ marcado, onClick, children, extra, disabled = false, style }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={!!marcado}
      onClick={onClick}
      disabled={disabled}
      className="ds-opcao"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        minHeight: 46,
        padding: '6px 14px',
        border: 0,
        borderBottom: '1px solid var(--linha)',
        background: 'var(--card)',
        color: 'var(--t1)',
        fontSize: 13.5,
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        ...style,
      }}
    >
      <span style={{ opacity: disabled ? 0.5 : 1, display: 'flex' }}>
        <Marcador estado={marcado} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {extra}
    </button>
  )
}

// Chip de escolha (motivo da pausa/interrupção).
export function Escolha({ ativo, onClick, children, style }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      style={{
        height: 38,
        padding: '0 14px',
        borderRadius: 9,
        border: `1px solid ${ativo ? 'var(--marca-tinta)' : 'var(--borda)'}`,
        background: ativo ? 'var(--marca-suave)' : 'var(--card)',
        color: 'var(--t1)',
        fontSize: 13.5,
        fontWeight: ativo ? 600 : 500,
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

export function Esqueleto({ w = '100%', h = 12, r = 5, style }) {
  return <div className="esqueleto" style={{ width: w, height: h, borderRadius: r, ...style }} />
}
