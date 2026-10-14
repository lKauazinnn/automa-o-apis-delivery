import { useState } from 'react'
import { Clock, Loader2, Pause, Store } from 'lucide-react'
import { Modal, Pill } from '../ui'
import { MOTIVOS_PAUSA, PRAZOS_PAUSA } from '../pausas'

const PLATAFORMA_LABEL = { ifood: 'iFood', '99food': '99Food' }

// Uma tela só pra toda pausa de item/complemento: o quê (com os itens parecidos já sugeridos),
// por quê, por quanto tempo e em quais outras lojas. `alvos` vem com `marcado` definindo o que
// já começa selecionado.
export function PausarModal({
  titulo,
  descricao,
  alvos,
  motivoInicial = '',
  outrasLojas = [],
  executando,
  onConfirmar,
  onClose,
  C,
  inputCls,
  inputStyle,
}) {
  const [marcados, setMarcados] = useState(() => new Set(alvos.filter((a) => a.marcado).map((a) => a.chave)))
  const [motivo, setMotivo] = useState(MOTIVOS_PAUSA.includes(motivoInicial) ? motivoInicial : '')
  const [motivoLivre, setMotivoLivre] = useState(MOTIVOS_PAUSA.includes(motivoInicial) ? '' : motivoInicial)
  const [prazo, setPrazo] = useState('manual')
  const [lojasExtras, setLojasExtras] = useState(new Set())

  const selecionados = alvos.filter((a) => marcados.has(a.chave))
  const comPdv = selecionados.filter((a) => a.tipo === 'item' && a.codigo_pdv).length

  function alternar(conjunto, setConjunto, chave) {
    const novo = new Set(conjunto)
    if (novo.has(chave)) novo.delete(chave)
    else novo.add(chave)
    setConjunto(novo)
  }

  function confirmar() {
    const opcao = PRAZOS_PAUSA.find((p) => p.chave === prazo)
    onConfirmar({
      alvos: selecionados,
      minutos: opcao.minutos(),
      motivo: (motivoLivre.trim() || motivo).slice(0, 120),
      lojasExtras: outrasLojas.filter((l) => lojasExtras.has(l.merchant_id)),
    })
  }

  const chipBase = 'px-3 rounded-lg font-semibold inline-flex items-center'
  const chip = (ativo) =>
    ativo
      ? { background: C.marcaSuave, color: C.marcaTinta, border: `1px solid ${C.marca}`, height: 34, fontSize: 13 }
      : { background: C.inputBg, color: C.text2, border: `1px solid ${C.cardBorder}`, height: 34, fontSize: 13 }
  const rotulo = 'text-[11.5px] font-bold uppercase tracking-widest mb-2'

  return (
    <Modal titulo={titulo} onClose={onClose} largura="max-w-lg">
      {descricao && (
        <p className="text-xs mb-3 leading-relaxed" style={{ color: C.text2 }}>
          {descricao}
        </p>
      )}

      <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto mb-4">
        {alvos.map((a) => (
          <label
            key={a.chave}
            className="flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-2 cursor-pointer"
            style={{ background: C.inputBg }}
          >
            <input type="checkbox" checked={marcados.has(a.chave)} onChange={() => alternar(marcados, setMarcados, a.chave)} />
            <span className="truncate" style={{ color: C.text1 }}>
              {a.nome}
            </span>
            {a.tipo === 'opcao' && <Pill color={C.info}>Complemento</Pill>}
            {a.sugerido && <Pill color={C.text3}>Parecido</Pill>}
            {a.status === 'UNAVAILABLE' && (
              <Pill color={C.neutral} dot>
                Já pausado
              </Pill>
            )}
            <span className="ml-auto fonte-mono flex-shrink-0" style={{ color: C.text3 }}>
              {a.codigo_pdv}
            </span>
          </label>
        ))}
      </div>

      <p className={rotulo} style={{ color: C.text2 }}>
        Motivo
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {MOTIVOS_PAUSA.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={motivo === m && !motivoLivre}
            onClick={() => {
              setMotivo(motivo === m ? '' : m)
              setMotivoLivre('')
            }}
            className={chipBase}
            style={chip(motivo === m && !motivoLivre)}
          >
            {m}
          </button>
        ))}
      </div>
      <input
        className={inputCls + ' mb-4'}
        style={inputStyle}
        value={motivoLivre}
        maxLength={120}
        onChange={(e) => setMotivoLivre(e.target.value)}
        placeholder="Ou escreva o motivo (opcional)"
      />

      <p className={rotulo + ' flex items-center gap-1.5'} style={{ color: C.text2 }}>
        <Clock size={12} /> Por quanto tempo
      </p>
      <div role="radiogroup" aria-label="Prazo da pausa" className="flex flex-wrap gap-1.5 mb-1.5">
        {PRAZOS_PAUSA.map((p) => (
          <button
            key={p.chave}
            type="button"
            role="radio"
            aria-checked={prazo === p.chave}
            onClick={() => setPrazo(p.chave)}
            className={chipBase}
            style={chip(prazo === p.chave)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-xs mb-4" style={{ color: C.text3 }}>
        {prazo === 'manual'
          ? 'Fica pausado até alguém reativar (em Rupturas ou no próprio cardápio).'
          : 'Volta sozinho ao cardápio no fim do prazo — precisa do monitor rodando ou do painel aberto.'}
      </p>

      {outrasLojas.length > 0 && (
        <>
          <p className={rotulo + ' flex items-center gap-1.5'} style={{ color: C.text2 }}>
            <Store size={12} /> Pausar também em
          </p>
          <div className="flex flex-col gap-1.5 mb-1.5">
            {outrasLojas.map((l) => (
              <label
                key={l.merchant_id}
                className="flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-2 cursor-pointer"
                style={{ background: C.inputBg }}
              >
                <input
                  type="checkbox"
                  checked={lojasExtras.has(l.merchant_id)}
                  onChange={() => alternar(lojasExtras, setLojasExtras, l.merchant_id)}
                />
                <span className="truncate" style={{ color: C.text1 }}>
                  {l.nome}
                </span>
                <span className="ml-auto flex-shrink-0" style={{ color: C.text3 }}>
                  {PLATAFORMA_LABEL[l.plataforma] || l.plataforma}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs mb-4" style={{ color: C.text3 }}>
            Acha o mesmo item nas outras lojas pelo código PDV ({comPdv} de {selecionados.length} selecionados têm código).
            Complementos não são replicados.
          </p>
        </>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          disabled={executando || selecionados.length === 0}
          onClick={confirmar}
          className="botao-primario flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
        >
          {executando ? <Loader2 size={12} className="animate-spin" /> : <Pause size={12} />}
          Pausar {selecionados.length} {selecionados.length === 1 ? 'item' : 'itens'}
          {lojasExtras.size > 0 ? ` + ${lojasExtras.size} loja(s)` : ''}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold px-3.5 py-2.5 rounded-xl ml-auto"
          style={{ color: C.text2, background: 'transparent' }}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
