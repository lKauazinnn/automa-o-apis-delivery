import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '../ui'

const DIAS = [
  { chave: 'MONDAY', label: 'Segunda' },
  { chave: 'TUESDAY', label: 'Terça' },
  { chave: 'WEDNESDAY', label: 'Quarta' },
  { chave: 'THURSDAY', label: 'Quinta' },
  { chave: 'FRIDAY', label: 'Sexta' },
  { chave: 'SATURDAY', label: 'Sábado' },
  { chave: 'SUNDAY', label: 'Domingo' },
]

function minutosParaHora(minutosDoDia) {
  const h = Math.floor(minutosDoDia / 60) % 24
  const m = minutosDoDia % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function horaParaMinutos(hora) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function HorarioFuncionamentoModal({ onClose, apiFetch, notificar, podeEditar, C, inputStyle }) {
  const [carregando, setCarregando] = useState(true)
  const [dias, setDias] = useState(() =>
    Object.fromEntries(DIAS.map((d) => [d.chave, { aberto: false, inicio: '08:00', fim: '22:00' }]))
  )
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    apiFetch('/horario-funcionamento')
      .then((data) => {
        const novo = Object.fromEntries(DIAS.map((d) => [d.chave, { aberto: false, inicio: '08:00', fim: '22:00' }]))
        for (const turno of data.shifts || []) {
          const inicioMin = horaParaMinutos(turno.start.slice(0, 5))
          novo[turno.dayOfWeek] = {
            aberto: true,
            inicio: turno.start.slice(0, 5),
            fim: minutosParaHora(inicioMin + turno.duration),
          }
        }
        setDias(novo)
      })
      .catch((e) => notificar('erro', e.message))
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function atualizarDia(chave, campo, valor) {
    setDias((prev) => ({ ...prev, [chave]: { ...prev[chave], [campo]: valor } }))
  }

  async function salvar() {
    setSalvando(true)
    try {
      const turnos = DIAS.filter((d) => dias[d.chave].aberto).map((d) => {
        const { inicio, fim } = dias[d.chave]
        const inicioMin = horaParaMinutos(inicio)
        let fimMin = horaParaMinutos(fim)
        if (fimMin <= inicioMin) fimMin += 24 * 60 // atravessa a meia-noite
        return { dayOfWeek: d.chave, start: `${inicio}:00`, duration: fimMin - inicioMin }
      })
      if (turnos.length === 0) {
        notificar('erro', 'Marque ao menos um dia como aberto.')
        setSalvando(false)
        return
      }
      await apiFetch('/horario-funcionamento', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnos }),
      })
      notificar('sucesso', 'Horário de funcionamento atualizado.')
      onClose()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal titulo="Horário de funcionamento" onClose={onClose} largura="max-w-lg">
      {carregando ? (
        <p className="text-xs flex items-center gap-1.5 py-4" style={{ color: C.text2 }}>
          <Loader2 size={12} className="animate-spin" /> Carregando...
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5 mb-4">
            {DIAS.map((d) => {
              const dia = dias[d.chave]
              return (
                <div key={d.chave} className="flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-2" style={{ background: C.inputBg }}>
                  <label className="flex items-center gap-2 w-24 flex-shrink-0 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!podeEditar}
                      checked={dia.aberto}
                      onChange={(e) => atualizarDia(d.chave, 'aberto', e.target.checked)}
                    />
                    <span style={{ color: C.text1 }}>{d.label}</span>
                  </label>
                  {dia.aberto ? (
                    <>
                      <input
                        type="time"
                        disabled={!podeEditar}
                        value={dia.inicio}
                        onChange={(e) => atualizarDia(d.chave, 'inicio', e.target.value)}
                        className="rounded-md px-2 py-1 text-xs outline-none flex-1 min-w-0"
                        style={inputStyle}
                      />
                      <span style={{ color: C.text3 }}>até</span>
                      <input
                        type="time"
                        disabled={!podeEditar}
                        value={dia.fim}
                        onChange={(e) => atualizarDia(d.chave, 'fim', e.target.value)}
                        className="rounded-md px-2 py-1 text-xs outline-none flex-1 min-w-0"
                        style={inputStyle}
                      />
                    </>
                  ) : (
                    <span className="flex-1" style={{ color: C.text3 }}>
                      Fechado
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {podeEditar && (
            <button
              type="button"
              disabled={salvando}
              onClick={salvar}
              className="botao-primario w-full flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl disabled:opacity-40"
            >
              {salvando && <Loader2 size={14} className="animate-spin" />}
              {salvando ? 'Salvando...' : 'Salvar horário'}
            </button>
          )}
        </>
      )}
    </Modal>
  )
}
