import { useEffect, useState } from 'react'
import { Loader2, Plus, X } from 'lucide-react'
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

const faixaPadrao = () => ({ inicio: '08:00', fim: '22:00' })

// Converte a lista de `shifts` da API do iFood no estado por dia do modal.
function shiftsParaDias(shifts) {
  const novo = Object.fromEntries(DIAS.map((d) => [d.chave, { aberto: false, faixas: [] }]))
  for (const turno of shifts || []) {
    const dia = novo[turno.dayOfWeek]
    if (!dia) continue
    const inicioMin = horaParaMinutos(turno.start.slice(0, 5))
    dia.aberto = true
    dia.faixas.push({ inicio: turno.start.slice(0, 5), fim: minutosParaHora(inicioMin + turno.duration) })
  }
  for (const d of DIAS) {
    const dia = novo[d.chave]
    if (dia.faixas.length === 0) dia.faixas = [faixaPadrao()]
  }
  return novo
}

// Assinatura normalizada de um conjunto de turnos, pra comparar o que salvamos com o que a
// API devolve na releitura (a leitura do iFood é eventualmente consistente e demora a refletir).
const assinaturaHorario = (arr) =>
  (arr || [])
    .map((s) => `${s.dayOfWeek}|${String(s.start).slice(0, 5)}|${s.duration}`)
    .sort()
    .join(',')

export function HorarioFuncionamentoModal({ onClose, apiFetch, notificar, podeEditar, C, inputStyle }) {
  const [carregando, setCarregando] = useState(true)
  // cada dia tem uma LISTA de faixas — o iFood aceita vários turnos no mesmo dia
  const [dias, setDias] = useState(() =>
    Object.fromEntries(DIAS.map((d) => [d.chave, { aberto: false, faixas: [faixaPadrao()] }]))
  )
  const [salvando, setSalvando] = useState(false)
  // status da propagação do iFood após salvar: null | { tipo: 'aguardando'|'ok'|'demorou', texto }
  const [statusProp, setStatusProp] = useState(null)

  useEffect(() => {
    apiFetch('/horario-funcionamento')
      .then((data) => setDias(shiftsParaDias(data.shifts)))
      .catch((e) => notificar('erro', e.message))
      .finally(() => setCarregando(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function alternarDia(chave, aberto) {
    setDias((prev) => {
      const faixas = prev[chave].faixas.length ? prev[chave].faixas : [faixaPadrao()]
      return { ...prev, [chave]: { ...prev[chave], aberto, faixas } }
    })
  }

  function atualizarFaixa(chave, idx, campo, valor) {
    setDias((prev) => {
      const faixas = prev[chave].faixas.map((f, i) => (i === idx ? { ...f, [campo]: valor } : f))
      return { ...prev, [chave]: { ...prev[chave], faixas } }
    })
  }

  function adicionarFaixa(chave) {
    setDias((prev) => ({ ...prev, [chave]: { ...prev[chave], faixas: [...prev[chave].faixas, faixaPadrao()] } }))
  }

  function removerFaixa(chave, idx) {
    setDias((prev) => {
      const faixas = prev[chave].faixas.filter((_, i) => i !== idx)
      return { ...prev, [chave]: { ...prev[chave], faixas: faixas.length ? faixas : [faixaPadrao()] } }
    })
  }

  async function salvar() {
    setSalvando(true)
    try {
      const turnos = []
      for (const d of DIAS) {
        if (!dias[d.chave].aberto) continue
        for (const f of dias[d.chave].faixas) {
          const inicioMin = horaParaMinutos(f.inicio)
          let fimMin = horaParaMinutos(f.fim)
          if (fimMin <= inicioMin) fimMin += 24 * 60 // atravessa a meia-noite
          turnos.push({ dayOfWeek: d.chave, start: `${f.inicio}:00`, duration: fimMin - inicioMin })
        }
      }
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
      // A escrita foi aceita, mas a LEITURA do iFood é eventualmente consistente (leva de
      // ~10s a >40s pra refletir). Em vez de fechar às cegas, reconsultamos até o horário
      // gravado aparecer de volta — aí o próprio modal mostra o dado persistido (a "consulta"
      // da homologação), sem depender do usuário cronometrar e reabrir.
      setStatusProp({ tipo: 'aguardando', texto: 'Salvo! Confirmando no iFood (a leitura pode levar até ~40s)…' })
      const alvo = assinaturaHorario(turnos)
      let confirmado = false
      for (let i = 0; i < 16; i++) {
        await new Promise((r) => setTimeout(r, 3000))
        let data
        try {
          data = await apiFetch('/horario-funcionamento')
        } catch {
          continue
        }
        if (assinaturaHorario(data.shifts) === alvo) {
          setDias(shiftsParaDias(data.shifts))
          confirmado = true
          break
        }
      }
      if (confirmado) {
        setStatusProp({ tipo: 'ok', texto: 'Confirmado no iFood — o horário acima é exatamente o que está gravado.' })
        notificar('sucesso', 'Horário atualizado e confirmado no iFood.')
      } else {
        setStatusProp({ tipo: 'demorou', texto: 'Salvo. A propagação do iFood está demorando mais que o normal — reabra este modal em alguns segundos para conferir.' })
        notificar('sucesso', 'Horário salvo (a confirmação de leitura está demorando no iFood).')
      }
    } catch (e) {
      notificar('erro', e.message)
      setStatusProp(null)
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
                <div key={d.chave} className="flex gap-2.5 text-xs rounded-lg px-2.5 py-2" style={{ background: C.inputBg }}>
                  <label className="flex items-center gap-2 w-24 flex-shrink-0 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      disabled={!podeEditar}
                      checked={dia.aberto}
                      onChange={(e) => alternarDia(d.chave, e.target.checked)}
                    />
                    <span style={{ color: C.text1 }}>{d.label}</span>
                  </label>
                  {dia.aberto ? (
                    <div className="flex-1 flex flex-col gap-1.5">
                      {dia.faixas.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="time"
                            disabled={!podeEditar}
                            value={f.inicio}
                            onChange={(e) => atualizarFaixa(d.chave, idx, 'inicio', e.target.value)}
                            className="rounded-md px-2 py-1 text-xs outline-none flex-1 min-w-0"
                            style={inputStyle}
                          />
                          <span style={{ color: C.text3 }}>até</span>
                          <input
                            type="time"
                            disabled={!podeEditar}
                            value={f.fim}
                            onChange={(e) => atualizarFaixa(d.chave, idx, 'fim', e.target.value)}
                            className="rounded-md px-2 py-1 text-xs outline-none flex-1 min-w-0"
                            style={inputStyle}
                          />
                          {podeEditar && (
                            <button
                              type="button"
                              onClick={() => removerFaixa(d.chave, idx)}
                              title="Remover faixa"
                              className="botao-icone-fantasma w-6 h-6 rounded-md inline-flex items-center justify-center flex-shrink-0"
                              style={{ color: C.text3 }}
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => adicionarFaixa(d.chave)}
                          className="self-start inline-flex items-center gap-1 text-[11px] font-semibold mt-0.5"
                          style={{ color: C.marcaTinta }}
                        >
                          <Plus size={12} /> adicionar faixa
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="flex-1 pt-1" style={{ color: C.text3 }}>
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
              {salvando ? (statusProp?.tipo === 'aguardando' ? 'Confirmando no iFood…' : 'Salvando...') : 'Salvar horário'}
            </button>
          )}
          {statusProp && (
            <p
              className="text-xs mt-2 flex items-center gap-1.5 leading-relaxed"
              style={{ color: statusProp.tipo === 'ok' ? C.good : statusProp.tipo === 'demorou' ? C.neutral : C.text2 }}
            >
              {statusProp.tipo === 'aguardando' && <Loader2 size={12} className="animate-spin flex-shrink-0" />}
              {statusProp.texto}
            </p>
          )}
        </>
      )}
    </Modal>
  )
}
