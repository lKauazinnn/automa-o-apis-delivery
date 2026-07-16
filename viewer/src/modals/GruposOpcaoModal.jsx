import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { Modal } from '../ui'

function LinhaOpcao({ opcao, podeExcluir, onExcluir, C }) {
  const [excluindo, setExcluindo] = useState(false)
  return (
    <div className="flex items-center gap-2 text-xs rounded-md px-2.5 py-1.5" style={{ background: C.cardBg }}>
      <span className="truncate flex-1" style={{ color: C.text1 }}>
        {opcao.name || opcao.externalCode || opcao.productId}
      </span>
      <span className="font-mono flex-shrink-0" style={{ color: C.text3 }}>
        R$ {Number(opcao.price?.value ?? 0).toFixed(2)}
      </span>
      {podeExcluir && (
        <button
          type="button"
          disabled={excluindo}
          onClick={async () => {
            setExcluindo(true)
            await onExcluir(opcao)
            setExcluindo(false)
          }}
          className="botao-icone-fantasma w-6 h-6 rounded-md inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          style={{ color: C.bad }}
          title="Excluir opção"
        >
          {excluindo ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
        </button>
      )}
    </div>
  )
}

export function GruposOpcaoModal({ onClose, apiFetch, notificar, podeEditar, souAdministrador, C, inputCls, inputStyle }) {
  const [grupos, setGrupos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [expandido, setExpandido] = useState(null)
  const [excluindoGrupo, setExcluindoGrupo] = useState(null)
  const [novaOpcao, setNovaOpcao] = useState({ nome: '', preco: '', codigo_pdv: '' })
  const [criandoOpcao, setCriandoOpcao] = useState(false)
  // A listagem de grupos do iFood não devolve as opções já cadastradas dentro de cada
  // grupo (a API sempre volta "options: []", mesmo quando existem) — então só temos como
  // mostrar as que a gente mesmo criou aqui, nesta sessão.
  const [opcoesCriadasAqui, setOpcoesCriadasAqui] = useState({})

  async function carregar() {
    setCarregando(true)
    try {
      setGrupos(await apiFetch('/grupos-opcao'))
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function criarGrupo(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setCriando(true)
    try {
      await apiFetch('/grupos-opcao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome.trim() }),
      })
      notificar('sucesso', `Grupo "${novoNome.trim()}" criado.`)
      setNovoNome('')
      carregar()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCriando(false)
    }
  }

  async function excluirGrupo(grupo) {
    setExcluindoGrupo(grupo.id)
    try {
      await apiFetch(`/grupos-opcao/${grupo.id}`, { method: 'DELETE' })
      notificar('sucesso', `Grupo "${grupo.name}" excluído.`)
      carregar()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setExcluindoGrupo(null)
    }
  }

  async function criarOpcao(e, grupo) {
    e.preventDefault()
    if (!novaOpcao.nome.trim()) return
    const preco = Number(String(novaOpcao.preco).replace(',', '.'))
    if (!preco || preco <= 0) {
      notificar('erro', 'Preço da opção deve ser maior que zero.')
      return
    }
    setCriandoOpcao(true)
    try {
      const criada = await apiFetch(`/grupos-opcao/${grupo.id}/opcoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novaOpcao.nome.trim(), preco, codigo_pdv: novaOpcao.codigo_pdv.trim() }),
      })
      notificar('sucesso', `Opção "${novaOpcao.nome.trim()}" criada.`)
      setOpcoesCriadasAqui((prev) => ({
        ...prev,
        [grupo.id]: [...(prev[grupo.id] || []), { ...criada, name: novaOpcao.nome.trim() }],
      }))
      setNovaOpcao({ nome: '', preco: '', codigo_pdv: '' })
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCriandoOpcao(false)
    }
  }

  async function excluirOpcao(grupo, opcao) {
    try {
      await apiFetch(`/grupos-opcao/${grupo.id}/opcoes/${opcao.productId}`, { method: 'DELETE' })
      notificar('sucesso', 'Opção excluída.')
      setOpcoesCriadasAqui((prev) => ({
        ...prev,
        [grupo.id]: (prev[grupo.id] || []).filter((o) => o.productId !== opcao.productId),
      }))
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  return (
    <Modal titulo="Grupos de opção (complementos)" onClose={onClose} largura="max-w-lg">
      <p className="text-xs mb-3 leading-relaxed" style={{ color: C.text2 }}>
        Complementos de um item (ex: "Escolha a bebida"). Depois de criados, use um grupo ao
        montar um combo ou anexe direto num item pela edição dele.
      </p>
      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto mb-4">
        {carregando && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: C.text2 }}>
            <Loader2 size={12} className="animate-spin" /> Carregando...
          </p>
        )}
        {!carregando && grupos.length === 0 && (
          <p className="text-xs" style={{ color: C.text2 }}>
            Nenhum grupo de opção ainda.
          </p>
        )}
        {grupos.map((grupo) => {
          const aberto = expandido === grupo.id
          const opcoesDoGrupo = opcoesCriadasAqui[grupo.id] || []
          return (
            <div key={grupo.id} className="rounded-lg" style={{ background: C.inputBg }}>
              <div className="w-full flex items-center gap-2 text-xs px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => setExpandido(aberto ? null : grupo.id)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  {aberto ? <ChevronDown size={13} className="flex-shrink-0" /> : <ChevronRight size={13} className="flex-shrink-0" />}
                  <span className="font-semibold truncate" style={{ color: C.text1 }}>
                    {grupo.name}
                  </span>
                </button>
                <span className="text-[10px] flex-shrink-0" style={{ color: C.text3 }}>
                  {opcoesDoGrupo.length} opções nesta sessão
                </span>
                {souAdministrador && (
                  <button
                    type="button"
                    onClick={() => excluirGrupo(grupo)}
                    className="botao-icone-fantasma w-6 h-6 rounded-md inline-flex items-center justify-center flex-shrink-0"
                    style={{ color: C.bad }}
                    title="Excluir grupo"
                  >
                    {excluindoGrupo === grupo.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  </button>
                )}
              </div>
              {aberto && (
                <div className="px-2.5 pb-2.5 flex flex-col gap-1.5">
                  <p className="text-[10px] px-1 leading-relaxed" style={{ color: C.text3 }}>
                    O iFood não devolve as opções já cadastradas num grupo — só mostramos aqui
                    as que você criar agora, nesta sessão.
                  </p>
                  {opcoesDoGrupo.map((opcao) => (
                    <LinhaOpcao
                      key={opcao.id || opcao.productId}
                      opcao={opcao}
                      podeExcluir={podeEditar}
                      onExcluir={(o) => excluirOpcao(grupo, o)}
                      C={C}
                    />
                  ))}
                  {podeEditar && (
                    <form onSubmit={(e) => criarOpcao(e, grupo)} className="flex gap-1.5 pt-1.5">
                      <input
                        required
                        className="flex-1 min-w-0 rounded-md px-2 py-1.5 text-xs outline-none"
                        style={inputStyle}
                        value={novaOpcao.nome}
                        onChange={(e) => setNovaOpcao({ ...novaOpcao, nome: e.target.value })}
                        placeholder="Nome da opção"
                      />
                      <input
                        required
                        className="w-20 flex-shrink-0 rounded-md px-2 py-1.5 text-xs outline-none"
                        style={inputStyle}
                        inputMode="decimal"
                        value={novaOpcao.preco}
                        onChange={(e) => setNovaOpcao({ ...novaOpcao, preco: e.target.value })}
                        placeholder="Preço"
                      />
                      <button
                        type="submit"
                        disabled={criandoOpcao}
                        className="botao-icone-fantasma w-8 h-8 rounded-md inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                        style={{ color: '#F56C35', border: `1px solid ${C.cardBorder}` }}
                        title="Adicionar opção"
                      >
                        {criandoOpcao ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {podeEditar && (
        <div className="border-t pt-3.5" style={{ borderColor: C.cardBorder }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.text2 }}>
            Novo grupo de opção
          </p>
          <form onSubmit={criarGrupo} className="flex gap-2">
            <input
              required
              className={`${inputCls} flex-1`}
              style={inputStyle}
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder='Ex: "Escolha a bebida"'
            />
            <button
              type="submit"
              disabled={criando}
              className="botao-primario text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40 flex-shrink-0 flex items-center gap-1.5"
            >
              {criando && <Loader2 size={12} className="animate-spin" />}
              Criar
            </button>
          </form>
        </div>
      )}
    </Modal>
  )
}
