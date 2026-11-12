import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, ImageOff, LayoutGrid, List, Lock, MoreHorizontal, Pause, Pencil, Play, RefreshCw, Search, Tag, Trash2, Zap } from 'lucide-react'
import { Botao, CampoBusca, EstadoVazio, Esqueleto, Interruptor, Marcador, MONO, Segmentado, Selo, seguirLuz, useLarguraConteudo } from '../ds'
import { bateBusca, normalizar, tempoDesde, tempoRestante, termosBusca } from '../pausas'
import { MiniaturaItem } from './DashboardView'

// Mesma grade no cabeçalho e nas linhas. Larguras mínimas somam ~900px: cabe a partir de ~1180px
// de janela com o menu aberto; abaixo disso o celular usa a lista em cartões.
const GRADE = '52px minmax(220px,2.6fr) minmax(110px,1fr) 116px 116px minmax(200px,1.3fr) 56px'

const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Destaca no nome os trechos que bateram na busca (começo de palavra, sem acento). Compara letra
// a letra numa versão sem acento do MESMO tamanho do original, então o realce cai no lugar certo.
function semAcento(t) {
  return Array.from(String(t || '').toLowerCase())
    .map((c) => c.normalize('NFD').charAt(0))
    .join('')
}
function Realce({ texto, busca }) {
  const termos = semAcento(busca).split(/[^a-z0-9]+/).filter(Boolean)
  if (!termos.length || !texto) return texto
  const base = semAcento(texto)
  const marca = new Array(texto.length).fill(false)
  for (const t of termos) {
    for (let i = 0; i <= base.length - t.length; i++) {
      const inicio = i === 0 || !/[a-z0-9]/.test(base[i - 1])
      if (inicio && base.startsWith(t, i)) for (let j = i; j < i + t.length; j++) marca[j] = true
    }
  }
  const partes = []
  for (let i = 0; i < texto.length; i++) {
    const ult = partes[partes.length - 1]
    if (ult && ult.m === marca[i]) ult.t += texto[i]
    else partes.push({ t: texto[i], m: marca[i] })
  }
  return partes.map((p, k) =>
    p.m ? (
      <mark key={k} style={{ background: 'var(--marca-suave)', color: 'var(--t1)', borderRadius: 4, boxShadow: '0 0 0 1px var(--marca-borda)', padding: '0 1px' }}>
        {p.t}
      </mark>
    ) : (
      <span key={k}>{p.t}</span>
    ),
  )
}

// Interruptor "no ar" do item. Desligar abre o modal de pausa (prazo + motivo) via
// onAlternarStatus; religar reativa direto. Item sem ID no 99Food não pode ser pausado pela API:
// mostra um cadeado no lugar.
function ControleNoAr({ item, alterandoStatus, executando, onAlternarStatus }) {
  if (item.semIdIntegracao) {
    return (
      <span
        title="Cadastre o ID do item no portal do parceiro 99 para pausar por aqui"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 9px', borderRadius: 99, border: '1px dashed var(--warn-bd)', color: 'var(--warn)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        <Lock size={12} />
        Sem ID
      </span>
    )
  }
  const pausado = item.status !== 'AVAILABLE'
  return (
    <Interruptor
      grande
      ligado={!pausado}
      ocupado={alterandoStatus === item.itemId}
      disabled={executando}
      rotulo={pausado ? `Reativar ${item.nome}` : `Pausar ${item.nome}`}
      onChange={() => onAlternarStatus(item)}
    />
  )
}

// Cartão da vista em grade: foto grande, preço em vidro sobre a foto, interruptor embaixo.
function CartaoItem({ item, idx, busca, sel, idRepetido, pausa, alterandoStatus, executando, onAlternarStatus, onAlternarSelecao, onAbrirEdicaoModal }) {
  const pausado = item.status !== 'AVAILABLE'
  const enviando = alterandoStatus === item.itemId
  return (
    <article
      className="ds-cartao ergue cartao-item"
      onMouseMove={seguirLuz}
      style={{
        animationDelay: `${Math.min(idx, 16) * 35}ms`,
        background: 'var(--card)',
        border: `1px solid ${sel ? 'var(--marca)' : 'var(--borda)'}`,
        borderRadius: 18,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: sel ? '0 0 0 1px var(--marca), var(--sh)' : 'var(--brilho), var(--sh)',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: 'var(--input)', overflow: 'hidden' }}>
        {item.foto ? (
          <img src={item.foto} alt="" loading="lazy" className="cartao-item__foto" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: pausado ? 'grayscale(1) brightness(.6)' : undefined }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>
            <ImageOff size={28} />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,.6), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
          {idRepetido && <span className="selo-foto selo-foto--ruim">ID {item.codigo_pdv} repetido</span>}
        </div>
        <button
          type="button"
          role="checkbox"
          aria-checked={sel}
          aria-label={`Selecionar ${item.nome}`}
          onClick={() => onAlternarSelecao(item.itemId)}
          style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(255,255,255,.25)', background: 'rgba(10,12,16,.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <Marcador estado={sel} tamanho={18} />
        </button>
        {pausado && (
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span className="selo-foto" style={{ height: 32, padding: '0 14px', fontSize: 13 }}>
              <Pause size={13} /> Pausado
            </span>
          </span>
        )}
        <span style={{ position: 'absolute', left: 12, bottom: 12, height: 30, padding: '0 11px', display: 'flex', alignItems: 'center', borderRadius: 10, background: 'rgba(10,12,16,.55)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', fontFamily: MONO, fontSize: 14, fontWeight: 600, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          {brl(item.preco)}
        </span>
      </div>
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <button
          type="button"
          onClick={() => onAbrirEdicaoModal(item)}
          title={`Editar ${item.nome}`}
          style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35, color: pausado ? 'var(--t2)' : 'var(--t1)' }}>
            <Realce texto={item.nome} busca={busca} />
          </span>
          <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>
            {item.categoria}
            {item.codigo_pdv && !item.semIdIntegracao ? ` · PDV ${item.codigo_pdv}` : ''}
          </span>
        </button>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTop: '1px solid var(--linha)' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: enviando ? 'var(--t2)' : pausado ? 'var(--warn)' : 'var(--good)' }}>{enviando ? 'Enviando…' : pausado ? 'Pausado' : 'No ar'}</span>
            {pausado && !enviando && <SubStatus pausa={pausa} />}
          </span>
          <ControleNoAr item={item} alterandoStatus={alterandoStatus} executando={executando} onAlternarStatus={onAlternarStatus} />
        </div>
      </div>
    </article>
  )
}

// Anel de saúde: % do cardápio no ar.
function AnelSaude({ noAr, total }) {
  const C = 2 * Math.PI * 30
  const pct = total ? noAr / total : 0
  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72" role="img" aria-label={`${noAr} de ${total} itens no ar`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r="30" fill="none" strokeWidth="7" style={{ stroke: 'var(--linha)' }} />
        <circle cx="36" cy="36" r="30" fill="none" strokeWidth="7" strokeLinecap="round" style={{ stroke: 'var(--good)', transition: 'stroke-dasharray 1.1s cubic-bezier(.2,.8,.2,1)' }} strokeDasharray={`${(C * pct).toFixed(1)} ${C.toFixed(1)}`} />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>
        {Math.round(pct * 100)}%
      </span>
    </div>
  )
}

function lerVista() {
  try {
    return localStorage.getItem('cardapio-vista') === 'grade' ? 'grade' : 'lista'
  } catch {
    return 'lista'
  }
}

function CelulaEditavel({ tipo, texto, editando, valor, salvando, salvo, onAbrir, onInput, onSalvar, onCancelar }) {
  const direita = tipo === 'preco'
  if (editando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: direita ? 'flex-end' : 'flex-start', gap: 3 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            height: 34,
            padding: '0 8px',
            marginLeft: direita ? 0 : -8,
            borderRadius: 7,
            border: '1.5px solid var(--marca-tinta)',
            boxShadow: '0 0 0 3px var(--marca-anel)',
            background: 'var(--card)',
          }}
        >
          {tipo === 'preco' && <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--t3)' }}>R$</span>}
          <input
            autoFocus
            value={valor}
            inputMode={tipo === 'preco' ? 'decimal' : undefined}
            onChange={(e) => onInput(e.target.value)}
            onBlur={onSalvar}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSalvar()
              } else if (e.key === 'Escape') {
                e.stopPropagation()
                onCancelar()
              }
            }}
            aria-label={tipo === 'preco' ? 'Preço' : 'Código PDV'}
            style={{
              width: tipo === 'preco' ? 66 : 96,
              border: 0,
              outline: 0,
              boxShadow: 'none',
              background: 'transparent',
              fontFamily: MONO,
              fontSize: 14,
              color: 'var(--t1)',
              textAlign: direita ? 'right' : 'left',
            }}
          />
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--t3)', marginLeft: direita ? 0 : -8 }}>Enter salva · Esc cancela</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: direita ? 'flex-end' : 'flex-start' }}>
      <button
        type="button"
        onClick={onAbrir}
        title="Clique para editar"
        className="ds-celula-editavel"
        style={{
          fontFamily: MONO,
          fontSize: tipo === 'preco' ? 14 : 13.5,
          fontWeight: tipo === 'preco' ? 500 : 400,
          color: tipo === 'preco' ? 'var(--t1)' : 'var(--t2)',
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 7,
          padding: '6px 8px',
          marginLeft: direita ? 0 : -8,
          cursor: 'text',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {texto || '—'}
      </button>
      {(salvando || salvo) && (
        <div style={{ fontSize: 12, color: salvo ? 'var(--good)' : 'var(--t3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: direita ? '0 8px 0 0' : 0 }}>
          {salvo && <Check size={14} />}
          {salvando ? 'Salvando…' : 'Salvo'}
        </div>
      )}
    </div>
  )
}

function SubStatus({ pausa }) {
  if (!pausa) return <span style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap' }}>pelo portal ou sem motivo</span>
  const r = pausa.volta_em ? tempoRestante(pausa.volta_em) : null
  const prazo = r ? (r.startsWith('em ') ? `volta ${r}` : r) : 'até reativar'
  return (
    <span title={[pausa.motivo, pausa.pausado_por, tempoDesde(pausa.pausado_em)].filter(Boolean).join(' · ')} style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
      {[prazo, pausa.motivo].filter(Boolean).join(' · ')}
    </span>
  )
}

function MenuLinha({ item, podeExcluir, onEditarPreco, onEditarPdv, onEditar, onExcluir, onFechar }) {
  const ref = useRef(null)
  useEffect(() => {
    function fora(e) {
      if (ref.current && !ref.current.contains(e.target)) onFechar()
    }
    function tecla(e) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [onFechar])
  const opcao = (Icon, texto, acao, perigo = false) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onFechar()
        acao()
      }}
      className={perigo ? 'ds-opcao-perigo' : 'ds-opcao'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 38,
        padding: '0 10px',
        borderRadius: 7,
        border: 0,
        background: 'transparent',
        color: perigo ? 'var(--bad)' : 'var(--t1)',
        fontSize: 13.5,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ color: perigo ? 'var(--bad)' : 'var(--t2)', display: 'flex' }}>
        <Icon size={16} />
      </span>
      {texto}
    </button>
  )
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Ações de ${item.nome}`}
      style={{
        position: 'absolute',
        top: 44,
        right: 12,
        zIndex: 10,
        width: 220,
        background: 'var(--card)',
        border: '1px solid var(--borda)',
        borderRadius: 12,
        boxShadow: 'var(--sh)',
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {opcao(Pencil, 'Editar preço', onEditarPreco)}
      {opcao(Tag, 'Editar código PDV', onEditarPdv)}
      {opcao(Pencil, 'Editar item completo', onEditar)}
      {podeExcluir && (
        <>
          <div style={{ height: 1, background: 'var(--linha)', margin: '4px 0' }} />
          {opcao(Trash2, 'Excluir item…', onExcluir, true)}
        </>
      )}
    </div>
  )
}

export function CatalogoView({
  itens,
  categoriasFiltro,
  busca,
  onBusca,
  filtroCategoria,
  onFiltroCategoria,
  filtroStatus,
  onFiltroStatus,
  filtrados,
  idsVisiveis,
  todosVisiveisSelecionados,
  selecionados,
  onAlternarSelecao,
  onAlternarSelecaoTodos,
  onLimparSelecao,
  carregando,
  erroCarregamento,
  onRecarregar,
  alterandoStatus,
  onAlternarStatus,
  onAbrirEdicaoModal,
  onExcluirItem,
  podeCriarItem,
  edicaoInline,
  onAbrirEdicaoInline,
  onEdicaoInlineInput,
  onSalvarEdicaoInline,
  onCancelarEdicaoInline,
  linhaSalvando,
  linhaSalva,
  onPausarSelecionados,
  onReativarSelecionados,
  onAbrirInsumo,
  executando,
  pausasPorItem = {},
  plataforma,
}) {
  const [menuAberto, setMenuAberto] = useState(null)
  const [vista, setVistaEstado] = useState(lerVista)
  const setVista = (v) => {
    setVistaEstado(v)
    try {
      localStorage.setItem('cardapio-vista', v)
    } catch {
      // sem storage: só não lembra a escolha no próximo acesso
    }
  }
  const temFiltro = busca.trim() !== '' || filtroCategoria !== 'TODAS' || filtroStatus !== 'TODOS'

  // Contagens do segmentado respeitam busca + categoria (o que a pessoa veria ao clicar).
  const termos = termosBusca(busca)
  const base = itens.filter((i) => (filtroCategoria === 'TODAS' || i.categoria === filtroCategoria) && bateBusca(i, termos))
  const nDisp = base.filter((i) => i.status === 'AVAILABLE').length
  const nSemIdBase = base.filter((i) => i.semIdIntegracao).length
  // Saúde do cardápio inteiro (sem filtro) e problemas de integração do 99Food.
  const totalNoAr = itens.filter((i) => i.status === 'AVAILABLE').length
  const semId = itens.filter((i) => i.semIdIntegracao).length
  const contagemPdv = {}
  itens.forEach((i) => {
    if (i.codigo_pdv && !i.semIdIntegracao) contagemPdv[i.codigo_pdv] = (contagemPdv[i.codigo_pdv] || 0) + 1
  })
  const idsRepetidos = plataforma === '99food' ? Object.keys(contagemPdv).filter((k) => contagemPdv[k] > 1) : []
  const contagemCategoria = {}
  base.forEach((i) => {
    contagemCategoria[i.categoria] = (contagemCategoria[i.categoria] || 0) + 1
  })

  const selecionadosItens = itens.filter((i) => selecionados.has(i.itemId))
  const selDisp = selecionadosItens.filter((i) => i.status === 'AVAILABLE').length
  const selPaus = selecionadosItens.length - selDisp
  const algunsSelecionados = idsVisiveis.some((id) => selecionados.has(id))

  function limparTudo() {
    onBusca('')
    onFiltroCategoria('TODAS')
    onFiltroStatus('TODOS')
  }

  const cabecalho = (
    <div
      role="row"
      style={{
        display: 'grid',
        gridTemplateColumns: GRADE,
        alignItems: 'center',
        height: 40,
        background: 'var(--card2)',
        borderBottom: '1px solid var(--linha)',
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: 'var(--t3)',
        position: 'sticky',
        top: -24,
        zIndex: 3,
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={todosVisiveisSelecionados ? true : algunsSelecionados ? 'mixed' : false}
        aria-label="Selecionar todos os itens visíveis"
        onClick={() => onAlternarSelecaoTodos(idsVisiveis)}
        style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 0, background: 'transparent' }}
      >
        <Marcador estado={todosVisiveisSelecionados ? true : algunsSelecionados ? 'parcial' : false} />
      </button>
      <div>Item</div>
      <div>Categoria</div>
      <div>Código PDV</div>
      <div style={{ textAlign: 'right', paddingRight: 8 }}>Preço</div>
      <div style={{ paddingLeft: 16 }}>No ar</div>
      <div />
    </div>
  )

  const opcoesStatus = [
    { valor: 'TODOS', rotulo: 'Todos', contagem: base.length },
    { valor: 'AVAILABLE', rotulo: 'No ar', contagem: nDisp },
    { valor: 'UNAVAILABLE', rotulo: 'Pausados', contagem: base.length - nDisp },
  ]
  if (semId > 0) opcoesStatus.push({ valor: 'SEM_ID', rotulo: 'Sem ID', contagem: nSemIdBase })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
      {!carregando && !erroCarregamento && itens.length > 0 && (
        <section
          className="ds-cartao"
          onMouseMove={seguirLuz}
          style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 18, boxShadow: 'var(--brilho), var(--sh)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}
        >
          <AnelSaude noAr={totalNoAr} total={itens.length} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 260px', minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--t1)' }}>
              {totalNoAr} de {itens.length} itens no ar
            </span>
            <span style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13.5, color: 'var(--t2)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--warn)' }} />
                <strong style={{ fontFamily: MONO, color: 'var(--t1)' }}>{itens.length - totalNoAr}</strong> pausados
              </span>
              {semId > 0 && (
                <button type="button" onClick={() => onFiltroStatus('SEM_ID')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', fontSize: 13.5, color: 'var(--t2)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--bad)' }} />
                  <strong style={{ fontFamily: MONO, color: 'var(--t1)' }}>{semId}</strong>
                  <span style={{ textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: 'var(--borda)' }}>sem ID no 99Food</span>
                </button>
              )}
              {idsRepetidos.length > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 99, background: 'var(--bad)' }} />
                  ID repetido: <strong style={{ fontFamily: MONO, color: 'var(--t1)' }}>{idsRepetidos.join(', ')}</strong>
                </span>
              )}
            </span>
            {(semId > 0 || idsRepetidos.length > 0) && (
              <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>O 99Food só deixa pausar pela API itens com ID único. Cadastre os IDs no portal do parceiro 99.</span>
            )}
          </div>
          <Botao variante="secundario" onClick={onAbrirInsumo} title="Acabou um ingrediente? Pausa todos os pratos e complementos que usam ele">
            <span style={{ color: 'var(--warn)', display: 'flex' }}>
              <Zap size={16} />
            </span>
            Pausar por insumo
          </Botao>
        </section>
      )}

      <section style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 18, boxShadow: 'var(--brilho), var(--sh)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--linha)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <CampoBusca
              valor={busca}
              onChange={onBusca}
              onLimpar={() => onBusca('')}
              placeholder="Buscar por nome, PDV ou ingrediente: bacon, classico, 533…"
              icone={<Search size={16} />}
              aria-label="Buscar item"
              style={{ flex: '1 1 260px', maxWidth: 440, height: 44 }}
            />
            <Segmentado rotulo="Filtrar por status" valor={filtroStatus} onChange={onFiltroStatus} altura={34} opcoes={opcoesStatus} />
            <span style={{ flex: 1 }} />
            <Segmentado
              rotulo="Modo de exibição"
              valor={vista}
              onChange={setVista}
              altura={34}
              opcoes={[
                { valor: 'lista', rotulo: <span style={{ display: 'flex' }} aria-label="Lista"><List size={16} /></span> },
                { valor: 'grade', rotulo: <span style={{ display: 'flex' }} aria-label="Grade com fotos"><LayoutGrid size={16} /></span> },
              ]}
            />
          </div>
          <div role="group" aria-label="Categorias" className="sem-barra" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {categoriasFiltro.map((c) => {
              const ativo = filtroCategoria === c
              const n = c === 'TODAS' ? base.length : contagemCategoria[c] || 0
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => onFiltroCategoria(c)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    height: 34,
                    padding: '0 13px',
                    borderRadius: 99,
                    border: `1px solid ${ativo ? 'var(--marca-borda)' : 'var(--borda)'}`,
                    background: ativo ? 'var(--marca-suave)' : 'var(--input)',
                    color: ativo ? 'var(--t1)' : 'var(--t2)',
                    fontSize: 13,
                    fontWeight: ativo ? 600 : 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {c === 'TODAS' ? 'Todas' : c}
                  <span style={{ fontFamily: MONO, fontSize: 11.5, color: ativo ? 'var(--marca-tinta)' : 'var(--t3)' }}>{n}</span>
                </button>
              )
            })}
          </div>
        </div>

        {erroCarregamento ? (
          <EstadoVazio
            icone={<AlertTriangle size={22} />}
            tipo="bad"
            titulo="Não deu pra carregar o cardápio"
            texto={erroCarregamento}
            acao={
              <Botao variante="primario" tamanho="lg" onClick={onRecarregar}>
                <RefreshCw size={16} /> Tentar de novo
              </Botao>
            }
          />
        ) : (
          <div role="table" aria-label="Itens do cardápio" aria-rowcount={filtrados.length}>
            {vista === 'lista' && cabecalho}

            {carregando &&
              Array.from({ length: 8 }).map((_, k) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: GRADE, alignItems: 'center', minHeight: 64, borderBottom: '1px solid var(--linha)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Esqueleto w={20} h={20} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Esqueleto w={40} h={40} r={7} />
                    <Esqueleto w={`${40 + ((k * 13) % 30)}%`} h={13} />
                  </div>
                  <Esqueleto w="60%" h={12} />
                  <Esqueleto w={70} h={12} />
                  <Esqueleto w={64} h={12} style={{ marginLeft: 'auto', marginRight: 8 }} />
                  <Esqueleto w={96} h={24} r={99} style={{ marginLeft: 16 }} />
                  <Esqueleto w={100} h={36} r={9} style={{ marginLeft: 'auto', marginRight: 12 }} />
                </div>
              ))}

            {!carregando && filtrados.length === 0 && (
              <EstadoVazio
                icone={<Search size={22} />}
                titulo={temFiltro ? 'Nenhum item encontrado' : 'Nenhum item no cardápio ainda'}
                texto={
                  temFiltro
                    ? busca.trim()
                      ? `Nada bate com “${busca.trim()}” nesse filtro.`
                      : `Existem ${itens.length} itens no cardápio — tire um filtro pra ver.`
                    : 'Assim que a loja tiver itens na plataforma, eles aparecem aqui.'
                }
                acao={
                  temFiltro && (
                    <Botao variante="secundario" tamanho="sm" onClick={limparTudo}>
                      Limpar filtros
                    </Botao>
                  )
                }
              />
            )}

            {!carregando && vista === 'grade' && filtrados.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, padding: 20 }}>
                {filtrados.map((item, idx) => (
                  <CartaoItem
                    key={item.itemId}
                    item={item}
                    idx={idx}
                    busca={busca}
                    sel={selecionados.has(item.itemId)}
                    idRepetido={idsRepetidos.includes(item.codigo_pdv) && !item.semIdIntegracao}
                    pausa={pausasPorItem[item.itemId]}
                    alterandoStatus={alterandoStatus}
                    executando={executando}
                    onAlternarStatus={onAlternarStatus}
                    onAlternarSelecao={onAlternarSelecao}
                    onAbrirEdicaoModal={onAbrirEdicaoModal}
                  />
                ))}
              </div>
            )}

            {!carregando &&
              vista === 'lista' &&
              filtrados.map((item, idx) => {
                const sel = selecionados.has(item.itemId)
                const pausado = item.status !== 'AVAILABLE'
                const ePreco = edicaoInline?.itemId === item.itemId && edicaoInline.campo === 'preco'
                const ePdv = edicaoInline?.itemId === item.itemId && edicaoInline.campo === 'pdv'
                const salvandoPreco = linhaSalvando === `${item.itemId}:preco`
                const salvandoPdv = linhaSalvando === `${item.itemId}:pdv`
                const salvoPreco = linhaSalva === `${item.itemId}:preco`
                const salvoPdv = linhaSalva === `${item.itemId}:pdv`
                const descricao = item.descricao && normalizar(item.descricao) !== normalizar(item.nome) ? item.descricao : ''
                return (
                  <div
                    key={item.itemId}
                    role="row"
                    className={`linha-entra${sel ? '' : ' ds-linha'}`}
                    style={{
                      animationDelay: `${Math.min(idx, 16) * 28}ms`,
                      display: 'grid',
                      gridTemplateColumns: GRADE,
                      alignItems: 'center',
                      minHeight: 64,
                      borderBottom: '1px solid var(--linha)',
                      background: sel ? 'var(--marca-suave)' : undefined,
                      boxShadow: sel ? 'inset 3px 0 0 var(--marca)' : undefined,
                    }}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={sel}
                      aria-label={`Selecionar ${item.nome}`}
                      onClick={() => onAlternarSelecao(item.itemId)}
                      style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 0, background: 'transparent' }}
                    >
                      <Marcador estado={sel} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, paddingRight: 12 }}>
                      {item.foto ? (
                        <MiniaturaItem item={item} apagada={pausado} />
                      ) : (
                        <div title="Item sem foto" style={{ width: 40, height: 40, borderRadius: 7, border: '1.5px dashed var(--borda)', background: 'var(--card2)', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ImageOff size={16} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => onAbrirEdicaoModal(item)}
                          title={`Editar ${item.nome}`}
                          style={{ display: 'block', maxWidth: '100%', fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: pausado ? 'var(--t2)' : 'var(--t1)', cursor: 'pointer', border: 0, background: 'transparent', padding: 0, textAlign: 'left' }}
                        >
                          <Realce texto={item.nome} busca={busca} />
                        </button>
                        {!item.semIdIntegracao && idsRepetidos.includes(item.codigo_pdv) && (
                          <div style={{ display: 'flex', gap: 6, margin: '3px 0 2px' }}>
                            <Selo tipo="bad" altura={20} style={{ fontSize: 11.5, padding: '0 7px' }}>
                              ID {item.codigo_pdv} repetido
                            </Selo>
                          </div>
                        )}
                        {descricao ? (
                          <div style={{ fontSize: 12.5, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{descricao}</div>
                        ) : (
                          !item.foto && (
                            <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>
                              Sem foto —{' '}
                              <button type="button" onClick={() => onAbrirEdicaoModal(item)} style={{ color: 'var(--marca-tinta)', fontWeight: 600, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', fontSize: 12.5 }}>
                                adicionar
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div title={item.categoria} style={{ fontSize: 13.5, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
                      {item.categoria}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <CelulaEditavel
                        tipo="pdv"
                        texto={item.codigo_pdv}
                        editando={ePdv}
                        valor={ePdv ? edicaoInline.valor : ''}
                        salvando={salvandoPdv}
                        salvo={salvoPdv}
                        onAbrir={() => onAbrirEdicaoInline(item, 'pdv')}
                        onInput={onEdicaoInlineInput}
                        onSalvar={onSalvarEdicaoInline}
                        onCancelar={onCancelarEdicaoInline}
                      />
                    </div>

                    <div style={{ paddingRight: 8 }}>
                      <CelulaEditavel
                        tipo="preco"
                        texto={brl(item.preco)}
                        editando={ePreco}
                        valor={ePreco ? edicaoInline.valor : ''}
                        salvando={salvandoPreco}
                        salvo={salvoPreco}
                        onAbrir={() => onAbrirEdicaoInline(item, 'preco')}
                        onInput={onEdicaoInlineInput}
                        onSalvar={onSalvarEdicaoInline}
                        onCancelar={onCancelarEdicaoInline}
                      />
                    </div>

                    <div style={{ paddingLeft: 16, paddingRight: 8, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <ControleNoAr item={item} alterandoStatus={alterandoStatus} executando={executando} onAlternarStatus={onAlternarStatus} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: alterandoStatus === item.itemId ? 'var(--t2)' : pausado ? 'var(--warn)' : 'var(--good)', whiteSpace: 'nowrap' }}>
                          {alterandoStatus === item.itemId ? 'Enviando…' : pausado ? 'Pausado' : 'No ar'}
                        </span>
                        {pausado && alterandoStatus !== item.itemId && <SubStatus pausa={pausasPorItem[item.itemId]} />}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingRight: 10, position: 'relative' }}>
                      <button
                        type="button"
                        aria-label={`Mais ações de ${item.nome}`}
                        aria-haspopup="menu"
                        aria-expanded={menuAberto === item.itemId}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => setMenuAberto(menuAberto === item.itemId ? null : item.itemId)}
                        className="ds-icone"
                        style={{ background: menuAberto === item.itemId ? 'var(--input)' : undefined }}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {menuAberto === item.itemId && (
                        <MenuLinha
                          item={item}
                          podeExcluir={podeCriarItem}
                          onFechar={() => setMenuAberto(null)}
                          onEditarPreco={() => onAbrirEdicaoInline(item, 'preco')}
                          onEditarPdv={() => onAbrirEdicaoInline(item, 'pdv')}
                          onEditar={() => onAbrirEdicaoModal(item)}
                          onExcluir={() => onExcluirItem(item)}
                        />
                      )}
                    </div>
                  </div>
                )
              })}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', fontSize: 13, color: 'var(--t3)', flexWrap: 'wrap', gap: 8 }}>
              <span>
                Mostrando {filtrados.length} de {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                Cardápio do {plataforma === '99food' ? '99Food' : 'iFood'} · preço e PDV salvam direto na plataforma
                <Botao variante="secundario" tamanho="xs" onClick={onRecarregar} disabled={carregando}>
                  <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
                  Recarregar
                </Botao>
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Barra de seleção: grudada no rodapé da área rolável, centralizada no conteúdo. */}
      <div style={{ position: 'sticky', bottom: 20, display: 'flex', justifyContent: 'center', pointerEvents: 'none', height: 0, zIndex: 5 }}>
        {selecionados.size > 0 && (
          <div
            className="toast-entrada barra-flutuante"
            style={{
              pointerEvents: 'auto',
              transform: 'translateY(-100%)',
              // O contêiner tem altura 0 (pra não ocupar espaço na rolagem); sem isto o flex
              // esticava a barra pra 0 + padding (18px) e o conteúdo vazava por cima dos itens.
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 8px 8px 16px',
              borderRadius: 16,
            }}
          >
            <span style={{ minWidth: 24, height: 24, padding: '0 6px', borderRadius: 99, background: 'var(--marca)', color: 'var(--marca-texto)', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selecionados.size}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--t1)' }}>
              {selecionados.size === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
            <Botao variante="fantasma" tamanho="sm" onClick={onLimparSelecao}>
              Limpar
            </Botao>
            <div style={{ width: 1, height: 24, background: 'var(--borda)' }} />
            {selDisp > 0 && (
              <Botao variante="pausar-suave" disabled={executando} onClick={onPausarSelecionados} style={{ height: 38 }}>
                <span style={{ color: 'var(--warn)', display: 'flex' }}>
                  <Pause size={16} />
                </span>
                {selDisp === selecionados.size ? 'Pausar' : `Pausar ${selDisp}`}
              </Botao>
            )}
            {selPaus > 0 && (
              <Botao variante="reativar" disabled={executando} onClick={onReativarSelecionados} style={{ height: 38 }}>
                <Play size={16} />
                {selPaus === selecionados.size ? 'Reativar' : `Reativar ${selPaus}`}
              </Botao>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Celular: lista de cartões com Pausar/Reativar de 44px no polegar ─────────────────────────
const LOTE_CELULAR = 50

export function CatalogoCelular({
  itens,
  filtrados,
  busca,
  onBusca,
  filtroStatus,
  onFiltroStatus,
  filtroCategoria,
  onFiltroCategoria,
  categoriasFiltro,
  selecionados,
  onAlternarSelecao,
  onLimparSelecao,
  carregando,
  erroCarregamento,
  onRecarregar,
  alterandoStatus,
  onAlternarStatus,
  onAbrirEdicaoModal,
  onPausarSelecionados,
  onReativarSelecionados,
  executando,
  pausasPorItem = {},
  // quanto a lista "come" do padding do <main> para encostar nas bordas (celular) — no tablet, 0
  recuo = { topo: 12, lado: 16 },
}) {
  const [modoSelecao, setModoSelecao] = useState(false)
  const [limite, setLimite] = useState(LOTE_CELULAR)
  const largura = useLarguraConteudo()
  const { topo, lado } = recuo
  const termos = termosBusca(busca)
  const base = itens.filter((i) => (filtroCategoria === 'TODAS' || i.categoria === filtroCategoria) && bateBusca(i, termos))
  const nPaus = base.filter((i) => i.status !== 'AVAILABLE').length
  const visiveis = filtrados.slice(0, limite)
  const emGrade = largura >= 640 && !erroCarregamento && (carregando || visiveis.length > 0)
  const selItens = itens.filter((i) => selecionados.has(i.itemId))
  const selDisp = selItens.filter((i) => i.status === 'AVAILABLE').length
  const selPaus = selItens.length - selDisp

  useEffect(() => {
    setLimite(LOTE_CELULAR)
  }, [busca, filtroStatus, filtroCategoria])

  const chip = (ativo) => ({
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    height: 38,
    padding: '0 14px',
    borderRadius: 99,
    border: `1px solid ${ativo ? 'var(--t1)' : 'var(--borda)'}`,
    background: ativo ? 'var(--t1)' : 'var(--card)',
    color: ativo ? 'var(--card)' : 'var(--t1)',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: `${-topo}px ${-lado}px 0` }}>
      <div style={{ position: 'sticky', top: -topo, zIndex: 5, background: 'var(--bg)', padding: `${topo || 8}px ${lado}px 8px`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <CampoBusca valor={busca} onChange={onBusca} onLimpar={() => onBusca('')} placeholder="Buscar item ou PDV" icone={<Search size={20} />} aria-label="Buscar item" style={{ flex: 1, height: 50, borderRadius: 12, background: 'var(--card)' }} />
          <Botao
            variante="secundario"
            onClick={() => {
              if (modoSelecao) onLimparSelecao()
              setModoSelecao(!modoSelecao)
            }}
            style={{ height: 50, background: modoSelecao ? 'var(--input)' : 'var(--card)' }}
          >
            {modoSelecao ? 'Cancelar' : 'Selecionar'}
          </Botao>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: `0 ${-lado}px`, padding: `0 ${lado}px 2px`, scrollbarWidth: 'none' }}>
          {[
            ['TODOS', 'Todos', base.length],
            ['UNAVAILABLE', 'Pausados', nPaus],
            ['AVAILABLE', 'Disponíveis', base.length - nPaus],
          ].map(([v, l, n]) => (
            <button key={v} type="button" aria-pressed={filtroStatus === v} onClick={() => onFiltroStatus(v)} style={chip(filtroStatus === v)}>
              {l}
              <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 500, opacity: 0.8 }}>{n}</span>
            </button>
          ))}
          <select value={filtroCategoria} onChange={(e) => onFiltroCategoria(e.target.value)} aria-label="Filtrar por categoria" style={{ ...chip(filtroCategoria !== 'TODAS'), appearance: 'auto', maxWidth: 220 }}>
            {categoriasFiltro.map((c) => (
              <option key={c} value={c}>
                {c === 'TODAS' ? 'Todas as categorias' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={emGrade ? { padding: `0 ${lado}px 16px`, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10, alignItems: 'start' } : { padding: `0 ${lado}px 16px`, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {erroCarregamento ? (
          <EstadoVazio
            icone={<AlertTriangle size={22} />}
            tipo="bad"
            titulo="Não deu pra carregar o cardápio"
            texto={erroCarregamento}
            acao={
              <Botao variante="primario" tamanho="lg" onClick={onRecarregar}>
                <RefreshCw size={16} /> Tentar de novo
              </Botao>
            }
          />
        ) : carregando ? (
          Array.from({ length: 6 }).map((_, k) => <Esqueleto key={k} h={72} r={12} />)
        ) : visiveis.length === 0 ? (
          <EstadoVazio titulo="Nada encontrado" texto="Tente pelo código PDV ou outra palavra." />
        ) : (
          visiveis.map((i) => {
            const pausado = i.status !== 'AVAILABLE'
            const sel = selecionados.has(i.itemId)
            const pausa = pausasPorItem[i.itemId]
            const r = pausa?.volta_em ? tempoRestante(pausa.volta_em) : null
            const sub = pausado ? [pausa?.motivo, r ? (r.startsWith('em ') ? `volta ${r}` : r) : pausa ? 'até reativar' : 'pelo portal'].filter(Boolean).join(' · ') : null
            return (
              <div key={i.itemId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, background: sel ? 'var(--marca-suave)' : 'var(--card)', border: `1px solid ${sel ? 'var(--marca-tinta)' : pausado ? 'var(--warn-bd)' : 'var(--borda)'}` }}>
                {modoSelecao && (
                  <button type="button" role="checkbox" aria-checked={sel} aria-label={`Selecionar ${i.nome}`} onClick={() => onAlternarSelecao(i.itemId)} style={{ width: 44, height: 44, margin: '-6px -4px -6px -6px', border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Marcador estado={sel} tamanho={22} />
                  </button>
                )}
                <button type="button" onClick={() => (modoSelecao ? onAlternarSelecao(i.itemId) : onAbrirEdicaoModal(i))} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', color: 'var(--t1)' }}>
                  <MiniaturaItem item={i} tamanho={48} apagada={pausado} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{i.nome}</div>
                    <div style={{ fontSize: 13, color: 'var(--t3)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      <span style={{ fontFamily: MONO, color: 'var(--t2)' }}>{brl(i.preco)}</span>
                      <span>·</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.categoria}</span>
                    </div>
                    {pausado && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--warn)', fontWeight: 600, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Pause size={13} style={{ flexShrink: 0 }} />
                        {sub}
                      </div>
                    )}
                  </div>
                </button>
                {!modoSelecao &&
                  (pausado ? (
                    <Botao variante="reativar" tamanho="lg" disabled={alterandoStatus === i.itemId || executando} onClick={() => onAlternarStatus(i)} style={{ padding: '0 12px', flexShrink: 0 }} aria-label={`Reativar ${i.nome}`}>
                      <Play size={16} /> Reativar
                    </Botao>
                  ) : (
                    <Botao variante="secundario" tamanho="lg" disabled={alterandoStatus === i.itemId || executando} onClick={() => onAlternarStatus(i)} style={{ padding: '0 14px', flexShrink: 0 }} aria-label={`Pausar ${i.nome}`}>
                      <span style={{ color: 'var(--warn)', display: 'flex' }}>
                        <Pause size={16} />
                      </span>
                      Pausar
                    </Botao>
                  ))}
              </div>
            )
          })
        )}
        {!carregando && filtrados.length > limite && (
          <Botao variante="secundario" tamanho="lg" onClick={() => setLimite((l) => l + LOTE_CELULAR)} style={{ gridColumn: '1 / -1' }}>
            Mostrar mais {Math.min(LOTE_CELULAR, filtrados.length - limite)}
          </Botao>
        )}
        {!carregando && filtrados.length > 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 12.5, color: 'var(--t3)', padding: 8 }}>
            Mostrando {Math.min(limite, filtrados.length)} de {filtrados.length}
          </div>
        )}
      </div>

      {selecionados.size > 0 && (
        <div style={{ position: 'sticky', bottom: 12, margin: '0 12px', zIndex: 6, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px 8px 14px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--borda)', boxShadow: 'var(--sh)' }}>
          <span style={{ fontSize: 14, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>{selecionados.size} selecionados</span>
          {selDisp > 0 && (
            <Botao variante="pausar-suave" tamanho="lg" disabled={executando} onClick={onPausarSelecionados}>
              <span style={{ color: 'var(--warn)', display: 'flex' }}>
                <Pause size={16} />
              </span>
              Pausar {selDisp}
            </Botao>
          )}
          {selPaus > 0 && (
            <Botao variante="reativar" tamanho="lg" disabled={executando} onClick={onReativarSelecionados} aria-label={`Reativar ${selPaus}`}>
              <Play size={16} /> {selPaus}
            </Botao>
          )}
        </div>
      )}
    </div>
  )
}
