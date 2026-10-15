import { useEffect, useState } from 'react'
import { Clock, Play, RefreshCw } from 'lucide-react'
import { Botao, BotaoIcone, EstadoVazio, Esqueleto, Etiqueta, Gaveta, tons } from '../ds'
import { rotuloVolta, tempoDesde, tempoRestante } from '../pausas'

function SeloPrazo({ pausa }) {
  if (!pausa?.volta_em) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, height: 22, padding: '0 8px', borderRadius: 99, background: 'var(--input)', border: '1px solid var(--borda)', color: 'var(--t2)', fontSize: 12, fontWeight: 600 }}>
        <Clock size={13} />
        {pausa ? 'Até reativar' : 'Sem prazo'}
      </span>
    )
  }
  const t = tons('info')
  const r = tempoRestante(pausa.volta_em)
  return (
    <span title={rotuloVolta(pausa.volta_em)} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 22, padding: '0 8px', borderRadius: 99, background: t.bg, border: `1px solid ${t.bd}`, color: t.fg, fontSize: 12, fontWeight: 600 }}>
      <Clock size={13} />
      {r.startsWith('em ') ? `volta ${r}` : r}
    </span>
  )
}

// Tudo que está fora do cardápio agora, numa lista só: as pausas feitas pelo painel (com motivo,
// quem pausou e quando volta) e os itens pausados sem registro (direto no portal do iFood/99 ou
// antes da tabela `pausas` existir). Reativar daqui é o "reposição chegou" da cozinha.
export function RupturasModal({ pausas, itens, carregando, erro, registroDisponivel, executando, onRecarregar, onReativar, onClose }) {
  const [, setTique] = useState(0)

  // Re-renderiza a cada 30s pra contagem regressiva ("volta em 12 min") não congelar.
  useEffect(() => {
    const id = setInterval(() => setTique((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const registrados = new Set(pausas.filter((p) => p.tipo === 'item').map((p) => p.alvo_id))
  const semRegistro = itens.filter((i) => i.status === 'UNAVAILABLE' && !registrados.has(i.itemId))

  const tarefaDe = (p) => ({ tipo: p.tipo, id: p.alvo_id, grupoId: p.grupo_id, nome: p.nome, codigo_pdv: p.codigo_pdv || '' })
  const todas = [
    ...pausas.map(tarefaDe),
    ...semRegistro.map((i) => ({ tipo: 'item', id: i.itemId, nome: i.nome, codigo_pdv: i.codigo_pdv || '' })),
  ]
  const n = todas.length

  const linha = (chave, nome, conteudo, alvo, comp = false) => (
    <div key={chave} style={{ display: 'flex', gap: 12, padding: '14px 24px', borderBottom: '1px solid var(--linha)' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nome}</span>
          {comp && <Etiqueta tipo="info">Complemento</Etiqueta>}
        </div>
        {conteudo}
      </div>
      <Botao variante="reativar" tamanho="sm" disabled={executando} onClick={() => onReativar([alvo])} style={{ alignSelf: 'center' }} aria-label={`Reativar ${nome}`}>
        <Play size={16} />
        Reativar
      </Botao>
    </div>
  )

  return (
    <Gaveta
      largura={480}
      eyebrow="Rupturas"
      titulo={carregando && !n ? 'Carregando…' : n ? `${n} ${n === 1 ? 'item fora' : 'itens fora'} do cardápio` : 'Tudo no cardápio'}
      descricao="Reativar daqui = “a reposição chegou”."
      onClose={onClose}
      rodape={
        <>
          <BotaoIcone rotulo="Recarregar rupturas" onClick={onRecarregar} disabled={carregando}>
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
          </BotaoIcone>
          <span style={{ flex: 1 }} />
          <Botao variante="secundario" tamanho="lg" onClick={onClose}>
            Fechar
          </Botao>
          <Botao variante="primario" tamanho="lg" disabled={executando || n === 0} onClick={() => onReativar(todas)}>
            <Play size={16} />
            Reativar tudo ({n})
          </Botao>
        </>
      }
    >
      <div style={{ margin: '-20px -24px', display: 'flex', flexDirection: 'column' }}>
        {!registroDisponivel && !carregando && !erro && (
          <div style={{ margin: '16px 24px 4px', padding: '10px 12px', borderRadius: 9, background: 'var(--input)', fontSize: 13, color: 'var(--t2)', lineHeight: 1.45 }}>
            O registro de motivo e prazo não está ativo no servidor. A lista mostra só os itens pausados.
          </div>
        )}
        {erro && (
          <div style={{ margin: '16px 24px 4px', padding: '10px 12px', borderRadius: 9, background: 'var(--bad-bg)', border: '1px solid var(--bad-bd)', fontSize: 13, color: 'var(--t1)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{erro}</span>
            <Botao variante="secundario" tamanho="xs" onClick={onRecarregar}>
              Tentar de novo
            </Botao>
          </div>
        )}

        {carregando && pausas.length === 0 && (
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map((k) => (
              <Esqueleto key={k} h={52} r={9} />
            ))}
          </div>
        )}

        {!carregando && n === 0 && !erro && <EstadoVazio titulo="Nenhuma ruptura agora" texto="O cardápio inteiro está no ar." />}

        {pausas.map((p) =>
          linha(
            p.id,
            p.nome || p.alvo_id,
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <SeloPrazo pausa={p} />
                {p.erro_reativacao && <Etiqueta tipo="bad">Falhou ao reativar sozinho</Etiqueta>}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>
                {[p.motivo, p.pausado_por || 'alguém', tempoDesde(p.pausado_em)].filter(Boolean).join(' · ')}
              </div>
            </>,
            tarefaDe(p),
            p.tipo === 'opcao',
          ),
        )}

        {semRegistro.map((i) =>
          linha(
            i.itemId,
            i.nome,
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                <SeloPrazo pausa={null} />
                <Etiqueta>Pausado no portal</Etiqueta>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>{i.categoria} · pausado no portal da plataforma ou antes do registro</div>
            </>,
            { tipo: 'item', id: i.itemId, nome: i.nome, codigo_pdv: i.codigo_pdv || '' },
          ),
        )}
      </div>
    </Gaveta>
  )
}
