import { createContext, useContext } from 'react'
import { X } from 'lucide-react'

// Paleta ativa (dark/claro), injetada pelo `Painel` em App.jsx. Compartilhado por App.jsx
// e pelos componentes de view/Sidebar pra não precisar repassar `C` por toda a árvore.
export const CoresContext = createContext(null)

// Tokens do redesign "App Cajupar iFood" (handoff do Claude Design). `neutral` representa
// "pausado" em toda a UI (pills, stat card, gráficos) — nesse redesign isso é âmbar/aviso, não
// cinza neutro, porque um item pausado merece atenção (possível ruptura de estoque).
export const PALETAS = {
  escuro: {
    bg: '#0A0A0D',
    bg2: '#08080B',
    cardBg: '#141419',
    card2: '#1B1B22',
    inputBg: '#101015',
    hover: 'rgba(255,255,255,0.04)',
    cardBorder: '#26262F',
    rowBorder: '#1D1D25',
    text1: '#F5F5F7',
    text2: '#9A9AA6',
    text3: '#5C5C67',
    headerBg: '#141419',
    good: '#34C77B',
    goodBg: 'rgba(52,199,123,0.13)',
    goodBd: 'rgba(52,199,123,0.30)',
    neutral: '#F5A623',
    neutralBg: 'rgba(245,166,35,0.13)',
    neutralBd: 'rgba(245,166,35,0.32)',
    bad: '#F0473F',
    badBg: 'rgba(240,71,63,0.12)',
    badBd: 'rgba(240,71,63,0.30)',
    info: '#5B8CFF',
    infoBg: 'rgba(91,140,255,0.12)',
    brand2: '#FBB34A',
    ring: 'rgba(245,108,53,0.32)',
    overlay: 'rgba(4,4,8,0.6)',
    modalBg: '#141419',
    modalBorder: '#26262F',
    sh: '0 1px 0 rgba(255,255,255,0.02), 0 18px 48px -16px rgba(0,0,0,0.65)',
    shSm: '0 1px 2px rgba(0,0,0,0.4)',
  },
  claro: {
    bg: '#F4F4F6',
    bg2: '#ECECEF',
    cardBg: '#FFFFFF',
    card2: '#F6F6F8',
    inputBg: '#F0F0F3',
    hover: 'rgba(16,16,20,0.035)',
    cardBorder: '#E6E6EA',
    rowBorder: '#EDEDF1',
    text1: '#15151A',
    text2: '#6A6A75',
    text3: '#9A9AA4',
    headerBg: '#FFFFFF',
    good: '#12924C',
    goodBg: 'rgba(18,146,76,0.09)',
    goodBd: 'rgba(18,146,76,0.24)',
    neutral: '#B57200',
    neutralBg: 'rgba(181,114,0,0.09)',
    neutralBd: 'rgba(181,114,0,0.24)',
    bad: '#DB3B33',
    badBg: 'rgba(219,59,51,0.08)',
    badBd: 'rgba(219,59,51,0.22)',
    info: '#2F6BE0',
    infoBg: 'rgba(47,107,224,0.09)',
    brand2: '#FBB34A',
    ring: 'rgba(245,108,53,0.32)',
    overlay: 'rgba(4,4,8,0.6)',
    modalBg: '#FFFFFF',
    modalBorder: '#E6E6EA',
    sh: '0 1px 2px rgba(16,16,20,0.05), 0 16px 40px -22px rgba(16,16,20,0.28)',
    shSm: '0 1px 2px rgba(16,16,20,0.06)',
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
  criar_categoria: 'criou a categoria',
  editar_categoria: 'editou a categoria',
  excluir_categoria: 'excluiu a categoria',
  excluir_item: 'excluiu o item',
  definir_turnos_item: 'definiu os turnos de',
  definir_horario_funcionamento: 'atualizou o horário de funcionamento',
  criar_interrupcao: 'criou uma interrupção',
  excluir_interrupcao: 'removeu uma interrupção',
  criar_grupo_opcao: 'criou o grupo de opção',
  excluir_grupo_opcao: 'excluiu o grupo de opção',
  criar_opcao: 'criou a opção',
  excluir_opcao: 'excluiu a opção',
  convidar_usuario: 'criou o usuário',
  resetar_senha_usuario: 'definiu a senha de',
  alterar_papel_usuario: 'trocou o papel de',
  criar_loja: 'cadastrou a loja',
  remover_loja: 'removeu a loja',
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

export const CORES_AVATAR = [
  'linear-gradient(135deg,#F56C35,#FBB34A)',
  'linear-gradient(135deg,#6366F1,#8B5CF6)',
  'linear-gradient(135deg,#0EA5E9,#22D3EE)',
  'linear-gradient(135deg,#EC4899,#F472B6)',
]

export function Avatar({ nome, idx = 0, size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: CORES_AVATAR[idx % CORES_AVATAR.length] }}
    >
      {iniciaisDe(nome)}
    </div>
  )
}

export function StatCard({ icon: Icon, value, label, color }) {
  const C = useContext(CoresContext)
  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: color + '18', border: `1px solid ${color}30` }}
      >
        <Icon size={17} color={color} />
      </div>
      <div>
        <p className="text-3xl font-black leading-none" style={{ color: C.text1, letterSpacing: '-0.04em' }}>
          {value}
        </p>
        <p className="text-xs mt-1.5" style={{ color: C.text3 }}>
          {label}
        </p>
      </div>
    </div>
  )
}

export function Pill({ children, color, dot = false }) {
  return (
    <span
      className={
        dot
          ? 'text-[11px] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5'
          : 'text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider inline-flex items-center gap-1'
      }
      style={{ color, background: color + '15', border: `1px solid ${color}30` }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
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
      title={titulo}
      disabled={disabled}
      onClick={onChange}
      className="relative inline-flex flex-shrink-0 rounded-full transition-colors disabled:opacity-40"
      style={{ width: 38, height: 21, background: ligado ? C.good : C.text3 }}
    >
      <span
        className="absolute rounded-full bg-white transition-all"
        style={{ width: 15, height: 15, top: 3, left: ligado ? 20 : 3, boxShadow: '0 1px 2px rgba(0,0,0,0.35)' }}
      />
    </button>
  )
}

export function Modal({ titulo, eyebrow, onClose, children, largura = 'max-w-md' }) {
  const C = useContext(CoresContext)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: C.overlay, backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className={`w-full ${largura} rounded-2xl p-5 max-h-[80vh] overflow-y-auto`}
        style={{
          background: C.modalBg,
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: `1px solid ${C.modalBorder}`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#F56C35' }}>
                {eyebrow}
              </p>
            )}
            <h3 className="text-sm font-bold" style={{ color: C.text1 }}>
              {titulo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ color: C.text2, background: C.inputBg }}
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
