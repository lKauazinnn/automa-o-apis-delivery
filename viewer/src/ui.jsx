import { createContext, useContext, useEffect } from 'react'
import { X } from 'lucide-react'

// Paleta ativa (dark/claro), injetada pelo `Painel` em App.jsx. Compartilhado por App.jsx
// e pelos componentes de view/Sidebar pra não precisar repassar `C` por toda a árvore.
export const CoresContext = createContext(null)

// Tokens do design system PausaFast (ver DESIGN_SYSTEM.md). A cor de DESTAQUE não mora aqui: é da
// empresa cliente (white-label) e entra em `C` como `marca`, `marcaTinta`, `marcaTexto`... via
// tokensDaMarca() em marca.js. `neutral` representa "pausado" em toda a UI (pills, stat card,
// gráficos) — é âmbar, não cinza, porque item pausado merece atenção (possível ruptura).
//
// Neutros frios (puxados pro azul-acinzentado) e cores de status com 4,5:1 ou mais sobre card,
// fundo e campo nos dois temas — conferido com contraste() de marca.js.
// Superfícies (cardBg, modalBg, headerBg) apontam pro token CSS translúcido — assim ganham o
// desfoque de vidro de index.css igual aos componentes de ds.jsx.
export const PALETAS = {
  claro: {
    bg: '#ECEFF5',
    bg2: '#E3E7EE',
    cardBg: 'var(--card)',
    card2: 'rgba(255,255,255,0.5)',
    inputBg: 'rgba(255,255,255,0.62)',
    hover: 'rgba(15,23,42,0.05)',
    cardBorder: 'rgba(15,23,42,0.1)',
    rowBorder: 'rgba(15,23,42,0.07)',
    text1: '#0B0F17',
    text2: '#384152',
    text3: '#566072',
    headerBg: 'var(--card)',
    good: '#0A7A4A',
    goodBg: 'rgba(10,122,74,0.1)',
    goodBd: 'rgba(10,122,74,0.28)',
    neutral: '#9A5600',
    neutralBg: 'rgba(217,119,6,0.12)',
    neutralBd: 'rgba(154,86,0,0.3)',
    bad: '#BF311E',
    badBg: 'rgba(191,49,30,0.09)',
    badBd: 'rgba(191,49,30,0.28)',
    info: '#0B7285',
    infoBg: 'rgba(11,114,133,0.1)',
    overlay: 'rgba(15,23,42,0.32)',
    modalBg: 'var(--card)',
    modalBorder: 'rgba(15,23,42,0.12)',
    sh: '0 2px 6px rgba(15,23,42,0.05), 0 24px 50px -28px rgba(15,23,42,0.4)',
    shSm: '0 1px 2px rgba(15,23,42,0.07)',
  },
  escuro: {
    bg: '#06080C',
    bg2: '#040508',
    cardBg: 'var(--card)',
    card2: 'rgba(255,255,255,0.035)',
    inputBg: 'rgba(255,255,255,0.055)',
    hover: 'rgba(255,255,255,0.05)',
    cardBorder: 'rgba(255,255,255,0.09)',
    rowBorder: 'rgba(255,255,255,0.065)',
    text1: '#F2F4F8',
    text2: '#B9C0CC',
    text3: '#8B94A4',
    headerBg: 'var(--card)',
    good: '#4ADE9B',
    goodBg: 'rgba(74,222,155,0.12)',
    goodBd: 'rgba(74,222,155,0.3)',
    neutral: '#FBBF4D',
    neutralBg: 'rgba(251,191,77,0.12)',
    neutralBd: 'rgba(251,191,77,0.32)',
    bad: '#FF7B6B',
    badBg: 'rgba(255,123,107,0.12)',
    badBd: 'rgba(255,123,107,0.32)',
    info: '#5CCBE6',
    infoBg: 'rgba(92,203,230,0.12)',
    overlay: 'rgba(3,4,7,0.62)',
    modalBg: 'var(--card)',
    modalBorder: 'rgba(255,255,255,0.12)',
    sh: '0 2px 6px rgba(0,0,0,0.35), 0 24px 60px -24px rgba(0,0,0,0.75)',
    shSm: '0 1px 2px rgba(0,0,0,0.5)',
  },
}

export const ACAO_LABEL = {
  criar_item: 'criou o item',
  criar_combo: 'criou o combo',
  pausar: 'pausou',
  despausar: 'despausou',
  alterar_preco: 'alterou o preço de',
  alterar_codigo_pdv: 'alterou o código PDV de',
  pausar_em_massa: 'pausou (em massa)',
  despausar_em_massa: 'despausou (em massa)',
  pausar_em_massa_erro: 'falhou ao pausar (em massa)',
  despausar_em_massa_erro: 'falhou ao despausar (em massa)',
  pausar_opcao: 'pausou o complemento',
  despausar_opcao: 'despausou o complemento',
  reativar_automatico: 'reativou (fim do prazo da pausa)',
  reativar_opcao_automatico: 'reativou o complemento (fim do prazo da pausa)',
  pausar_portal: 'pausou fora do painel',
  despausar_portal: 'reativou fora do painel',
  informar_motivo_pausa: 'informou o motivo da pausa de',
  criar_categoria: 'criou a categoria',
  editar_categoria: 'editou a categoria',
  excluir_categoria: 'excluiu a categoria',
  excluir_item: 'excluiu o item',
  definir_turnos_item: 'definiu os turnos de',
  definir_horario_funcionamento: 'atualizou o horário de funcionamento',
  criar_interrupcao: 'criou uma interrupção',
  excluir_interrupcao: 'removeu uma interrupção',
  criar_grupo_opcao: 'criou o grupo de complementos',
  excluir_grupo_opcao: 'excluiu o grupo de complementos',
  criar_opcao: 'criou o complemento',
  excluir_opcao: 'excluiu o complemento',
  convidar_usuario: 'criou o usuário',
  resetar_senha_usuario: 'definiu a senha de',
  alterar_papel_usuario: 'trocou o papel de',
  criar_loja: 'cadastrou a loja',
  remover_loja: 'removeu a loja',
  definir_marca: 'atualizou a marca',
  editar_item: 'editou o item',
  editar_opcao: 'editou o complemento',
  alterar_status_pedido: 'mudou o status do pedido',
  aceitar_negociacao: 'aceitou a negociação do pedido',
  recusar_negociacao: 'recusou a negociação do pedido',
  pedido_teste: 'criou um pedido de teste',
}

const STATUS_PEDIDO_TEXTO = {
  NOVO: 'Novo',
  CONFIRMADO: 'Confirmado',
  DESPACHADO: 'Despachado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

// Frase de uma linha de auditoria: { verbo, alvo, detalhe }. Sem rótulo conhecido, humaniza o
// código ("alguma_acao" → "alguma acao") em vez de mostrar o identificador cru.
export function descreverAuditoria(a) {
  if (a.acao === 'alterar_status_pedido') {
    const m = /novo status:\s*([A-Z_]+)(.*)$/.exec(a.detalhe || '')
    const status = m ? STATUS_PEDIDO_TEXTO[m[1]] || m[1].toLowerCase() : null
    return {
      verbo: status ? 'marcou um pedido como' : ACAO_LABEL.alterar_status_pedido,
      alvo: status,
      detalhe: m && m[2].trim() ? m[2].trim().replace(/^[·\-\s]+/, '') : null,
    }
  }
  const verbo = ACAO_LABEL[a.acao] || String(a.acao || '').replaceAll('_', ' ')
  return { verbo, alvo: a.nome || a.detalhe || null, detalhe: a.nome && a.detalhe ? a.detalhe : null }
}

const FORMATOS_FOTO_ACEITOS = new Set(['image/jpeg', 'image/jpg', 'image/png'])
const TAMANHO_MAX_FOTO = 5 * 1024 * 1024 // 5MB — limite do próprio endpoint de upload do iFood

export function lerImagemComoDataUrl(file) {
  if (!FORMATOS_FOTO_ACEITOS.has(file.type)) {
    return Promise.reject(new Error('Formato de imagem não aceito. Use JPG ou PNG.'))
  }
  if (file.size > TAMANHO_MAX_FOTO) {
    return Promise.reject(new Error('Imagem maior que 5MB — o iFood não aceita.'))
  }
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result)
    leitor.onerror = () => reject(new Error('Não consegui ler o arquivo de imagem.'))
    leitor.readAsDataURL(file)
  })
}

export function formatarTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

export function iniciaisDe(nome) {
  return (nome || '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// Cores de avatar lisas e claras o bastante pra carregar iniciais ESCURAS (#0F1115): todas passam
// de 6:1. Não usam a cor da marca — ela é do cliente e pode ser escura demais pra isso.
export const CORES_AVATAR = ['#8FA9EA', '#E9A97C', '#6CC3B1', '#D19BDF']

export function Avatar({ nome, idx = 0, size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: CORES_AVATAR[idx % CORES_AVATAR.length],
        color: '#0F1115',
        fontSize: Math.max(11, Math.round(size * 0.38)),
      }}
    >
      {iniciaisDe(nome)}
    </div>
  )
}

// Placeholder de carregamento. Substitui o spinner central em lista/tabela: com refresh
// automático a cada 10–15s, o spinner fazia a tela inteira piscar a cada ciclo.
export function Esqueleto({ w = '100%', h = 12, className = '', style }) {
  return <div className={`esqueleto ${className}`} style={{ width: w, height: h, ...style }} />
}

export function StatCard({ icon: Icon, value, label, color, destaque = false }) {
  const C = useContext(CoresContext)
  return (
    <div
      className="rounded-2xl border p-5 flex items-center gap-4"
      style={{ background: C.cardBg, borderColor: destaque ? color + '55' : C.cardBorder }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: color + '20', border: `1px solid ${color}4D` }}
      >
        <Icon size={21} color={color} />
      </div>
      <div className="min-w-0">
        <p
          className="font-bold leading-none"
          style={{ color: destaque ? color : C.text1, fontSize: 32, letterSpacing: '-0.035em' }}
        >
          {value}
        </p>
        <p className="mt-1.5" style={{ color: C.text2, fontSize: 13 }}>
          {label}
        </p>
      </div>
    </div>
  )
}

// `marcador` troca o ponto por um ícone (ex: relógio de pausa com prazo), mantendo o formato de pílula.
export function Pill({ children, color, dot = false, marcador = null }) {
  if (marcador) dot = true
  return (
    <span
      className={
        dot
          ? 'font-semibold px-2.5 rounded-full inline-flex items-center gap-1.5 whitespace-nowrap'
          : 'font-bold px-2.5 rounded-lg uppercase tracking-wider inline-flex items-center gap-1.5 whitespace-nowrap'
      }
      style={{
        color,
        background: color + '1F',
        border: `1px solid ${color}4D`,
        fontSize: dot ? 12.5 : 11.5,
        height: dot ? 27 : 24,
      }}
    >
      {marcador || (dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />)}
      {children}
    </span>
  )
}

export function Toggle({ ligado, onChange, disabled = false, titulo }) {
  const C = useContext(CoresContext)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={titulo}
      title={titulo}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex flex-shrink-0 rounded-full transition-colors disabled:opacity-40"
      style={{ width: 44, height: 25, background: ligado ? C.good : C.text3 }}
    >
      <span
        className="absolute rounded-full bg-white transition-all"
        style={{ width: 19, height: 19, top: 3, left: ligado ? 22 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.45)' }}
      />
    </button>
  )
}

// Dentro de um provider com `true`, o Modal vira um cartão na própria página (sem fundo escuro,
// sem Esc, sem travar rolagem). É como as telas de gestão (categorias, complementos, horário,
// interrupções) viram abas do Cardápio sem duplicar a lógica delas.
export const ModalEmbutidoContext = createContext(false)

export function Modal({ titulo, eyebrow, onClose, children, largura = 'max-w-md' }) {
  const C = useContext(CoresContext)
  const embutido = useContext(ModalEmbutidoContext)

  // Esc fecha. Antes só o clique no overlay ou no X fechavam — quem navega por teclado ficava
  // preso dentro do modal.
  useEffect(() => {
    if (embutido) return undefined
    function aoTeclar(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onClose, embutido])

  // Trava a rolagem do fundo enquanto o modal está aberto: sem isso, rolar dentro de um modal
  // curto passava o scroll pra tabela atrás e a pessoa perdia o lugar na lista ao fechar.
  useEffect(() => {
    if (embutido) return undefined
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = anterior
    }
  }, [embutido])

  if (embutido) {
    return (
      <section
        aria-label={titulo}
        style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden', maxWidth: 1040 }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--linha)' }}>
          <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: 'var(--t1)' }}>{titulo}</h2>
        </div>
        <div className="p-5">{children}</div>
      </section>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: C.overlay, backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`modal-entrada w-full ${largura} rounded-2xl max-h-[85vh] overflow-y-auto`}
        style={{
          background: C.modalBg,
          border: `1px solid ${C.modalBorder}`,
          boxShadow: '0 28px 70px -20px rgba(0,0,0,0.85)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: C.cardBorder, background: C.modalBg }}
        >
          <div className="min-w-0">
            {eyebrow && (
              <p
                className="font-bold uppercase tracking-widest mb-1"
                style={{ color: C.marcaTinta, fontSize: 11.5 }}
              >
                {eyebrow}
              </p>
            )}
            <h3 className="font-bold" style={{ color: C.text1, fontSize: 16, letterSpacing: '-0.01em' }}>
              {titulo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
          >
            <X size={15} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
