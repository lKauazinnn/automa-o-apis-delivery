import { useEffect, useState } from 'react'
import { Clock, Loader2, Play, RefreshCw } from 'lucide-react'
import { Esqueleto, Modal, Pill } from '../ui'
import { rotuloVolta, tempoDesde, tempoRestante } from '../pausas'

// Tudo que está fora do cardápio agora, numa lista só: as pausas feitas pelo painel (com motivo,
// quem pausou e quando volta) e os itens pausados sem registro (direto no portal do iFood/99 ou
// antes da tabela `pausas` existir). Reativar daqui é o "reposição chegou" da cozinha.
export function RupturasModal({ pausas, itens, carregando, erro, registroDisponivel, executando, onRecarregar, onReativar, onClose, C }) {
  const [, setTique] = useState(0)

  // Re-renderiza a cada 30s pra contagem regressiva ("volta em 12 min") não congelar.
  useEffect(() => {
    const id = setInterval(() => setTique((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const registrados = new Set(pausas.filter((p) => p.tipo === 'item').map((p) => p.alvo_id))
  const semRegistro = itens.filter((i) => i.status === 'UNAVAILABLE' && !registrados.has(i.itemId))

  const tarefasDe = (p) => ({ tipo: p.tipo, id: p.alvo_id, grupoId: p.grupo_id, nome: p.nome, codigo_pdv: p.codigo_pdv || '' })
  const todas = [
    ...pausas.map(tarefasDe),
    ...semRegistro.map((i) => ({ tipo: 'item', id: i.itemId, nome: i.nome, codigo_pdv: i.codigo_pdv || '' })),
  ]

  const linha = 'flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-2'
  const botaoReativar = (alvo, rotulo) => (
    <button
      type="button"
      disabled={executando}
      onClick={() => onReativar([alvo])}
      className="botao-icone-fantasma inline-flex items-center gap-1.5 px-2.5 rounded-lg font-semibold flex-shrink-0 disabled:opacity-40"
      style={{ color: C.good, height: 32, fontSize: 12.5 }}
      aria-label={`Reativar ${rotulo}`}
    >
      <Play size={13} />
      Reativar
    </button>
  )

  return (
    <Modal titulo="Rupturas ativas" eyebrow="Pausas" onClose={onClose} largura="max-w-2xl">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs leading-relaxed flex-1" style={{ color: C.text2 }}>
          O que está fora do cardápio agora nesta loja. Pausas com prazo voltam sozinhas.
        </p>
        <button
          type="button"
          onClick={onRecarregar}
          disabled={carregando}
          className="botao-icone-fantasma w-9 h-9 rounded-lg inline-flex items-center justify-center disabled:opacity-40"
          style={{ color: C.text2 }}
          title="Recarregar"
          aria-label="Recarregar rupturas"
        >
          <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
        </button>
      </div>

      {!registroDisponivel && !carregando && !erro && (
        <p className="text-xs mb-3 rounded-lg px-2.5 py-2" style={{ color: C.text2, background: C.inputBg }}>
          O registro de motivo/prazo não está ativo no servidor (falta rodar <span className="fonte-mono">sql/010_pausas_programadas.sql</span> no
          Supabase). A lista abaixo mostra só os itens pausados.
        </p>
      )}

      {erro && (
        <div className="text-xs mb-3 rounded-lg px-2.5 py-2 flex items-center gap-2" style={{ color: C.bad, background: C.badBg }}>
          <span className="flex-1">{erro}</span>
          <button type="button" onClick={onRecarregar} className="font-semibold underline">
            Tentar de novo
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1.5 max-h-[55vh] overflow-y-auto mb-4">
        {carregando && pausas.length === 0 && [0, 1, 2].map((k) => <Esqueleto key={k} h={44} />)}

        {!carregando && todas.length === 0 && !erro && (
          <p className="text-xs py-6 text-center" style={{ color: C.text2 }}>
            Nenhuma ruptura — o cardápio inteiro está no ar.
          </p>
        )}

        {pausas.map((p) => (
          <div key={p.id} className={linha} style={{ background: C.inputBg }}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold truncate" style={{ color: C.text1 }}>
                  {p.nome || p.alvo_id}
                </span>
                {p.tipo === 'opcao' && <Pill color={C.info}>Complemento</Pill>}
              </div>
              <p className="truncate mt-0.5" style={{ color: C.text3 }}>
                {p.motivo ? `${p.motivo} · ` : ''}
                {p.pausado_por || 'alguém'} · {tempoDesde(p.pausado_em)}
                {p.erro_reativacao ? ' · falhou ao reativar sozinho, tentando de novo' : ''}
              </p>
            </div>
            {p.volta_em ? (
              <span title={rotuloVolta(p.volta_em)} className="flex-shrink-0">
                <Pill color={C.info} marcador={<Clock size={12} className="flex-shrink-0" />}>
                  {tempoRestante(p.volta_em)}
                </Pill>
              </span>
            ) : (
              <span className="flex-shrink-0">
                <Pill color={C.neutral} dot>
                  Manual
                </Pill>
              </span>
            )}
            {botaoReativar(tarefasDe(p), p.nome)}
          </div>
        ))}

        {semRegistro.length > 0 && (
          <p className="text-[11.5px] font-bold uppercase tracking-widest mt-2 mb-0.5" style={{ color: C.text3 }}>
            Pausados sem registro de motivo
          </p>
        )}
        {semRegistro.map((i) => (
          <div key={i.itemId} className={linha} style={{ background: C.inputBg }}>
            <div className="min-w-0 flex-1">
              <span className="font-semibold truncate block" style={{ color: C.text1 }}>
                {i.nome}
              </span>
              <p className="truncate mt-0.5" style={{ color: C.text3 }}>
                {i.categoria} · pausado no portal da plataforma ou antes do registro
              </p>
            </div>
            {botaoReativar({ tipo: 'item', id: i.itemId, nome: i.nome, codigo_pdv: i.codigo_pdv || '' }, i.nome)}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={executando || todas.length === 0}
          onClick={() => onReativar(todas)}
          className="botao-primario flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
        >
          {executando ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          Reativar tudo ({todas.length})
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold px-3.5 py-2.5 rounded-xl ml-auto"
          style={{ color: C.text2, background: 'transparent' }}
        >
          Fechar
        </button>
      </div>
    </Modal>
  )
}
