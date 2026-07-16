import { useEffect, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Modal } from '../ui'

export function InterrupcoesModal({ onClose, apiFetch, notificar, podeEditar, C, inputCls, inputStyle }) {
  const [interrupcoes, setInterrupcoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState({ descricao: '', inicio: '', fim: '' })
  const [criando, setCriando] = useState(false)
  const [excluindoId, setExcluindoId] = useState(null)

  async function carregar() {
    setCarregando(true)
    try {
      setInterrupcoes(await apiFetch('/interrupcoes'))
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

  async function criar(e) {
    e.preventDefault()
    if (!form.descricao.trim() || !form.inicio || !form.fim) return
    setCriando(true)
    try {
      await apiFetch('/interrupcoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: form.descricao.trim(),
          inicio: `${form.inicio}:00.000Z`,
          fim: `${form.fim}:00.000Z`,
        }),
      })
      notificar('sucesso', 'Interrupção criada — a loja fecha automaticamente nesse período.')
      setForm({ descricao: '', inicio: '', fim: '' })
      carregar()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setCriando(false)
    }
  }

  async function excluir(interrupcao) {
    setExcluindoId(interrupcao.id)
    try {
      await apiFetch(`/interrupcoes/${interrupcao.id}`, { method: 'DELETE' })
      notificar('sucesso', 'Interrupção removida.')
      carregar()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setExcluindoId(null)
    }
  }

  return (
    <Modal titulo="Interrupções (fechamento temporário)" onClose={onClose} largura="max-w-lg">
      <p className="text-xs mb-3 leading-relaxed" style={{ color: C.text2 }}>
        Fecha a loja por um período (ex: sem entregador disponível, cozinha travada) — volta a
        abrir sozinha no fim do horário.
      </p>
      <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto mb-4">
        {carregando && (
          <p className="text-xs flex items-center gap-1.5" style={{ color: C.text2 }}>
            <Loader2 size={12} className="animate-spin" /> Carregando...
          </p>
        )}
        {!carregando && interrupcoes.length === 0 && (
          <p className="text-xs" style={{ color: C.text2 }}>
            Nenhuma interrupção agendada.
          </p>
        )}
        {interrupcoes.map((i) => (
          <div key={i.id} className="flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-2" style={{ background: C.inputBg }}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate" style={{ color: C.text1 }}>
                {i.description}
              </p>
              <p style={{ color: C.text3 }}>
                {i.start} — {i.end}
              </p>
            </div>
            {podeEditar && (
              <button
                type="button"
                disabled={excluindoId === i.id}
                onClick={() => excluir(i)}
                className="botao-icone-fantasma w-7 h-7 rounded-md inline-flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                style={{ color: C.bad }}
                title="Remover interrupção"
              >
                {excluindoId === i.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </button>
            )}
          </div>
        ))}
      </div>

      {podeEditar && (
        <div className="border-t pt-3.5" style={{ borderColor: C.cardBorder }}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: C.text2 }}>
            Nova interrupção
          </p>
          <form onSubmit={criar} className="flex flex-col gap-2.5">
            <input
              required
              className={inputCls}
              style={inputStyle}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Motivo (ex: Sem entregador disponível)"
            />
            <div className="grid grid-cols-2 gap-2.5">
              <input
                required
                type="datetime-local"
                className={inputCls}
                style={inputStyle}
                value={form.inicio}
                onChange={(e) => setForm({ ...form, inicio: e.target.value })}
              />
              <input
                required
                type="datetime-local"
                className={inputCls}
                style={inputStyle}
                value={form.fim}
                onChange={(e) => setForm({ ...form, fim: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={criando}
              className="botao-primario flex items-center justify-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
            >
              {criando && <Loader2 size={12} className="animate-spin" />}
              {criando ? 'Criando...' : 'Fechar loja nesse período'}
            </button>
          </form>
        </div>
      )}
    </Modal>
  )
}
