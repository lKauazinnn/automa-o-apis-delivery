import { useContext } from 'react'
import { MarcaContext, tokensDaMarca } from './marca'

// Símbolo do PausaFast: quadrado na cor da marca com o sinal de pausa — a segunda barra
// inclinada, como quem já está voltando ao movimento. Desenhado na cor da empresa cliente,
// então serve de logo provisória pra quem ainda não subiu a sua.
export function SimboloPausaFast({ cor, tamanho = 36 }) {
  const t = tokensDaMarca(cor)
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 32 32" aria-hidden="true" className="flex-shrink-0">
      <rect width="32" height="32" rx="8" fill={t.marca} />
      <rect x="9" y="8.5" width="4.6" height="15" rx="1.4" fill={t.marcaTexto} />
      <path d="M18.6 8.5h3.6c.9 0 1.5.8 1.3 1.6l-3 12.4c-.2.6-.7 1-1.3 1h-3.6c-.9 0-1.5-.8-1.3-1.6l3-12.4c.2-.6.7-1 1.3-1Z" fill={t.marcaTexto} />
    </svg>
  )
}

// Logo da empresa cliente (upload em Administração > Marca) ou, sem upload, o símbolo + nome.
export function LogoMarca({ tamanho = 36, mostrarNome = true, corTexto }) {
  const { marca } = useContext(MarcaContext)
  if (marca.logo) {
    return <img src={marca.logo} alt={marca.nome} style={{ height: tamanho, width: 'auto', maxWidth: 180 }} className="object-contain flex-shrink-0" />
  }
  return (
    <span className="inline-flex items-center gap-2.5 min-w-0">
      <SimboloPausaFast cor={marca.cor} tamanho={tamanho} />
      {mostrarNome && (
        <span className="font-bold truncate" style={{ color: corTexto, fontSize: Math.round(tamanho * 0.47), letterSpacing: '-0.015em' }}>
          {marca.nome}
        </span>
      )}
    </span>
  )
}
