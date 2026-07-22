import type { OrderStatus } from '../types'
import { STATUS_COR } from '../lib/format'

export function StatusBadge({ status }: { status: OrderStatus }) {
  const c = STATUS_COR[status] ?? STATUS_COR.Pendente
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.fg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  )
}
