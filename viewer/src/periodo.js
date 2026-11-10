// Período (presets do filtro de datas), formatação e CSV — compartilhado por Financeiro e Desempenho.

export const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function isoLocal(d) {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export function periodoPreset(chave) {
  const hoje = new Date()
  const fim = isoLocal(hoje)
  if (chave === 'hoje') return { inicio: fim, fim }
  if (chave === '7d') return { inicio: isoLocal(new Date(hoje.getTime() - 6 * 86400000)), fim }
  if (chave === '30d') return { inicio: isoLocal(new Date(hoje.getTime() - 29 * 86400000)), fim }
  if (chave === 'mes') return { inicio: isoLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1)), fim }
  return null
}

export const br = (iso) => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '')

export function diaCurto(iso) {
  const [a, m, d] = iso.split('-')
  const dt = new Date(Number(a), Number(m) - 1, Number(d))
  return `${dt.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')} ${d}/${m}`
}

export function baixarCsv(nome, linhas) {
  const csv = linhas.map((l) => l.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}
