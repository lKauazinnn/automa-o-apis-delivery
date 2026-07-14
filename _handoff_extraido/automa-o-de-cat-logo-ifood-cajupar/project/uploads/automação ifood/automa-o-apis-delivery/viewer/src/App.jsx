import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  History,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Search,
  Store,
  Sun,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { API, buscarEu, lerConviteDaUrl, lerErroDaUrl, limparHashDaUrl, logoutSupabase } from './auth'
import { TelaDefinirSenha, TelaLogin } from './TelasAuth'

const PALETAS = {
  escuro: {
    cardBg: '#0f0f18',
    cardBorder: '#1e1e2e',
    inputBg: '#1a1a25',
    text1: '#f1f5f9',
    text2: '#64748b',
    text3: '#475569',
    headerBg: 'rgba(10,9,8,0.92)',
    rowBorder: '#151520',
    good: '#22c55e',
    neutral: '#94a3b8',
    bad: '#ef4444',
    overlay: 'rgba(5,5,10,0.55)',
    modalBg: 'rgba(20,20,32,0.72)',
    modalBorder: 'rgba(255,255,255,0.08)',
  },
  claro: {
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    inputBg: '#f1f5f9',
    text1: '#0f172a',
    text2: '#64748b',
    text3: '#94a3b8',
    headerBg: 'rgba(255,255,255,0.85)',
    rowBorder: '#eef1f5',
    good: '#15803d',
    neutral: '#64748b',
    bad: '#dc2626',
    overlay: 'rgba(15,23,42,0.35)',
    modalBg: 'rgba(255,255,255,0.78)',
    modalBorder: 'rgba(15,23,42,0.08)',
  },
}

const CoresContext = createContext(PALETAS.escuro)

const ACAO_LABEL = {
  criar_item: 'criou o item',
  pausar: 'pausou',
  despausar: 'despausou',
  alterar_preco: 'alterou o preço de',
  alterar_codigo_pdv: 'alterou o código PDV de',
  pausar_em_massa: 'pausou (em massa)',
  despausar_em_massa: 'despausou (em massa)',
  pausar_em_massa_erro: 'falhou ao pausar (em massa)',
  despausar_em_massa_erro: 'falhou ao despausar (em massa)',
}

const PAPEIS = [
  { valor: 'administrador', label: 'Administrador' },
  { valor: 'gerente', label: 'Gerente' },
  { valor: 'operador', label: 'Operador' },
]
const PAPEIS_QUE_PODEM_CRIAR = new Set(['administrador', 'gerente'])

// Prefixos de porção/linha que não ajudam a identificar o "prato" em si
// (ex: "Com Ancho Black" / "Fam Ancho Black" / "Exec Ancho Black" são o mesmo corte, tamanhos diferentes).
const PALAVRAS_IGNORADAS = new Set([
  'com', 'de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'as', 'os', 'na', 'no', 'em', 'pra', 'ao', 'aos',
  'add', 'fam', 'exec', 'kids', 'promo', 'pro', 'week', 'def', 'fest', 'vt', 'esp', 'dose', 't',
])

function removerAcentos(texto) {
  // NFD separa a letra da marca de acento (ex: "ó" -> "o" + marca); descartamos
  // qualquer code point de marca combinante (faixa Unicode 0x0300–0x036F).
  return Array.from(texto)
    .filter((ch) => {
      const codigo = ch.codePointAt(0)
      return codigo < 0x0300 || codigo > 0x036f
    })
    .join('')
}

function palavrasChave(nome) {
  return removerAcentos((nome || '').toLowerCase().normalize('NFD'))
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((p) => p.length >= 4)
    .filter((p) => !/\d/.test(p))
    .filter((p) => !PALAVRAS_IGNORADAS.has(p))
}

function encontrarRelacionados(item, todosItens) {
  const chave = palavrasChave(item.nome)
  if (!chave.length) return []
  return todosItens
    .filter((i) => i.itemId !== item.itemId)
    .map((i) => ({ item: i, comuns: palavrasChave(i.nome).filter((p) => chave.includes(p)).length }))
    .filter((r) => r.comuns > 0)
    .sort((a, b) => b.comuns - a.comuns)
    .map((r) => r.item)
}

function campoPreenchido(valor) {
  return String(valor ?? '').trim().length > 0
}

function formatarTimestamp(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

function StatCard({ icon: Icon, value, label, color }) {
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

function Modal({ titulo, onClose, children, largura = 'max-w-md' }) {
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: C.text1 }}>
            {titulo}
          </h3>
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

let contadorToast = 0
const CHAVE_SESSAO = 'sessao_ifood_v1'

function Painel({ sessao, onSair }) {
  const [tema, setTema] = useState(() => localStorage.getItem('tema') || 'escuro')
  const C = PALETAS[tema]

  useEffect(() => {
    document.body.classList.toggle('tema-claro', tema === 'claro')
    localStorage.setItem('tema', tema)
  }, [tema])

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

  const podeCriarItem = PAPEIS_QUE_PODEM_CRIAR.has(sessao.usuario.papel)

  const [lojas, setLojas] = useState([])
  const [lojaForm, setLojaForm] = useState({ nome: '', merchant_id: '' })
  const [criandoLoja, setCriandoLoja] = useState(false)
  const [lojaId, setLojaId] = useState('')
  const [modalLojas, setModalLojas] = useState(false)

  const [modalUsuarios, setModalUsuarios] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const [conviteForm, setConviteForm] = useState({ nome: '', email: '', papel: 'operador' })
  const [convidando, setConvidando] = useState(false)
  const [resetandoSenha, setResetandoSenha] = useState(null)
  const [senhaResetada, setSenhaResetada] = useState(null)

  const [selecionados, setSelecionados] = useState(new Set())
  const [executandoMassa, setExecutandoMassa] = useState(false)
  const [modalAcoesMassa, setModalAcoesMassa] = useState(false)
  const [modalRelacionados, setModalRelacionados] = useState(null)

  const [modalEdicao, setModalEdicao] = useState(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  const [auditoria, setAuditoria] = useState([])
  const [toasts, setToasts] = useState([])

  function notificar(tipo, mensagem) {
    const id = ++contadorToast
    setToasts((prev) => [...prev, { id, tipo, mensagem }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000)
  }

  async function apiFetch(caminho, opcoes = {}) {
    const separador = caminho.includes('?') ? '&' : '?'
    const url = lojaId ? `${API}${caminho}${separador}loja=${encodeURIComponent(lojaId)}` : `${API}${caminho}`
    const resp = await fetch(url, {
      ...opcoes,
      headers: { ...(opcoes.headers || {}), Authorization: `Bearer ${sessao.accessToken}` },
    })
    let dados = null
    try {
      dados = await resp.json()
    } catch {
      dados = null
    }
    if (resp.status === 401) {
      onSair()
      throw new Error('Sua sessão expirou. Faça login de novo.')
    }
    if (!resp.ok) {
      throw new Error(dados?.erro || 'Erro inesperado ao falar com o servidor local.')
    }
    return dados
  }

  async function carregar() {
    setCarregando(true)
    setErroCarregamento('')
    try {
      const data = await apiFetch('/catalogo')
      setItens(data.itens)
      setCategorias(data.categorias)
    } catch (e) {
      setErroCarregamento(e.message || 'Não consegui falar com o servidor local. Ele está rodando? (python server/app.py)')
    } finally {
      setCarregando(false)
    }
  }

  async function carregarAuditoria() {
    try {
      setAuditoria(await apiFetch('/auditoria?limite=20'))
    } catch {
      // painel de atividade é informativo; falha aqui não deve travar o resto da tela
    }
  }

  async function carregarLojas() {
    try {
      setLojas(await apiFetch('/lojas'))
    } catch {
      // se a listagem de lojas falhar, segue usando a loja padrão do .env
    }
  }

  async function handleCriarLoja(e) {
    e.preventDefault()
    setCriandoLoja(true)
    try {
      await apiFetch('/lojas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lojaForm),
      })
      notificar('sucesso', `Loja "${lojaForm.nome}" cadastrada.`)
      setLojaForm({ nome: '', merchant_id: '' })
      carregarLojas()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCriandoLoja(false)
    }
  }

  async function removerLoja(loja) {
    try {
      await apiFetch(`/lojas/${loja.id}`, { method: 'DELETE' })
      setLojas((prev) => prev.filter((l) => l.id !== loja.id))
      if (lojaId === loja.merchant_id) setLojaId('')
      notificar('sucesso', `Loja "${loja.nome}" removida.`)
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  async function carregarUsuarios() {
    try {
      setUsuarios(await apiFetch('/usuarios'))
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  function abrirModalUsuarios() {
    setModalUsuarios(true)
    carregarUsuarios()
  }

  async function trocarPapelUsuario(id, papel) {
    try {
      await apiFetch(`/usuarios/${id}/papel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papel }),
      })
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, papel } : u)))
      notificar('sucesso', 'Papel atualizado.')
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  async function handleConvidar(e) {
    e.preventDefault()
    setConvidando(true)
    try {
      await apiFetch('/usuarios/convidar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conviteForm),
      })
      notificar('sucesso', `Convite enviado pra ${conviteForm.email}.`)
      setConviteForm({ nome: '', email: '', papel: 'operador' })
      carregarUsuarios()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setConvidando(false)
    }
  }

  // Bypassa o e-mail inteiramente: gera uma senha nova direto pela Admin API do Supabase.
  // Existe porque o link por e-mail é frágil (expira, e-mail corporativo às vezes consome o
  // token de um scanner de segurança antes da pessoa clicar).
  async function resetarSenhaUsuario(usuario) {
    setResetandoSenha(usuario.id)
    try {
      const data = await apiFetch(`/usuarios/${usuario.id}/resetar-senha`, { method: 'POST' })
      setSenhaResetada({ usuario, senha: data.senha })
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setResetandoSenha(null)
    }
  }

  useEffect(() => {
    carregar()
    carregarAuditoria()
    carregarLojas()
  }, [])

  useEffect(() => {
    if (lojas.length) carregar()
  }, [lojaId])

  const lojaAtual = useMemo(() => lojas.find((l) => l.merchant_id === lojaId) || lojas[0], [lojas, lojaId])

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
      await apiFetch('/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          categoria: categoriaFinal.trim(),
          codigo_pdv: form.codigo_pdv.trim(),
          preco: form.preco,
        }),
      })
      setSucessoForm(`"${form.nome}" criado no catálogo do iFood.`)
      notificar('sucesso', `Item "${form.nome}" criado.`)
      setForm({ nome: '', categoria: '', novaCategoria: '', codigo_pdv: '', preco: '' })
      carregar()
      carregarAuditoria()
    } catch (e) {
      setErroForm(e.message)
      notificar('erro', e.message)
    } finally {
      setSalvando(false)
    }
  }

  // Toggle direto de um único item, sem checar relacionados (usado quando não há
  // nenhum item parecido, ou quando o usuário escolhe "só este item" no modal).
  async function executarAlternarStatus(item, novoStatus) {
    setAlterandoStatus(item.itemId)
    try {
      await apiFetch(`/itens/${item.itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, nome: item.nome }),
      })
      setItens((prev) => prev.map((i) => (i.itemId === item.itemId ? { ...i, status: novoStatus } : i)))
      notificar('sucesso', `"${item.nome}" ${novoStatus === 'UNAVAILABLE' ? 'pausado' : 'despausado'}.`)
      carregarAuditoria()
    } catch (e) {
      notificar('erro', `Não consegui alterar "${item.nome}": ${e.message}`)
    } finally {
      setAlterandoStatus(null)
    }
  }

  // Clique no botão de pausar/despausar de uma linha: se existir item parecido (ex: mesma
  // proteína em tamanhos "Com/Fam/Exec"), pergunta antes se quer aplicar a todos de uma vez —
  // pensado pra ruptura de insumo, onde travar 1 por 1 é lento.
  function prepararAlternarStatus(item) {
    const novoStatus = item.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE'
    const relacionados = encontrarRelacionados(item, itens).filter((i) => i.status !== novoStatus)
    if (relacionados.length === 0) {
      executarAlternarStatus(item, novoStatus)
      return
    }
    setModalRelacionados({
      item,
      novoStatus,
      relacionados,
      selecionados: new Set(relacionados.map((r) => r.itemId)),
    })
  }

  function alternarSelecaoModalRelacionados(itemId) {
    setModalRelacionados((prev) => {
      const novo = new Set(prev.selecionados)
      if (novo.has(itemId)) novo.delete(itemId)
      else novo.add(itemId)
      return { ...prev, selecionados: novo }
    })
  }

  // Aplica um status a vários itens de uma vez (usado pelo modal de ações em massa e pelo
  // modal de itens parecidos). `alvos` é [{ item_id, nome }] — o nome vai só pra auditoria
  // ficar legível, sem precisar o backend ir buscar no iFood.
  async function pausarComIds(alvos, status) {
    setExecutandoMassa(true)
    try {
      const data = await apiFetch('/itens/pausar-em-massa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alvos, status }),
      })
      setItens((prev) =>
        prev.map((i) => {
          const resultado = data.resultados.find((r) => r.itemId === i.itemId)
          return resultado?.ok ? { ...i, status } : i
        })
      )
      const acao = status === 'UNAVAILABLE' ? 'pausados' : 'despausados'
      if (data.erro > 0) {
        notificar('aviso', `${data.ok} de ${data.total} itens ${acao}. ${data.erro} falharam.`)
      } else {
        notificar('sucesso', `${data.ok} itens ${acao}.`)
      }
      carregarAuditoria()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setExecutandoMassa(false)
    }
  }

  function paraAlvos(ids) {
    return ids.map((id) => ({ item_id: id, nome: itens.find((i) => i.itemId === id)?.nome || '' }))
  }

  async function acaoEmMassa(status) {
    const ids = Array.from(selecionados)
    if (!ids.length) return
    await pausarComIds(paraAlvos(ids), status)
    setSelecionados(new Set())
    setModalAcoesMassa(false)
  }

  async function confirmarModalRelacionados() {
    const { item, novoStatus, selecionados: sel } = modalRelacionados
    const ids = [item.itemId, ...Array.from(sel)]
    setModalRelacionados(null)
    await pausarComIds(paraAlvos(ids), novoStatus)
  }

  function confirmarSoItemAtualModal() {
    const { item, novoStatus } = modalRelacionados
    setModalRelacionados(null)
    executarAlternarStatus(item, novoStatus)
  }

  function alternarSelecao(itemId) {
    setSelecionados((prev) => {
      const novo = new Set(prev)
      if (novo.has(itemId)) novo.delete(itemId)
      else novo.add(itemId)
      return novo
    })
  }

  function alternarSelecaoTodos(idsVisiveis) {
    setSelecionados((prev) => {
      const todosSelecionados = idsVisiveis.every((id) => prev.has(id))
      if (todosSelecionados) {
        const novo = new Set(prev)
        idsVisiveis.forEach((id) => novo.delete(id))
        return novo
      }
      return new Set([...prev, ...idsVisiveis])
    })
  }

  function abrirEdicao(item) {
    setModalEdicao({ item, preco: String(item.preco ?? ''), codigoPdv: item.codigo_pdv || '' })
  }

  async function salvarEdicao() {
    const { item, preco, codigoPdv } = modalEdicao
    const precoNum = Number(String(preco).replace(',', '.'))
    if (!precoNum || precoNum <= 0) {
      notificar('erro', 'Preço deve ser maior que zero.')
      return
    }
    if (!codigoPdv.trim()) {
      notificar('erro', 'Código PDV não pode ficar vazio.')
      return
    }

    setSalvandoEdicao(true)
    try {
      const tarefas = []
      if (precoNum !== Number(item.preco)) {
        tarefas.push(
          apiFetch(`/itens/${item.itemId}/preco`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preco: precoNum, nome: item.nome }),
          })
        )
      }
      if (codigoPdv.trim() !== item.codigo_pdv) {
        tarefas.push(
          apiFetch(`/itens/${item.itemId}/codigo-pdv`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo_pdv: codigoPdv.trim(), nome: item.nome }),
          })
        )
      }
      if (!tarefas.length) {
        setModalEdicao(null)
        return
      }
      await Promise.all(tarefas)
      setItens((prev) =>
        prev.map((i) => (i.itemId === item.itemId ? { ...i, preco: precoNum, codigo_pdv: codigoPdv.trim() } : i))
      )
      notificar('sucesso', `"${item.nome}" atualizado.`)
      setModalEdicao(null)
      carregarAuditoria()
    } catch (e) {
      notificar('erro', `Não consegui salvar as alterações: ${e.message}`)
    } finally {
      setSalvandoEdicao(false)
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

  const idsVisiveis = useMemo(() => filtrados.map((i) => i.itemId), [filtrados])
  const todosVisiveisSelecionados = idsVisiveis.length > 0 && idsVisiveis.every((id) => selecionados.has(id))
  const itensSelecionados = useMemo(() => itens.filter((i) => selecionados.has(i.itemId)), [itens, selecionados])

  const totalDisponiveis = useMemo(() => itens.filter((i) => i.status === 'AVAILABLE').length, [itens])
  const totalPausados = itens.length - totalDisponiveis

  const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all'
  const inputStyle = { background: C.inputBg, color: C.text1, border: `1px solid ${C.cardBorder}` }

  const CORES_TOAST = {
    sucesso: C.good,
    erro: C.bad,
    aviso: '#f59e0b',
  }

  return (
    <CoresContext.Provider value={C}>
      <div className="min-h-screen">
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="rounded-xl px-4 py-3 text-xs font-semibold shadow-lg flex items-start gap-2"
              style={{
                background: C.cardBg,
                color: CORES_TOAST[t.tipo] || C.text1,
                border: `1px solid ${(CORES_TOAST[t.tipo] || C.cardBorder)}40`,
              }}
            >
              {t.tipo === 'erro' && <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />}
              <span>{t.mensagem}</span>
            </div>
          ))}
        </div>

        {modalLojas && (
          <Modal titulo="Gerenciar lojas" onClose={() => setModalLojas(false)} largura="max-w-lg">
            <div className="flex flex-col gap-2 mb-4">
              {lojas.length === 0 && (
                <p className="text-xs" style={{ color: C.text2 }}>
                  Nenhuma loja cadastrada ainda.
                </p>
              )}
              {lojas.map((l) => {
                const ativa = l.merchant_id === lojaAtual?.merchant_id
                return (
                  <div
                    key={l.id}
                    className="rounded-xl px-3.5 py-3 flex items-center gap-3"
                    style={{
                      background: ativa ? 'rgba(245,108,53,0.12)' : C.inputBg,
                      border: `1px solid ${ativa ? '#F56C35' : C.cardBorder}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setLojaId(l.merchant_id)
                        setModalLojas(false)
                      }}
                      className="text-left min-w-0 flex-1"
                    >
                      <p className="text-sm font-semibold truncate" style={{ color: C.text1 }}>
                        {l.nome || 'Loja sem nome'}
                      </p>
                      <p className="text-[11px] font-mono truncate" style={{ color: C.text3 }}>
                        {l.merchant_id}
                      </p>
                    </button>
                    {ativa && <Pill color={C.good}>Ativa</Pill>}
                    {sessao.usuario.papel === 'administrador' && (
                      <button
                        type="button"
                        onClick={() => removerLoja(l)}
                        title="Remover loja"
                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ color: C.bad, background: 'rgba(239,68,68,0.1)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {sessao.usuario.papel === 'administrador' && (
              <div className="border-t pt-3.5" style={{ borderColor: C.cardBorder }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.text2 }}>
                  Cadastrar nova loja
                </p>
                <form onSubmit={handleCriarLoja} className="flex flex-col gap-2.5">
                  <input
                    required
                    className={inputCls}
                    style={inputStyle}
                    type="text"
                    value={lojaForm.nome}
                    onChange={(e) => setLojaForm({ ...lojaForm, nome: e.target.value })}
                    placeholder="Nome da loja"
                  />
                  <input
                    required
                    className={inputCls}
                    style={inputStyle}
                    type="text"
                    value={lojaForm.merchant_id}
                    onChange={(e) => setLojaForm({ ...lojaForm, merchant_id: e.target.value })}
                    placeholder="Merchant ID do iFood"
                  />
                  <button
                    type="submit"
                    disabled={criandoLoja}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg,#F56C35,#AF2D0A)', color: '#fff' }}
                  >
                    {criandoLoja && <Loader2 size={12} className="animate-spin" />}
                    {criandoLoja ? 'Cadastrando...' : 'Cadastrar loja'}
                  </button>
                  <p className="text-[10px]" style={{ color: C.text3 }}>
                    Não sabe o Merchant ID? Rode <code>python scripts/descobrir_lojas.py</code> no backend.
                  </p>
                </form>
              </div>
            )}
          </Modal>
        )}

        {modalUsuarios && (
          <Modal titulo="Gerenciar usuários" onClose={() => setModalUsuarios(false)} largura="max-w-lg">
            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto mb-4">
              {usuarios.length === 0 && (
                <p className="text-xs" style={{ color: C.text2 }}>
                  Nenhum usuário cadastrado ainda além de você.
                </p>
              )}
              {usuarios.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-2"
                  style={{ background: C.inputBg }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate" style={{ color: C.text1 }}>
                      {u.nome}
                    </p>
                    <p className="truncate" style={{ color: C.text3 }}>
                      {u.email}
                    </p>
                  </div>
                  <select
                    value={u.papel}
                    onChange={(e) => trocarPapelUsuario(u.id, e.target.value)}
                    className="px-2 py-1.5 rounded-md text-xs flex-shrink-0"
                    style={inputStyle}
                  >
                    {PAPEIS.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={resetandoSenha === u.id}
                    onClick={() => resetarSenhaUsuario(u)}
                    title="Gerar senha nova (não depende de e-mail)"
                    className="px-2 py-1.5 rounded-md text-[10px] font-semibold flex-shrink-0 disabled:opacity-40 flex items-center gap-1"
                    style={{ color: C.text2, background: C.cardBg, border: `1px solid ${C.cardBorder}` }}
                  >
                    {resetandoSenha === u.id && <Loader2 size={11} className="animate-spin" />}
                    Redefinir senha
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t pt-3.5" style={{ borderColor: C.cardBorder }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.text2 }}>
                Convidar novo usuário
              </p>
              <form onSubmit={handleConvidar} className="flex flex-col gap-2.5">
                <input
                  required
                  className={inputCls}
                  style={inputStyle}
                  type="text"
                  value={conviteForm.nome}
                  onChange={(e) => setConviteForm({ ...conviteForm, nome: e.target.value })}
                  placeholder="Nome"
                />
                <input
                  required
                  className={inputCls}
                  style={inputStyle}
                  type="email"
                  value={conviteForm.email}
                  onChange={(e) => setConviteForm({ ...conviteForm, email: e.target.value })}
                  placeholder="E-mail"
                />
                <select
                  className={inputCls}
                  style={inputStyle}
                  value={conviteForm.papel}
                  onChange={(e) => setConviteForm({ ...conviteForm, papel: e.target.value })}
                >
                  {PAPEIS.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={convidando}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#F56C35,#AF2D0A)', color: '#fff' }}
                >
                  {convidando && <Loader2 size={12} className="animate-spin" />}
                  {convidando ? 'Enviando...' : 'Enviar convite'}
                </button>
              </form>
            </div>
          </Modal>
        )}

        {senhaResetada && (
          <Modal titulo={`Senha nova pra ${senhaResetada.usuario.nome}`} onClose={() => setSenhaResetada(null)}>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: C.text2 }}>
              Repasse essa senha pra pessoa por fora (WhatsApp, presencial). Ela consegue trocar
              depois fazendo login e usando "Esqueci minha senha".
            </p>
            <div
              className="flex items-center justify-between gap-2 rounded-xl px-3.5 py-3 mb-4"
              style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              <span className="font-mono text-sm" style={{ color: C.text1 }}>
                {senhaResetada.senha}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(senhaResetada.senha)
                  notificar('sucesso', 'Senha copiada.')
                }}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg flex-shrink-0"
                style={{ color: '#F56C35', background: 'rgba(245,108,53,0.12)' }}
              >
                Copiar
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSenhaResetada(null)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl"
              style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              Fechar
            </button>
          </Modal>
        )}

        {modalEdicao && (
          <Modal titulo={`Editar "${modalEdicao.item.nome}"`} onClose={() => setModalEdicao(null)}>
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                  Preço (R$)
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={modalEdicao.preco}
                  onChange={(e) => setModalEdicao({ ...modalEdicao, preco: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                  Código PDV
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="text"
                  value={modalEdicao.codigoPdv}
                  onChange={(e) => setModalEdicao({ ...modalEdicao, codigoPdv: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={salvandoEdicao}
                  onClick={salvarEdicao}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#F56C35,#AF2D0A)', color: '#fff' }}
                >
                  {salvandoEdicao && <Loader2 size={12} className="animate-spin" />}
                  {salvandoEdicao ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalEdicao(null)}
                  className="text-xs font-semibold px-3.5 py-2.5 rounded-xl"
                  style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </Modal>
        )}

        {modalAcoesMassa && (
          <Modal titulo={`Ações em massa (${itensSelecionados.length} itens)`} onClose={() => setModalAcoesMassa(false)} largura="max-w-lg">
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto mb-4">
              {itensSelecionados.map((i) => (
                <div
                  key={i.itemId}
                  className="text-xs rounded-lg px-2.5 py-2 flex items-center justify-between gap-2"
                  style={{ background: C.inputBg }}
                >
                  <span className="truncate" style={{ color: C.text1 }}>
                    {i.nome}
                  </span>
                  <Pill color={i.status === 'AVAILABLE' ? C.good : C.neutral}>
                    {i.status === 'AVAILABLE' ? 'Disponível' : 'Pausado'}
                  </Pill>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                disabled={executandoMassa}
                onClick={() => acaoEmMassa('UNAVAILABLE')}
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                style={{ color: C.bad, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                Pausar todos
              </button>
              <button
                type="button"
                disabled={executandoMassa}
                onClick={() => acaoEmMassa('AVAILABLE')}
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                style={{ color: C.good, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                Despausar todos
              </button>
              <button
                type="button"
                onClick={() => setModalAcoesMassa(false)}
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl ml-auto"
                style={{ color: C.text2, background: 'transparent' }}
              >
                Fechar
              </button>
            </div>
          </Modal>
        )}

        {modalRelacionados && (
          <Modal
            titulo={`${modalRelacionados.novoStatus === 'UNAVAILABLE' ? 'Pausar' : 'Despausar'} itens parecidos?`}
            onClose={() => setModalRelacionados(null)}
            largura="max-w-lg"
          >
            <p className="text-xs mb-3 leading-relaxed" style={{ color: C.text2 }}>
              Encontramos {modalRelacionados.relacionados.length}{' '}
              {modalRelacionados.relacionados.length === 1 ? 'item parecido' : 'itens parecidos'} com{' '}
              <span style={{ color: C.text1, fontWeight: 600 }}>"{modalRelacionados.item.nome}"</span> — útil pra
              ruptura de um insumo que afeta várias variações do mesmo prato (ex: tamanhos diferentes). Desmarque o
              que não fizer sentido.
            </p>
            <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto mb-4">
              {modalRelacionados.relacionados.map((r) => (
                <label
                  key={r.itemId}
                  className="flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-2 cursor-pointer"
                  style={{ background: C.inputBg }}
                >
                  <input
                    type="checkbox"
                    checked={modalRelacionados.selecionados.has(r.itemId)}
                    onChange={() => alternarSelecaoModalRelacionados(r.itemId)}
                  />
                  <span className="truncate" style={{ color: C.text1 }}>
                    {r.nome}
                  </span>
                  <span className="ml-auto font-mono flex-shrink-0" style={{ color: C.text3 }}>
                    {r.codigo_pdv}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                disabled={executandoMassa}
                onClick={confirmarModalRelacionados}
                className="text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg,#F56C35,#AF2D0A)', color: '#fff' }}
              >
                {modalRelacionados.novoStatus === 'UNAVAILABLE' ? 'Pausar' : 'Despausar'}{' '}
                {modalRelacionados.selecionados.size + 1} itens
              </button>
              <button
                type="button"
                disabled={executandoMassa}
                onClick={confirmarSoItemAtualModal}
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
              >
                Só este item
              </button>
              <button
                type="button"
                onClick={() => setModalRelacionados(null)}
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl ml-auto"
                style={{ color: C.text2, background: 'transparent' }}
              >
                Cancelar
              </button>
            </div>
          </Modal>
        )}

        <header
          className="sticky top-0 z-20"
          style={{ background: C.headerBg, backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.cardBorder}` }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
            <div
              className="flex items-center"
              style={
                tema === 'claro'
                  ? { background: '#151217', borderRadius: '10px', padding: '6px 10px' }
                  : undefined
              }
            >
              <img src="/brand/logo-cajupar.png" alt="Cajupar" className="h-9 w-auto object-contain" />
            </div>
            <div className="w-px h-8" style={{ background: C.cardBorder }} />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold" style={{ color: C.text1 }}>
                Catálogo iFood
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1" style={{ color: '#F56C35' }}>
                Gestão de itens
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg"
                style={inputStyle}
                title={tema === 'escuro' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {tema === 'escuro' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <button
                type="button"
                onClick={() => setModalLojas(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                style={inputStyle}
                title="Gerenciar lojas conectadas"
              >
                <Store size={13} />
                {lojaAtual?.nome || 'Lojas'}
              </button>
              {sessao.usuario.papel === 'administrador' && (
                <button
                  type="button"
                  onClick={abrirModalUsuarios}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
                  style={inputStyle}
                  title="Gerenciar usuários e papéis"
                >
                  <Users size={13} />
                  Usuários
                </button>
              )}
              <div className="flex items-center gap-2 pl-2 ml-1" style={{ borderLeft: `1px solid ${C.cardBorder}` }}>
                <div className="text-right leading-none">
                  <p className="text-xs font-semibold" style={{ color: C.text1 }}>
                    {sessao.usuario.nome}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: C.text3 }}>
                    {sessao.usuario.papel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSair}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg"
                  style={inputStyle}
                  title="Sair"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
          <div className="h-[2px]" style={{ background: 'linear-gradient(90deg,#AF2D0A,#F56C35,#FBB34A)' }} />
        </header>

        <main className="max-w-7xl mx-auto px-6 py-7 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Boxes} value={itens.length} label="Itens no catálogo" color="#F56C35" />
            <StatCard icon={Layers} value={categorias.length} label="Categorias" color="#FBB34A" />
            <StatCard icon={CheckCircle2} value={totalDisponiveis} label="Disponíveis" color={C.good} />
            <StatCard icon={Pause} value={totalPausados} label="Pausados" color={C.neutral} />
          </div>

          <div className="grid lg:grid-cols-[300px_1fr] gap-5 items-start">
            <div className="flex flex-col gap-5">
              <div className="rounded-2xl border p-5" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#F56C35' }}>
                  Novo material
                </p>
                <h2 className="text-base font-bold mb-4" style={{ color: C.text1 }}>
                  Adicionar item ao catálogo
                </h2>

                {!podeCriarItem ? (
                  <div
                    className="rounded-xl p-4 flex flex-col items-center gap-2.5 text-center"
                    style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
                  >
                    <Lock size={18} style={{ color: C.text3 }} />
                    <p className="text-xs leading-relaxed" style={{ color: C.text2 }}>
                      Criar itens é restrito a administradores e gerentes. Sua conta ({sessao.usuario.papel}) não
                      tem esse acesso — peça pra um administrador criar o item ou trocar seu papel em "Usuários".
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
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
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
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
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
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
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
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
                        <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
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

                    <div className="rounded-xl p-3.5 flex flex-col gap-2" style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}>
                      {requisitos.map((r) => (
                        <div key={r.chave} className="flex items-center gap-2.5 text-xs" style={{ color: r.ok ? C.text1 : C.text3 }}>
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                            style={
                              r.ok
                                ? { background: 'linear-gradient(135deg,#F56C35,#AF2D0A)' }
                                : { border: `1.5px solid ${C.cardBorder}` }
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
                      className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-40 transition-all"
                      style={
                        formValido
                          ? { background: 'linear-gradient(135deg,#F56C35,#AF2D0A)', color: '#fff', boxShadow: '0 4px 14px rgba(245,108,53,0.35)' }
                          : { background: C.inputBg, color: C.text2, border: `1px solid ${C.cardBorder}` }
                      }
                    >
                      {salvando && <Loader2 size={14} className="animate-spin" />}
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
                        style={{ color: C.good, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
                      >
                        {sucessoForm}
                      </p>
                    )}
                  </form>
                )}
              </div>

              <div className="rounded-2xl border p-5" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
                <div className="flex items-center gap-2 mb-3.5">
                  <History size={14} color="#F56C35" />
                  <h2 className="text-sm font-bold" style={{ color: C.text1 }}>
                    Atividade recente
                  </h2>
                </div>
                <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto">
                  {auditoria.length === 0 && (
                    <p className="text-xs" style={{ color: C.text3 }}>
                      Nenhuma ação registrada ainda.
                    </p>
                  )}
                  {auditoria.map((a, idx) => (
                    <div key={idx} className="text-xs pb-2.5 border-b last:border-0" style={{ borderColor: C.rowBorder }}>
                      <p style={{ color: C.text1 }}>
                        <span className="font-semibold">{a.operador || 'desconhecido'}</span>{' '}
                        <span style={{ color: C.text2 }}>{ACAO_LABEL[a.acao] || a.acao}</span>{' '}
                        {(a.nome || a.item_id) && <span className="font-semibold">{a.nome || a.item_id}</span>}
                      </p>
                      <p style={{ color: C.text3 }}>{formatarTimestamp(a.timestamp)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border overflow-hidden min-w-0" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
              <div className="px-6 py-4 flex items-center justify-between border-b flex-wrap gap-3" style={{ borderColor: C.cardBorder }}>
                <div className="flex items-center gap-2">
                  <Tag size={15} color="#F56C35" />
                  <h2 className="text-sm font-bold" style={{ color: C.text1 }}>
                    Itens cadastrados
                  </h2>
                </div>
                <span
                  className="text-[11px] px-2.5 py-1 rounded-full"
                  style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
                >
                  {filtrados.length} de {itens.length} itens
                </span>
              </div>

              <div className="px-6 py-3.5 border-b flex flex-col md:flex-row gap-2 md:items-center" style={{ borderColor: C.cardBorder }}>
                <div className="relative w-full md:max-w-xs">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.text2 }} />
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

                <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}>
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
                          ? { background: tema === 'escuro' ? '#2a2a3a' : '#e2e8f0', color: C.text1 }
                          : { color: C.text2, background: 'transparent' }
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
                  style={{ color: C.text2, background: 'transparent', border: `1px solid ${C.cardBorder}` }}
                >
                  <RefreshCw size={12} />
                  Recarregar
                </button>
              </div>

              {selecionados.size > 0 && (
                <div
                  className="px-6 py-3 border-b flex items-center gap-3 flex-wrap"
                  style={{ borderColor: C.cardBorder, background: 'rgba(245,108,53,0.06)' }}
                >
                  <span className="text-xs font-semibold" style={{ color: C.text1 }}>
                    {selecionados.size} {selecionados.size === 1 ? 'item selecionado' : 'itens selecionados'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalAcoesMassa(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{ color: '#F56C35', background: 'rgba(245,108,53,0.12)', border: '1px solid rgba(245,108,53,0.3)' }}
                  >
                    <ListChecks size={13} />
                    Ações em massa
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelecionados(new Set())}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg ml-auto"
                    style={{ color: C.text2, background: 'transparent' }}
                  >
                    Limpar seleção
                  </button>
                </div>
              )}

              {erroCarregamento && (
                <p className="px-6 py-8 text-center text-xs" style={{ color: '#ef4444' }}>
                  {erroCarregamento}
                </p>
              )}

              {!erroCarregamento && (
                <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '64vh' }}>
                  <table className="w-full text-sm table-fixed">
                    <colgroup>
                      <col className="w-[4%]" />
                      <col className="w-[13%]" />
                      <col className="w-[25%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[12%]" />
                      <col className="w-[20%]" />
                    </colgroup>
                    <thead>
                      <tr
                        className="text-[10px] uppercase tracking-wider border-b sticky top-0"
                        style={{ color: C.text3, borderColor: C.cardBorder, background: C.cardBg }}
                      >
                        <th className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={todosVisiveisSelecionados}
                            onChange={() => alternarSelecaoTodos(idsVisiveis)}
                            aria-label="Selecionar todos os itens visíveis"
                          />
                        </th>
                        <th className="px-3 py-3 text-left">Categoria</th>
                        <th className="px-3 py-3 text-left">Item</th>
                        <th className="px-3 py-3 text-left">Código PDV</th>
                        <th className="px-3 py-3 text-right">Preço</th>
                        <th className="px-3 py-3 text-center">Status</th>
                        <th className="px-3 py-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {carregando && (
                        <tr>
                          <td colSpan={7} className="px-3 py-10 text-center text-xs" style={{ color: C.text2 }}>
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 size={14} className="animate-spin" />
                              Carregando catálogo...
                            </div>
                          </td>
                        </tr>
                      )}

                      {!carregando && filtrados.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-12 text-center text-xs" style={{ color: C.text2 }}>
                            Nenhum item encontrado com esses filtros.
                          </td>
                        </tr>
                      )}

                      {!carregando &&
                        filtrados.map((item) => (
                          <tr key={item.itemId} className="border-t" style={{ borderColor: C.rowBorder }}>
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={selecionados.has(item.itemId)}
                                onChange={() => alternarSelecao(item.itemId)}
                                aria-label={`Selecionar ${item.nome}`}
                              />
                            </td>
                            <td className="px-3 py-3 text-xs truncate" style={{ color: C.text2 }} title={item.categoria}>
                              {item.categoria}
                            </td>
                            <td className="px-3 py-3 font-semibold truncate" style={{ color: C.text1 }} title={item.nome}>
                              {item.nome}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className="font-mono text-xs px-2 py-1 rounded-md inline-block truncate max-w-full"
                                style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
                                title={item.codigo_pdv}
                              >
                                {item.codigo_pdv}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono whitespace-nowrap" style={{ color: C.text1 }}>
                              R$ {Number(item.preco).toFixed(2)}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Pill color={item.status === 'AVAILABLE' ? C.good : C.neutral}>
                                {item.status === 'AVAILABLE' ? 'Disponível' : 'Pausado'}
                              </Pill>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => abrirEdicao(item)}
                                  title="Editar preço e código PDV"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg"
                                  style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
                                >
                                  <Pencil size={12} />
                                </button>
                                <button
                                  type="button"
                                  disabled={alterandoStatus === item.itemId}
                                  onClick={() => prepararAlternarStatus(item)}
                                  title={item.status === 'AVAILABLE' ? 'Pausar item (some do cardápio no iFood)' : 'Despausar item (volta a aparecer no cardápio)'}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg disabled:opacity-40"
                                  style={
                                    item.status === 'AVAILABLE'
                                      ? { color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }
                                      : { color: C.good, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.26)' }
                                  }
                                >
                                  {item.status === 'AVAILABLE' ? <Pause size={13} /> : <Play size={13} />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-center pt-2" style={{ color: tema === 'escuro' ? '#334155' : '#94a3b8' }}>
            Cajupar · Automação iFood · {itens.length} itens sincronizados
          </p>
        </main>
      </div>
    </CoresContext.Provider>
  )
}

function TelaCarregando() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 size={22} className="animate-spin" style={{ color: '#F56C35' }} />
      <p className="text-xs" style={{ color: '#64748b' }}>
        Carregando...
      </p>
    </div>
  )
}

const MENSAGEM_ERRO_LINK = {
  otp_expired:
    'Esse link expirou ou já foi usado — às vezes o filtro de segurança do e-mail corporativo abre o link sozinho e "queima" ele antes de você clicar. Peça um novo abaixo, ou peça pra um administrador redefinir sua senha direto no painel de Usuários.',
}

export default function App() {
  const [verificando, setVerificando] = useState(true)
  const [sessao, setSessao] = useState(null)
  const [convite, setConvite] = useState(() => lerConviteDaUrl())
  const [avisoLink] = useState(() => {
    const erro = lerErroDaUrl()
    if (!erro) return ''
    return MENSAGEM_ERRO_LINK[erro.codigo] || erro.descricao?.replaceAll('+', ' ') || 'Esse link não é mais válido.'
  })

  useEffect(() => {
    if (avisoLink) limparHashDaUrl()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (convite) {
      setVerificando(false)
      return
    }
    const salvo = localStorage.getItem(CHAVE_SESSAO)
    if (!salvo) {
      setVerificando(false)
      return
    }
    const { accessToken } = JSON.parse(salvo)
    buscarEu(accessToken)
      .then((usuario) => setSessao({ accessToken, usuario }))
      .catch(() => localStorage.removeItem(CHAVE_SESSAO))
      .finally(() => setVerificando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function aoLogar(dadosLogin) {
    const accessToken = dadosLogin.access_token
    const usuario = await buscarEu(accessToken)
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ accessToken }))
    setSessao({ accessToken, usuario })
  }

  async function aoDefinirSenha(accessToken) {
    limparHashDaUrl()
    const usuario = await buscarEu(accessToken)
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ accessToken }))
    setConvite(null)
    setSessao({ accessToken, usuario })
  }

  async function sair() {
    if (sessao) await logoutSupabase(sessao.accessToken)
    localStorage.removeItem(CHAVE_SESSAO)
    setSessao(null)
  }

  if (verificando) return <TelaCarregando />
  if (convite) return <TelaDefinirSenha convite={convite} onDefinida={aoDefinirSenha} />
  if (!sessao) return <TelaLogin onLogar={aoLogar} avisoInicial={avisoLink} />
  return <Painel sessao={sessao} onSair={sair} />
}
