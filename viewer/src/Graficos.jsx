import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Flame, PauseCircle, PlayCircle, ShieldCheck, TrendingUp } from 'lucide-react'

const ALTURA_LINHA = 34
const ALTURA_MINIMA = 140
const DIAS_TENDENCIA = 14
const MAX_ITENS_REINCIDENTES = 8
// Mostra só ~7 datas no eixo X (uma a cada 2 dias) — com as 14 espremidas, a label
// vira ilegível e crua nenhuma serve pra leitura direta (o tooltip já dá o dia exato).
const INTERVALO_EIXO_DIAS = Math.max(0, Math.ceil(DIAS_TENDENCIA / 7) - 1)

const ACOES_PAUSAR = new Set(['pausar', 'pausar_em_massa'])
const ACOES_DESPAUSAR = new Set(['despausar', 'despausar_em_massa'])

function truncar(texto, max) {
  if (!texto || texto.length <= max) return texto
  return `${texto.slice(0, max - 1)}…`
}

function chaveDia(data) {
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}`
}

function ultimosDias(qtd) {
  const hoje = new Date()
  const dias = []
  for (let i = qtd - 1; i >= 0; i--) {
    const d = new Date(hoje)
    d.setDate(d.getDate() - i)
    dias.push(d)
  }
  return dias
}

function TooltipCartao({ active, payload, label, C }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, color: C.text1 }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: C.text2 }}>
          <span style={{ color: p.stroke || p.fill || p.color }}>●</span>
          {p.name}: <span className="font-semibold" style={{ color: C.text1 }}>{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function Selo({ icon: Icon, texto, cor }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
      style={{ color: cor, background: cor + '15', border: `1px solid ${cor}30` }}
    >
      <Icon size={12} />
      {texto}
    </span>
  )
}

function CartaoGrafico({ titulo, subtitulo, icon: Icon, C, vazio, mensagemVazia, selos, children }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
      <div className="flex items-center gap-2 mb-0.5">
        <Icon size={14} color="#F56C35" />
        <h2 className="text-sm font-bold" style={{ color: C.text1 }}>
          {titulo}
        </h2>
      </div>
      {subtitulo && (
        <p className="text-[11px] mb-3" style={{ color: C.text3 }}>
          {subtitulo}
        </p>
      )}
      {vazio ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <ShieldCheck size={20} style={{ color: C.text3 }} />
          <p className="text-xs" style={{ color: C.text3 }}>
            {mensagemVazia || 'Sem dados ainda.'}
          </p>
        </div>
      ) : (
        <>
          {selos && <div className="flex flex-wrap gap-2 mb-3.5">{selos}</div>}
          {children}
        </>
      )}
    </div>
  )
}

// Mostra a evolução diária de pausas x despausas — revela padrões (ex: pico toda
// sexta) que uma foto estática do catálogo não mostra.
export function GraficoTendenciaAtividade({ auditoria, C }) {
  const { dados, totalPausas, totalDespausas } = useMemo(() => {
    const dias = ultimosDias(DIAS_TENDENCIA)
    const porDia = new Map(dias.map((d) => [chaveDia(d), { dia: chaveDia(d), pausas: 0, despausas: 0 }]))
    let totalPausas = 0
    let totalDespausas = 0
    for (const item of auditoria) {
      if (!item.timestamp) continue
      const bucket = porDia.get(chaveDia(new Date(item.timestamp)))
      if (!bucket) continue
      if (ACOES_PAUSAR.has(item.acao)) {
        bucket.pausas += 1
        totalPausas += 1
      } else if (ACOES_DESPAUSAR.has(item.acao)) {
        bucket.despausas += 1
        totalDespausas += 1
      }
    }
    return { dados: Array.from(porDia.values()), totalPausas, totalDespausas }
  }, [auditoria])

  return (
    <CartaoGrafico
      titulo="Tendência de pausas x despausas"
      subtitulo={`Últimos ${DIAS_TENDENCIA} dias`}
      icon={TrendingUp}
      C={C}
      vazio={totalPausas + totalDespausas === 0}
      mensagemVazia="Nenhuma pausa ou despausa nos últimos dias."
      selos={[
        <Selo key="pausas" icon={PauseCircle} texto={`${totalPausas} pausas`} cor={C.neutral} />,
        <Selo key="despausas" icon={PlayCircle} texto={`${totalDespausas} despausas`} cor={C.good} />,
      ]}
    >
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={C.rowBorder} />
          <XAxis
            dataKey="dia"
            interval={INTERVALO_EIXO_DIAS}
            tick={{ fill: C.text3, fontSize: 11 }}
            axisLine={{ stroke: C.cardBorder }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            width={28}
            tick={{ fill: C.text3, fontSize: 11 }}
            axisLine={{ stroke: C.cardBorder }}
            tickLine={false}
          />
          <Tooltip content={<TooltipCartao C={C} />} cursor={{ stroke: C.cardBorder }} />
          <Area
            type="monotone"
            dataKey="pausas"
            name="Pausas"
            stroke={C.neutral}
            fill={C.neutral}
            fillOpacity={0.1}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: C.neutral, stroke: C.cardBg, strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="despausas"
            name="Despausas"
            stroke={C.good}
            fill={C.good}
            fillOpacity={0.1}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: C.good, stroke: C.cardBg, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </CartaoGrafico>
  )
}

// Ranking de itens pausados mais de uma vez — sinaliza ruptura de estoque recorrente,
// o problema operacional real que esse painel existe pra ajudar a enxergar.
export function GraficoItensReincidentes({ auditoria, C }) {
  const dados = useMemo(() => {
    const porItem = new Map()
    for (const item of auditoria) {
      if (!ACOES_PAUSAR.has(item.acao)) continue
      const nome = item.nome || item.item_id || 'Item desconhecido'
      porItem.set(nome, (porItem.get(nome) || 0) + 1)
    }
    return Array.from(porItem.entries())
      .map(([nome, vezes]) => ({ nome, vezes }))
      .filter((i) => i.vezes >= 2)
      .sort((a, b) => b.vezes - a.vezes)
      .slice(0, MAX_ITENS_REINCIDENTES)
  }, [auditoria])

  return (
    <CartaoGrafico
      titulo="Itens com pausas recorrentes"
      subtitulo="Pausados mais de uma vez — possível ruptura de estoque frequente"
      icon={Flame}
      C={C}
      vazio={dados.length === 0}
      mensagemVazia="Nenhum item foi pausado mais de uma vez. Sem sinal de ruptura recorrente."
    >
      <ResponsiveContainer width="100%" height={Math.max(ALTURA_MINIMA, dados.length * ALTURA_LINHA + 40)}>
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke={C.rowBorder} />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: C.text3, fontSize: 11 }}
            axisLine={{ stroke: C.cardBorder }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="nome"
            width={140}
            tickFormatter={(valor) => truncar(valor, 19)}
            tick={{ fill: C.text2, fontSize: 11 }}
            axisLine={{ stroke: C.cardBorder }}
            tickLine={false}
          />
          <Tooltip content={<TooltipCartao C={C} />} cursor={{ fill: C.inputBg }} />
          <Bar dataKey="vezes" name="Vezes pausado" fill="#F56C35" radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList dataKey="vezes" position="right" formatter={(valor) => `${valor}x`} fill={C.text2} fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CartaoGrafico>
  )
}
