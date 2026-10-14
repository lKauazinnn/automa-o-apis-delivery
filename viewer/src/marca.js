// White-label: a marca (nome, cor de destaque, logo) vem da empresa cliente, via GET /api/marca.
// Nenhum componente escreve a cor de destaque como literal — usa `C.marca` (JS) ou `var(--marca)`
// (CSS). Tudo que depende dela (rótulo sobre o botão, hover, fundo suave, anel de foco) é derivado
// aqui, então qualquer cor que o cliente escolher continua legível.

import { createContext } from 'react'

// { marca, setMarca } — a marca ativa e quem troca ela (tela Administração > Marca).
export const MarcaContext = createContext({ marca: null, setMarca: () => {} })

export const MARCA_PADRAO = {
  nome: 'PausaFast',
  cor: '#2B59C3',
  logo: null, // data URL da logo do cliente; sem logo, usa o símbolo do PausaFast na cor da marca
}

const CHAVE_CACHE = 'marca'

function hexParaRgb(hex) {
  const limpo = String(hex || '').replace('#', '').trim()
  const cheio = limpo.length === 3 ? limpo.split('').map((c) => c + c).join('') : limpo
  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) return null
  return [0, 2, 4].map((i) => parseInt(cheio.slice(i, i + 2), 16))
}

function rgbParaHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase()
}

// Luminância relativa (WCAG 2.x).
function luminancia(rgb) {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contraste(hexA, hexB) {
  const a = hexParaRgb(hexA)
  const b = hexParaRgb(hexB)
  if (!a || !b) return 1
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

function misturar(hex, alvo, pct) {
  const a = hexParaRgb(hex)
  const b = hexParaRgb(alvo)
  return rgbParaHex(a.map((v, i) => v + (b[i] - v) * pct))
}

export function corValida(hex) {
  return !!hexParaRgb(hex)
}

const TEXTO_CLARO = '#FFFFFF'
const TEXTO_ESCURO = '#0F1115'

// Superfície do card em cada tema (mesmos valores de PALETAS em ui.jsx).
const SUPERFICIE = { claro: '#FFFFFF', escuro: '#15181E' }

// A marca como TEXTO/ÍCONE sobre o card: escurece (tema claro) ou clareia (escuro) a cor do
// cliente até passar de 4,5:1. Um amarelo puro vira um ocre legível no claro; um azul escuro
// vira um azul claro no escuro. O preenchimento de botão continua com a cor original.
function tintaLegivel(base, tema) {
  const fundo = SUPERFICIE[tema] || SUPERFICIE.claro
  const alvo = tema === 'escuro' ? '#FFFFFF' : '#000000'
  for (let pct = 0; pct <= 1; pct += 0.04) {
    const c = misturar(base, alvo, pct)
    if (contraste(c, fundo) >= 4.5) return c
  }
  return tema === 'escuro' ? '#FFFFFF' : '#000000'
}

// Tokens derivados da cor da marca. O rótulo sobre o preenchimento é o que der mais contraste
// (branco ou quase-preto); o hover anda na direção que AUMENTA esse contraste — escurece sob
// rótulo branco, clareia sob rótulo escuro — pra nunca derrubar a legibilidade.
export function tokensDaMarca(cor, tema = 'claro') {
  const base = corValida(cor) ? rgbParaHex(hexParaRgb(cor)) : MARCA_PADRAO.cor
  const textoBranco = contraste(base, TEXTO_CLARO) >= contraste(base, TEXTO_ESCURO)
  return {
    marca: base,
    marcaTinta: tintaLegivel(base, tema),
    marcaTexto: textoBranco ? TEXTO_CLARO : TEXTO_ESCURO,
    marcaHover: textoBranco ? misturar(base, '#000000', 0.14) : misturar(base, '#FFFFFF', 0.16),
    marcaSuave: base + '1A', // ~10% — fundo de item ativo/selecionado
    marcaBorda: base + '47', // ~28% — borda de item ativo/selecionado
    marcaAnel: base + '40', // ~25% — anel de foco dos campos
    contrasteRotulo: contraste(base, textoBranco ? TEXTO_CLARO : TEXTO_ESCURO),
  }
}

// Espelha os tokens em variáveis CSS no <html>, pras classes de index.css (.botao-primario,
// foco, seleção) seguirem a marca sem saber de React.
export function aplicarMarcaNoDocumento(cor, tema) {
  const t = tokensDaMarca(cor, tema)
  const raiz = document.documentElement.style
  raiz.setProperty('--marca', t.marca)
  raiz.setProperty('--marca-tinta', t.marcaTinta)
  raiz.setProperty('--marca-texto', t.marcaTexto)
  raiz.setProperty('--marca-hover', t.marcaHover)
  raiz.setProperty('--marca-suave', t.marcaSuave)
  raiz.setProperty('--marca-borda', t.marcaBorda)
  raiz.setProperty('--marca-anel', t.marcaAnel)
  return t
}

export function lerMarcaEmCache() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CACHE) || 'null')
    return salvo ? { ...MARCA_PADRAO, ...salvo } : MARCA_PADRAO
  } catch {
    return MARCA_PADRAO
  }
}

export function guardarMarcaEmCache(marca) {
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(marca))
  } catch {
    // sem storage (aba anônima/bloqueado): a marca só não abre instantânea no próximo acesso
  }
}
