import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Clock, Layers, Loader2, PowerOff, Tag, Tags, Trash2 } from 'lucide-react'
import {
  API,
  buscarEu,
  definirSenha,
  lerConviteDaUrl,
  lerErroDaUrl,
  limparHashDaUrl,
  logoutSupabase,
  marcarSenhaTrocada,
} from './auth'
import { CategoriasModal } from './modals/CategoriasModal'
import { ComboModal } from './modals/ComboModal'
import { GruposOpcaoModal } from './modals/GruposOpcaoModal'
import { HorarioFuncionamentoModal } from './modals/HorarioFuncionamentoModal'
import { InterrupcoesModal } from './modals/InterrupcoesModal'
import { MarcaModal } from './modals/MarcaModal'
import { PausaInsumoModal } from './modals/PausaInsumoModal'
import { PausarModal } from './modals/PausarModal'
import { RupturasModal } from './modals/RupturasModal'
import { Sidebar } from './Sidebar'
import { BannerConexao, BarraProgresso, Header, Toasts } from './Shell'
import { Botao, Dialogo, MONO } from './ds'
import { encontrarRelacionados } from './pausas'
import { TelaDefinirSenha, TelaLogin } from './TelasAuth'
import { Avatar, CoresContext, iniciaisDe, lerImagemComoDataUrl, Modal, ModalEmbutidoContext, PALETAS, Pill } from './ui'
import { aplicarMarcaNoDocumento, guardarMarcaEmCache, lerMarcaEmCache, MARCA_PADRAO, MarcaContext, tokensDaMarca } from './marca'
import { AuditoriaView } from './views/AuditoriaView'
import { CatalogoView } from './views/CatalogoView'
import { DashboardView } from './views/DashboardView'
import { FinanceiroView } from './views/FinanceiroView'
import { StatusLojasView } from './views/StatusLojasView'
import { KDSView } from './views/KDSView'
import { PedidosView } from './views/PedidosView'

// Uma entrada por `chave` de VIEWS no Sidebar.jsx — o header lê daqui. Sem a entrada, a tela
// abria e derrubava o painel inteiro no boundary de erro (era o caso de `lojas` e `financeiro`).
const TITULOS_VIEW = {
  dashboard: { t: 'Painel', sub: 'Visão geral da operação' },
  pedidos: { t: 'Pedidos', sub: 'Histórico completo, atualizando sozinho' },
  kds: { t: 'Cozinha', sub: 'Quadro de preparo em tempo real' },
  catalogo: { t: 'Cardápio', sub: 'Gestão de itens' },
  lojas: { t: 'Status das lojas', sub: 'Aberta ou fechada agora, loja a loja' },
  financeiro: { t: 'Financeiro', sub: 'Faturamento, ticket médio e repasses' },
  auditoria: { t: 'Histórico', sub: 'Tudo que a equipe alterou, em ordem' },
}

// Rede de segurança: uma view sem entrada aqui nunca mais deve quebrar o header.
const TITULO_PADRAO = { t: 'Painel', sub: '' }

// Views que se atualizam sozinhas — o selo "Ao vivo" no header existe pra deixar claro que a
// tela relê os pedidos por conta própria, e (junto com o estado de erro) pra dar onde olhar
// quando a leitura falha.
const AO_VIVO = { kds: '10s', pedidos: '15s' }

const PAPEIS = [
  { valor: 'administrador', label: 'Administrador' },
  { valor: 'gerente', label: 'Gerente' },
  { valor: 'operador', label: 'Operador' },
]
const PAPEIS_QUE_PODEM_CRIAR = new Set(['administrador', 'gerente'])

// Abas do Cardápio (gerente pra cima). Antes eram 4 modais na sidebar; agora são sub-telas do
// próprio Cardápio, que é onde a pessoa já está quando precisa delas.
const ABAS_CARDAPIO = [
  { chave: 'itens', label: 'Itens', Icon: Tag },
  { chave: 'categorias', label: 'Categorias', Icon: Tags },
  { chave: 'complementos', label: 'Complementos', Icon: Layers },
  { chave: 'horario', label: 'Horário', Icon: Clock },
  { chave: 'interrupcoes', label: 'Interrupções', Icon: PowerOff },
]

const CHAVE_SIDEBAR = 'sidebar_aberta'

function campoPreenchido(valor) {
  return String(valor ?? '').trim().length > 0
}

// Usado tanto pra dar a alguém uma senha inicial (ao definir por um admin) quanto pra
// redefinir a de quem já tem conta — sempre sem depender de e-mail chegar.
function FormDefinirSenha({ usuario, carregando, onConfirmar, onCancelar, C }) {
  const [modo, setModo] = useState('aleatoria')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (modo === 'especifica') {
      if (senha.length < 6) {
        setErro('A senha precisa ter pelo menos 6 caracteres.')
        return
      }
      onConfirmar(senha)
    } else {
      onConfirmar('')
    }
  }

  const botaoEstiloAtivo = { background: C.marca, color: C.marcaTexto }
  const botaoEstiloInativo = { background: C.inputBg, color: C.text2 }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: C.cardBorder }}>
        <button
          type="button"
          onClick={() => setModo('aleatoria')}
          className="flex-1 text-xs font-semibold py-2 transition-colors"
          style={modo === 'aleatoria' ? botaoEstiloAtivo : botaoEstiloInativo}
        >
          Gerar aleatória
        </button>
        <button
          type="button"
          onClick={() => setModo('especifica')}
          className="flex-1 text-xs font-semibold py-2 transition-colors"
          style={modo === 'especifica' ? botaoEstiloAtivo : botaoEstiloInativo}
        >
          Escolher senha
        </button>
      </div>

      {modo === 'especifica' ? (
        <input
          type="text"
          autoFocus
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Nova senha (mín. 6 caracteres)"
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: C.inputBg, color: C.text1, border: `1px solid ${C.cardBorder}` }}
        />
      ) : (
        <p className="text-xs leading-relaxed" style={{ color: C.text2 }}>
          O sistema gera uma senha segura e mostra ela na próxima tela, pra você repassar pra{' '}
          {usuario.nome} por fora (WhatsApp, presencial etc).
        </p>
      )}

      {erro && (
        <p
          className="text-xs rounded-lg px-3 py-2"
          style={{ color: C.bad, background: C.badBg, border: `1px solid ${C.badBd}` }}
        >
          {erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={carregando}
          className="botao-primario flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
        >
          {carregando && <Loader2 size={13} className="animate-spin" />}
          {carregando ? 'Salvando...' : modo === 'especifica' ? 'Definir essa senha' : 'Gerar e definir'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="text-xs font-semibold px-3.5 py-2.5 rounded-xl"
          style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

let contadorToast = 0
const CHAVE_SESSAO = 'sessao_ifood_v1'

function Painel({ sessao, onSair, tema, setTema, C }) {
  const { marca } = useContext(MarcaContext)

  const [itens, setItens] = useState([])
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erroCarregamento, setErroCarregamento] = useState('')

  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS')
  const [filtroStatus, setFiltroStatus] = useState('TODOS')

  const [form, setForm] = useState({ nome: '', categoria: '', novaCategoria: '', codigo_pdv: '', preco: '', foto: '' })
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [alterandoStatus, setAlterandoStatus] = useState(null)

  const podeCriarItem = PAPEIS_QUE_PODEM_CRIAR.has(sessao.usuario.papel)

  const [lojas, setLojas] = useState([])
  const [lojaForm, setLojaForm] = useState({ nome: '', merchant_id: '', plataforma: 'ifood' })
  const [criandoLoja, setCriandoLoja] = useState(false)
  const [lojaId, setLojaId] = useState('')
  const [modalLojas, setModalLojas] = useState(false)
  // Selo "verificada no iFood": ids que o GET /merchants do iFood reconhece. null = ainda não
  // consultado; { disponivel:false } = iFood não respondeu (não mostra selo).
  const [verificacaoIfood, setVerificacaoIfood] = useState(null)
  const [modalDetalhesLoja, setModalDetalhesLoja] = useState(false)
  const [carregandoDetalhesLoja, setCarregandoDetalhesLoja] = useState(false)
  const [detalhesLoja, setDetalhesLoja] = useState(null)
  const [disponibilidadeLoja, setDisponibilidadeLoja] = useState(null)

  const [modalUsuarios, setModalUsuarios] = useState(false)
  const [usuarios, setUsuarios] = useState([])
  const [conviteForm, setConviteForm] = useState({ nome: '', email: '', papel: 'operador' })
  const [convidando, setConvidando] = useState(false)
  const [resetandoSenha, setResetandoSenha] = useState(null)
  const [senhaResetada, setSenhaResetada] = useState(null)
  const [modalDefinirSenha, setModalDefinirSenha] = useState(null)

  const [modalMinhaSenha, setModalMinhaSenha] = useState(false)
  const [minhaSenhaForm, setMinhaSenhaForm] = useState({ senha: '', confirmacao: '' })
  const [salvandoMinhaSenha, setSalvandoMinhaSenha] = useState(false)
  const [erroMinhaSenha, setErroMinhaSenha] = useState('')

  const [selecionados, setSelecionados] = useState(new Set())
  const [executandoMassa, setExecutandoMassa] = useState(false)
  const [progressoMassa, setProgressoMassa] = useState(null)
  const [modalAcoesMassa, setModalAcoesMassa] = useState(false)
  const [modalRelacionados, setModalRelacionados] = useState(null)
  const [modalPausar, setModalPausar] = useState(null) // { titulo, descricao, alvos, motivoInicial }
  const [modalInsumo, setModalInsumo] = useState(false)
  const [modalRupturas, setModalRupturas] = useState(false)
  const [modalMarca, setModalMarca] = useState(false)
  const [pausasAtivas, setPausasAtivas] = useState([])
  const [carregandoPausas, setCarregandoPausas] = useState(false)
  const [erroPausas, setErroPausas] = useState('')
  const [registroPausas, setRegistroPausas] = useState(true)

  const [modalEdicao, setModalEdicao] = useState(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [salvandoTurnos, setSalvandoTurnos] = useState(false)

  const [itemExcluindo, setItemExcluindo] = useState(null)

  const [modalCategorias, setModalCategorias] = useState(false)
  const [modalGruposOpcao, setModalGruposOpcao] = useState(false)
  const [modalCombo, setModalCombo] = useState(false)
  const [modalHorario, setModalHorario] = useState(false)
  const [modalInterrupcoes, setModalInterrupcoes] = useState(false)

  const [view, setView] = useState('dashboard')
  const [modalNovoItem, setModalNovoItem] = useState(false)
  const [edicaoInline, setEdicaoInline] = useState(null) // { itemId, campo: 'preco' | 'pdv', valor }
  const [linhaSalvando, setLinhaSalvando] = useState(null)
  const [linhaSalva, setLinhaSalva] = useState(null)

  const [auditoria, setAuditoria] = useState([])
  const [toasts, setToasts] = useState([])
  const [confirmacao, setConfirmacao] = useState(null)

  const [sidebarAberta, setSidebarAberta] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_SIDEBAR) !== '0'
    } catch {
      return true
    }
  })
  const [abaCardapio, setAbaCardapio] = useState('itens')
  // 'online' | 'reconectando' (1 falha de rede) | 'offline' (2+ seguidas ou navegador sem rede)
  const [conexao, setConexao] = useState(() => (navigator.onLine === false ? 'offline' : 'online'))
  const falhasRede = useRef(0)

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_SIDEBAR, sidebarAberta ? '1' : '0')
    } catch {
      // sem storage: só não lembra no próximo acesso
    }
  }, [sidebarAberta])

  useEffect(() => {
    const ficouOffline = () => setConexao('offline')
    const voltou = () => {
      falhasRede.current = 0
      setConexao('online')
    }
    window.addEventListener('offline', ficouOffline)
    window.addEventListener('online', voltou)
    return () => {
      window.removeEventListener('offline', ficouOffline)
      window.removeEventListener('online', voltou)
    }
  }, [])

  // `opcoes`: { sub, desfazer } — `desfazer` vira o botão "Desfazer" do aviso.
  function notificar(tipo, mensagem, opcoes = {}) {
    const id = ++contadorToast
    setToasts((prev) => [{ id, tipo, mensagem, ...opcoes }, ...prev].slice(0, 4))
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), opcoes.desfazer ? 7000 : 5000)
  }

  async function apiFetch(caminho, opcoes = {}) {
    const separador = caminho.includes('?') ? '&' : '?'
    // Usa a loja RESOLVIDA (lojaAtual), não o lojaId cru: se o id selecionado não existe
    // mais na lista (ex: loja corrigida/removida), cai na primeira loja em vez de mandar
    // um merchant morto que gera 403.
    const loja = lojaAtual?.merchant_id
    const url = loja ? `${API}${caminho}${separador}loja=${encodeURIComponent(loja)}` : `${API}${caminho}`
    let resp
    try {
      resp = await fetch(url, {
        ...opcoes,
        headers: { ...(opcoes.headers || {}), Authorization: `Bearer ${sessao.accessToken}` },
      })
    } catch (e) {
      // fetch só rejeita em falha de REDE (servidor fora, sem internet) — erro HTTP chega aqui
      // como resposta normal. Uma falha é "reconectando"; duas seguidas, "sem conexão".
      falhasRede.current += 1
      setConexao(falhasRede.current >= 2 ? 'offline' : 'reconectando')
      const erro = new Error('Sem conexão com o servidor. Tente de novo em instantes.')
      erro.cause = e
      throw erro
    }
    if (falhasRede.current) {
      falhasRede.current = 0
      setConexao('online')
    }
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
      // O backend manda `detalhe` com a resposta crua do iFood/Supabase. Sem isso o usuário
      // via só "a operação foi recusada" e não tinha como saber o motivo nem o que fazer.
      const base = dados?.erro || 'Erro inesperado ao falar com o servidor local.'
      const detalhe = String(dados?.detalhe || '').trim()
      const erro = new Error(detalhe ? `${base} — ${detalhe.slice(0, 160)}` : base)
      erro.status = resp.status
      throw erro
    }
    return dados
  }

  async function carregar() {
    setCarregando(true)
    setErroCarregamento('')
    try {
      const data = await apiFetch(lojaAtual?.plataforma === '99food' ? '/99food/catalogo' : '/catalogo')
      setItens(data.itens)
      setCategorias(data.categorias)
      carregarPausas()
    } catch (e) {
      setErroCarregamento(e.message || 'Não consegui falar com o servidor local. Ele está rodando? (python server/app.py)')
    } finally {
      setCarregando(false)
    }
  }

  // Pausas registradas pelo painel (motivo/prazo). O backend aproveita a chamada pra reativar o
  // que já venceu, então se ele devolver `reativadas > 0` o catálogo na tela está velho.
  async function carregarPausas() {
    setCarregandoPausas(true)
    setErroPausas('')
    try {
      const r = await apiFetch('/pausas')
      setPausasAtivas(r.pausas || [])
      setRegistroPausas(!!r.disponivel)
      if (r.reativadas > 0) {
        notificar('sucesso', `${r.reativadas} item(ns) com pausa vencida voltaram ao cardápio.`)
        const data = await apiFetch(lojaAtual?.plataforma === '99food' ? '/99food/catalogo' : '/catalogo')
        setItens(data.itens)
        carregarAuditoria()
      }
    } catch (e) {
      setErroPausas(e.message)
    } finally {
      setCarregandoPausas(false)
    }
  }

  async function carregarAuditoria() {
    try {
      // limite maior que os 20 exibidos na lista: os gráficos de tendência precisam
      // de mais histórico pra mostrar padrão ao longo dos dias, não só o mais recente.
      setAuditoria(await apiFetch('/auditoria?limite=200'))
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

  // Ao abrir "Gerenciar lojas", cruza a lista local com o GET /merchants do iFood pra marcar
  // quais lojas o iFood reconhece como vinculadas. Não bloqueia nada: se falhar, só não mostra
  // o selo (o endpoint volta disponivel=false).
  useEffect(() => {
    if (!modalLojas) return
    let cancelado = false
    apiFetch('/lojas-verificacao-ifood')
      .then((r) => {
        if (!cancelado) setVerificacaoIfood({ disponivel: !!r?.disponivel, ids: new Set(r?.merchant_ids || []) })
      })
      .catch(() => {
        if (!cancelado) setVerificacaoIfood({ disponivel: false, ids: new Set() })
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalLojas])

  async function abrirDetalhesLoja() {
    setModalDetalhesLoja(true)
    setCarregandoDetalhesLoja(true)
    try {
      const [detalhes, disponibilidade] = await Promise.all([apiFetch('/loja/detalhes'), apiFetch('/loja/disponibilidade')])
      setDetalhesLoja(detalhes)
      setDisponibilidadeLoja(disponibilidade)
    } catch (e) {
      notificar('erro', `Não consegui buscar os dados da loja: ${e.message}`)
    } finally {
      setCarregandoDetalhesLoja(false)
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
      setLojaForm({ nome: '', merchant_id: '', plataforma: 'ifood' })
      carregarLojas()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCriandoLoja(false)
    }
  }

  async function removerLoja(loja) {
    try {
      await apiFetch(`/lojas/${loja.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: loja.nome }),
      })
      setLojas((prev) => prev.filter((l) => l.id !== loja.id))
      if (lojaId === loja.merchant_id) setLojaId('')
      notificar('sucesso', `Loja "${loja.nome}" removida.`)
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  function pedirConfirmacaoRemoverLoja(loja) {
    setConfirmacao({
      titulo: 'Remover loja?',
      mensagem: `Isso tira "${loja.nome || loja.merchant_id}" da lista aqui do painel. Os itens continuam existindo no iFood — só o atalho pra essa loja some.`,
      textoConfirmar: 'Remover',
      perigo: true,
      aoConfirmar: () => removerLoja(loja),
    })
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

  async function trocarPapelUsuario(id, papel, nome) {
    try {
      await apiFetch(`/usuarios/${id}/papel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papel, nome }),
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
      const data = await apiFetch('/usuarios/convidar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conviteForm),
      })
      notificar('sucesso', `Usuário "${conviteForm.nome}" criado.`)
      setConviteForm({ nome: '', email: '', papel: 'operador' })
      setSenhaResetada({ usuario: { nome: data.nome }, senha: data.senha })
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
  // senhaEscolhida vazia = backend gera uma aleatória; preenchida = usa exatamente essa.
  async function resetarSenhaUsuario(usuario, senhaEscolhida = '') {
    setResetandoSenha(usuario.id)
    try {
      const data = await apiFetch(`/usuarios/${usuario.id}/resetar-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha: senhaEscolhida, nome: usuario.nome }),
      })
      setModalDefinirSenha(null)
      setSenhaResetada({ usuario, senha: data.senha })
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setResetandoSenha(null)
    }
  }

  // Qualquer usuário logado troca a própria senha, sem depender de e-mail — pensado pra quem
  // recebeu uma senha inicial de um administrador e quer definir uma só sua.
  async function handleTrocarMinhaSenha(e) {
    e.preventDefault()
    setErroMinhaSenha('')
    if (minhaSenhaForm.senha.length < 6) {
      setErroMinhaSenha('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (minhaSenhaForm.senha !== minhaSenhaForm.confirmacao) {
      setErroMinhaSenha('As senhas não são iguais.')
      return
    }
    setSalvandoMinhaSenha(true)
    try {
      await definirSenha(sessao.accessToken, minhaSenhaForm.senha)
      await marcarSenhaTrocada(sessao.accessToken)
      notificar('sucesso', 'Senha alterada.')
      setModalMinhaSenha(false)
      setMinhaSenhaForm({ senha: '', confirmacao: '' })
    } catch (e) {
      setErroMinhaSenha(e.message)
    } finally {
      setSalvandoMinhaSenha(false)
    }
  }

  useEffect(() => {
    carregar()
    carregarAuditoria()
    carregarLojas()
    if (sessao.usuario.papel === 'administrador') carregarUsuarios()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (lojas.length) {
      carregar()
      carregarAuditoria() // recarrega a auditoria por loja ao trocar de loja (senão o dashboard fica com a loja anterior)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId])

  // Se a loja selecionada não existe mais na lista (ex: foi corrigida/removida no banco),
  // limpa o lojaId pra cair na primeira loja — evita ficar pedindo um merchant morto (403).
  useEffect(() => {
    if (lojas.length && lojaId && !lojas.some((l) => l.merchant_id === lojaId)) {
      setLojaId('')
    }
  }, [lojas, lojaId])

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

  async function handleSubmit() {
    setErroForm('')
    if (!formValido) {
      setErroForm('Preencha todos os campos antes de criar o item.')
      return
    }
    setSalvando(true)
    try {
      let imagemPath
      if (form.foto) {
        const up = await apiFetch('/imagens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagem: form.foto }),
        })
        imagemPath = up.imagem_path
      }
      await apiFetch('/itens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          categoria: categoriaFinal.trim(),
          codigo_pdv: form.codigo_pdv.trim(),
          preco: form.preco,
          imagem_path: imagemPath,
        }),
      })
      notificar('sucesso', `Item "${form.nome}" criado.`)
      setForm({ nome: '', categoria: '', novaCategoria: '', codigo_pdv: '', preco: '', foto: '' })
      setModalNovoItem(false)
      carregar()
      carregarAuditoria()
    } catch (e) {
      setErroForm(e.message)
      notificar('erro', e.message)
    } finally {
      setSalvando(false)
    }
  }

  // Rota de status de um alvo. `alvo.tipo` é 'item' ou 'opcao' (complemento); `loja` só vem
  // preenchida na replicação pra outra loja — o ?loja= no caminho tem prioridade sobre o que o
  // apiFetch acrescenta (o Flask lê o primeiro valor).
  function caminhoStatus(alvo, loja) {
    const plataforma = loja ? loja.plataforma : lojaAtual?.plataforma
    let caminho
    if (alvo.tipo === 'opcao') caminho = `/grupos-opcao/${alvo.grupoId}/opcoes/${alvo.id}/status`
    else if (plataforma === '99food') caminho = `/99food/itens/${alvo.id}/status`
    else caminho = `/itens/${alvo.id}/status`
    return loja ? `${caminho}?loja=${encodeURIComponent(loja.merchant_id)}` : caminho
  }

  function alvoDoItem(item, extras = {}) {
    return {
      chave: `item:${item.itemId}`,
      tipo: 'item',
      id: item.itemId,
      nome: item.nome,
      codigo_pdv: item.codigo_pdv || '',
      status: item.status,
      ...extras,
    }
  }

  // Toggle direto de um único item, sem checar relacionados (usado pra despausar quando não há
  // nenhum item parecido, quando o usuário escolhe "só este item" e no despausar rápido do Painel).
  async function executarAlternarStatus(item, novoStatus) {
    setAlterandoStatus(item.itemId)
    try {
      await apiFetch(caminhoStatus(alvoDoItem(item)), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, nome: item.nome, codigo_pdv: item.codigo_pdv || '' }),
      })
      setItens((prev) => prev.map((i) => (i.itemId === item.itemId ? { ...i, status: novoStatus } : i)))
      notificar('sucesso', `"${item.nome}" ${novoStatus === 'UNAVAILABLE' ? 'pausado' : 'despausado'}.`)
      carregarAuditoria()
      carregarPausas()
    } catch (e) {
      notificar('erro', `Não consegui alterar "${item.nome}": ${e.message}`)
    } finally {
      setAlterandoStatus(null)
    }
  }

  function abrirPausar(alvos, { titulo, descricao, motivoInicial = '' } = {}) {
    setModalPausar({ alvos, titulo, descricao, motivoInicial })
  }

  // Atalho P = "Pausar item" (o botão do topo da sidebar). Não dispara digitando num campo nem
  // com outro painel aberto por cima.
  useEffect(() => {
    function aoTeclar(e) {
      if (e.key !== 'p' && e.key !== 'P') return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const alvo = e.target
      const tag = alvo?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo?.isContentEditable) return
      if (document.querySelector('[aria-modal="true"]')) return
      e.preventDefault()
      setModalPausar({ alvos: [] })
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  // Clique no botão da linha. Pausar abre o modal de motivo/prazo já com os itens parecidos
  // sugeridos (ex: mesma proteína em tamanhos "Com/Fam/Exec" — ruptura de insumo, onde travar
  // 1 por 1 é lento). Despausar continua direto, perguntando só pelos parecidos.
  function prepararAlternarStatus(item) {
    const novoStatus = item.status === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE'
    const relacionados = encontrarRelacionados(item, itens).filter((i) => i.status !== novoStatus)
    if (novoStatus === 'UNAVAILABLE') {
      abrirPausar(
        [alvoDoItem(item, { marcado: true }), ...relacionados.map((r) => alvoDoItem(r, { marcado: true, sugerido: true }))],
        {
          titulo: `Pausar "${item.nome}"`,
          descricao: relacionados.length
            ? `Marcamos também ${relacionados.length} ${relacionados.length === 1 ? 'item parecido' : 'itens parecidos'} — desmarque o que não faltar.`
            : '',
        },
      )
      return
    }
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

  // Aplica um status a vários alvos, um por vez (as APIs não têm status em lote), com barra de
  // progresso. Cada tarefa é um alvo { tipo, id, grupoId?, nome, codigo_pdv } com `loja`
  // opcional (replicação pra outra loja). `extras` = { minutos, motivo } da pausa.
  async function executarStatusEmLote(tarefas, status, extras = {}) {
    setExecutandoMassa(true)
    setProgressoMassa({ atual: 0, total: tarefas.length, status })
    try {
      const resultados = []
      for (let i = 0; i < tarefas.length; i++) {
        const t = tarefas[i]
        try {
          await apiFetch(caminhoStatus(t, t.loja), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, nome: t.nome, codigo_pdv: t.codigo_pdv || '', ...extras }),
          })
          resultados.push({ t, ok: true })
        } catch (e) {
          resultados.push({ t, ok: false, erro: e.message })
          // sessão caiu no meio da operação: não adianta insistir no resto da fila
          if (e.message.includes('sessão expirou')) break
        }
        setProgressoMassa({ atual: i + 1, total: tarefas.length, status })
        if (i < tarefas.length - 1) await new Promise((resolve) => setTimeout(resolve, 150))
      }

      const okAqui = new Set(resultados.filter((r) => r.ok && !r.t.loja && r.t.tipo === 'item').map((r) => r.t.id))
      setItens((prev) => prev.map((i) => (okAqui.has(i.itemId) ? { ...i, status } : i)))
      const ok = resultados.filter((r) => r.ok).length
      const total = resultados.length
      const acao = status === 'UNAVAILABLE' ? 'pausados' : 'reativados'
      if (ok < total) {
        const falhas = resultados.filter((r) => !r.ok).map((r) => `${r.t.nome}${r.t.loja ? ` (${r.t.loja.nome})` : ''}`)
        notificar('aviso', `${ok} de ${total} ${acao}. Falharam: ${falhas.slice(0, 3).join(', ')}${falhas.length > 3 ? '...' : ''}`)
      } else {
        notificar('sucesso', `${ok} ${ok === 1 ? 'item' : 'itens'} ${acao}.`)
      }
      carregarAuditoria()
      carregarPausas()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setExecutandoMassa(false)
      setProgressoMassa(null)
    }
  }

  // Pausa multicanal: acha o mesmo item nas outras lojas pelo código PDV (é o único identificador
  // que o iFood e o 99 compartilham) e devolve as tarefas extras. Loja que falhar ao carregar
  // vira aviso, não bloqueia a pausa na loja atual.
  async function tarefasEmOutrasLojas(alvos, lojasExtras) {
    const pdvs = new Set(alvos.filter((a) => a.tipo === 'item' && a.codigo_pdv).map((a) => a.codigo_pdv))
    const tarefas = []
    for (const loja of lojasExtras) {
      try {
        const base = loja.plataforma === '99food' ? '/99food/catalogo' : '/catalogo'
        const data = await apiFetch(`${base}?loja=${encodeURIComponent(loja.merchant_id)}`)
        const achados = (data.itens || []).filter((i) => i.codigo_pdv && pdvs.has(i.codigo_pdv))
        if (!achados.length) notificar('aviso', `${loja.nome}: nenhum item com os mesmos códigos PDV.`)
        achados.forEach((i) => tarefas.push({ ...alvoDoItem(i), loja }))
      } catch (e) {
        notificar('aviso', `Não consegui ler o cardápio de ${loja.nome}: ${e.message}`)
      }
    }
    return tarefas
  }

  async function confirmarPausa({ alvos, minutos, motivo, lojasExtras }) {
    const extras = lojasExtras.length ? await tarefasEmOutrasLojas(alvos, lojasExtras) : []
    setModalPausar(null)
    setSelecionados(new Set())
    setModalAcoesMassa(false)
    await executarStatusEmLote([...alvos, ...extras], 'UNAVAILABLE', { minutos, motivo })
  }

  function paraAlvos(ids) {
    return ids.map((id) => alvoDoItem(itens.find((i) => i.itemId === id) || { itemId: id, nome: '' }))
  }

  function pausarSelecionados() {
    const alvos = paraAlvos(Array.from(selecionados)).map((a) => ({ ...a, marcado: true }))
    if (!alvos.length) return
    abrirPausar(alvos, { titulo: `Pausar ${alvos.length} ${alvos.length === 1 ? 'item' : 'itens'}` })
  }

  async function acaoEmMassa(status) {
    if (status === 'UNAVAILABLE') {
      pausarSelecionados()
      return
    }
    const ids = Array.from(selecionados)
    if (!ids.length) return
    await executarStatusEmLote(paraAlvos(ids), status)
    setSelecionados(new Set())
    setModalAcoesMassa(false)
  }

  async function confirmarModalRelacionados() {
    const { item, novoStatus, selecionados: sel } = modalRelacionados
    const ids = [item.itemId, ...Array.from(sel)]
    setModalRelacionados(null)
    await executarStatusEmLote(paraAlvos(ids), novoStatus)
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

  const DIAS_SEMANA = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  function abrirEdicao(item) {
    setModalEdicao({
      item,
      nome: item.nome || '',
      preco: String(item.preco ?? ''),
      codigoPdv: item.codigo_pdv || '',
      foto: item.foto || '',
      fotoNova: '',
      turnoAtivo: false,
      turnoInicio: '11:00',
      turnoFim: '15:00',
      turnoDias: new Set(DIAS_SEMANA),
    })
  }

  async function salvarTurnos() {
    const { item, turnoAtivo, turnoInicio, turnoFim, turnoDias } = modalEdicao
    if (turnoAtivo && turnoDias.size === 0) {
      notificar('erro', 'Marque ao menos um dia da semana pro turno.')
      return
    }
    setSalvandoTurnos(true)
    try {
      const turnos = turnoAtivo
        ? [
            {
              startTime: turnoInicio,
              endTime: turnoFim,
              ...Object.fromEntries(DIAS_SEMANA.map((d) => [d, turnoDias.has(d)])),
            },
          ]
        : [{ startTime: '00:00', endTime: '23:59', ...Object.fromEntries(DIAS_SEMANA.map((d) => [d, true])) }]
      await apiFetch(`/itens/${item.itemId}/turnos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnos, nome: item.nome }),
      })
      notificar('sucesso', `Turno de "${item.nome}" atualizado.`)
      carregarAuditoria()
    } catch (e) {
      notificar('erro', `Não consegui salvar o turno: ${e.message}`)
    } finally {
      setSalvandoTurnos(false)
    }
  }

  async function excluirItemDeVerdade(item) {
    try {
      await apiFetch(`/itens/${item.itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: item.categoryId, productId: item.productId, nome: item.nome }),
      })
      setItens((prev) => prev.filter((i) => i.itemId !== item.itemId))
      notificar('sucesso', `"${item.nome}" excluído do catálogo.`)
      carregarAuditoria()
    } catch (e) {
      notificar('erro', `Não consegui excluir "${item.nome}": ${e.message}`)
    } finally {
      setItemExcluindo(null)
    }
  }

  function pedirConfirmacaoExcluirItem(item) {
    setConfirmacao({
      titulo: 'Excluir item?',
      mensagem: `Isso remove "${item.nome}" de vez do catálogo no iFood — diferente de pausar, não dá pra desfazer com um clique.`,
      textoConfirmar: 'Excluir',
      perigo: true,
      aoConfirmar: () => {
        setItemExcluindo(item.itemId)
        excluirItemDeVerdade(item)
      },
    })
  }

  async function salvarEdicao() {
    const { item, nome, preco, codigoPdv, foto, fotoNova } = modalEdicao
    const precoNum = Number(String(preco).replace(',', '.'))
    if (!precoNum || precoNum <= 0) {
      notificar('erro', 'Preço deve ser maior que zero.')
      return
    }
    if (!codigoPdv.trim()) {
      notificar('erro', 'Código PDV não pode ficar vazio.')
      return
    }
    if (!nome.trim()) {
      notificar('erro', 'Nome não pode ficar vazio.')
      return
    }

    setSalvandoEdicao(true)
    try {
      const nomeMudou = nome.trim() !== item.nome
      const fotoMudou = !!fotoNova

      // 99Food: um único PATCH combinado (nome/preço/PDV) — evita reler o cardápio várias
      // vezes por causa do rate-limit. Foto ainda não é suportada por aqui no 99.
      if (lojaAtual?.plataforma === '99food') {
        if (fotoNova) notificar('info', 'Foto ainda não é suportada no 99Food por aqui — salvando nome/preço/PDV.')
        await apiFetch(`/99food/itens/${item.itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: nome.trim(), preco: precoNum, codigo_pdv: codigoPdv.trim() }),
        })
        setItens((prev) =>
          prev.map((i) =>
            i.itemId === item.itemId ? { ...i, nome: nome.trim(), preco: precoNum, codigo_pdv: codigoPdv.trim() } : i
          )
        )
        notificar('sucesso', `"${nome.trim()}" atualizado.`)
        setModalEdicao(null)
        carregarAuditoria()
        return
      }

      if (nomeMudou || fotoMudou) {
        // Nome e foto só existem via PUT completo do item (não tem PATCH dedicado no iFood
        // pra isso) — então reenvia tudo de uma vez, inclusive preço/PDV atuais do form.
        let imagemPath = foto || undefined
        if (fotoNova) {
          const up = await apiFetch('/imagens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagem: fotoNova }),
          })
          imagemPath = up.imagem_path
        }
        await apiFetch(`/itens/${item.itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: item.productId,
            category_id: item.categoryId,
            nome: nome.trim(),
            preco: precoNum,
            codigo_pdv: codigoPdv.trim(),
            status: item.status,
            imagem_path: imagemPath,
          }),
        })
        setItens((prev) =>
          prev.map((i) =>
            i.itemId === item.itemId
              ? { ...i, nome: nome.trim(), preco: precoNum, codigo_pdv: codigoPdv.trim(), foto: imagemPath }
              : i
          )
        )
        notificar('sucesso', `"${nome.trim()}" atualizado.`)
        setModalEdicao(null)
        carregarAuditoria()
        return
      }

      const tarefas = []
      if (precoNum !== Number(item.preco)) {
        tarefas.push(
          apiFetch(lojaAtual?.plataforma === '99food' ? `/99food/itens/${item.itemId}/preco` : `/itens/${item.itemId}/preco`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              preco: precoNum,
              nome: item.nome,
              preco_anterior: `R$ ${Number(item.preco).toFixed(2).replace('.', ',')}`,
            }),
          })
        )
      }
      if (codigoPdv.trim() !== item.codigo_pdv) {
        tarefas.push(
          apiFetch(lojaAtual?.plataforma === '99food' ? `/99food/itens/${item.itemId}/codigo-pdv` : `/itens/${item.itemId}/codigo-pdv`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codigo_pdv: codigoPdv.trim(), nome: item.nome, codigo_anterior: item.codigo_pdv }),
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

  // Edição de um campo direto na linha da tabela (clique no preço ou no código PDV), sem
  // abrir o modal de edição completo — pensado pra ajuste rápido de um único campo.
  function abrirEdicaoInline(item, campo) {
    setEdicaoInline({ itemId: item.itemId, campo, valor: campo === 'preco' ? String(item.preco ?? '') : item.codigo_pdv || '' })
  }

  function onEdicaoInlineInput(valor) {
    setEdicaoInline((prev) => (prev ? { ...prev, valor } : prev))
  }

  async function salvarEdicaoInline() {
    const atual = edicaoInline
    setEdicaoInline(null)
    if (!atual) return
    const item = itens.find((i) => i.itemId === atual.itemId)
    if (!item) return

    if (atual.campo === 'preco') {
      const precoNum = Number(String(atual.valor).replace(',', '.'))
      if (!precoNum || precoNum <= 0 || precoNum === Number(item.preco)) return
      setLinhaSalvando(item.itemId)
      try {
        await apiFetch(lojaAtual?.plataforma === '99food' ? `/99food/itens/${item.itemId}/preco` : `/itens/${item.itemId}/preco`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preco: precoNum,
            nome: item.nome,
            preco_anterior: `R$ ${Number(item.preco).toFixed(2).replace('.', ',')}`,
          }),
        })
        setItens((prev) => prev.map((i) => (i.itemId === item.itemId ? { ...i, preco: precoNum } : i)))
        notificar('sucesso', `Preço de "${item.nome}" atualizado.`)
        setLinhaSalva(item.itemId)
        carregarAuditoria()
        setTimeout(() => setLinhaSalva((atualId) => (atualId === item.itemId ? null : atualId)), 1700)
      } catch (e) {
        notificar('erro', `Não consegui salvar: ${e.message}`)
      } finally {
        setLinhaSalvando(null)
      }
      return
    }

    const codigo = String(atual.valor).trim()
    if (!codigo || codigo === item.codigo_pdv) return
    setLinhaSalvando(item.itemId)
    try {
      await apiFetch(lojaAtual?.plataforma === '99food' ? `/99food/itens/${item.itemId}/codigo-pdv` : `/itens/${item.itemId}/codigo-pdv`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_pdv: codigo, nome: item.nome, codigo_anterior: item.codigo_pdv }),
      })
      setItens((prev) => prev.map((i) => (i.itemId === item.itemId ? { ...i, codigo_pdv: codigo } : i)))
      notificar('sucesso', `Código PDV de "${item.nome}" atualizado.`)
      setLinhaSalva(item.itemId)
      carregarAuditoria()
      setTimeout(() => setLinhaSalva((atualId) => (atualId === item.itemId ? null : atualId)), 1700)
    } catch (e) {
      notificar('erro', `Não consegui salvar: ${e.message}`)
    } finally {
      setLinhaSalvando(null)
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

  const outrasLojas = useMemo(() => lojas.filter((l) => l.merchant_id !== lojaAtual?.merchant_id), [lojas, lojaAtual])
  const pausasPorItem = useMemo(
    () => Object.fromEntries(pausasAtivas.filter((p) => p.tipo === 'item').map((p) => [p.alvo_id, p])),
    [pausasAtivas],
  )
  // Badge de Rupturas: itens pausados + complementos pausados pelo painel (esses não estão em `itens`).
  const totalRupturas = totalPausados + pausasAtivas.filter((p) => p.tipo === 'opcao').length

  const inputCls = 'w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all'
  const inputStyle = { background: C.inputBg, color: C.text1, border: `1px solid ${C.cardBorder}` }

  function fecharToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  // Administração ainda abre os painéis de sempre (vira tela própria numa etapa seguinte).
  function mudarView(chave) {
    if (chave === 'usuarios') return abrirModalUsuarios()
    if (chave === 'lojas-admin') return setModalLojas(true)
    if (chave === 'marca') return setModalMarca(true)
    setView(chave)
  }

  return (
    <CoresContext.Provider value={C}>
      <div>
        <Toasts toasts={toasts} onFechar={fecharToast} />

        {confirmacao && (
          <Dialogo
            alerta
            largura={440}
            titulo={confirmacao.titulo}
            onClose={() => setConfirmacao(null)}
            rodape={
              <>
                <span style={{ flex: 1 }} />
                <Botao variante="secundario" tamanho="lg" onClick={() => setConfirmacao(null)}>
                  {confirmacao.textoCancelar || 'Cancelar'}
                </Botao>
                {confirmacao.alternativa && (
                  <Botao
                    variante="secundario"
                    tamanho="lg"
                    onClick={() => {
                      confirmacao.alternativa.aoEscolher()
                      setConfirmacao(null)
                    }}
                  >
                    {confirmacao.alternativa.texto}
                  </Botao>
                )}
                <Botao
                  variante={confirmacao.perigo ? 'perigo' : 'primario'}
                  tamanho="lg"
                  onClick={() => {
                    confirmacao.aoConfirmar()
                    setConfirmacao(null)
                  }}
                >
                  {confirmacao.textoConfirmar}
                </Botao>
              </>
            }
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: confirmacao.perigo ? 'var(--bad-bg)' : 'var(--marca-suave)',
                  color: confirmacao.perigo ? 'var(--bad)' : 'var(--marca-tinta)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {confirmacao.perigo ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'var(--t2)', lineHeight: 1.5, textWrap: 'pretty' }}>{confirmacao.mensagem}</p>
            </div>
          </Dialogo>
        )}

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
                      background: ativa ? C.marca + '1F' : C.inputBg,
                      border: `1px solid ${ativa ? C.marca : C.cardBorder}`,
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
                      <span className="flex items-center gap-1.5">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: C.text2 }}
                        >
                          {l.plataforma === '99food' ? '99Food' : 'iFood'}
                        </span>
                        {l.plataforma !== '99food' && verificacaoIfood?.disponivel && (
                          verificacaoIfood.ids.has(String(l.merchant_id)) ? (
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                              style={{ color: C.good, background: C.goodBg }}
                              title="Loja reconhecida pelo GET /merchants do iFood (vinculada às credenciais)"
                            >
                              <Check size={9} /> verificada no iFood
                            </span>
                          ) : (
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ color: C.neutral, background: C.neutralBg }}
                              title="O iFood não retornou essa loja no GET /merchants pras credenciais atuais"
                            >
                              não encontrada no iFood
                            </span>
                          )
                        )}
                      </span>
                    </button>
                    {ativa && <Pill color={C.good}>Ativa</Pill>}
                    {ativa && (
                      <button
                        type="button"
                        onClick={abrirDetalhesLoja}
                        title="Ver detalhes e disponibilidade da loja"
                        className="botao-icone-fantasma text-[10px] font-semibold px-2 py-1.5 rounded-lg flex-shrink-0"
                        style={{ color: C.text2, border: `1px solid ${C.cardBorder}` }}
                      >
                        Detalhes
                      </button>
                    )}
                    {sessao.usuario.papel === 'administrador' && (
                      <button
                        type="button"
                        onClick={() => pedirConfirmacaoRemoverLoja(l)}
                        title="Remover loja"
                        className="w-7 h-7 inline-flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{ color: C.bad, background: C.badBg }}
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
                  <select
                    className={inputCls}
                    style={inputStyle}
                    value={lojaForm.plataforma}
                    onChange={(e) => setLojaForm({ ...lojaForm, plataforma: e.target.value })}
                  >
                    <option value="ifood">iFood</option>
                    <option value="99food">99Food</option>
                  </select>
                  <input
                    required
                    className={inputCls}
                    style={inputStyle}
                    type="text"
                    value={lojaForm.merchant_id}
                    onChange={(e) => setLojaForm({ ...lojaForm, merchant_id: e.target.value })}
                    placeholder={lojaForm.plataforma === '99food' ? 'App Shop ID do 99Food' : 'Merchant ID do iFood'}
                  />
                  <button
                    type="submit"
                    disabled={criandoLoja}
                    className="botao-primario flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                  >
                    {criandoLoja && <Loader2 size={12} className="animate-spin" />}
                    {criandoLoja ? 'Cadastrando...' : 'Cadastrar loja'}
                  </button>
                  {lojaForm.plataforma === 'ifood' ? (
                    <p className="text-[10px]" style={{ color: C.text3 }}>
                      Não sabe o Merchant ID? Rode <code>python scripts/descobrir_lojas.py</code> no backend.
                    </p>
                  ) : (
                    <p className="text-[10px]" style={{ color: C.text3 }}>
                      App Shop ID = o ID que você deu à loja no 99Food (ex: 5764607576333878701).
                    </p>
                  )}
                </form>
              </div>
            )}
          </Modal>
        )}

        {modalDetalhesLoja && (
          <Modal titulo="Detalhes e disponibilidade da loja" onClose={() => setModalDetalhesLoja(false)}>
            {carregandoDetalhesLoja && (
              <p className="text-xs flex items-center gap-1.5" style={{ color: C.text2 }}>
                <Loader2 size={12} className="animate-spin" /> Carregando...
              </p>
            )}

            {!carregandoDetalhesLoja && detalhesLoja && (
              <div className="flex flex-col gap-3.5 mb-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: C.text1 }}>
                    {detalhesLoja.name}
                  </p>
                  <p className="text-xs" style={{ color: C.text2 }}>
                    {detalhesLoja.corporateName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill color={detalhesLoja.status === 'AVAILABLE' || detalhesLoja.status === 'ENABLED' ? C.good : C.neutral}>
                    Status da conta: {detalhesLoja.status}
                  </Pill>
                  {detalhesLoja.test === 'TEST' && <Pill color={C.neutral}>Sandbox</Pill>}
                </div>
                {detalhesLoja.address && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: C.text2 }}>
                      Endereço
                    </p>
                    <p className="text-xs" style={{ color: C.text1 }}>
                      {detalhesLoja.address.street}, {detalhesLoja.address.number} — {detalhesLoja.address.district}
                      <br />
                      {detalhesLoja.address.city}/{detalhesLoja.address.state}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!carregandoDetalhesLoja && Array.isArray(disponibilidadeLoja) && (
              <div className="border-t pt-3.5 flex flex-col gap-2.5" style={{ borderColor: C.cardBorder }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.text2 }}>
                  Disponibilidade por canal
                </p>
                {disponibilidadeLoja.map((op) => (
                  <div
                    key={`${op.operation}-${op.salesChannel}`}
                    className="rounded-xl px-3.5 py-3"
                    style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: C.text1 }}>
                        {op.operation} · {op.salesChannel}
                      </span>
                      <Pill color={op.available ? C.good : C.bad} dot>
                        {op.available ? 'Disponível' : 'Indisponível'}
                      </Pill>
                    </div>
                    {op.message?.title && (
                      <p className="text-xs" style={{ color: C.text2 }}>
                        {op.message.title}
                        {op.message.subtitle ? ` — ${op.message.subtitle}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setModalDetalhesLoja(false)}
              className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl mt-3.5"
              style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              Fechar
            </button>
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
              {usuarios.map((u, idx) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-2"
                  style={{ background: C.inputBg }}
                >
                  <Avatar nome={u.nome} idx={idx} size={26} />
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
                    onChange={(e) => trocarPapelUsuario(u.id, e.target.value, u.nome)}
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
                    onClick={() => setModalDefinirSenha(u)}
                    title="Definir senha nova (não depende de e-mail)"
                    className="px-2 py-1.5 rounded-md text-[10px] font-semibold flex-shrink-0 disabled:opacity-40 flex items-center gap-1"
                    style={{ color: C.text2, background: C.cardBg, border: `1px solid ${C.cardBorder}` }}
                  >
                    {resetandoSenha === u.id && <Loader2 size={11} className="animate-spin" />}
                    Definir senha
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t pt-3.5" style={{ borderColor: C.cardBorder }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.text2 }}>
                Criar novo usuário
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
                  className="botao-primario flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                >
                  {convidando && <Loader2 size={12} className="animate-spin" />}
                  {convidando ? 'Criando...' : 'Criar usuário'}
                </button>
              </form>
            </div>
          </Modal>
        )}

        {modalMinhaSenha && (
          <Modal
            titulo="Trocar minha senha"
            onClose={() => {
              setModalMinhaSenha(false)
              setMinhaSenhaForm({ senha: '', confirmacao: '' })
              setErroMinhaSenha('')
            }}
          >
            <form onSubmit={handleTrocarMinhaSenha} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                  Nova senha
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="password"
                  autoFocus
                  autoComplete="new-password"
                  value={minhaSenhaForm.senha}
                  onChange={(e) => setMinhaSenhaForm({ ...minhaSenhaForm, senha: e.target.value })}
                  placeholder="Mín. 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                  Confirme a senha
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="password"
                  autoComplete="new-password"
                  value={minhaSenhaForm.confirmacao}
                  onChange={(e) => setMinhaSenhaForm({ ...minhaSenhaForm, confirmacao: e.target.value })}
                  placeholder="Repita a senha"
                />
              </div>
              {erroMinhaSenha && (
                <p
                  className="text-xs rounded-lg px-3 py-2"
                  style={{ color: C.bad, background: C.badBg, border: `1px solid ${C.badBd}` }}
                >
                  {erroMinhaSenha}
                </p>
              )}
              <button
                type="submit"
                disabled={salvandoMinhaSenha}
                className="botao-primario flex items-center justify-center gap-2 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
              >
                {salvandoMinhaSenha && <Loader2 size={13} className="animate-spin" />}
                {salvandoMinhaSenha ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          </Modal>
        )}

        {modalDefinirSenha && (
          <Modal titulo={`Definir senha pra ${modalDefinirSenha.nome}`} onClose={() => setModalDefinirSenha(null)}>
            <FormDefinirSenha
              usuario={modalDefinirSenha}
              carregando={resetandoSenha === modalDefinirSenha.id}
              onConfirmar={(senha) => resetarSenhaUsuario(modalDefinirSenha, senha)}
              onCancelar={() => setModalDefinirSenha(null)}
              C={C}
            />
          </Modal>
        )}

        {senhaResetada && (
          <Modal titulo={`Senha nova pra ${senhaResetada.usuario.nome}`} onClose={() => setSenhaResetada(null)}>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: C.text2 }}>
              Repasse essa senha pra pessoa por fora (WhatsApp, presencial). Ela consegue trocar
              por uma só dela depois, logada, em "Trocar minha senha".
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
                style={{ color: C.marcaTinta, background: C.marca + '1F' }}
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
                  Nome do material
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="text"
                  autoFocus
                  value={modalEdicao.nome}
                  onChange={(e) => setModalEdicao({ ...modalEdicao, nome: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                  Preço (R$)
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="text"
                  inputMode="decimal"
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
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                  Foto
                </label>
                <div className="flex items-center gap-3">
                  {(modalEdicao.fotoNova || modalEdicao.foto) && (
                    <img
                      src={modalEdicao.fotoNova || modalEdicao.foto}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      style={{ border: `1px solid ${C.cardBorder}` }}
                    />
                  )}
                  <input
                    className={`${inputCls} py-1.5`}
                    style={inputStyle}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={async (e) => {
                      const arquivo = e.target.files?.[0]
                      if (!arquivo) return
                      try {
                        const dataUrl = await lerImagemComoDataUrl(arquivo)
                        setModalEdicao((prev) => (prev ? { ...prev, fotoNova: dataUrl } : prev))
                      } catch (err) {
                        notificar('erro', err.message)
                      }
                    }}
                  />
                </div>
              </div>
              <div className="border-t pt-3.5" style={{ borderColor: C.cardBorder }}>
                <label className="flex items-center gap-2 text-xs font-semibold mb-2.5 cursor-pointer" style={{ color: C.text1 }}>
                  <input
                    type="checkbox"
                    checked={modalEdicao.turnoAtivo}
                    onChange={(e) => setModalEdicao({ ...modalEdicao, turnoAtivo: e.target.checked })}
                  />
                  Só vende em turno específico (ex: só no almoço)
                </label>
                {modalEdicao.turnoAtivo && (
                  <div className="flex flex-col gap-2.5 mb-1">
                    <div className="grid grid-cols-2 gap-2.5">
                      <input
                        type="time"
                        value={modalEdicao.turnoInicio}
                        onChange={(e) => setModalEdicao({ ...modalEdicao, turnoInicio: e.target.value })}
                        className="rounded-xl px-3 py-2 text-xs outline-none"
                        style={inputStyle}
                      />
                      <input
                        type="time"
                        value={modalEdicao.turnoFim}
                        onChange={(e) => setModalEdicao({ ...modalEdicao, turnoFim: e.target.value })}
                        className="rounded-xl px-3 py-2 text-xs outline-none"
                        style={inputStyle}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        ['monday', 'Seg'],
                        ['tuesday', 'Ter'],
                        ['wednesday', 'Qua'],
                        ['thursday', 'Qui'],
                        ['friday', 'Sex'],
                        ['saturday', 'Sáb'],
                        ['sunday', 'Dom'],
                      ].map(([chave, label]) => {
                        const ativo = modalEdicao.turnoDias.has(chave)
                        return (
                          <button
                            key={chave}
                            type="button"
                            onClick={() => {
                              const novo = new Set(modalEdicao.turnoDias)
                              if (novo.has(chave)) novo.delete(chave)
                              else novo.add(chave)
                              setModalEdicao({ ...modalEdicao, turnoDias: novo })
                            }}
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                            style={
                              ativo
                                ? { background: C.marca + '26', color: C.marcaTinta, border: '1px solid ${C.marca}59' }
                                : { background: C.inputBg, color: C.text3, border: `1px solid ${C.cardBorder}` }
                            }
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  disabled={salvandoTurnos}
                  onClick={salvarTurnos}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl disabled:opacity-40 flex items-center gap-1.5"
                  style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
                >
                  {salvandoTurnos && <Loader2 size={12} className="animate-spin" />}
                  {salvandoTurnos ? 'Salvando turno...' : 'Salvar turno'}
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={salvandoEdicao}
                  onClick={salvarEdicao}
                  className="botao-primario flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
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
                  <Pill color={i.status === 'AVAILABLE' ? C.good : C.neutral} dot>
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
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                style={{ color: C.bad, background: C.badBg, border: `1px solid ${C.badBd}` }}
              >
                {executandoMassa && progressoMassa?.status === 'UNAVAILABLE' && <Loader2 size={12} className="animate-spin" />}
                {executandoMassa && progressoMassa?.status === 'UNAVAILABLE'
                  ? `Pausando ${progressoMassa.atual}/${progressoMassa.total}...`
                  : 'Pausar todos'}
              </button>
              <button
                type="button"
                disabled={executandoMassa}
                onClick={() => acaoEmMassa('AVAILABLE')}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
                style={{ color: C.good, background: C.goodBg, border: `1px solid ${C.goodBd}` }}
              >
                {executandoMassa && progressoMassa?.status === 'AVAILABLE' && <Loader2 size={12} className="animate-spin" />}
                {executandoMassa && progressoMassa?.status === 'AVAILABLE'
                  ? `Despausando ${progressoMassa.atual}/${progressoMassa.total}...`
                  : 'Despausar todos'}
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
                  <Pill color={r.status === 'AVAILABLE' ? C.good : C.neutral} dot>
                    {r.status === 'AVAILABLE' ? 'Disponível' : 'Pausado'}
                  </Pill>
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
                className="botao-primario text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
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

        {modalCategorias && (
          <CategoriasModal
            onClose={() => setModalCategorias(false)}
            apiFetch={apiFetch}
            notificar={notificar}
            podeEditar={podeCriarItem}
            souAdministrador={sessao.usuario.papel === 'administrador'}
            C={C}
            inputCls={inputCls}
            inputStyle={inputStyle}
          />
        )}

        {modalGruposOpcao && (
          <GruposOpcaoModal
            onClose={() => setModalGruposOpcao(false)}
            apiFetch={apiFetch}
            notificar={notificar}
            podeEditar={podeCriarItem}
            souAdministrador={sessao.usuario.papel === 'administrador'}
            C={C}
            inputCls={inputCls}
            inputStyle={inputStyle}
          />
        )}

        {modalCombo && (
          <ComboModal
            onClose={() => setModalCombo(false)}
            onCriado={() => {
              carregar()
              carregarAuditoria()
            }}
            apiFetch={apiFetch}
            notificar={notificar}
            categorias={categorias}
            C={C}
            inputCls={inputCls}
            inputStyle={inputStyle}
          />
        )}

        {modalHorario && (
          <HorarioFuncionamentoModal
            onClose={() => setModalHorario(false)}
            apiFetch={apiFetch}
            notificar={notificar}
            podeEditar={podeCriarItem}
            C={C}
            inputStyle={inputStyle}
          />
        )}

        {modalPausar && (
          <PausarModal
            alvos={modalPausar.alvos}
            itens={itens}
            paraAlvo={alvoDoItem}
            motivoInicial={modalPausar.motivoInicial}
            outrasLojas={outrasLojas}
            lojaAtual={lojaAtual}
            executando={executandoMassa}
            onConfirmar={confirmarPausa}
            onClose={() => setModalPausar(null)}
          />
        )}

        {modalInsumo && (
          <PausaInsumoModal
            itens={itens}
            plataforma={lojaAtual?.plataforma}
            apiFetch={apiFetch}
            onContinuar={(alvos, termo) => {
              setModalInsumo(false)
              abrirPausar(alvos, {
                titulo: `Ruptura de "${termo}"`,
                descricao: 'Já desmarcamos o que está pausado. Revise antes de confirmar.',
                motivoInicial: `Acabou: ${termo}`,
              })
            }}
            onClose={() => setModalInsumo(false)}
            C={C}
            inputStyle={inputStyle}
          />
        )}

        {modalRupturas && (
          <RupturasModal
            pausas={pausasAtivas}
            itens={itens}
            carregando={carregandoPausas}
            erro={erroPausas}
            registroDisponivel={registroPausas}
            executando={executandoMassa}
            onRecarregar={carregarPausas}
            onReativar={(alvos) => executarStatusEmLote(alvos, 'AVAILABLE')}
            onClose={() => setModalRupturas(false)}
            C={C}
          />
        )}

        {modalMarca && (
          <MarcaModal
            onClose={() => setModalMarca(false)}
            apiFetch={apiFetch}
            notificar={notificar}
            C={C}
            inputCls={inputCls}
            inputStyle={inputStyle}
          />
        )}

        {modalInterrupcoes && (
          <InterrupcoesModal
            onClose={() => setModalInterrupcoes(false)}
            apiFetch={apiFetch}
            notificar={notificar}
            podeEditar={podeCriarItem}
            C={C}
            inputCls={inputCls}
            inputStyle={inputStyle}
          />
        )}

        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--t1)' }}>
          <Sidebar
            aberta={sidebarAberta}
            onExpandir={() => setSidebarAberta(true)}
            view={view}
            onMudarView={mudarView}
            totalPausados={totalPausados}
            lojaNome={lojaAtual?.nome}
            lojaPlataforma={lojaAtual?.plataforma}
            totalLojas={lojas.length}
            podeTrocarLoja={lojas.length > 1 || sessao.usuario.papel === 'administrador'}
            onTrocarLoja={() => setModalLojas(true)}
            userNome={sessao.usuario.nome}
            userIniciais={iniciaisDe(sessao.usuario.nome)}
            userPapel={sessao.usuario.papel}
            podeVerFinanceiro={podeCriarItem}
            souAdministrador={sessao.usuario.papel === 'administrador'}
            totalRupturas={totalRupturas}
            onPausarItem={() => setModalPausar({ alvos: [] })}
            onAbrirRupturas={() => {
              setModalRupturas(true)
              carregarPausas()
            }}
            onAbrirInsumo={() => setModalInsumo(true)}
            onMinhaSenha={() => setModalMinhaSenha(true)}
            onSair={onSair}
          />

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <Header
              crumb={[marca.nome, lojaAtual?.nome, lojaAtual ? (lojaAtual.plataforma === '99food' ? '99Food' : 'iFood') : null]
                .filter(Boolean)
                .join(' · ')}
              titulo={(TITULOS_VIEW[view] || TITULO_PADRAO).t}
              aoVivo={AO_VIVO[view]}
              conexao={conexao}
              tema={tema}
              onAlternarTema={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
              onAlternarSidebar={() => setSidebarAberta((v) => !v)}
            />
            <BarraProgresso progresso={progressoMassa} />
            <BannerConexao
              conexao={conexao}
              onTentar={() => {
                carregar()
                carregarAuditoria()
              }}
            />

            <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative', padding: '24px 28px 40px' }}>
              {view === 'dashboard' && (
                <DashboardView
                  itens={itens}
                  categorias={categorias}
                  totalDisponiveis={totalDisponiveis}
                  totalPausados={totalPausados}
                  auditoria={auditoria}
                  C={C}
                  onIrAuditoria={() => setView('auditoria')}
                  onIrCatalogoPausados={() => {
                    setFiltroStatus('UNAVAILABLE')
                    setView('catalogo')
                  }}
                  onDespausarRapido={(item) => executarAlternarStatus(item, 'AVAILABLE')}
                  alterandoStatus={alterandoStatus}
                />
              )}

              {view === 'pedidos' && (
                <PedidosView apiFetch={apiFetch} C={C} notificar={notificar} inputStyle={inputStyle} lojaNome={lojaAtual?.nome} />
              )}

              {view === 'kds' && (
                <KDSView
                  apiFetch={apiFetch}
                  C={C}
                  notificar={notificar}
                  setConfirmacao={setConfirmacao}
                  onAbrirHistorico={() => setView('pedidos')}
                  plataforma={lojaAtual?.plataforma}
                />
              )}

              {view === 'catalogo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1480 }}>
                {podeCriarItem && (
                  <div role="tablist" aria-label="Seções do cardápio" style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--borda)', marginTop: -4, overflowX: 'auto' }}>
                    {ABAS_CARDAPIO.map((a) => {
                      const ativa = abaCardapio === a.chave
                      return (
                        <button
                          key={a.chave}
                          type="button"
                          role="tab"
                          aria-selected={ativa}
                          onClick={() => setAbaCardapio(a.chave)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            height: 42,
                            padding: '0 14px',
                            border: 0,
                            borderBottom: `2px solid ${ativa ? 'var(--marca)' : 'transparent'}`,
                            marginBottom: -1,
                            background: 'transparent',
                            color: ativa ? 'var(--t1)' : 'var(--t2)',
                            fontSize: 14,
                            fontWeight: ativa ? 600 : 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <a.Icon size={16} />
                          {a.label}
                          {a.chave === 'itens' && (
                            <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--t3)' }}>{itens.length}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}

                {podeCriarItem && abaCardapio !== 'itens' && (
                  <ModalEmbutidoContext.Provider value={true}>
                    {abaCardapio === 'categorias' && (
                      <CategoriasModal
                        onClose={() => setAbaCardapio('itens')}
                        apiFetch={apiFetch}
                        notificar={notificar}
                        podeEditar={podeCriarItem}
                        souAdministrador={sessao.usuario.papel === 'administrador'}
                        C={C}
                        inputCls={inputCls}
                        inputStyle={inputStyle}
                      />
                    )}
                    {abaCardapio === 'complementos' && (
                      <GruposOpcaoModal
                        onClose={() => setAbaCardapio('itens')}
                        apiFetch={apiFetch}
                        notificar={notificar}
                        podeEditar={podeCriarItem}
                        souAdministrador={sessao.usuario.papel === 'administrador'}
                        C={C}
                        inputCls={inputCls}
                        inputStyle={inputStyle}
                      />
                    )}
                    {abaCardapio === 'horario' && (
                      <HorarioFuncionamentoModal
                        onClose={() => setAbaCardapio('itens')}
                        apiFetch={apiFetch}
                        notificar={notificar}
                        podeEditar={podeCriarItem}
                        C={C}
                        inputStyle={inputStyle}
                      />
                    )}
                    {abaCardapio === 'interrupcoes' && (
                      <InterrupcoesModal
                        onClose={() => setAbaCardapio('itens')}
                        apiFetch={apiFetch}
                        notificar={notificar}
                        podeEditar={podeCriarItem}
                        C={C}
                        inputCls={inputCls}
                        inputStyle={inputStyle}
                      />
                    )}
                  </ModalEmbutidoContext.Provider>
                )}

                {(abaCardapio === 'itens' || !podeCriarItem) && (
                <CatalogoView
                  itens={itens}
                  categorias={categorias}
                  categoriasFiltro={categoriasFiltro}
                  busca={busca}
                  onBusca={setBusca}
                  filtroCategoria={filtroCategoria}
                  onFiltroCategoria={setFiltroCategoria}
                  filtroStatus={filtroStatus}
                  onFiltroStatus={setFiltroStatus}
                  filtrados={filtrados}
                  idsVisiveis={idsVisiveis}
                  todosVisiveisSelecionados={todosVisiveisSelecionados}
                  selecionados={selecionados}
                  onAlternarSelecao={alternarSelecao}
                  onAlternarSelecaoTodos={alternarSelecaoTodos}
                  onLimparSelecao={() => setSelecionados(new Set())}
                  carregando={carregando}
                  erroCarregamento={erroCarregamento}
                  onRecarregar={carregar}
                  alterandoStatus={alterandoStatus}
                  onAlternarStatus={prepararAlternarStatus}
                  onAbrirEdicaoModal={abrirEdicao}
                  onExcluirItem={pedirConfirmacaoExcluirItem}
                  itemExcluindo={itemExcluindo}
                  onAbrirCombo={() => setModalCombo(true)}
                  totalDisponiveis={totalDisponiveis}
                  totalPausados={totalPausados}
                  podeCriarItem={podeCriarItem}
                  modalNovoItem={modalNovoItem}
                  onAbrirNovoItem={() => setModalNovoItem(true)}
                  onFecharNovoItem={() => {
                    setModalNovoItem(false)
                    setErroForm('')
                  }}
                  form={form}
                  setForm={setForm}
                  onCriarItem={handleSubmit}
                  onSelecionarFoto={async (arquivo) => {
                    try {
                      const dataUrl = await lerImagemComoDataUrl(arquivo)
                      setForm((prev) => ({ ...prev, foto: dataUrl }))
                    } catch (err) {
                      notificar('erro', err.message)
                    }
                  }}
                  requisitos={requisitos}
                  formValido={formValido}
                  salvando={salvando}
                  erroForm={erroForm}
                  edicaoInline={edicaoInline}
                  onAbrirEdicaoInline={abrirEdicaoInline}
                  onEdicaoInlineInput={onEdicaoInlineInput}
                  onSalvarEdicaoInline={salvarEdicaoInline}
                  onCancelarEdicaoInline={() => setEdicaoInline(null)}
                  linhaSalvando={linhaSalvando}
                  linhaSalva={linhaSalva}
                  onAbrirAcoesMassa={() => setModalAcoesMassa(true)}
                  onPausarSelecionados={pausarSelecionados}
                  onAbrirInsumo={() => setModalInsumo(true)}
                  pausasPorItem={pausasPorItem}
                  C={C}
                  inputCls={inputCls}
                  inputStyle={inputStyle}
                />
                )}
                </div>
              )}

              {view === 'lojas' && (
                <StatusLojasView apiFetch={apiFetch} C={C} notificar={notificar} podeGerenciar={podeCriarItem} />
              )}

              {view === 'financeiro' && podeCriarItem && (
                <FinanceiroView apiFetch={apiFetch} C={C} notificar={notificar} lojaAtual={lojaAtual} />
              )}

              {view === 'auditoria' && (
                <AuditoriaView
                  auditoria={auditoria}
                  totalUsuarios={usuarios.length}
                  mostrarTotalUsuarios={sessao.usuario.papel === 'administrador'}
                  C={C}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </CoresContext.Provider>
  )
}

function TelaCarregando({ C }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <Loader2 size={22} className="animate-spin" style={{ color: C.marcaTinta }} />
      <p className="text-xs" style={{ color: C.text2 }}>
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
  // Tema claro é o padrão do produto (tela de balcão/cozinha iluminada); o escuro fica a um clique.
  const [tema, setTema] = useState(() => localStorage.getItem('tema') || 'claro')
  const [marca, setMarca] = useState(lerMarcaEmCache)
  const C = useMemo(() => ({ ...PALETAS[tema], ...tokensDaMarca(marca.cor, tema) }), [tema, marca.cor])
  const valorMarca = useMemo(() => ({ marca, setMarca }), [marca])

  useEffect(() => {
    document.documentElement.classList.toggle('tema-escuro', tema === 'escuro')
    localStorage.setItem('tema', tema)
  }, [tema])

  // A marca da empresa cliente: abre na hora com a do cache e confirma com o servidor.
  useEffect(() => {
    fetch(`${API}/marca`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!m) return
        const nova = { ...MARCA_PADRAO, ...m }
        setMarca(nova)
        guardarMarcaEmCache(nova)
      })
      .catch(() => {
        // servidor fora: segue com a marca do cache/padrão
      })
  }, [])

  useEffect(() => {
    aplicarMarcaNoDocumento(marca.cor, tema)
    document.title = `${marca.nome} · Operação delivery`
  }, [marca, tema])

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

  async function aoDefinirSenha() {
    limparHashDaUrl()
    const usuario = await buscarEu(convite.accessToken)
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ accessToken: convite.accessToken }))
    setConvite(null)
    setSessao({ accessToken: convite.accessToken, usuario })
  }

  // Senha temporária (definida por um admin) trocada com sucesso: desliga a flag no backend
  // e libera o painel sem precisar buscar o perfil de novo.
  async function aoTrocarSenhaObrigatoria() {
    await marcarSenhaTrocada(sessao.accessToken)
    setSessao((prev) => ({ ...prev, usuario: { ...prev.usuario, senha_temporaria: false } }))
  }

  async function sair() {
    if (sessao) await logoutSupabase(sessao.accessToken)
    localStorage.removeItem(CHAVE_SESSAO)
    setSessao(null)
  }

  return (
    <MarcaContext.Provider value={valorMarca}>
      <CoresContext.Provider value={C}>{renderizarTela()}</CoresContext.Provider>
    </MarcaContext.Provider>
  )

  function renderizarTela() {
    if (verificando) return <TelaCarregando C={C} />
    if (convite)
      return (
        <TelaDefinirSenha
          accessToken={convite.accessToken}
          eyebrow={convite.tipo === 'invite' ? 'Bem-vindo(a)' : 'Recuperar acesso'}
          onDefinida={aoDefinirSenha}
          C={C}
        />
      )
    if (!sessao) return <TelaLogin onLogar={aoLogar} avisoInicial={avisoLink} C={C} />
    if (sessao.usuario.senha_temporaria)
      return (
        <TelaDefinirSenha
          accessToken={sessao.accessToken}
          eyebrow="Segurança da conta"
          aviso="Você entrou com uma senha temporária, definida por um administrador. Por segurança, escolha agora uma senha só sua antes de continuar."
          onDefinida={aoTrocarSenhaObrigatoria}
          onSair={sair}
          C={C}
        />
      )
    return <Painel sessao={sessao} onSair={sair} tema={tema} setTema={setTema} C={C} />
  }
}
