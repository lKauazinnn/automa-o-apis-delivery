import { NavLink } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Box,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  Settings,
  Sparkles,
  Star,
  Store,
  Trash2,
  Zap,
} from 'lucide-react'

interface Item {
  to: string
  label: string
  Icon: typeof Box
  end?: boolean
  badge?: string
}

const SECOES: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Operação',
    itens: [
      { to: '/dashboard', label: 'Painel', Icon: LayoutDashboard },
      { to: '/orders', label: 'Pedidos', Icon: ClipboardList, end: true },
      { to: '/orders/kds', label: 'KDS', Icon: LayoutGrid },
      { to: '/reviews', label: 'Avaliações', Icon: Star },
    ],
  },
  {
    titulo: 'Cardápio',
    itens: [
      { to: '/menu/manage', label: 'Gerenciar Cardápio', Icon: Sparkles, badge: 'BETA' },
      { to: '/menu', label: 'Cardápio (clássico)', Icon: BookOpen, end: true },
      { to: '/trash', label: 'Lixeira', Icon: Trash2 },
      { to: '/problems', label: 'Problemas', Icon: AlertTriangle },
    ],
  },
  {
    titulo: 'Lojas & Integração',
    itens: [
      { to: '/stores', label: 'Lojas', Icon: Store },
      { to: '/events', label: 'Eventos', Icon: Zap },
      { to: '/agent', label: 'Agente', Icon: Bot },
    ],
  },
  { titulo: 'Conta', itens: [{ to: '/configurations', label: 'Configurações', Icon: Settings }] },
]

export function Sidebar() {
  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-line bg-ink-850 p-3">
      <NavLink to="/dashboard" className="mb-4 flex items-center gap-2.5 px-2 py-1.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
          <Box size={18} />
        </span>
        <span className="text-[15px] font-bold text-zinc-100">Delivery Integrator</span>
      </NavLink>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {SECOES.map((secao) => (
          <div key={secao.titulo} className="mb-1">
            <div className="px-2 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {secao.titulo}
            </div>
            {secao.itens.map(({ to, label, Icon, end, badge }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
                    isActive
                      ? 'bg-gold/15 font-semibold text-gold'
                      : 'font-medium text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`
                }
              >
                <Icon size={16} />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-gold">{badge}</span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
