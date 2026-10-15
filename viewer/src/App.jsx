import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, ClipboardList, Clock, Layers, LayoutGrid, Loader2, Menu, Plus, PowerOff, Tag, Tags, Trash2, UtensilsCrossed } from 'lucide-react'
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
import { PausaInsumoModal } from './modals/PausaInsumoModal'
import { PausarModal } from './modals/PausarModal'
import { RupturasModal } from './modals/RupturasModal'
import { Sidebar } from './Sidebar'
import { BannerConexao, BarraProgresso, Header, HeaderCelular, NavInferior, Toasts } from './Shell'
import { Botao, Dialogo, EstadoVazio, LarguraContext, MONO, OpcaoMarcavel, Segmentado, useCelular, useMedirLargura, useTelaCompacta } from './ds'
import { SimboloPausaFast } from './Logo'
import { MaisView } from './views/MaisView'
import { ItemEditarGaveta, ItemNovoGaveta } from './modals/ItemGaveta'
import { sugestoesParecidas } from './pausas'
import { TelaCarregando, TelaDefinirSenha, TelaLogin } from './TelasAuth'
import { CoresContext, iniciaisDe, lerImagemComoDataUrl, ModalEmbutidoContext, PALETAS, Pill } from './ui'
import { aplicarMarcaNoDocumento, guardarMarcaEmCache, lerMarcaEmCache, MARCA_PADRAO, MarcaContext, tokensDaMarca } from './marca'
import { AuditoriaView } from './views/AuditoriaView'
import { LojasSecao, MarcaSecao, UsuariosSecao } from './views/AdminView'
import { CatalogoCelular, CatalogoView } from './views/CatalogoView'
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
  usuarios: { t: 'Usuários', sub: 'Quem tem acesso ao painel' },
  'lojas-admin': { t: 'Lojas', sub: 'Lojas e plataformas conectadas' },
  marca: { t: 'Marca', sub: 'Nome, cor e logo da empresa' },
  mais: { t: 'Mais', sub: '' },
}

// Rede de segurança: uma view sem entrada aqui nunca mais deve quebrar o header.
const TITULO_PADRAO = { t: 'Painel', sub: '' }

// Views que se atualizam sozinhas — o selo "Ao vivo" no header existe pra deixar claro que a
// tela relê os pedidos por conta própria, e (junto com o estado de erro) pra dar onde olhar
// quando a leitura falha.
const AO_VIVO = { kds: '10s', pedidos: '15s' }

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
function FormDefinirSenha({ usuario, carregando, onConfirmar, onCancelar }) {
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

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Segmentado
        rotulo="Como definir a senha"
        valor={modo}
        onChange={setModo}
        altura={36}
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}
        opcoes={[
          { valor: 'aleatoria', rotulo: 'Gerar aleatória', cheio: true },
          { valor: 'especifica', rotulo: 'Escolher senha', cheio: true },
        ]}
      />
      {modo === 'especifica' ? (
        <input type="text" autoFocus className="ds-input" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Nova senha (mín. 6 caracteres)" />
      ) : (
        <div style={{ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.5 }}>
          O sistema gera uma senha segura e mostra na próxima tela, pra você repassar pra {usuario.nome} por fora (WhatsApp, presencial). No primeiro acesso a pessoa troca por uma só dela.
        </div>
      )}
      {erro && (
        <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bad-bg)', border: '1px solid var(--bad-bd)', fontSize: 13.5, color: 'var(--t1)' }}>
          {erro}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Botao variante="secundario" tamanho="lg" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="primario" tamanho="lg" disabled={carregando}>
          {carregando && <Loader2 size={16} className="animate-spin" />}
          {carregando ? 'Salvando…' : modo === 'especifica' ? 'Definir essa senha' : 'Gerar e definir'}
        </Botao>
      </div>
    </form>
  )
}

let contadorToast = 0
const CHAVE_SESSAO = 'sessao_ifood_v1'

function Painel({ sessao, onSair, tema, setTema, C }) {
  const { marca } = useContext(MarcaContext)
  const celular = useCelular()
  const compacta = useTelaCompacta()
  const [sidebarSobreposta, setSidebarSobreposta] = useState(false)
  const [refMain, larguraMain] = useMedirLargura()
  // O cardápio só cabe como tabela com ~960px de conteúdo; Pedidos e Cozinha, ~1000px.
  const cardapioEmCartoes = celular || larguraMain < 960
  const layoutEstreito = celular || larguraMain < 1000

  useEffect(() => {
    if (!sidebarSobreposta) return undefined
    const fechar = (e) => e.key === 'Escape' && setSidebarSobreposta(false)
    window.addEventListener('keydown', fechar)
    return () => window.removeEventListener('keydown', fechar)
  }, [sidebarSobreposta])

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
  const [modalRelacionados, setModalRelacionados] = useState(null)
  const [modalPausar, setModalPausar] = useState(null) // { titulo, descricao, alvos, motivoInicial }
  const [modalInsumo, setModalInsumo] = useState(false)
  const [modalRupturas, setModalRupturas] = useState(false)
  const [pausasAtivas, setPausasAtivas] = useState([])
  const [carregandoPausas, setCarregandoPausas] = useState(false)
  const [erroPausas, setErroPausas] = useState('')
  const [registroPausas, setRegistroPausas] = useState(true)

  const [modalEdicao, setModalEdicao] = useState(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [salvandoTurnos, setSalvandoTurnos] = useState(false)


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
  const sidebarAntesDaCozinha = useRef(null)

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
    if (!modalLojas && view !== 'lojas-admin') return
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
  }, [modalLojas, view])

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
    { chave: 'nome', label: 'Nome do item', ok: campoPreenchido(form.nome) },
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
    const sugestoes = sugestoesParecidas(
      item,
      itens.filter((i) => i.status !== novoStatus),
    )
    const relacionados = sugestoes.map((r) => r.item)
    if (novoStatus === 'UNAVAILABLE') {
      abrirPausar(
        [alvoDoItem(item, { marcado: true }), ...sugestoes.map((r) => alvoDoItem(r.item, { marcado: r.forte, sugerido: true }))],
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
      selecionados: new Set(sugestoes.filter((r) => r.forte).map((r) => r.item.itemId)),
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
    await executarStatusEmLote([...alvos, ...extras], 'UNAVAILABLE', { minutos, motivo })
  }

  function paraAlvos(ids) {
    return ids.map((id) => alvoDoItem(itens.find((i) => i.itemId === id) || { itemId: id, nome: '' }))
  }

  function pausarSelecionados() {
    const disponiveis = Array.from(selecionados).filter((id) => itens.find((i) => i.itemId === id)?.status === 'AVAILABLE')
    const alvos = paraAlvos(disponiveis).map((a) => ({ ...a, marcado: true }))
    if (!alvos.length) return
    abrirPausar(alvos, { titulo: `Pausar ${alvos.length} ${alvos.length === 1 ? 'item' : 'itens'}` })
  }

  async function acaoEmMassa(status) {
    if (status === 'UNAVAILABLE') {
      pausarSelecionados()
      return
    }
    const ids = Array.from(selecionados).filter((id) => itens.find((i) => i.itemId === id)?.status !== status)
    if (!ids.length) return
    await executarStatusEmLote(paraAlvos(ids), status)
    setSelecionados(new Set())
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
      preco: item.preco == null ? '' : Number(item.preco).toFixed(2).replace('.', ','),
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
    }
  }

  function pedirConfirmacaoExcluirItem(item) {
    setConfirmacao({
      titulo: `Excluir "${item.nome}"?`,
      mensagem: 'Isso tira o item do cardápio de vez, na plataforma também. Se só acabou, use Pausar — dá pra reativar depois.',
      textoConfirmar: 'Excluir item',
      perigo: true,
      alternativa: item.status === 'AVAILABLE' ? { texto: 'Pausar em vez disso', aoEscolher: () => prepararAlternarStatus(item) } : null,
      aoConfirmar: () => {
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
      setLinhaSalvando(`${item.itemId}:${atual.campo}`)
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
        setLinhaSalva(`${item.itemId}:${atual.campo}`)
        carregarAuditoria()
        setTimeout(() => setLinhaSalva((atualId) => (atualId === `${item.itemId}:${atual.campo}` ? null : atualId)), 1700)
      } catch (e) {
        notificar('erro', `Não consegui salvar: ${e.message}`)
      } finally {
        setLinhaSalvando(null)
      }
      return
    }

    const codigo = String(atual.valor).trim()
    if (!codigo || codigo === item.codigo_pdv) return
    setLinhaSalvando(`${item.itemId}:${atual.campo}`)
    try {
      await apiFetch(lojaAtual?.plataforma === '99food' ? `/99food/itens/${item.itemId}/codigo-pdv` : `/itens/${item.itemId}/codigo-pdv`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_pdv: codigo, nome: item.nome, codigo_anterior: item.codigo_pdv }),
      })
      setItens((prev) => prev.map((i) => (i.itemId === item.itemId ? { ...i, codigo_pdv: codigo } : i)))
      notificar('sucesso', `Código PDV de "${item.nome}" atualizado.`)
      setLinhaSalva(`${item.itemId}:${atual.campo}`)
      carregarAuditoria()
      setTimeout(() => setLinhaSalva((atualId) => (atualId === `${item.itemId}:${atual.campo}` ? null : atualId)), 1700)
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

  function mudarView(chave) {
    setSidebarSobreposta(false)
    if (chave === 'usuarios') carregarUsuarios()
    // A Cozinha precisa de largura: entrar nela recolhe o menu; sair devolve como estava.
    if (compacta) {
      // tablet: a sidebar já fica recolhida e abre por cima — nada a guardar
    } else if (chave === 'kds' && view !== 'kds') {
      sidebarAntesDaCozinha.current = sidebarAberta
      setSidebarAberta(false)
    } else if (chave !== 'kds' && view === 'kds' && sidebarAntesDaCozinha.current !== null) {
      setSidebarAberta(sidebarAntesDaCozinha.current)
      sidebarAntesDaCozinha.current = null
    }
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
          <Dialogo
            largura={520}
            eyebrow="Loja ativa"
            titulo="Trocar de loja"
            descricao="O painel inteiro — cardápio, pedidos e cozinha — passa a mostrar a loja escolhida."
            onClose={() => setModalLojas(false)}
            rodape={
              <>
                {sessao.usuario.papel === 'administrador' && (
                  <Botao
                    variante="link"
                    onClick={() => {
                      setModalLojas(false)
                      mudarView('lojas-admin')
                    }}
                  >
                    Gerenciar lojas
                  </Botao>
                )}
                <span style={{ flex: 1 }} />
                <Botao variante="secundario" tamanho="lg" onClick={() => setModalLojas(false)}>
                  Fechar
                </Botao>
              </>
            }
          >
            {lojas.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--t2)' }}>Nenhuma loja cadastrada ainda.</div>
            ) : (
              <div style={{ border: '1px solid var(--borda)', borderRadius: 9, overflow: 'hidden' }}>
                {lojas.map((l) => {
                  const ativa = l.merchant_id === lojaAtual?.merchant_id
                  return (
                    <button
                      key={l.id}
                      type="button"
                      role="radio"
                      aria-checked={ativa}
                      onClick={() => {
                        setLojaId(l.merchant_id)
                        setModalLojas(false)
                      }}
                      className="ds-opcao"
                      style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 56, padding: '8px 14px', border: 0, borderBottom: '1px solid var(--linha)', background: ativa ? 'var(--marca-suave)' : 'var(--card)', color: 'var(--t1)', textAlign: 'left', cursor: 'pointer' }}
                    >
                      <span style={{ width: 18, height: 18, borderRadius: 99, border: `1.5px solid ${ativa ? 'var(--marca-tinta)' : 'var(--borda)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: ativa ? 'var(--marca-tinta)' : 'transparent' }} />
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{l.nome || 'Loja sem nome'}</span>
                        <span style={{ display: 'block', fontFamily: MONO, fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.merchant_id}</span>
                      </span>
                      <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 5, background: 'var(--input)', border: '1px solid var(--borda)', color: 'var(--t2)' }}>
                        {l.plataforma === '99food' ? '99Food' : 'iFood'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </Dialogo>
        )}

        {modalDetalhesLoja && (
          <Dialogo largura={560} eyebrow="Loja" titulo={detalhesLoja?.name || lojaAtual?.nome || 'Detalhes da loja'} descricao={detalhesLoja?.corporateName} onClose={() => setModalDetalhesLoja(false)}>
            {carregandoDetalhesLoja && (
              <div style={{ fontSize: 13.5, color: 'var(--t2)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Loader2 size={14} className="animate-spin" /> Carregando…
              </div>
            )}
            {!carregandoDetalhesLoja && detalhesLoja && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Pill color={detalhesLoja.status === 'AVAILABLE' || detalhesLoja.status === 'ENABLED' ? C.good : C.neutral} dot>
                    Status da conta: {detalhesLoja.status}
                  </Pill>
                  {detalhesLoja.test === 'TEST' && <Pill color={C.neutral}>Sandbox</Pill>}
                </div>
                {detalhesLoja.address && (
                  <div style={{ fontSize: 13.5, color: 'var(--t1)', lineHeight: 1.5 }}>
                    {detalhesLoja.address.street}, {detalhesLoja.address.number} — {detalhesLoja.address.district}
                    <br />
                    {detalhesLoja.address.city}/{detalhesLoja.address.state}
                  </div>
                )}
              </div>
            )}
            {!carregandoDetalhesLoja && Array.isArray(disponibilidadeLoja) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>Disponibilidade por canal</div>
                {disponibilidadeLoja.map((op) => (
                  <div key={`${op.operation}-${op.salesChannel}`} style={{ padding: '12px 14px', borderRadius: 9, background: 'var(--card2)', border: '1px solid var(--linha)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t1)' }}>
                        {op.operation} · {op.salesChannel}
                      </span>
                      <Pill color={op.available ? C.good : C.bad} dot>
                        {op.available ? 'Disponível' : 'Indisponível'}
                      </Pill>
                    </div>
                    {op.message?.title && (
                      <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 4 }}>
                        {op.message.title}
                        {op.message.subtitle ? ` — ${op.message.subtitle}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Dialogo>
        )}

        {modalMinhaSenha && (
          <Dialogo
            largura={440}
            eyebrow="Sua conta"
            titulo="Trocar minha senha"
            onClose={() => {
              setModalMinhaSenha(false)
              setMinhaSenhaForm({ senha: '', confirmacao: '' })
              setErroMinhaSenha('')
            }}
            rodape={
              <>
                <span style={{ flex: 1 }} />
                <Botao variante="primario" tamanho="lg" disabled={salvandoMinhaSenha} onClick={handleTrocarMinhaSenha}>
                  {salvandoMinhaSenha && <Loader2 size={16} className="animate-spin" />}
                  {salvandoMinhaSenha ? 'Salvando…' : 'Salvar nova senha'}
                </Botao>
              </>
            }
          >
            <form onSubmit={handleTrocarMinhaSenha} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Nova senha</span>
                <input className="ds-input" type="password" autoFocus autoComplete="new-password" value={minhaSenhaForm.senha} onChange={(e) => setMinhaSenhaForm({ ...minhaSenhaForm, senha: e.target.value })} placeholder="Mínimo de 6 caracteres" />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Repita a nova senha</span>
                <input className="ds-input" type="password" autoComplete="new-password" value={minhaSenhaForm.confirmacao} onChange={(e) => setMinhaSenhaForm({ ...minhaSenhaForm, confirmacao: e.target.value })} />
              </label>
              {erroMinhaSenha && (
                <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bad-bg)', border: '1px solid var(--bad-bd)', fontSize: 13.5, color: 'var(--t1)' }}>
                  {erroMinhaSenha}
                </div>
              )}
              <button type="submit" style={{ display: 'none' }} />
            </form>
          </Dialogo>
        )}

        {modalDefinirSenha && (
          <Dialogo largura={460} eyebrow="Redefinir senha" titulo={modalDefinirSenha.nome} descricao={modalDefinirSenha.email} onClose={() => setModalDefinirSenha(null)}>
            <FormDefinirSenha
              usuario={modalDefinirSenha}
              carregando={resetandoSenha === modalDefinirSenha.id}
              onConfirmar={(senha) => resetarSenhaUsuario(modalDefinirSenha, senha)}
              onCancelar={() => setModalDefinirSenha(null)}
            />
          </Dialogo>
        )}

        {senhaResetada && (
          <Dialogo
            largura={460}
            eyebrow="Senha gerada"
            titulo={`Envie para ${String(senhaResetada.usuario.nome || '').split(' ')[0] || 'a pessoa'}`}
            onClose={() => setSenhaResetada(null)}
            rodape={
              <>
                <span style={{ flex: 1 }} />
                <Botao variante="secundario" tamanho="lg" onClick={() => setSenhaResetada(null)}>
                  Pronto
                </Botao>
              </>
            }
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 6px 6px 14px', borderRadius: 9, background: 'var(--input)', border: '1px solid var(--borda)' }}>
              <span style={{ flex: 1, fontFamily: MONO, fontSize: 18, fontWeight: 600, letterSpacing: '.04em', color: 'var(--t1)', overflowWrap: 'anywhere' }}>{senhaResetada.senha}</span>
              <Botao
                variante="primario"
                tamanho="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(senhaResetada.senha)
                  notificar('sucesso', 'Senha copiada.')
                }}
              >
                <Check size={14} /> Copiar
              </Botao>
            </div>
            <div style={{ fontSize: 13.5, color: 'var(--t2)', lineHeight: 1.5 }}>
              Ela só aparece agora. Repasse por fora (WhatsApp, presencial). No primeiro acesso a pessoa cai na tela de <b>troca obrigatória</b> e define a própria senha.
            </div>
          </Dialogo>
        )}

        {modalEdicao && (
          <ItemEditarGaveta
            estado={modalEdicao}
            setEstado={setModalEdicao}
            plataforma={lojaAtual?.plataforma}
            salvando={salvandoEdicao}
            salvandoTurno={salvandoTurnos}
            podeExcluir={podeCriarItem}
            onSalvar={salvarEdicao}
            onSalvarTurno={salvarTurnos}
            onFoto={async (arquivo) => {
              try {
                const dataUrl = await lerImagemComoDataUrl(arquivo)
                setModalEdicao((prev) => (prev ? { ...prev, fotoNova: dataUrl } : prev))
              } catch (err) {
                notificar('erro', err.message)
              }
            }}
            onExcluir={() => {
              const item = modalEdicao.item
              setModalEdicao(null)
              pedirConfirmacaoExcluirItem(item)
            }}
            onClose={() => setModalEdicao(null)}
          />
        )}

        {modalNovoItem && (
          <ItemNovoGaveta
            form={form}
            setForm={setForm}
            categorias={categorias}
            requisitos={requisitos}
            formValido={formValido}
            salvando={salvando}
            erro={erroForm}
            onFoto={async (arquivo) => {
              try {
                const dataUrl = await lerImagemComoDataUrl(arquivo)
                setForm((prev) => ({ ...prev, foto: dataUrl }))
              } catch (err) {
                notificar('erro', err.message)
              }
            }}
            onCriar={handleSubmit}
            onClose={() => {
              setModalNovoItem(false)
              setErroForm('')
            }}
          />
        )}

        {modalRelacionados && (
          <Dialogo
            largura={560}
            eyebrow="Reativar"
            titulo="Reativar os parecidos também?"
            descricao={
              <>
                {modalRelacionados.relacionados.length} {modalRelacionados.relacionados.length === 1 ? 'item parecido com' : 'itens parecidos com'}{' '}
                <b style={{ color: 'var(--t1)' }}>{modalRelacionados.item.nome}</b> {modalRelacionados.relacionados.length === 1 ? 'está pausado' : 'estão pausados'} — provavelmente pelo mesmo insumo. Desmarque o que ainda não voltou.
              </>
            }
            onClose={() => setModalRelacionados(null)}
            rodape={
              <>
                <span style={{ flex: 1 }} />
                <Botao variante="secundario" tamanho="lg" disabled={executandoMassa} onClick={confirmarSoItemAtualModal}>
                  Só este item
                </Botao>
                <Botao variante="primario" tamanho="lg" disabled={executandoMassa} onClick={confirmarModalRelacionados}>
                  Reativar {modalRelacionados.selecionados.size + 1} itens
                </Botao>
              </>
            }
          >
            <div style={{ border: '1px solid var(--borda)', borderRadius: 9, overflow: 'hidden' }}>
              {modalRelacionados.relacionados.map((r) => (
                <OpcaoMarcavel
                  key={r.itemId}
                  marcado={modalRelacionados.selecionados.has(r.itemId)}
                  onClick={() => alternarSelecaoModalRelacionados(r.itemId)}
                  extra={<span style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--t3)' }}>{r.codigo_pdv}</span>}
                >
                  <span style={{ fontWeight: 500 }}>{r.nome}</span>
                </OpcaoMarcavel>
              ))}
            </div>
          </Dialogo>
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
              abrirPausar(alvos, { motivoInicial: `Acabou: ${termo}` })
            }}
            onPausarDireto={(alvos, termo) => {
              setModalInsumo(false)
              executarStatusEmLote(alvos, 'UNAVAILABLE', { minutos: null, motivo: `Acabou: ${termo}`.slice(0, 120) })
            }}
            executando={executandoMassa}
            onClose={() => setModalInsumo(false)}
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

        <div style={{ display: 'flex', height: '100dvh', overflow: 'clip', background: 'var(--bg)', color: 'var(--t1)' }}>
          {compacta && !celular && sidebarSobreposta && (
            <div onClick={() => setSidebarSobreposta(false)} style={{ position: 'fixed', inset: 0, background: 'var(--veu)', zIndex: 60 }} aria-hidden="true" />
          )}
          {!celular && (
          <div style={compacta && sidebarSobreposta ? { position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 61, boxShadow: 'var(--sh)' } : { flexShrink: 0 }}>
          <Sidebar
            aberta={compacta ? sidebarSobreposta : sidebarAberta}
            onExpandir={() => (compacta ? setSidebarSobreposta(true) : setSidebarAberta(true))}
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
          </div>
          )}
          {/* sobreposta, a sidebar sai do fluxo: o espaço da versão recolhida continua reservado */}
          {!celular && compacta && sidebarSobreposta && <div style={{ width: 72, flexShrink: 0 }} />}

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {celular ? (
              <HeaderCelular
                simbolo={<SimboloPausaFast cor={marca.cor} tamanho={32} />}
                titulo={(TITULOS_VIEW[view] || TITULO_PADRAO).t}
                sub={[lojaAtual?.nome, lojaAtual ? (lojaAtual.plataforma === '99food' ? '99Food' : 'iFood') : null].filter(Boolean).join(' · ')}
                conexao={conexao}
                aoVivo={!!AO_VIVO[view]}
                tema={tema}
                onAlternarTema={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
              />
            ) : (
            <Header
              crumb={[marca.nome, lojaAtual?.nome, lojaAtual ? (lojaAtual.plataforma === '99food' ? '99Food' : 'iFood') : null]
                .filter(Boolean)
                .join(' · ')}
              titulo={(TITULOS_VIEW[view] || TITULO_PADRAO).t}
              aoVivo={AO_VIVO[view]}
              conexao={conexao}
              tema={tema}
              onAlternarTema={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
              onAlternarSidebar={() => (compacta ? setSidebarSobreposta((v) => !v) : setSidebarAberta((v) => !v))}
            />
            )}
            <BarraProgresso progresso={progressoMassa} />
            <BannerConexao
              conexao={conexao}
              onTentar={() => {
                carregar()
                carregarAuditoria()
              }}
            />

            <LarguraContext.Provider value={larguraMain}>
            <main ref={refMain} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', position: 'relative', padding: celular ? '12px 16px 24px' : compacta ? '20px 20px 32px' : '24px 28px 40px' }}>
              {view === 'mais' && celular && (
                <MaisView
                  usuario={sessao.usuario}
                  lojaNome={lojaAtual?.nome}
                  totalRupturas={totalRupturas}
                  podeVerFinanceiro={podeCriarItem}
                  souAdministrador={sessao.usuario.papel === 'administrador'}
                  tema={tema}
                  onAlternarTema={() => setTema(tema === 'escuro' ? 'claro' : 'escuro')}
                  onIr={mudarView}
                  onAbrirRupturas={() => {
                    setModalRupturas(true)
                    carregarPausas()
                  }}
                  onAbrirInsumo={() => setModalInsumo(true)}
                  onTrocarLoja={() => setModalLojas(true)}
                  onMinhaSenha={() => setModalMinhaSenha(true)}
                  onSair={onSair}
                />
              )}

              {view === 'dashboard' && (
                <DashboardView
                  itens={itens}
                  categorias={categorias}
                  totalDisponiveis={totalDisponiveis}
                  totalPausados={totalPausados}
                  auditoria={auditoria}
                  pausasPorItem={pausasPorItem}
                  carregando={carregando}
                  executando={executandoMassa}
                  apiFetch={apiFetch}
                  chaveLoja={lojaAtual?.merchant_id}
                  onIrAuditoria={() => setView('auditoria')}
                  onAbrirRupturas={() => {
                    setModalRupturas(true)
                    carregarPausas()
                  }}
                  onReativar={(alvos) => executarStatusEmLote(alvos, 'AVAILABLE')}
                  celular={celular}
                  onPausarItem={() => setModalPausar({ alvos: [] })}
                />
              )}

              {view === 'pedidos' && (
                <PedidosView apiFetch={apiFetch} notificar={notificar} lojaNome={lojaAtual?.nome} plataforma={lojaAtual?.plataforma} celular={layoutEstreito} />
              )}

              {view === 'kds' && (
                <KDSView
                  apiFetch={apiFetch}
                  C={C}
                  notificar={notificar}
                  setConfirmacao={setConfirmacao}
                  lojaNome={lojaAtual?.nome}
                  plataforma={lojaAtual?.plataforma}
                  celular={celular}
                  compacto={layoutEstreito}
                />
              )}

              {view === 'catalogo' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {podeCriarItem && !celular && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--borda)', marginTop: -4 }}>
                  <div role="tablist" aria-label="Seções do cardápio" style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
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
                    {abaCardapio === 'itens' && (
                      <Botao variante="primario" onClick={() => setModalNovoItem(true)} style={{ flexShrink: 0, marginBottom: 6 }}>
                        <Plus size={16} />
                        {larguraMain < 820 ? 'Adicionar' : 'Adicionar item'}
                      </Botao>
                    )}
                  </div>
                )}

                {!celular && podeCriarItem && abaCardapio !== 'itens' && lojaAtual?.plataforma === '99food' && (
                  <section style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, maxWidth: 960 }}>
                    <EstadoVazio
                      icone={<Tags size={22} />}
                      titulo={`${ABAS_CARDAPIO.find((a) => a.chave === abaCardapio)?.label} ainda é só do iFood`}
                      texto={`A API do 99Food que o painel usa não tem essa gestão. Para "${lojaAtual?.nome}", ajuste pelo portal do 99Food — itens, preço, PDV e pausas continuam funcionando aqui.`}
                      acao={
                        <Botao variante="secundario" tamanho="sm" onClick={() => setAbaCardapio('itens')}>
                          Voltar pros itens
                        </Botao>
                      }
                    />
                  </section>
                )}

                {!celular && podeCriarItem && abaCardapio !== 'itens' && lojaAtual?.plataforma !== '99food' && (
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

                {cardapioEmCartoes && (abaCardapio === 'itens' || celular || !podeCriarItem) && (
                  <CatalogoCelular
                    recuo={celular ? { topo: 12, lado: 16 } : { topo: 0, lado: 0 }}
                    itens={itens}
                    filtrados={filtrados}
                    busca={busca}
                    onBusca={setBusca}
                    filtroStatus={filtroStatus}
                    onFiltroStatus={setFiltroStatus}
                    filtroCategoria={filtroCategoria}
                    onFiltroCategoria={setFiltroCategoria}
                    categoriasFiltro={categoriasFiltro}
                    selecionados={selecionados}
                    onAlternarSelecao={alternarSelecao}
                    onLimparSelecao={() => setSelecionados(new Set())}
                    carregando={carregando}
                    erroCarregamento={erroCarregamento}
                    onRecarregar={carregar}
                    alterandoStatus={alterandoStatus}
                    onAlternarStatus={prepararAlternarStatus}
                    onAbrirEdicaoModal={abrirEdicao}
                    onPausarSelecionados={pausarSelecionados}
                    onReativarSelecionados={() => acaoEmMassa('AVAILABLE')}
                    executando={executandoMassa}
                    pausasPorItem={pausasPorItem}
                  />
                )}

                {!cardapioEmCartoes && (abaCardapio === 'itens' || !podeCriarItem) && (
                <CatalogoView
                  itens={itens}
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
                  podeCriarItem={podeCriarItem}
                  edicaoInline={edicaoInline}
                  onAbrirEdicaoInline={abrirEdicaoInline}
                  onEdicaoInlineInput={onEdicaoInlineInput}
                  onSalvarEdicaoInline={salvarEdicaoInline}
                  onCancelarEdicaoInline={() => setEdicaoInline(null)}
                  linhaSalvando={linhaSalvando}
                  linhaSalva={linhaSalva}
                  onPausarSelecionados={pausarSelecionados}
                  onReativarSelecionados={() => acaoEmMassa('AVAILABLE')}
                  onAbrirInsumo={() => setModalInsumo(true)}
                  executando={executandoMassa}
                  pausasPorItem={pausasPorItem}
                  plataforma={lojaAtual?.plataforma}
                />
                )}
                </div>
              )}

              {view === 'lojas' && (
                <StatusLojasView apiFetch={apiFetch} notificar={notificar} podeGerenciar={podeCriarItem} />
              )}

              {view === 'financeiro' && podeCriarItem && (
                <FinanceiroView apiFetch={apiFetch} notificar={notificar} lojaAtual={lojaAtual} />
              )}

              {view === 'auditoria' && <AuditoriaView auditoria={auditoria} />}

              {view === 'usuarios' && sessao.usuario.papel === 'administrador' && (
                <UsuariosSecao
                  usuarios={usuarios}
                  meuId={sessao.usuario.id}
                  conviteForm={conviteForm}
                  setConviteForm={setConviteForm}
                  convidando={convidando}
                  onConvidar={handleConvidar}
                  onTrocarPapel={trocarPapelUsuario}
                  onDefinirSenha={(u) => setModalDefinirSenha(u)}
                  resetandoSenha={resetandoSenha}
                />
              )}

              {view === 'lojas-admin' && sessao.usuario.papel === 'administrador' && (
                <LojasSecao
                  lojas={lojas}
                  lojaAtual={lojaAtual}
                  verificacaoIfood={verificacaoIfood}
                  lojaForm={lojaForm}
                  setLojaForm={setLojaForm}
                  criandoLoja={criandoLoja}
                  onCriar={handleCriarLoja}
                  onAtivar={(id) => {
                    setLojaId(id)
                    notificar('sucesso', 'Loja ativa trocada.', { sub: 'Cardápio, pedidos e cozinha agora mostram essa loja.' })
                  }}
                  onRemover={pedirConfirmacaoRemoverLoja}
                  onDetalhes={abrirDetalhesLoja}
                />
              )}

              {view === 'marca' && sessao.usuario.papel === 'administrador' && <MarcaSecao apiFetch={apiFetch} notificar={notificar} tema={tema} />}
            </main>
            </LarguraContext.Provider>
            {celular && (
              <NavInferior
                ativa={['dashboard', 'pedidos', 'kds', 'catalogo'].includes(view) ? view : 'mais'}
                onMudar={mudarView}
                abas={[
                  { chave: 'dashboard', label: 'Painel', Icon: LayoutGrid },
                  { chave: 'pedidos', label: 'Pedidos', Icon: ClipboardList },
                  { chave: 'kds', label: 'Cozinha', Icon: UtensilsCrossed },
                  { chave: 'catalogo', label: 'Cardápio', Icon: Tag, badge: totalPausados },
                  { chave: 'mais', label: 'Mais', Icon: Menu },
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </CoresContext.Provider>
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
    if (verificando) return <TelaCarregando />
    if (convite)
      return (
        <TelaDefinirSenha
          accessToken={convite.accessToken}
          modo="convite"
          eyebrow={convite.tipo === 'invite' ? 'Boas-vindas' : 'Recuperar acesso'}
          aviso={convite.tipo === 'invite' ? 'Sua conta já foi criada. Escolha a senha que você vai usar para entrar.' : 'Escolha uma senha nova para voltar a entrar no painel.'}
          onDefinida={aoDefinirSenha}
        />
      )
    if (!sessao) return <TelaLogin onLogar={aoLogar} avisoInicial={avisoLink} />
    if (sessao.usuario.senha_temporaria)
      return (
        <TelaDefinirSenha
          accessToken={sessao.accessToken}
          modo="obrigatoria"
          nomeUsuario={sessao.usuario.nome}
          onDefinida={aoTrocarSenhaObrigatoria}
          onSair={sair}
        />
      )
    return <Painel sessao={sessao} onSair={sair} tema={tema} setTema={setTema} C={C} />
  }
}
