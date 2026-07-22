import type { ReactNode } from 'react'
import { Bell } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center justify-end gap-4 border-b border-line bg-ink-950/60 px-6">
          <button className="text-zinc-400 hover:text-zinc-200" title="Notificações">
            <Bell size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold to-amber-600 text-sm font-bold text-ink-950">
              R
            </div>
            <div className="leading-tight">
              <div className="text-xs font-semibold text-zinc-100">Restaurante de Teste</div>
              <div className="text-[10px] text-zinc-500">conta-centralizada</div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
