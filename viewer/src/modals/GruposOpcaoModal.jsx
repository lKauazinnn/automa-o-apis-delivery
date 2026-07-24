import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Loader2, Pause, Pencil, Play, Plus, Trash2, X } from 'lucide-react'
import { lerImagemComoDataUrl, Modal, Pill } from '../ui'

function LinhaOpcao({ opcao, podeExcluir, onExcluir, onAlternarStatus, onEditar, C, inputStyle }) {
  const [excluindo, setExcluindo] = useState(false)
  const [alternando, setAlternando] = useState(false)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({ nome: opcao.name || '', preco: opcao.price?.value ?? '', foto: opcao.imagePath || '' })
  const pausada = opcao.status === 'UNAVAILABLE'

  if (editando) {
    return (
      <form
        className="flex flex-col gap-1.5 rounded-md px-2.5 py-2"
        style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}` }}
        onSubmit={async (e) => {
          e.preventDefault()
          setSalvando(true)
          const ok = await onEditar(opcao, form)
          setSalvando(false)
          if (ok) setEditando(false)
        }}
      >
        <div className="flex gap-1.5">
          <input
            required
            autoFocus
            className="flex-1 min-w-0 rounded-md px-2 py-1.5 text-xs outline-none"
            style={inputStyle}
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do complemento"
          />
          <input
            required
            className="w-20 flex-shrink-0 rounded-md px-2 py-1.5 text-xs outline-none"
            style={inputStyle}
            inputMode="decimal"
            value={form.preco}
            onChange={(e) => setForm({ ...form, preco: e.target.value })}
            placeholder="Preço"
          />
        </div>
        <div className="flex items-center gap-2">
          {form.foto && <img src={form.foto} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />}
          <input
            className="flex-1 min-w-0 rounded-md text-[11px] outline-none"
            style={inputStyle}
            type="file"
            accept="image/png,image/jpeg"
            onChange={async (e) => {
              const arquivo = e.target.files?.[0]
              if (!arquivo) return
              const dataUrl = await lerImagemComoDataUrl(arquivo)
              setForm((prev) => ({ ...prev, foto: dataUrl }))
            }}
          />
          <button
            type="submit"
            disabled={salvando}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: C.goodBg, border: `1px solid ${C.goodBd}`, color: C.good }}
            title="Salvar"
          >
            {salvando ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          </button>
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="botao-icone-fantasma w-7 h-7 rounded-md inline-flex items-center justify-center flex-shrink-0"
            style={{ color: C.text3 }}
            title="Cancelar"
          >
            <X size={12} />
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center gap-2 text-xs rounded-md px-2.5 py-1.5" style={{ background: C.cardBg }}>
      {opcao.imagePath && (
        <img src={opcao.imagePath} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
      )}
      <span className="truncate flex-1" style={{ color: C.text1 }}>
        {opcao.name || opcao.externalCode || opcao.productId}
      </span>
      <span className="font-mono flex-shrink-0" style={{ color: C.text3 }}>
        R$ {Number(opcao.price?.value ?? 0).toFixed(2)}
      </span>
      <span className="flex-shrink-0">
        <Pill color={pausada ? C.neutral : C.good} dot>{pausada ? 'Pausado' : 'Disponível'}</Pill>
      </span>
      {podeExcluir && (
        <button
          type="button"
          onClick={() => {
            setForm({ nome: opcao.name || '', preco: opcao.price?.value ?? '', foto: opcao.imagePath || '' })
            setEditando(true)
          }}
          className="botao-icone-fantasma w-6 h-6 rounded-md inline-flex items-center justify-center flex-shrink-0"
          style={{ color: C.text2 }}
          title="Editar complemento"
        >
          <Pencil size={11} />
        </button>
      )}
      {podeExcluir && (
        <button
          type="button"
          disabled={alternando}
          onClick={async () => {
            setAlternando(true)
            await onAlternarStatus(opcao)
            setAlternando(false)
          }}
          title={pausada ? 'Despausar complemento' : 'Pausar complemento'}
          className="w-6 h-6 rounded-md inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          style={
            pausada
              ? { background: C.goodBg, border: `1px solid ${C.goodBd}`, color: C.good }
              : { background: C.neutralBg, border: `1px solid ${C.neutralBd}`, color: C.neutral }
          }
        >
          {alternando ? <Loader2 size={11} className="animate-spin" /> : pausada ? <Play size={11} /> : <Pause size={11} />}
        </button>
      )}
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
          title="Excluir complemento"
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
  const [novaOpcao, setNovaOpcao] = useState({ nome: '', preco: '', codigo_pdv: '', foto: '' })
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
      notificar('erro', 'Preço do complemento deve ser maior que zero.')
      return
    }
    setCriandoOpcao(true)
    try {
      let imagemPath
      if (novaOpcao.foto) {
        const up = await apiFetch('/imagens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagem: novaOpcao.foto }),
        })
        imagemPath = up.imagem_path
      }
      const criada = await apiFetch(`/grupos-opcao/${grupo.id}/opcoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novaOpcao.nome.trim(),
          preco,
          codigo_pdv: novaOpcao.codigo_pdv.trim(),
          imagem_path: imagemPath,
        }),
      })
      notificar('sucesso', `Complemento "${novaOpcao.nome.trim()}" criado.`)
      // Blinda contra variação no nome do campo na resposta do iFood: a UI usa opcao.id
      // (pausar) e opcao.productId (editar/excluir). Garante os dois — e status/preço iniciais
      // pro badge e o valor aparecerem na hora — independente do shape exato do create_option.
      const idOpcao = criada.id ?? criada.optionId ?? criada.option_id ?? criada.productId ?? criada.product?.id
      const productIdOpcao =
        criada.productId ?? criada.product_id ?? criada.product?.productId ?? criada.product?.id ?? criada.id ?? criada.optionId
      setOpcoesCriadasAqui((prev) => ({
        ...prev,
        [grupo.id]: [
          ...(prev[grupo.id] || []),
          {
            ...criada,
            id: idOpcao,
            productId: productIdOpcao,
            status: criada.status || 'AVAILABLE',
            name: novaOpcao.nome.trim(),
            price: { value: preco },
            imagePath: novaOpcao.foto,
          },
        ],
      }))
      setNovaOpcao({ nome: '', preco: '', codigo_pdv: '', foto: '' })
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCriandoOpcao(false)
    }
  }

  async function alternarStatusOpcao(grupo, opcao) {
    const novoStatus = opcao.status === 'UNAVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE'
    try {
      await apiFetch(`/grupos-opcao/${grupo.id}/opcoes/${opcao.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus, nome: opcao.name }),
      })
      setOpcoesCriadasAqui((prev) => ({
        ...prev,
        [grupo.id]: (prev[grupo.id] || []).map((o) => (o.productId === opcao.productId ? { ...o, status: novoStatus } : o)),
      }))
      notificar('sucesso', `"${opcao.name}" ${novoStatus === 'UNAVAILABLE' ? 'pausado' : 'despausado'}.`)
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  async function editarOpcao(opcao, form) {
    const preco = Number(String(form.preco).replace(',', '.'))
    if (!preco || preco <= 0) {
      notificar('erro', 'Preço do complemento deve ser maior que zero.')
      return false
    }
    if (!form.foto) {
      notificar('erro', 'Esse complemento precisa de uma foto — o iFood exige foto pra editar (envie uma, mesmo que já tivesse antes).')
      return false
    }
    try {
      let imagemPath = form.foto
      if (form.foto.startsWith('data:')) {
        const up = await apiFetch('/imagens', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imagem: form.foto }),
        })
        imagemPath = up.imagem_path
      }
      await apiFetch(`/grupos-opcao/opcoes/${opcao.productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), preco, imagem_path: imagemPath, nome_anterior: opcao.name }),
      })
      setOpcoesCriadasAqui((prev) => {
        const next = {}
        for (const [grupoId, opcoes] of Object.entries(prev)) {
          next[grupoId] = opcoes.map((o) =>
            o.productId === opcao.productId
              ? { ...o, name: form.nome.trim(), imagePath: imagemPath, price: { value: preco } }
              : o
          )
        }
        return next
      })
      notificar('sucesso', `"${form.nome.trim()}" atualizado.`)
      return true
    } catch (e) {
      notificar('erro', e.message)
      return false
    }
  }

  async function excluirOpcao(grupo, opcao) {
    try {
      await apiFetch(`/grupos-opcao/${grupo.id}/opcoes/${opcao.productId}`, { method: 'DELETE' })
      notificar('sucesso', 'Complemento excluído.')
      setOpcoesCriadasAqui((prev) => ({
        ...prev,
        [grupo.id]: (prev[grupo.id] || []).filter((o) => o.productId !== opcao.productId),
      }))
    } catch (e) {
      notificar('erro', e.message)
    }
  }

  return (
    <Modal titulo="Complementos" onClose={onClose} largura="max-w-lg">
      <p className="text-xs mb-3 leading-relaxed" style={{ color: C.text2 }}>
        Um <strong>grupo de complementos</strong> junta os complementos de um item (ex: "Escolha a
        bebida", "Adicionais"). Crie o grupo e adicione os complementos dentro dele.
      </p>
      <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto mb-4">
        {carregando && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: C.text2 }}>
            <Loader2 size={12} className="animate-spin" /> Carregando...
          </p>
        )}
        {!carregando && grupos.length === 0 && (
          <p className="text-xs" style={{ color: C.text2 }}>
            Nenhum grupo de complementos ainda.
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
                  {opcoesDoGrupo.length} complementos nesta sessão
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
                    O iFood não devolve os complementos já cadastrados num grupo — só mostramos
                    aqui os que você criar agora, nesta sessão.
                  </p>
                  {opcoesDoGrupo.map((opcao) => (
                    <LinhaOpcao
                      key={opcao.id || opcao.productId}
                      opcao={opcao}
                      podeExcluir={podeEditar}
                      onExcluir={(o) => excluirOpcao(grupo, o)}
                      onAlternarStatus={(o) => alternarStatusOpcao(grupo, o)}
                      onEditar={editarOpcao}
                      C={C}
                      inputStyle={inputStyle}
                    />
                  ))}
                  {podeEditar && (
                    <form onSubmit={(e) => criarOpcao(e, grupo)} className="flex flex-col gap-1.5 pt-1.5">
                      <div className="flex gap-1.5">
                        <input
                          required
                          className="flex-1 min-w-0 rounded-md px-2 py-1.5 text-xs outline-none"
                          style={inputStyle}
                          value={novaOpcao.nome}
                          onChange={(e) => setNovaOpcao({ ...novaOpcao, nome: e.target.value })}
                          placeholder="Nome do complemento"
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
                          title="Adicionar complemento"
                        >
                          {criandoOpcao ? <Loader2 size={12} className="animate-spin" /> : <Plus size={13} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {novaOpcao.foto && (
                          <img src={novaOpcao.foto} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                        )}
                        <input
                          className="flex-1 min-w-0 rounded-md text-[11px] outline-none"
                          style={inputStyle}
                          type="file"
                          accept="image/png,image/jpeg"
                          onChange={async (e) => {
                            const arquivo = e.target.files?.[0]
                            if (!arquivo) return
                            try {
                              const dataUrl = await lerImagemComoDataUrl(arquivo)
                              setNovaOpcao((prev) => ({ ...prev, foto: dataUrl }))
                            } catch (err) {
                              notificar('erro', err.message)
                            }
                          }}
                        />
                      </div>
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
            Novo grupo de complementos
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
