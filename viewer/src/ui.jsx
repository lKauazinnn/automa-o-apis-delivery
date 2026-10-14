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
export const PALETAS = {
  claro: {
    bg: '#F4F5F7',
    bg2: '#EBEDF0',
    cardBg: '#FFFFFF',
    card2: '#F7F8FA',
    inputBg: '#F1F3F5',
    hover: 'rgba(17,20,27,0.04)',
    cardBorder: '#DFE2E7',
    rowBorder: '#ECEEF1',
    text1: '#12151B',
    text2: '#4B5361',
    text3: '#626A79',
    headerBg: '#FFFFFF',
    good: '#1A7F4B',
    goodBg: 'rgba(26,127,75,0.09)',
    goodBd: 'rgba(26,127,75,0.26)',
    neutral: '#A35406',
    neutralBg: 'rgba(163,84,6,0.09)',
    neutralBd: 'rgba(163,84,6,0.26)',
    bad: '#C8322B',
    badBg: 'rgba(200,50,43,0.08)',
    badBd: 'rgba(200,50,43,0.24)',
    info: '#0B7285',
    infoBg: 'rgba(11,114,133,0.09)',
    overlay: 'rgba(12,14,19,0.45)',
    modalBg: '#FFFFFF',
    modalBorder: '#DFE2E7',
    sh: '0 1px 2px rgba(17,20,27,0.05), 0 16px 40px -22px rgba(17,20,27,0.30)',
    shSm: '0 1px 2px rgba(17,20,27,0.07)',
  },
  escuro: {
    bg: '#0D0F13',
    bg2: '#090B0E',
    cardBg: '#15181E',
    card2: '#1B1F26',
    inputBg: '#111419',
    hover: 'rgba(255,255,255,0.045)',
    cardBorder: '#272C35',
    rowBorder: '#1E2229',
    text1: '#F1F3F6',
    text2: '#A7AFBC',
    text3: '#858E9C',
    headerBg: '#15181E',
    good: '#3DC981',
    goodBg: 'rgba(61,201,129,0.13)',
    goodBd: 'rgba(61,201,129,0.30)',
    neutral: '#F0A23B',
    neutralBg: 'rgba(240,162,59,0.13)',
    neutralBd: 'rgba(240,162,59,0.32)',
    bad: '#F26A5F',
    badBg: 'rgba(242,106,95,0.12)',
    badBd: 'rgba(242,106,95,0.30)',
    info: '#3BB6D4',
    infoBg: 'rgba(59,182,212,0.12)',
    overlay: 'rgba(4,5,8,0.62)',
    modalBg: '#15181E',
    modalBorder: '#323844',
    sh: '0 1px 0 rgba(255,255,255,0.02), 0 18px 48px -16px rgba(0,0,0,0.65)',
    shSm: '0 1px 2px rgba(0,0,0,0.4)',
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

export function Modal({ titulo, eyebrow, onClose, children, largura = 'max-w-md' }) {
  const C = useContext(CoresContext)

  // Esc fecha. Antes só o clique no overlay ou no X fechavam — quem navega por teclado ficava
  // preso dentro do modal.
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onClose])

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
