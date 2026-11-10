import { useEffect, useRef, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Modal } from '../ui'

export function InterrupcoesModal({ onClose, apiFetch, notificar, podeEditar, C, inputCls, inputStyle }) {
  const [interrupcoes, setInterrupcoes] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [form, setForm] = useState({ descricao: '', inicio: '', fim: '' })
  const [criando, setCriando] = useState(false)
  const [excluindoId, setExcluindoId] = useState(null)
  const montado = useRef(true)

  async function carregar(silencioso = false) {
    if (!silencioso) setCarregando(true)
    try {
      const dados = await apiFetch('/interrupcoes')
      if (montado.current) setInterrupcoes(dados)
      return dados
    } catch (e) {
      if (!silencioso) notificar('erro', e.message)
      return null
    } finally {
      if (!silencioso && montado.current) setCarregando(false)
    }
  }

  // A lista do iFood é eventualmente consistente: uma interrupção recém-criada/removida leva de
  // ~10s a mais de 1 min pra aparecer/sumir (medido no sandbox em 10/11/2026). Reconsultamos em
  // silêncio a cada 5s até a lista refletir a mudança (ou 2 min), sem depender de refresh manual.
  async function recarregarComPropagacao(refletiu) {
    const ate = Date.now() + 120000
    let dados = await carregar(true)
    while (montado.current && !(dados && refletiu(dados)) && Date.now() < ate) {
      await new Promise((r) => setTimeout(r, 5000))
      if (!montado.current) return
      dados = (await carregar(true)) ?? dados
    }
  }

  useEffect(() => {
    // Religa a flag: no StrictMode (dev) o efeito monta → limpa → monta de novo, e sem isso
    // `montado` ficava false pra sempre e a lista travava em "Carregando...".
    montado.current = true
    carregar()
    return () => {
      montado.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function criar(e) {
    e.preventDefault()
    if (!form.descricao.trim() || !form.inicio || !form.fim) return
    setCriando(true)
    try {
      const criada = await apiFetch('/interrupcoes', {
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
      const idNovo = criada?.id
      recarregarComPropagacao((lista) => (idNovo ? lista.some((i) => i.id === idNovo) : lista.length > 0))
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
      recarregarComPropagacao((lista) => !lista.some((i) => i.id === interrupcao.id))
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
