import { useContext } from 'react'
import { ClipboardList, Clock, Columns3, History, KeyRound, LayoutDashboard, LayoutGrid, Layers, LogOut, PowerOff, Store, Tags, Users } from 'lucide-react'
import { CoresContext } from './ui'

const VIEWS = [
  { chave: 'dashboard', label: 'Painel', Icon: LayoutDashboard },
  { chave: 'pedidos', label: 'Pedidos', Icon: ClipboardList },
  { chave: 'kds', label: 'Cozinha (KDS)', Icon: Columns3 },
  { chave: 'catalogo', label: 'Cardápio', Icon: LayoutGrid },
  { chave: 'auditoria', label: 'Histórico', Icon: History },
]

function ItemNav({ Icon, label, ativo, badge, onClick, C }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] w-full text-left botao-icone-fantasma"
      style={{
        fontWeight: ativo ? 600 : 500,
        border: `1px solid ${ativo ? C.cardBorder : 'transparent'}`,
        background: ativo ? C.inputBg : 'transparent',
        color: ativo ? C.text1 : C.text2,
      }}
    >
      <Icon size={16} />
      <span className="flex-1">{label}</span>
      {!!badge && (
        <span
          className="text-[10px] font-bold rounded-full px-2 py-0.5"
          style={{ background: C.neutralBg, color: C.neutral }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export function Sidebar({
  view,
  onMudarView,
  totalPausados,
  userNome,
  userIniciais,
  userPapel,
  podeGerenciarUsuarios,
  podeGerenciarCatalogoAvancado,
  onAbrirUsuarios,
  onAbrirLojas,
  onAbrirCategorias,
  onAbrirGruposOpcao,
  onAbrirHorario,
  onAbrirInterrupcoes,
  onMinhaSenha,
  onSair,
}) {
  const C = useContext(CoresContext)
  return (
    <aside
      className="w-[230px] flex-shrink-0 flex flex-col gap-1 p-3.5 sticky top-0 h-screen"
      style={{ borderRight: `1px solid ${C.cardBorder}`, background: C.cardBg }}
    >
      <div className="flex items-center gap-2.5 px-1 pb-4">
        <img src="/brand/logo-cajupar-icon.png" alt="Cajupar" className="w-9 h-9 rounded-xl object-contain flex-shrink-0" />
        <div className="leading-tight min-w-0">
          <div className="text-[15px] font-extrabold truncate" style={{ color: C.text1 }}>
            Cajupar
          </div>
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] mt-0.5" style={{ color: '#F56C35' }}>
            Catálogo iFood
          </div>
        </div>
      </div>

      <div className="text-[9.5px] font-bold uppercase tracking-wider px-2.5 pb-1" style={{ color: C.text3 }}>
        Operação
      </div>

      {VIEWS.map((v) => (
        <ItemNav
          key={v.chave}
          Icon={v.Icon}
          label={v.label}
          ativo={view === v.chave}
          badge={v.chave === 'catalogo' ? totalPausados : 0}
          onClick={() => onMudarView(v.chave)}
          C={C}
        />
      ))}

      {podeGerenciarCatalogoAvancado && (
        <>
          <div className="text-[9.5px] font-bold uppercase tracking-wider px-2.5 pt-3 pb-1" style={{ color: C.text3 }}>
            Cardápio avançado
          </div>
          <ItemNav Icon={Tags} label="Categorias" ativo={false} onClick={onAbrirCategorias} C={C} />
          <ItemNav Icon={Layers} label="Complementos" ativo={false} onClick={onAbrirGruposOpcao} C={C} />
          <ItemNav Icon={Clock} label="Horário de funcionamento" ativo={false} onClick={onAbrirHorario} C={C} />
          <ItemNav Icon={PowerOff} label="Interrupções" ativo={false} onClick={onAbrirInterrupcoes} C={C} />
        </>
      )}

      <div className="text-[9.5px] font-bold uppercase tracking-wider px-2.5 pt-3 pb-1" style={{ color: C.text3 }}>
        Conta
      </div>
      {podeGerenciarUsuarios && <ItemNav Icon={Users} label="Usuários" ativo={false} onClick={onAbrirUsuarios} C={C} />}
      <ItemNav Icon={Store} label="Lojas" ativo={false} onClick={onAbrirLojas} C={C} />

      <div className="mt-auto" />

      <div className="flex items-center gap-2.5 pt-3 border-t" style={{ borderColor: C.rowBorder }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#F56C35,#FBB34A)' }}
        >
          {userIniciais}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-xs font-semibold truncate" style={{ color: C.text1 }}>
            {userNome}
          </div>
          <div className="text-[9.5px] uppercase tracking-wider truncate" style={{ color: C.text3 }}>
            {userPapel}
          </div>
        </div>
        <button
          type="button"
          onClick={onMinhaSenha}
          title="Trocar minha senha"
          className="botao-icone-fantasma w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0"
          style={{ color: C.text3 }}
        >
          <KeyRound size={14} />
        </button>
        <button
          type="button"
          onClick={onSair}
          title="Sair"
          className="botao-icone-fantasma w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0"
          style={{ color: C.text3 }}
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  )
}
