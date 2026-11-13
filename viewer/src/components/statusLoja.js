// Como mostrar o status aberta/fechada de uma loja (seletor de lojas e visão geral do Painel).
// `grupo` ordena e filtra: 'problema' = saiu do ar por algo que pede ação (pausada, desconectada,
// bloqueada, sem entregador, PDV do iFood...), 'horario' = fechada no fim do expediente (99:
// status 3; iFood: fechada por horário), 'aberta' e 'sem' (nunca verificada ou consulta falhou).
const RE_HORARIO = /hor[aá]rio|fora do expediente|closed/i

export function tomDaLoja(s) {
  if (!s || s.aberta == null) {
    return { grupo: 'sem', rotulo: 'Sem status', titulo: s?.motivo || 'Ainda sem verificação', cor: 'var(--t3)', corTexto: 'var(--t3)', pulsa: false }
  }
  if (s.aberta) {
    return { grupo: 'aberta', rotulo: 'Aberta', titulo: s.motivo || 'Loja aberta', cor: 'var(--good)', corTexto: 'var(--good)', pulsa: true }
  }
  const horario = s.estado === '3' || (s.estado === 'CLOSED' && RE_HORARIO.test(s.motivo || ''))
  if (horario) {
    return { grupo: 'horario', rotulo: 'Fechada · horário', titulo: s.motivo || 'Fora do horário', cor: 'var(--t3)', corTexto: 'var(--t2)', pulsa: false }
  }
  const rotulo = !s.motivo ? 'Fechada' : /^fechad/i.test(s.motivo) ? s.motivo : `Fechada · ${s.motivo.replace(/^loja\s+/i, '')}`
  return { grupo: 'problema', rotulo, titulo: s.motivo || 'Loja fechada', cor: 'var(--bad)', corTexto: 'var(--bad)', pulsa: false }
}

export const ORDEM_GRUPO = { problema: 0, sem: 1, aberta: 2, horario: 3 }
