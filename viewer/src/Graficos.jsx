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

// Só itens do cardápio — é o que o ranking de reincidência mede (ruptura de estoque de um item).
const ACOES_PAUSAR = new Set(['pausar', 'pausar_em_massa'])

// A TENDÊNCIA mede volume de pausa da operação inteira, então conta também o que o ranking de
// itens deixa de fora: complemento pausado e a reativação automática no fim do prazo. Sem isso a
// linha de despausas ficava quase sempre em zero, já que a maioria das pausas tem prazo e volta
// sozinha — ninguém clica em "despausar".
const ACOES_PAUSAR_TENDENCIA = new Set([...ACOES_PAUSAR, 'pausar_opcao'])
const ACOES_DESPAUSAR_TENDENCIA = new Set([
  'despausar',
  'despausar_em_massa',
  'despausar_opcao',
  'reativar_automatico',
  'reativar_opcao_automatico',
])

function truncar(texto, max) {
  if (!texto || texto.length <= max) return texto
  return `${texto.slice(0, max - 1)}…`
}

// O Recharts anima por JS (recalcula o `d` do path a cada frame), então a regra de
// prefers-reduced-motion do index.css — que só alcança animação/transição CSS — não o atinge.
// Quem pediu menos movimento no sistema continuava vendo a linha ser desenhada a cada refresh
// automático do Painel. Aqui a preferência é lida de verdade e desliga a animação do gráfico.
function animacaoDeGrafico() {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const reais = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// No eixo Y, "R$ 4.480,00" em cada marca rouba metade da largura do gráfico. Abrevia o milhar
// ("4,5 mil") e deixa o valor exato pro tooltip e pra tabela logo abaixo.
function eixoReais(v) {
  const n = Number(v || 0)
  if (n >= 1000) return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
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

// `formatar` deixa o mesmo tooltip servir pra contagem (padrão) e pra dinheiro, sem uma
// segunda cópia do componente. `extras` acrescenta linhas de contexto que não são séries do
// gráfico (ex: pedidos e ticket médio do dia) — contexto no hover evita o segundo eixo Y.
function TooltipCartao({ active, payload, label, C, formatar = (v) => v, extras }) {
  if (!active || !payload?.length) return null
  const linhasExtras = extras ? extras(payload[0]?.payload) : []
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-lg"
      style={{ background: C.cardBg, border: `1px solid ${C.cardBorder}`, color: C.text1 }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5" style={{ color: C.text2 }}>
          <span style={{ color: p.stroke || p.fill || p.color }}>●</span>
          {p.name}: <span className="font-semibold" style={{ color: C.text1 }}>{formatar(p.value)}</span>
        </p>
      ))}
      {linhasExtras.map((linha) => (
        <p key={linha} style={{ color: C.text3 }}>
          {linha}
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
        <Icon size={14} color={C.marcaTinta} />
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
      if (ACOES_PAUSAR_TENDENCIA.has(item.acao)) {
        bucket.pausas += 1
        totalPausas += 1
      } else if (ACOES_DESPAUSAR_TENDENCIA.has(item.acao)) {
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
          {/* `linear`, não `monotone`: a contagem é DIÁRIA e discreta — a curva suavizada
              desenhava morros entre dois dias, sugerindo valores em horários que não existem
              no dado, e estourava acima do pico real. */}
          <Area
            type="linear"
            dataKey="pausas"
            name="Pausas"
            stroke={C.neutral}
            fill={C.neutral}
            fillOpacity={0.1}
            strokeWidth={2}
            dot={false}
            isAnimationActive={animacaoDeGrafico()}
            activeDot={{ r: 4, fill: C.neutral, stroke: C.cardBg, strokeWidth: 2 }}
          />
          <Area
            type="linear"
            dataKey="despausas"
            name="Despausas"
            stroke={C.good}
            fill={C.good}
            fillOpacity={0.1}
            strokeWidth={2}
            dot={false}
            isAnimationActive={animacaoDeGrafico()}
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
          <Bar
            dataKey="vezes"
            name="Vezes pausado"
            fill={C.marca}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            isAnimationActive={animacaoDeGrafico()}
          >
            <LabelList dataKey="vezes" position="right" formatter={(valor) => `${valor}x`} fill={C.text2} fontSize={11} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </CartaoGrafico>
  )
}

// Faturamento por dia no Financeiro, que antes só tinha tabela — a tabela responde "quanto
// no dia 12?" e o gráfico responde "está subindo ou caindo?", que é a pergunta de quem abre
// a tela. Série ÚNICA de propósito: pedidos e ticket médio têm outra escala e virariam um
// segundo eixo Y (leitura enganosa); eles entram como contexto no hover.
//
// Cor: `marcaTinta` — faturamento não é status (não é bom nem ruim por natureza), então não
// usa good/neutral/bad; e a tinta é derivada por tokensDaMarca() até passar de 4,5:1 sobre o
// card nos dois temas, então funciona com a cor de qualquer cliente.
export function GraficoFaturamentoDiario({ porDia, C }) {
  const { dados, pico, total } = useMemo(() => {
    const linhas = (porDia || []).map((l) => {
      const [, mes, dia] = String(l.chave).split('-')
      return {
        dia: `${dia}/${mes}`,
        faturamento: Number(l.faturamento || 0),
        pedidos: Number(l.pedidos || 0),
        cancelados: Number(l.cancelados || 0),
      }
    })
    const total = linhas.reduce((s, l) => s + l.faturamento, 0)
    const pico = linhas.reduce((melhor, l) => (!melhor || l.faturamento > melhor.faturamento ? l : melhor), null)
    return { dados: linhas, pico, total }
  }, [porDia])

  // Com muitos dias (ex: "30 dias" ou "Este mês") as datas se espremem e viram um borrão;
  // mostra ~8 marcas no eixo e deixa o dia exato pro tooltip.
  const intervaloEixo = Math.max(0, Math.ceil(dados.length / 8) - 1)

  return (
    <CartaoGrafico
      titulo="Faturamento por dia"
      subtitulo={`${dados.length} ${dados.length === 1 ? 'dia' : 'dias'} no período · só pedidos válidos`}
      icon={TrendingUp}
      C={C}
      vazio={total === 0}
      mensagemVazia="Nenhum pedido válido no período escolhido."
    >
      <ResponsiveContainer width="100%" height={240}>
        {/* right=28: a marca do último dia é centrada no ponto, que fica na borda do plot —
            com a margem de 12 a data saía cortada pela metade ("14/1"). */}
        <AreaChart data={dados} margin={{ top: 8, right: 28, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={C.rowBorder} />
          <XAxis
            dataKey="dia"
            interval={intervaloEixo}
            tick={{ fill: C.text3, fontSize: 11 }}
            axisLine={{ stroke: C.cardBorder }}
            tickLine={false}
          />
          <YAxis
            width={54}
            tick={{ fill: C.text3, fontSize: 11 }}
            axisLine={{ stroke: C.cardBorder }}
            tickLine={false}
            tickFormatter={eixoReais}
          />
          <Tooltip
            content={
              <TooltipCartao
                C={C}
                formatar={reais}
                extras={(linha) =>
                  linha
                    ? [
                        `${linha.pedidos} pedido(s) · ticket ${linha.pedidos ? reais(linha.faturamento / linha.pedidos) : '—'}`,
                        ...(linha.cancelados ? [`${linha.cancelados} cancelado(s)`] : []),
                      ]
                    : []
                }
              />
            }
            cursor={{ stroke: C.cardBorder }}
          />
          <Area
            type="linear"
            dataKey="faturamento"
            name="Faturamento"
            stroke={C.marcaTinta}
            fill={C.marcaTinta}
            fillOpacity={0.12}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            dot={false}
            isAnimationActive={animacaoDeGrafico()}
            activeDot={{ r: 4, fill: C.marcaTinta, stroke: C.cardBg, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {pico && pico.faturamento > 0 && (
        <p className="text-[11px] mt-1" style={{ color: C.text3 }}>
          Melhor dia do período: <span className="font-semibold" style={{ color: C.text2 }}>{pico.dia}</span> com{' '}
          <span className="fonte-mono font-semibold" style={{ color: C.text2 }}>{reais(pico.faturamento)}</span>.
        </p>
      )}
    </CartaoGrafico>
  )
}
