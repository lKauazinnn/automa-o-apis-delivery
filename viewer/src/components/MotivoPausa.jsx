import { useState } from 'react'
import { Check, CircleHelp, Flame, Globe, MessageSquareText, PackageX, PenLine, ShoppingBasket, Wrench } from 'lucide-react'
import { Botao } from '../ds'
import { dataHoraCurta, MOTIVOS_PAUSA, pausaDoPortal, tempoDesde } from '../pausas'
import { Avatar } from '../ui'

// "Quem pausou e o que rolou" de uma pausa — o mesmo bloco no Painel, nas Rupturas e no Cardápio.
// Pausa feita no portal do iFood/99 não tem autor (a plataforma não informa pela API): mostra o
// portal como origem e a hora em que o painel viu o item pausado, nunca um nome inventado.

const ICONES = [
  [/^acabou o estoque/i, PackageX],
  [/^acabou:/i, PackageX],
  [/insumo/i, ShoppingBasket],
  [/sobrecarreg|movimento|fila/i, Flame],
  [/preparo|equipamento|quebr|chapa|forno|fritadeira/i, Wrench],
]

export function iconeDoMotivo(motivo) {
  const achado = ICONES.find(([re]) => re.test(motivo || ''))
  return achado ? achado[1] : MessageSquareText
}

function corAvatar(nome) {
  let h = 0
  for (const ch of String(nome || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

function SeloPortal({ size }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'var(--input)', border: '1px solid var(--borda)', color: 'var(--t2)' }}
    >
      <Globe size={Math.round(size * 0.55)} />
    </span>
  )
}

export function textoQuemPausou(pausa) {
  if (!pausa) return 'Pausado sem registro'
  const quando = pausa.pausado_em ? `${tempoDesde(pausa.pausado_em)} (${dataHoraCurta(pausa.pausado_em)})` : ''
  if (pausaDoPortal(pausa)) return `Pausado no ${pausa.pausado_por.replace(/^portal/i, 'portal')} · visto pausado ${quando}`
  return `${pausa.pausado_por || 'Alguém'} pausou ${quando}`.trim()
}

// Linha "avatar + quem + quando". `tamanho="sm"` pra caber na linha do Painel.
export function QuemPausou({ pausa, tamanho = 'md' }) {
  const sz = tamanho === 'sm' ? 20 : 30
  const portal = pausaDoPortal(pausa)
  const quando = pausa?.pausado_em ? tempoDesde(pausa.pausado_em) : ''
  const hora = pausa?.pausado_em ? dataHoraCurta(pausa.pausado_em) : ''
  if (tamanho === 'sm') {
    // Uma linha só: "(KL) Kauã · há 42 min" / "(🌐) Portal do 99 · visto há 2h".
    const quem = !pausa ? 'Portal' : portal ? pausa.pausado_por : (pausa.pausado_por || 'Alguém').split(' ')[0]
    return (
      <span title={textoQuemPausou(pausa)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, maxWidth: '100%', fontSize: 12.5, color: 'var(--t3)', whiteSpace: 'nowrap' }}>
        {portal || !pausa ? <SeloPortal size={sz} /> : <Avatar nome={pausa.pausado_por || '?'} idx={corAvatar(pausa.pausado_por)} size={sz} />}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <strong style={{ fontWeight: 600, color: 'var(--t2)' }}>{quem}</strong>
          {pausa ? ` · ${portal ? 'visto ' : ''}${quando}` : ' · sem registro'}
        </span>
      </span>
    )
  }
  return (
    <div title={textoQuemPausou(pausa)} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      {portal || !pausa ? <SeloPortal size={sz} /> : <Avatar nome={pausa.pausado_por || '?'} idx={corAvatar(pausa.pausado_por)} size={sz} />}
      <div style={{ minWidth: 0, lineHeight: 1.3 }}>
        <div style={{ fontSize: tamanho === 'sm' ? 12.5 : 13.5, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {!pausa ? (
            <span style={{ color: 'var(--t2)' }}>Pausado fora do painel</span>
          ) : portal ? (
            <>
              <strong style={{ fontWeight: 600 }}>{pausa.pausado_por}</strong>
              <span style={{ color: 'var(--t2)' }}> · fora do painel</span>
            </>
          ) : (
            <>
              <strong style={{ fontWeight: 600 }}>{pausa.pausado_por || 'Alguém'}</strong>
              <span style={{ color: 'var(--t2)' }}> pausou</span>
            </>
          )}
        </div>
        {tamanho !== 'sm' && (
          <div style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {!pausa
              ? 'A plataforma não informa quem pausou'
              : portal
                ? `Visto pausado ${quando} · ${hora} · a plataforma não informa quem foi`
                : `${quando} · ${hora}`}
          </div>
        )}
      </div>
    </div>
  )
}

// O "o que rolou": chip com ícone. Sem motivo vira um chip tracejado que pede o motivo.
export function ChipMotivo({ motivo, compacto = false }) {
  const tem = !!(motivo || '').trim()
  const Icone = tem ? iconeDoMotivo(motivo) : CircleHelp
  return (
    <span
      title={tem ? `Motivo: ${motivo}` : 'Ninguém informou o motivo'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
        height: compacto ? 22 : 26,
        padding: compacto ? '0 8px' : '0 10px',
        borderRadius: 99,
        background: tem ? 'var(--warn-bg)' : 'transparent',
        border: `1px ${tem ? 'solid var(--warn-bd)' : 'dashed var(--borda)'}`,
        color: tem ? 'var(--t1)' : 'var(--t3)',
        fontSize: compacto ? 12 : 12.5,
        fontWeight: tem ? 600 : 500,
        whiteSpace: 'nowrap',
        minWidth: 0,
      }}
    >
      <span style={{ display: 'flex', color: tem ? 'var(--warn)' : 'var(--t3)', flexShrink: 0 }}>
        <Icone size={compacto ? 13 : 14} />
      </span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tem ? motivo : 'Sem motivo'}</span>
    </span>
  )
}

// Escolher o motivo de uma pausa aberta que ficou sem (as do portal, principalmente). Inline, sem
// abrir outro diálogo por cima da gaveta.
export function InformarMotivo({ pausa, onInformar }) {
  const [aberto, setAberto] = useState(false)
  const [livre, setLivre] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function salvar(motivo) {
    const m = (motivo || '').trim().slice(0, 120)
    if (!m || enviando) return
    setEnviando(true)
    const ok = await onInformar(pausa, m)
    setEnviando(false)
    if (ok) {
      setAberto(false)
      setLivre('')
    }
  }

  if (!aberto) {
    return (
      <Botao variante="link" tamanho="xs" onClick={() => setAberto(true)} style={{ height: 26, padding: '0 4px', alignSelf: 'flex-start' }}>
        <PenLine size={14} />
        Informar o motivo
      </Botao>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, borderRadius: 10, background: 'var(--input)', border: '1px solid var(--borda)' }}>
      <div style={{ fontSize: 12.5, color: 'var(--t2)' }}>O que aconteceu com este item?</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {MOTIVOS_PAUSA.map((m) => {
          const Icone = iconeDoMotivo(m)
          return (
            <button
              key={m}
              type="button"
              disabled={enviando}
              onClick={() => salvar(m)}
              className="ds-opcao"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 34, padding: '0 10px', borderRadius: 8, border: '1px solid var(--borda)', color: 'var(--t1)', fontSize: 13, cursor: 'pointer' }}
            >
              <span style={{ display: 'flex', color: 'var(--warn)' }}>
                <Icone size={14} />
              </span>
              {m}
            </button>
          )
        })}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          salvar(livre)
        }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
      >
        <input
          value={livre}
          onChange={(e) => setLivre(e.target.value)}
          maxLength={120}
          placeholder="Ou escreva o que rolou"
          aria-label="Motivo da pausa"
          className="ds-input"
          style={{ flex: '1 1 100%', minWidth: 0, height: 38 }}
        />
        <Botao variante="primario" tamanho="sm" type="submit" disabled={enviando || !livre.trim()}>
          <Check size={15} />
          Salvar
        </Botao>
        <Botao variante="secundario" tamanho="sm" type="button" onClick={() => setAberto(false)} disabled={enviando}>
          Cancelar
        </Botao>
      </form>
    </div>
  )
}

