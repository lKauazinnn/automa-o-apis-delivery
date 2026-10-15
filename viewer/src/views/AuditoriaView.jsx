import { ArrowRight, History } from 'lucide-react'
import { EstadoVazio, MONO, Rotulo } from '../ds'
import { descreverAuditoria, iniciaisDe } from '../ui'

function rotuloDia(d) {
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(hoje.getDate() - 1)
  if (d.toDateString() === hoje.toDateString()) return 'Hoje'
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
}

// Linha do tempo de tudo que a equipe mudou, agrupada por dia (o mais recente em cima).
export function AuditoriaView({ auditoria }) {
  const dias = []
  for (const a of auditoria) {
    const d = new Date(a.timestamp)
    const chave = d.toDateString()
    let grupo = dias[dias.length - 1]
    if (!grupo || grupo.chave !== chave) {
      grupo = { chave, rotulo: rotuloDia(d), itens: [] }
      dias.push(grupo)
    }
    grupo.itens.push(a)
  }

  if (!auditoria.length) {
    return (
      <section style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, maxWidth: 1040 }}>
        <EstadoVazio icone={<History size={22} />} titulo="Nada registrado ainda" texto="Toda pausa, preço, item criado e pedido movido aparece aqui, com quem fez e quando." />
      </section>
    )
  }

  return (
    <div style={{ maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {dias.map((d) => (
        <section key={d.chave} style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 24px', background: 'var(--card2)', borderBottom: '1px solid var(--linha)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Rotulo>{d.rotulo}</Rotulo>
            <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--t3)' }}>{d.itens.length}</span>
          </div>
          {d.itens.map((a, idx) => {
            const f = descreverAuditoria(a)
            const temDelta = !!(a.valor_de && a.valor_para)
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) auto', gap: 14, padding: '14px 24px', borderBottom: '1px solid var(--linha)', alignItems: 'start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 99, background: 'var(--marca-suave)', color: 'var(--marca-tinta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                  {iniciaisDe(a.operador)}
                </div>
                <div style={{ minWidth: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--t2)' }}>
                  <div style={{ textWrap: 'pretty' }}>
                    <b style={{ fontWeight: 600, color: 'var(--t1)' }}>{a.operador || 'Alguém'}</b> {f.verbo}{' '}
                    {f.alvo && <b style={{ fontWeight: 600, color: 'var(--t1)' }}>{f.alvo}</b>}
                  </div>
                  {temDelta && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontFamily: MONO, fontSize: 13 }}>
                      <span style={{ color: 'var(--t3)', textDecoration: 'line-through' }}>{a.valor_de}</span>
                      <span style={{ color: 'var(--t3)', display: 'flex' }}>
                        <ArrowRight size={14} />
                      </span>
                      <span style={{ color: 'var(--t1)', fontWeight: 600, padding: '1px 6px', borderRadius: 5, background: 'var(--input)' }}>{a.valor_para}</span>
                    </div>
                  )}
                  {f.detalhe && <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2 }}>{f.detalhe}</div>}
                </div>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--t3)', paddingTop: 2 }}>
                  {new Date(a.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
        </section>
      ))}
      <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>Mostrando as {auditoria.length} ações mais recentes desta loja.</div>
    </div>
  )
}
