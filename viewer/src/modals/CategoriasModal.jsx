import { useEffect, useState } from 'react'
import { Check, Loader2, Pencil, Trash2 } from 'lucide-react'
import { Modal, Pill } from '../ui'

export function CategoriasModal({ onClose, apiFetch, notificar, podeEditar, souAdministrador, C, inputCls, inputStyle }) {
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [editandoId, setEditandoId] = useState(null)
  const [nomeEdicao, setNomeEdicao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [excluindoId, setExcluindoId] = useState(null)
  const [novoNome, setNovoNome] = useState('')
  const [criando, setCriando] = useState(false)

  async function carregar() {
    setCarregando(true)
    try {
      setCategorias(await apiFetch('/categorias'))
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

  function abrirEdicao(cat) {
    setEditandoId(cat.id)
    setNomeEdicao(cat.nome)
  }

  async function salvarEdicao(cat) {
    setSalvando(true)
    try {
      const campos = {}
      if (nomeEdicao.trim() && nomeEdicao.trim() !== cat.nome) campos.nome = nomeEdicao.trim()
      if (Object.keys(campos).length) {
        await apiFetch(`/categorias/${cat.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campos),
        })
        notificar('sucesso', `Categoria "${nomeEdicao.trim()}" atualizada.`)
      }
      setEditandoId(null)
      carregar()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setSalvando(false)
    }
  }

  async function alternarStatusCategoria(cat) {
    const novoStatus = cat.status === 'AVAILABLE' ? 'PAUSED' : 'AVAILABLE'
    try {
      await apiFetch(`/categorias/${cat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus }),
      })
      notificar(
        'sucesso',
        `Categoria "${cat.nome}" ${novoStatus === 'PAUSED' ? 'pausada' : 'reativada'}${
          novoStatus === 'PAUSED' ? ' — todos os itens dela pausam junto no iFood.' : '.'
        }`
      )
      carregar()
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  async function excluir(cat) {
    setExcluindoId(cat.id)
    try {
      await apiFetch(`/categorias/${cat.id}`, { method: 'DELETE' })
      notificar('sucesso', `Categoria "${cat.nome}" excluída.`)
      carregar()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setExcluindoId(null)
    }
  }

  async function criarCategoria(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setCriando(true)
    try {
      await apiFetch('/categorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome.trim() }),
      })
      notificar('sucesso', `Categoria "${novoNome.trim()}" criada.`)
      setNovoNome('')
      carregar()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCriando(false)
    }
  }

  return (
    <Modal titulo="Gerenciar categorias" onClose={onClose} largura="max-w-lg">
      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto mb-4">
        {carregando && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: C.text2 }}>
            <Loader2 size={12} className="animate-spin" /> Carregando...
          </p>
        )}
        {!carregando && categorias.length === 0 && (
          <p className="text-xs" style={{ color: C.text2 }}>
            Nenhuma categoria ainda.
          </p>
        )}
        {categorias.map((cat) => (
          <div key={cat.id} className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-2" style={{ background: C.inputBg }}>
            {editandoId === cat.id ? (
              <>
                <input
                  autoFocus
                  className="flex-1 min-w-0 rounded-md px-2 py-1 text-xs outline-none"
                  style={inputStyle}
                  value={nomeEdicao}
                  onChange={(e) => setNomeEdicao(e.target.value)}
                />
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => salvarEdicao(cat)}
                  className="botao-icone-fantasma w-7 h-7 rounded-md inline-flex items-center justify-center flex-shrink-0"
                  style={{ color: C.good }}
                  title="Salvar"
                >
                  {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                </button>
              </>
            ) : (
              <>
                <span className="font-semibold truncate flex-1" style={{ color: C.text1 }}>
                  {cat.nome}
                </span>
                <button
                  type="button"
                  onClick={() => alternarStatusCategoria(cat)}
                  disabled={!podeEditar}
                  className="disabled:opacity-40"
                  title={podeEditar ? 'Clique pra pausar/reativar a categoria inteira' : undefined}
                >
                  <Pill color={cat.status === 'AVAILABLE' ? C.good : C.neutral} dot>
                    {cat.status === 'AVAILABLE' ? 'Ativa' : 'Pausada'}
                  </Pill>
                </button>
                {podeEditar && (
                  <button
                    type="button"
                    onClick={() => abrirEdicao(cat)}
                    className="botao-icone-fantasma w-7 h-7 rounded-md inline-flex items-center justify-center flex-shrink-0"
                    style={{ color: C.text2 }}
                    title="Renomear"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                {souAdministrador && (
                  <button
                    type="button"
                    disabled={excluindoId === cat.id}
                    onClick={() => excluir(cat)}
                    className="botao-icone-fantasma w-7 h-7 rounded-md inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                    style={{ color: C.bad }}
                    title="Excluir categoria"
                  >
                    {excluindoId === cat.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {podeEditar && (
        <div className="border-t pt-3.5" style={{ borderColor: C.cardBorder }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.text2 }}>
            Nova categoria
          </p>
          <form onSubmit={criarCategoria} className="flex gap-2">
            <input
              required
              className={`${inputCls} flex-1`}
              style={inputStyle}
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome da categoria"
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
