// Mascote visual do graphify: um grafo de conhecimento com contorno de cérebro.
// Nós pulsam (reaproveita `.pulso-vivo` de index.css) e sinais viajam pelas arestas
// via <animateMotion> (SMIL), sem gradiente nem glow — ver viewer/CLAUDE.md.

const NOS = [
  { x: 40, y: 70 },
  { x: 55, y: 40 },
  { x: 75, y: 25 },
  { x: 100, y: 20 },
  { x: 125, y: 25 },
  { x: 150, y: 35 },
  { x: 170, y: 55 },
  { x: 180, y: 85 },
  { x: 170, y: 115 },
  { x: 145, y: 140 },
  { x: 115, y: 150 },
  { x: 85, y: 145 },
  { x: 55, y: 125 },
  { x: 35, y: 100 },
  { x: 105, y: 100 },
  { x: 110, y: 130 },
]

const ARESTAS_BASE = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8],
  [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 0],
  [0, 14], [3, 14], [7, 14], [10, 15], [14, 15], [12, 15],
]

const ARESTAS_SINAL = [
  { de: 1, para: 8, dur: 3.2 },
  { de: 4, para: 12, dur: 3.8 },
  { de: 13, para: 6, dur: 4.4 },
  { de: 14, para: 10, dur: 2.6 },
  { de: 15, para: 3, dur: 3.5 },
]

const CORES = {
  escuro: { aresta: 'rgba(148,163,184,0.28)', no: '#94a3b8', sinal: '#f56c35' },
  claro: { aresta: 'rgba(100,116,139,0.28)', no: '#64748b', sinal: '#f56c35' },
}

export function CerebroGraphify({ tema = 'escuro', tamanho = 160, className = '' }) {
  const cor = CORES[tema] ?? CORES.escuro

  return (
    <svg
      viewBox="0 0 220 180"
      width={tamanho}
      height={tamanho * (180 / 220)}
      className={className}
      role="img"
      aria-label="Grafo de conhecimento do graphify em formato de cérebro"
    >
      <g stroke={cor.aresta} strokeWidth="1" fill="none">
        {ARESTAS_BASE.map(([a, b], i) => (
          <line key={i} x1={NOS[a].x} y1={NOS[a].y} x2={NOS[b].x} y2={NOS[b].y} />
        ))}
      </g>

      {ARESTAS_SINAL.map((aresta, i) => {
        const de = NOS[aresta.de]
        const para = NOS[aresta.para]
        return (
          <circle key={i} r="2.5" fill={cor.sinal}>
            <animateMotion
              dur={`${aresta.dur}s`}
              repeatCount="indefinite"
              begin={`${i * 0.6}s`}
              path={`M${de.x},${de.y} L${para.x},${para.y}`}
            />
          </circle>
        )
      })}

      <g fill={cor.no}>
        {NOS.map((no, i) => (
          <circle
            key={i}
            cx={no.x}
            cy={no.y}
            r="3.5"
            className="pulso-vivo"
            style={{ animationDelay: `${(i % 7) * 0.25}s` }}
          />
        ))}
      </g>
    </svg>
  )
}
