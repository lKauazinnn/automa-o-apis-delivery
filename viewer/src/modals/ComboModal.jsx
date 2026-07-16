import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Modal } from '../ui'

export function ComboModal({ onClose, onCriado, apiFetch, notificar, categorias, C, inputCls, inputStyle }) {
  const [form, setForm] = useState({ nome: '', categoria: '', novaCategoria: '', codigo_pdv: '', preco: '' })
  const [grupos, setGrupos] = useState([])
  const [carregandoGrupos, setCarregandoGrupos] = useState(true)
  const [grupoPrincipal, setGrupoPrincipal] = useState('')
  const [gruposAdicionais, setGruposAdicionais] = useState(new Set())
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    apiFetch('/grupos-opcao')
      .then(setGrupos)
      .catch((e) => notificar('erro', e.message))
      .finally(() => setCarregandoGrupos(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function alternarAdicional(id) {
    setGruposAdicionais((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const categoriaFinal = form.categoria === '__NOVA__' ? form.novaCategoria : form.categoria
  const precoNumerico = Number(String(form.preco).replace(',', '.'))
  const formValido =
    form.nome.trim() && categoriaFinal.trim() && form.codigo_pdv.trim() && form.preco && precoNumerico > 0 && grupoPrincipal

  async function criar(e) {
    e.preventDefault()
    setErro('')
    if (!formValido) {
      setErro('Preencha nome, categoria, código PDV, preço e escolha o grupo principal do combo.')
      return
    }
    setSalvando(true)
    try {
      const gruposOpcao = [
        { optionGroupId: grupoPrincipal, principal: true },
        ...Array.from(gruposAdicionais).map((id) => ({ optionGroupId: id, principal: false })),
      ]
      await apiFetch('/itens/combo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          categoria: categoriaFinal.trim(),
          codigo_pdv: form.codigo_pdv.trim(),
          preco: form.preco,
          grupos_opcao: gruposOpcao,
        }),
      })
      notificar('sucesso', `Combo "${form.nome}" criado.`)
      onCriado()
      onClose()
    } catch (e) {
      setErro(e.message)
      notificar('erro', e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal titulo="Criar combo" eyebrow="Novo combo" onClose={onClose} largura="max-w-lg">
      {carregandoGrupos ? (
        <p className="text-xs flex items-center gap-1.5 py-4" style={{ color: C.text2 }}>
          <Loader2 size={12} className="animate-spin" /> Carregando grupos de opção...
        </p>
      ) : grupos.length === 0 ? (
        <p className="text-xs leading-relaxed" style={{ color: C.text2 }}>
          Você ainda não tem nenhum grupo de opção cadastrado. Crie um primeiro em "Grupos de
          opção" — um combo precisa de ao menos um grupo marcado como principal (ex: "Escolha o
          hambúrguer").
        </p>
      ) : (
        <form onSubmit={criar} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
              Nome do combo
            </label>
            <input
              autoFocus
              className={inputCls}
              style={inputStyle}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Combo hambúrguer e refrigerante"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
              Categoria
            </label>
            <select className={inputCls} style={inputStyle} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
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
            <input
              className={inputCls}
              style={inputStyle}
              value={form.novaCategoria}
              onChange={(e) => setForm({ ...form, novaCategoria: e.target.value })}
              placeholder="Nome da nova categoria"
            />
          )}

          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="min-w-0">
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                Código PDV
              </label>
              <input
                className={inputCls}
                style={inputStyle}
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
                inputMode="decimal"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                placeholder="29,90"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
              Grupo principal (obrigatório — ex: "Escolha o hambúrguer")
            </label>
            <select className={inputCls} style={inputStyle} value={grupoPrincipal} onChange={(e) => setGrupoPrincipal(e.target.value)}>
              <option value="">Selecione...</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
              Outros grupos do combo (opcional — ex: "Escolha a bebida")
            </label>
            <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
              {grupos
                .filter((g) => g.id !== grupoPrincipal)
                .map((g) => (
                  <label
                    key={g.id}
                    className="flex items-center gap-2 text-xs rounded-lg px-2.5 py-2 cursor-pointer"
                    style={{ background: C.inputBg }}
                  >
                    <input type="checkbox" checked={gruposAdicionais.has(g.id)} onChange={() => alternarAdicional(g.id)} />
                    <span style={{ color: C.text1 }}>{g.name}</span>
                  </label>
                ))}
            </div>
          </div>

          {erro && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              {erro}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={!formValido || salvando}
              className="botao-primario flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl disabled:opacity-40"
            >
              {salvando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {salvando ? 'Criando...' : 'Criar combo'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold px-3.5 py-2.5 rounded-xl"
              style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
