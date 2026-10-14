import { useContext } from 'react'
import {
  Activity,
  ChevronsUpDown,
  ClipboardList,
  Clock,
  Columns3,
  History,
  KeyRound,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  PackageX,
  Palette,
  PowerOff,
  SearchX,
  Store,
  Tags,
  Users,
  Wallet,
} from 'lucide-react'
import { LogoMarca } from './Logo'
import { CoresContext } from './ui'

// Os itens que TROCAM DE VIEW. Tudo abaixo deles na sidebar abre um painel em cima da
// view atual — antes os onze itens eram visualmente idênticos, então não dava pra saber o que
// era navegação e o que era ação sem clicar.
const VIEWS = [
  { chave: 'dashboard', label: 'Painel', Icon: LayoutDashboard },
  { chave: 'pedidos', label: 'Pedidos', Icon: ClipboardList },
  { chave: 'kds', label: 'Cozinha', Icon: Columns3 },
  { chave: 'catalogo', label: 'Cardápio', Icon: LayoutGrid },
  { chave: 'lojas', label: 'Status das lojas', Icon: Activity },
  { chave: 'financeiro', label: 'Financeiro', Icon: Wallet, restrito: true },
  { chave: 'auditoria', label: 'Histórico', Icon: History },
]

function Secao({ children, C }) {
  return (
    <div
      className="font-semibold uppercase px-3 pt-5 pb-2"
      style={{ color: C.text3, fontSize: 11.5, letterSpacing: '0.08em' }}
    >
      {children}
    </div>
  )
}

function ItemNav({ Icon, label, ativo, badge, badgeCor, onClick, painel = false, C }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={ativo ? 'page' : undefined}
      className="flex items-center gap-3 px-3 rounded-xl w-full text-left botao-icone-fantasma"
      style={{
        height: painel ? 38 : 42,
        fontSize: painel ? 13.5 : 14,
        fontWeight: ativo ? 600 : 500,
        border: `1px solid ${ativo ? C.marcaBorda : 'transparent'}`,
        background: ativo ? C.marcaSuave : 'transparent',
        color: ativo ? C.text1 : C.text2,
      }}
    >
      <Icon size={painel ? 17 : 18} className="flex-shrink-0" style={ativo ? { color: C.marcaTinta } : undefined} />
      <span className="flex-1 truncate">{label}</span>
      {!!badge && (
        <span
          className="font-bold rounded-full px-2 inline-flex items-center justify-center flex-shrink-0"
          style={{
            minWidth: 22,
            height: 20,
            fontSize: 11.5,
            background: (badgeCor || C.neutral) + '24',
            color: badgeCor || C.neutral,
            border: `1px solid ${(badgeCor || C.neutral)}4D`,
          }}
        >
          {badge}
        </span>
      )}
      {painel && (
        <span className="flex-shrink-0 leading-none" style={{ color: C.text3, fontSize: 12 }} aria-hidden="true">
          ↗
        </span>
      )}
    </button>
  )
}

export function Sidebar({
  view,
  onMudarView,
  totalPausados,
  totalPedidosAtivos = 0,
  lojaNome,
  lojaPlataforma,
  totalLojas = 0,
  userNome,
  userIniciais,
  userPapel,
  podeGerenciarUsuarios,
  podeGerenciarCatalogoAvancado,
  podeTrocarLoja = true,
  onAbrirUsuarios,
  onAbrirLojas,
  onAbrirMarca,
  onAbrirCategorias,
  onAbrirGruposOpcao,
  onAbrirHorario,
  onAbrirInterrupcoes,
  totalRupturas = 0,
  onAbrirRupturas,
  onAbrirInsumo,
  onMinhaSenha,
  onSair,
}) {
  const C = useContext(CoresContext)
  const plataformaLabel = lojaPlataforma === '99food' ? '99Food' : 'iFood'

  return (
    <aside
      className="w-[248px] flex-shrink-0 flex flex-col p-3 sticky top-0 h-screen overflow-y-auto"
      style={{ borderRight: `1px solid ${C.cardBorder}`, background: C.cardBg }}
    >
      <div className="flex items-center px-1.5 pb-3.5 min-w-0">
        <div className="min-w-0">
          <LogoMarca tamanho={34} corTexto={C.text1} />
          <div
            className="font-semibold uppercase mt-1.5"
            style={{ color: C.text3, fontSize: 11.5, letterSpacing: '0.08em' }}
          >
            Operação delivery
          </div>
        </div>
      </div>

      {/* Seletor de loja: contexto global, não ação de header. Saiu do topo da tela pra cá
          porque tudo que a sidebar lista embaixo é relativo a ESTA loja. */}
      <button
        type="button"
        onClick={podeTrocarLoja ? onAbrirLojas : undefined}
        disabled={!podeTrocarLoja}
        title={podeTrocarLoja ? 'Trocar de loja' : undefined}
        className="flex items-center gap-2.5 w-full px-3 mb-1 rounded-xl text-left disabled:cursor-default"
        style={{
          height: 50,
          background: C.inputBg,
          border: `1px solid ${C.cardBorder}`,
          color: C.text1,
        }}
      >
        <Store size={17} className="flex-shrink-0" style={{ color: podeTrocarLoja ? C.marca : C.text3 }} />
        <span className="flex-1 min-w-0">
          <span className="block font-semibold truncate leading-tight" style={{ fontSize: 13.5 }}>
            {lojaNome || 'Selecionar loja'}
          </span>
          <span className="block truncate leading-tight mt-0.5" style={{ color: C.text3, fontSize: 11.5 }}>
            {lojaNome ? `${plataformaLabel}${totalLojas > 1 ? ` · ${totalLojas} lojas` : ''}` : 'nenhuma cadastrada'}
          </span>
        </span>
        {podeTrocarLoja && <ChevronsUpDown size={15} className="flex-shrink-0" style={{ color: C.text3 }} />}
      </button>

      <Secao C={C}>Operação</Secao>
      <div className="flex flex-col gap-1">
        {VIEWS.filter((v) => !v.restrito || podeGerenciarCatalogoAvancado).map((v) => (
          <ItemNav
            key={v.chave}
            Icon={v.Icon}
            label={v.label}
            ativo={view === v.chave}
            badge={v.chave === 'catalogo' ? totalPausados : v.chave === 'kds' ? totalPedidosAtivos : 0}
            badgeCor={v.chave === 'kds' ? C.info : C.neutral}
            onClick={() => onMudarView(v.chave)}
            C={C}
          />
        ))}
      </div>

      {/* Pausas ficam fora do bloco restrito: pausar é tarefa do operador também. */}
      <Secao C={C}>Pausas</Secao>
      <div className="flex flex-col gap-1">
        <ItemNav painel Icon={PackageX} label="Rupturas" badge={totalRupturas} onClick={onAbrirRupturas} C={C} />
        <ItemNav painel Icon={SearchX} label="Pausar por insumo" onClick={onAbrirInsumo} C={C} />
      </div>

      {podeGerenciarCatalogoAvancado && (
        <>
          <Secao C={C}>Cardápio</Secao>
          <div className="flex flex-col gap-1">
            <ItemNav painel Icon={Tags} label="Categorias" onClick={onAbrirCategorias} C={C} />
            <ItemNav painel Icon={Layers} label="Complementos" onClick={onAbrirGruposOpcao} C={C} />
            <ItemNav painel Icon={Clock} label="Horário" onClick={onAbrirHorario} C={C} />
            <ItemNav painel Icon={PowerOff} label="Interrupções" onClick={onAbrirInterrupcoes} C={C} />
          </div>
        </>
      )}

      {podeGerenciarUsuarios && (
        <>
          <Secao C={C}>Administração</Secao>
          <div className="flex flex-col gap-1">
            <ItemNav painel Icon={Users} label="Usuários" onClick={onAbrirUsuarios} C={C} />
            <ItemNav painel Icon={Store} label="Lojas" onClick={onAbrirLojas} C={C} />
            <ItemNav painel Icon={Palette} label="Marca" onClick={onAbrirMarca} C={C} />
          </div>
        </>
      )}

      {!podeGerenciarCatalogoAvancado && (
        <div
          className="mt-5 rounded-xl p-3.5 leading-relaxed"
          style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}`, color: C.text3, fontSize: 12.5 }}
        >
          Criar item, categorias, complementos e horário são do <b style={{ color: C.text2 }}>gerente</b> pra cima.
          Pausar e ajustar preço continuam com você.
        </div>
      )}

      <div className="mt-auto" />

      <div className="flex items-center gap-2.5 pt-3 mt-3 border-t" style={{ borderColor: C.rowBorder }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0"
          style={{ background: C.marca, color: C.marcaTexto, fontSize: 12.5 }}
        >
          {userIniciais}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-semibold truncate" style={{ color: C.text1, fontSize: 13.5 }}>
            {userNome}
          </div>
          <div className="truncate capitalize" style={{ color: C.text3, fontSize: 11.5 }}>
            {userPapel}
          </div>
        </div>
        <button
          type="button"
          onClick={onMinhaSenha}
          title="Trocar minha senha"
          aria-label="Trocar minha senha"
          className="botao-icone-fantasma w-8 h-8 rounded-lg inline-flex items-center justify-center flex-shrink-0"
          style={{ color: C.text3 }}
        >
          <KeyRound size={15} />
        </button>
        <button
          type="button"
          onClick={onSair}
          title="Sair"
          aria-label="Sair"
          className="botao-icone-fantasma w-8 h-8 rounded-lg inline-flex items-center justify-center flex-shrink-0"
          style={{ color: C.text3 }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
