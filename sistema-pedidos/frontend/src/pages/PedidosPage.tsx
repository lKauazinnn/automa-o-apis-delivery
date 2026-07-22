import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpDown, Columns3, Eye, Filter, RefreshCw, Search, Wifi, WifiOff } from 'lucide-react'
import { listOrders } from '../api'
import { WS_URL } from '../api'
import { useWebSocket } from '../hooks/useWebSocket'
import type { OrderStatus, OrderType, Paginated } from '../types'
import { brl, dataHora } from '../lib/format'
import { StatusBadge } from '../components/StatusBadge'
import { OrderDrawer } from '../components/OrderDrawer'

const STATUSES: OrderStatus[] = [
  'Pendente',
  'Confirmado',
  'Pronto',
  'Saiu para entrega',
  'Retirado',
  'Concluído',
  'Cancelado',
]
const TIPOS: OrderType[] = ['Entrega', 'Retirada', 'Manual', 'Agendado']

const COLUNAS = [
  { key: 'codigo', label: 'Pedido' },
  { key: 'loja', label: 'Loja' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'pagamento', label: 'Pagamento' },
  { key: 'documento', label: 'Documento' },
  { key: 'status', label: 'Status' },
  { key: 'recebido', label: 'Recebido' },
] as const

type ColKey = (typeof COLUNAS)[number]['key']

export function PedidosPage() {
  const [q, setQ] = useState('')
  const [statusSel, setStatusSel] = useState<string[]>([])
  const [tipoSel, setTipoSel] = useState<string[]>([])
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('desc')

  const [data, setData] = useState<Paginated | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [colunasAbertas, setColunasAbertas] = useState(false)
  const [colsVisiveis, setColsVisiveis] = useState<Record<ColKey, boolean>>(
    Object.fromEntries(COLUNAS.map((c) => [c.key, true])) as Record<ColKey, boolean>,
  )
  const [selecionado, setSelecionado] = useState<number | null>(null)

  const { conectado } = useWebSocket(WS_URL, () => setTick((t) => t + 1))

  // debounce da busca
  const [qDebounced, setQDebounced] = useState('')
  const primeiro = useRef(true)
  useEffect(() => {
    const id = setTimeout(() => setQDebounced(q), 300)
    return () => clearTimeout(id)
  }, [q])

  const recarregar = useCallback(() => {
    setCarregando(true)
    setErro(null)
    listOrders({
      q: qDebounced || undefined,
      status: statusSel.length ? statusSel : undefined,
      tipo: tipoSel.length ? tipoSel : undefined,
      recebido_de: de || undefined,
      recebido_ate: ate || undefined,
      page,
      per_page: perPage,
      order_by: 'recebido_em',
      order_dir: orderDir,
    })
      .then(setData)
      .catch((e) => setErro(String(e.message ?? e)))
      .finally(() => setCarregando(false))
  }, [qDebounced, statusSel, tipoSel, de, ate, page, perPage, orderDir])

  useEffect(() => {
    recarregar()
  }, [recarregar, tick])

  // volta pra página 1 quando um filtro muda
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false
      return
    }
    setPage(1)
  }, [qDebounced, statusSel, tipoSel, de, ate, perPage])

  const registros = data?.registros ?? []
  const total = data?.total ?? 0
  const totalPaginas = Math.max(1, Math.ceil(total / perPage))
  const inicio = total === 0 ? 0 : (page - 1) * perPage + 1
  const fim = Math.min(page * perPage, total)

  const filtrosAtivos = statusSel.length + tipoSel.length + (de ? 1 : 0) + (ate ? 1 : 0)

  function toggle(lista: string[], set: (v: string[]) => void, valor: string) {
    set(lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor])
  }

  const visiveis = useMemo(() => COLUNAS.filter((c) => colsVisiveis[c.key]), [colsVisiveis])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Pedidos</h1>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            Atualização automática em tempo real via WebSocket. Use "Atualizar" para forçar.
            {conectado ? (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <Wifi size={12} /> ao vivo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-zinc-500">
                <WifiOff size={12} /> reconectando
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setTick((t) => t + 1)}
          className="flex items-center gap-2 rounded-lg bg-gold px-3.5 py-2 text-xs font-semibold text-ink-950 hover:bg-gold-600"
        >
          <RefreshCw size={14} className={carregando ? 'girando' : ''} />
          Atualizar do iFood
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código ou documento..."
            className="w-full rounded-lg border border-line bg-ink-850 py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-gold/50 focus:outline-none"
          />
        </div>
        <BotaoToolbar Icon={Columns3} label="Colunas" onClick={() => setColunasAbertas((v) => !v)} />
        <BotaoToolbar Icon={Filter} label="Filtros" badge={filtrosAtivos} onClick={() => setFiltrosAbertos((v) => !v)} />
      </div>

      {colunasAbertas && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-line bg-ink-850 p-4">
          {COLUNAS.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={colsVisiveis[c.key]}
                onChange={() => setColsVisiveis((s) => ({ ...s, [c.key]: !s[c.key] }))}
                className="accent-gold"
              />
              <Eye size={13} className="text-zinc-500" />
              {c.label}
            </label>
          ))}
        </div>
      )}

      {filtrosAbertos && (
        <div className="grid gap-4 rounded-xl border border-line bg-ink-850 p-4 sm:grid-cols-2">
          <GrupoCheck titulo="Status" opcoes={STATUSES} sel={statusSel} onToggle={(v) => toggle(statusSel, setStatusSel, v)} />
          <GrupoCheck titulo="Tipo" opcoes={TIPOS} sel={tipoSel} onToggle={(v) => toggle(tipoSel, setTipoSel, v)} />
          <div>
            <div className="mb-1.5 text-xs font-semibold text-zinc-400">Recebido de</div>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-sm text-zinc-200" />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-zinc-400">Recebido até</div>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-sm text-zinc-200" />
          </div>
          {filtrosAtivos > 0 && (
            <button
              onClick={() => {
                setStatusSel([])
                setTipoSel([])
                setDe('')
                setAte('')
              }}
              className="justify-self-start text-xs font-semibold text-gold"
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ink-850 text-[11px] uppercase tracking-wider text-zinc-500">
                {visiveis.map((c) => (
                  <th key={c.key} className="px-4 py-3 font-semibold">
                    {c.key === 'recebido' ? (
                      <button
                        onClick={() => setOrderDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
                        className="flex items-center gap-1 hover:text-zinc-300"
                      >
                        {c.label}
                        <ArrowUpDown size={12} />
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((o) => (
                <tr key={o.id} className="border-b border-line/60 last:border-0 hover:bg-white/[0.02]">
                  {colsVisiveis.codigo && <td className="px-4 py-3 font-mono font-semibold text-zinc-100">{o.codigo}</td>}
                  {colsVisiveis.loja && <td className="px-4 py-3 text-zinc-300">{o.loja_nome ?? '—'}</td>}
                  {colsVisiveis.tipo && <td className="px-4 py-3 text-zinc-300">{o.tipo}</td>}
                  {colsVisiveis.pagamento && <td className="px-4 py-3 text-zinc-400">{o.pagamento_forma ?? '—'}</td>}
                  {colsVisiveis.documento && <td className="px-4 py-3 font-mono text-zinc-400">{o.documento ?? '—'}</td>}
                  {colsVisiveis.status && (
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                  )}
                  {colsVisiveis.recebido && <td className="px-4 py-3 text-zinc-400">{dataHora(o.recebido_em)}</td>}
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelecionado(o.id)}
                      className="rounded-lg border border-line px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-white/5"
                    >
                      Detalhes
                    </button>
                  </td>
                </tr>
              ))}
              {registros.length === 0 && !carregando && (
                <tr>
                  <td colSpan={visiveis.length + 1} className="px-4 py-10 text-center text-sm text-zinc-500">
                    {erro ? `Erro: ${erro}` : 'Nenhum pedido encontrado.'}
                  </td>
                </tr>
              )}
              {carregando && registros.length === 0 && (
                <tr>
                  <td colSpan={visiveis.length + 1} className="px-4 py-10 text-center text-sm text-zinc-500">
                    Carregando…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Registros por página</span>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="rounded-lg border border-line bg-ink-850 px-2 py-1 text-zinc-200"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span>
            Mostrando {inicio} até {fim} de {total} registros
          </span>
          <div className="flex gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-line px-2.5 py-1 text-zinc-300 disabled:opacity-40 hover:enabled:bg-white/5"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPaginas}
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
              className="rounded-lg border border-line px-2.5 py-1 text-zinc-300 disabled:opacity-40 hover:enabled:bg-white/5"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <OrderDrawer orderId={selecionado} onClose={() => setSelecionado(null)} />
    </div>
  )
}

function BotaoToolbar({
  Icon,
  label,
  badge,
  onClick,
}: {
  Icon: typeof Filter
  label: string
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-line bg-ink-850 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5"
    >
      <Icon size={14} />
      {label}
      {!!badge && <span className="rounded-full bg-gold/20 px-1.5 text-[10px] font-bold text-gold">{badge}</span>}
    </button>
  )
}

function GrupoCheck({
  titulo,
  opcoes,
  sel,
  onToggle,
}: {
  titulo: string
  opcoes: readonly string[]
  sel: string[]
  onToggle: (v: string) => void
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold text-zinc-400">{titulo}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {opcoes.map((op) => (
          <label key={op} className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" checked={sel.includes(op)} onChange={() => onToggle(op)} className="accent-gold" />
            {op}
          </label>
        ))}
      </div>
    </div>
  )
}
