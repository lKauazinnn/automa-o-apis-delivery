import { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  Check,
  CheckCircle2,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Search,
  Tag,
} from 'lucide-react'

const API = 'http://localhost:5000/api'

const CARD_BG = '#0f0f18'
const CARD_BORDER = '#1e1e2e'
const INPUT_BG = '#1a1a25'
const TEXT_1 = '#f1f5f9'
const TEXT_2 = '#64748b'
const TEXT_3 = '#475569'

const STATUS = {
  good: '#22c55e',
  neutral: '#94a3b8',
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="rounded-2xl border p-5 flex flex-col gap-3" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: color + '18', border: `1px solid ${color}30` }}
      >
        <Icon size={17} color={color} />
      </div>
      <div>
        <p className="text-3xl font-black leading-none" style={{ color: TEXT_1, letterSpacing: '-0.04em' }}>
          {value}
        </p>
        <p className="text-xs mt-1.5" style={{ color: TEXT_3 }}>
          {label}
        </p>
      </div>
    </div>
  )
}

function Pill({ children, color }) {
  return (
    <span
      className="text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider inline-flex items-center gap-1"
      style={{ color, background: color + '15', border: `1px solid ${color}30` }}
    >
      {children}
    </span>
  )
}

function campoPreenchido(valor) {
  return String(valor ?? '').trim().length > 0
}

export default function App() {
  const [itens, setItens] = useState([])
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState('')

  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')

  const [form, setForm] = useState({ nome: '', categoria: '', novaCategoria: '', codigo_pdv: '', preco: '' })
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [sucessoForm, setSucessoForm] = useState('')
  const [alterandoStatus, setAlterandoStatus] = useState(null)

  async function carregar() {
    setCarregando(true)
    setErroCarregamento('')
    try {
      const resp = await fetch(`${API}/catalogo`)
      if (!resp.ok) throw new Error('Falha ao carregar catálogo')
      const data = await resp.json()
      setItens(data.itens)
      setCategorias(data.categorias)
    } catch (e) {
      setErroCarregamento('Não consegui falar com o servidor local. Ele está rodando? (python server/app.py)')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const categoriaFinal = form.categoria === '__NOVA__' ? form.novaCategoria : form.categoria
  const precoNumerico = Number(String(form.preco).replace(',', '.'))

  const requisitos = [
    { chave: 'nome', label: 'Nome do material', ok: campoPreenchido(form.nome) },
    { chave: 'categoria', label: 'Categoria', ok: campoPreenchido(categoriaFinal) },
    { chave: 'codigo_pdv', label: 'Código PDV', ok: campoPreenchido(form.codigo_pdv) },
    { chave: 'preco', label: 'Preço maior que zero', ok: campoPreenchido(form.preco) && precoNumerico > 0 },
  ]
  const formValido = requisitos.every((r) => r.ok)

  async function handleSubmit(e) {
    e.preventDefault()
    setErroForm('')
    setSucessoForm('')
    if (!formValido) {
      setErroForm('Preencha todos os campos antes de criar o item.')
      return
    }
    setSalvando(true)
    try {
      const resp = await fetch(`${API}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          categoria: categoriaFinal.trim(),
          codigo_pdv: form.codigo_pdv.trim(),
          preco: form.preco,
        }),
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.erro || 'Erro ao criar item')
      setSucessoForm(`"${form.nome}" criado no catálogo do iFood.`)
      setForm({ nome: '', categoria: '', novaCategoria: '', codigo_pdv: '', preco: '' })
      carregar()
    } catch (e) {
      setErroForm(e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function alternarStatus(item) {
    const novoStatus = item.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE'
    setAlterandoStatus(item.itemId)
    try {
      const resp = await fetch(`${API}/itens/${item.itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      if (!resp.ok) throw new Error('Falha ao alterar status')
      setItens((prev) => prev.map((i) => (i.itemId === item.itemId ? { ...i, status: novoStatus } : i)))
    } catch (e) {
      alert('Não consegui alterar o status desse item. Tenta de novo.')
    } finally {
      setAlterandoStatus(null)
    }
  }

  const categoriasFiltro = useMemo(() => ['TODAS', ...categorias], [categorias])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return itens.filter((item) => {
      if (filtroCategoria !== 'TODAS' && item.categoria !== filtroCategoria) return false
      if (filtroStatus !== 'TODOS' && item.status !== filtroStatus) return false
      if (termo && !`${item.nome} ${item.codigo_pdv}`.toLowerCase().includes(termo)) return false
      return true
    })
  }, [itens, busca, filtroCategoria, filtroStatus])

  const totalDisponiveis = useMemo(() => itens.filter((i) => i.status === 'AVAILABLE').length, [itens])
  const totalPausados = itens.length - totalDisponiveis

  const inputCls =
    'w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all'
  const inputStyle = { background: INPUT_BG, color: TEXT_1, border: `1px solid ${CARD_BORDER}` }

  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-20"
        style={{ background: 'rgba(10,9,8,0.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${CARD_BORDER}` }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <img src="/brand/logo-cajupar.png" alt="Cajupar" className="h-9 w-auto object-contain" />
          <div className="w-px h-8" style={{ background: CARD_BORDER }} />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-bold" style={{ color: TEXT_1 }}>
              Catálogo iFood
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: '#F56C35' }}>
              Gestão de itens
            </span>
          </div>
        </div>
        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg,#AF2D0A,#F56C35,#FBB34A)' }} />
      </header>

      <main className="max-w-7xl mx-auto px-6 py-7 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Boxes} value={itens.length} label="Itens no catálogo" color="#F56C35" />
          <StatCard icon={Layers} value={categorias.length} label="Categorias" color="#FBB34A" />
          <StatCard icon={CheckCircle2} value={totalDisponiveis} label="Disponíveis" color={STATUS.good} />
          <StatCard icon={Pause} value={totalPausados} label="Pausados" color={STATUS.neutral} />
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-5 items-start">
          <div className="rounded-2xl border p-5" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#F56C35' }}>
              Novo material
            </p>
            <h2 className="text-base font-bold mb-4" style={{ color: TEXT_1 }}>
              Adicionar item ao catálogo
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_2 }}>
                  Nome do material
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Coca-Cola 350ml"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_2 }}>
                  Categoria
                </label>
                <select
                  className={inputCls}
                  style={inputStyle}
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  <option value="__NOVA__">+ Criar nova categoria</option>
                  {categorias.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {form.categoria === '__NOVA__' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_2 }}>
                    Nome da nova categoria
                  </label>
                  <input
                    className={inputCls}
                    style={inputStyle}
                    type="text"
                    value={form.novaCategoria}
                    onChange={(e) => setForm({ ...form, novaCategoria: e.target.value })}
                    placeholder="Ex: Sobremesas"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 min-w-0">
                <div className="min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_2 }}>
                    Código PDV
                  </label>
                  <input
                    className={inputCls}
                    style={inputStyle}
                    type="text"
                    value={form.codigo_pdv}
                    onChange={(e) => setForm({ ...form, codigo_pdv: e.target.value })}
                    placeholder="10452"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: TEXT_2 }}>
                    Preço (R$)
                  </label>
                  <input
                    className={inputCls}
                    style={inputStyle}
                    type="text"
                    inputMode="decimal"
                    value={form.preco}
                    onChange={(e) => setForm({ ...form, preco: e.target.value })}
                    placeholder="12,90"
                  />
                </div>
              </div>

              <div className="rounded-xl p-3.5 flex flex-col gap-2" style={{ background: INPUT_BG, border: `1px solid ${CARD_BORDER}` }}>
                {requisitos.map((r) => (
                  <div key={r.chave} className="flex items-center gap-2.5 text-xs" style={{ color: r.ok ? TEXT_1 : TEXT_3 }}>
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={
                        r.ok
                          ? { background: 'linear-gradient(135deg,#F56C35,#AF2D0A)' }
                          : { border: `1.5px solid ${CARD_BORDER}` }
                      }
                    >
                      {r.ok && <Check size={11} color="#fff" strokeWidth={3} />}
                    </span>
                    {r.label}
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={!formValido || salvando}
                className="text-sm font-bold uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-40 transition-all"
                style={
                  formValido
                    ? { background: 'linear-gradient(135deg,#F56C35,#AF2D0A)', color: '#fff', boxShadow: '0 4px 14px rgba(245,108,53,0.35)' }
                    : { background: INPUT_BG, color: TEXT_2, border: `1px solid ${CARD_BORDER}` }
                }
              >
                {salvando ? 'Criando...' : 'Criar item'}
              </button>

              {erroForm && (
                <p
                  className="text-xs rounded-lg px-3 py-2"
                  style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
                >
                  {erroForm}
                </p>
              )}
              {sucessoForm && (
                <p
                  className="text-xs rounded-lg px-3 py-2"
                  style={{ color: STATUS.good, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
                >
                  {sucessoForm}
                </p>
              )}
            </form>
          </div>

          <div className="rounded-2xl border overflow-hidden min-w-0" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
            <div className="px-6 py-4 flex items-center justify-between border-b flex-wrap gap-3" style={{ borderColor: CARD_BORDER }}>
              <div className="flex items-center gap-2">
                <Tag size={15} color="#F56C35" />
                <h2 className="text-sm font-bold" style={{ color: TEXT_1 }}>
                  Itens cadastrados
                </h2>
              </div>
              <span
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{ color: TEXT_2, background: INPUT_BG, border: `1px solid ${CARD_BORDER}` }}
              >
                {filtrados.length} de {itens.length} itens
              </span>
            </div>

            <div className="px-6 py-3.5 border-b flex flex-col md:flex-row gap-2 md:items-center" style={{ borderColor: CARD_BORDER }}>
              <div className="relative w-full md:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_2 }} />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome ou código PDV"
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
                  style={inputStyle}
                />
              </div>

              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-3 py-2 rounded-lg text-xs"
                style={inputStyle}
              >
                {categoriasFiltro.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: INPUT_BG, border: `1px solid ${CARD_BORDER}` }}>
                {[
                  { valor: 'TODOS', label: 'Todos' },
                  { valor: 'AVAILABLE', label: 'Disponível' },
                  { valor: 'UNAVAILABLE', label: 'Pausado' },
                ].map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => setFiltroStatus(op.valor)}
                    className="text-xs px-3 py-1.5 rounded-md font-semibold"
                    style={
                      filtroStatus === op.valor
                        ? { background: '#2a2a3a', color: TEXT_1 }
                        : { color: TEXT_2, background: 'transparent' }
                    }
                  >
                    {op.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={carregar}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold md:ml-auto"
                style={{ color: TEXT_2, background: 'transparent', border: `1px solid ${CARD_BORDER}` }}
              >
                <RefreshCw size={12} />
                Recarregar
              </button>
            </div>

            {erroCarregamento && (
              <p className="px-6 py-8 text-center text-xs" style={{ color: '#ef4444' }}>
                {erroCarregamento}
              </p>
            )}

            {!erroCarregamento && (
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '64vh' }}>
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[30%]" />
                    <col className="w-[16%]" />
                    <col className="w-[12%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr
                      className="text-[10px] uppercase tracking-wider border-b sticky top-0"
                      style={{ color: TEXT_3, borderColor: CARD_BORDER, background: CARD_BG }}
                    >
                      <th className="px-3 py-3 text-left">Categoria</th>
                      <th className="px-3 py-3 text-left">Item</th>
                      <th className="px-3 py-3 text-left">Código PDV</th>
                      <th className="px-3 py-3 text-right">Preço</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {carregando && (
                      <tr>
                        <td colSpan={6} className="px-3 py-10 text-center text-xs" style={{ color: TEXT_2 }}>
                          Carregando catálogo...
                        </td>
                      </tr>
                    )}

                    {!carregando && filtrados.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-12 text-center text-xs" style={{ color: TEXT_2 }}>
                          Nenhum item encontrado com esses filtros.
                        </td>
                      </tr>
                    )}

                    {!carregando &&
                      filtrados.map((item) => (
                        <tr key={item.itemId} className="border-t" style={{ borderColor: '#151520' }}>
                          <td className="px-3 py-3 text-xs truncate" style={{ color: TEXT_2 }} title={item.categoria}>
                            {item.categoria}
                          </td>
                          <td className="px-3 py-3 font-semibold truncate" style={{ color: TEXT_1 }} title={item.nome}>
                            {item.nome}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className="font-mono text-xs px-2 py-1 rounded-md inline-block truncate max-w-full"
                              style={{ color: TEXT_2, background: INPUT_BG, border: `1px solid ${CARD_BORDER}` }}
                              title={item.codigo_pdv}
                            >
                              {item.codigo_pdv}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono whitespace-nowrap" style={{ color: TEXT_1 }}>
                            R$ {Number(item.preco).toFixed(2)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Pill color={item.status === 'AVAILABLE' ? STATUS.good : STATUS.neutral}>
                              {item.status === 'AVAILABLE' ? 'Disponível' : 'Pausado'}
                            </Pill>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              disabled={alterandoStatus === item.itemId}
                              onClick={() => alternarStatus(item)}
                              title={item.status === 'AVAILABLE' ? 'Pausar item' : 'Despausar item'}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg disabled:opacity-40"
                              style={
                                item.status === 'AVAILABLE'
                                  ? { color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }
                                  : { color: STATUS.good, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.26)' }
                              }
                            >
                              {item.status === 'AVAILABLE' ? <Pause size={13} /> : <Play size={13} />}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-center pt-2" style={{ color: '#334155' }}>
          Cajupar · Automação iFood · {itens.length} itens sincronizados
        </p>
      </main>
    </div>
  )
}
