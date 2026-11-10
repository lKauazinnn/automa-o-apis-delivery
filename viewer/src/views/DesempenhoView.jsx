import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Download, Loader2, RefreshCw, Star, TrendingUp } from 'lucide-react'
import { Botao, EstadoVazio, Esqueleto, MONO, Segmentado } from '../ds'
import { baixarCsv, br, brl, diaCurto, periodoPreset } from '../periodo'

// Equivalente à aba "Desempenho" do Portal do Parceiro do iFood. Dados de GET /api/desempenho
// (server/desempenho.py): Financial API v3 (pedido a pedido, mesmo dia), Analytics (agregado D-1),
// Review API e o histórico de pedidos do painel (clientes). Conversão do cardápio, Ads e Super
// Restaurante não têm API pública no iFood — ficam de fora.

const cartao = { background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12 }
const PATROCINADOR_COR = { Loja: 'var(--serie-1)', iFood: 'var(--serie-2)', Rede: 'var(--serie-3)', 'Indústria': 'var(--serie-4)' }
const CANAL = { IFOOD: 'App iFood', DIGITAL_CATALOG: 'Cardápio digital', POS: 'PDV' }
const LOGISTICA = { IFOOD: 'Entrega iFood', MERCHANT: 'Entrega própria', IFOOD_DELIVERY: 'Entrega iFood', MERCHANT_DELIVERY: 'Entrega própria', DINE_IN: 'Consumo no local', '—': 'Retirada / não informado' }
const STATUS = { CONCLUDED: 'Concluído', CANCELLED: 'Cancelado', CONFIRMED: 'Confirmado', DISPATCHED: 'Despachado', PLACED: 'Recebido' }

const ABAS = [
  { valor: 'vendas', rotulo: 'Vendas' },
  { valor: 'promocoes', rotulo: 'Promoções' },
  { valor: 'operacao', rotulo: 'Operação' },
  { valor: 'cancelamentos', rotulo: 'Cancelamentos' },
  { valor: 'clientes', rotulo: 'Clientes' },
  { valor: 'avaliacoes', rotulo: 'Avaliações' },
]

const n0 = (v) => Number(v || 0).toLocaleString('pt-BR')
const min = (v) => (v == null ? '—' : `${String(v).replace('.', ',')} min`)
const csvNum = (v) => (v == null ? '' : Number(v).toFixed(2).replace('.', ','))
const pct = (v) => `${String(v ?? 0).replace('.', ',')}%`

function Secao({ titulo, nota, children, style }) {
  return (
    <section style={{ ...cartao, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, ...style }}>
      {(titulo || nota) && (
        <div>
          {titulo && <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--t1)' }}>{titulo}</h3>}
          {nota && <div style={{ fontSize: 12.5, color: 'var(--t3)', marginTop: 3 }}>{nota}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

function Kpi({ rotulo, valor, sub, destaque, carregando }) {
  return (
    <div style={{ ...cartao, padding: '16px 18px', minWidth: 0 }}>
      <div style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 500 }}>{rotulo}</div>
      {carregando ? (
        <Esqueleto w="60%" h={30} style={{ marginTop: 6 }} />
      ) : (
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 4, color: destaque || 'var(--t1)' }}>{valor}</div>
      )}
      {sub && <div style={{ fontSize: 12.5, color: 'var(--t3)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

const gradeKpi = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }
const gradeDupla = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16 }

// Barras verticais de UMA série (cor única). Tooltip ao passar o mouse; o alvo é a coluna
// inteira, não só a barra, pra dia com valor pequeno também responder.
function Colunas({ dados, valor, rotuloX, formatar, descricao, altura = 140 }) {
  const [foco, setFoco] = useState(null)
  const mx = Math.max(1, ...dados.map((d) => Number(valor(d) || 0)))
  return (
    <div style={{ position: 'relative' }}>
      <div role="img" aria-label={descricao} style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: altura, borderBottom: '1px solid var(--borda)' }} onMouseLeave={() => setFoco(null)}>
        {dados.map((d, i) => {
          const v = Number(valor(d) || 0)
          return (
            <div key={i} onMouseEnter={() => setFoco(i)} style={{ flex: 1, minWidth: 3, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default' }}>
              <div style={{ width: '100%', height: `${(v / mx) * 100}%`, minHeight: v ? 3 : 0, background: 'var(--serie-1)', opacity: foco == null || foco === i ? 1 : 0.45, borderRadius: '4px 4px 0 0' }} />
            </div>
          )
        })}
      </div>
      {foco != null && dados[foco] && (
        <div style={{ position: 'absolute', top: -6, left: `${((foco + 0.5) / dados.length) * 100}%`, transform: 'translate(-50%, -100%)', background: 'var(--t1)', color: 'var(--card)', fontSize: 12.5, padding: '5px 9px', borderRadius: 7, whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: 'var(--sh-sm)' }}>
          <b>{rotuloX(dados[foco])}</b> · {formatar(dados[foco])}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>
        <span>{dados[0] ? rotuloX(dados[0]) : ''}</span>
        <span>{dados.length ? rotuloX(dados[dados.length - 1]) : ''}</span>
      </div>
    </div>
  )
}

// Ranking horizontal de uma série (motivos, notas, canais): rótulo e valor sempre escritos.
function Ranking({ linhas, vazio = 'Nada no período.', formatarValor = n0 }) {
  const mx = Math.max(1, ...linhas.map((l) => Number(l.valor || 0)))
  if (!linhas.length) return <div style={{ fontSize: 13, color: 'var(--t3)' }}>{vazio}</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {linhas.map((l) => (
        <div key={l.chave} title={`${l.rotulo}: ${formatarValor(l.valor)}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '4px 10px', alignItems: 'center' }}>
          <span style={{ fontSize: 13.5, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.rotulo}</span>
          <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--t1)' }}>{formatarValor(l.valor)}{l.extra ? <span style={{ color: 'var(--t3)' }}> · {l.extra}</span> : null}</span>
          <div style={{ gridColumn: '1 / -1', height: 8, borderRadius: 99, background: 'var(--input)' }}>
            <div style={{ width: `${(Number(l.valor || 0) / mx) * 100}%`, minWidth: l.valor ? 4 : 0, height: '100%', borderRadius: 99, background: 'var(--serie-1)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Tabela({ colunas, linhas, vazio }) {
  if (!linhas.length) return <div style={{ fontSize: 13, color: 'var(--t3)' }}>{vazio}</div>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.k} style={{ textAlign: c.num ? 'right' : 'left', padding: '8px 10px', fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t3)', borderBottom: '1px solid var(--borda)', whiteSpace: 'nowrap' }}>
                {c.t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i}>
              {colunas.map((c) => (
                <td key={c.k} style={{ padding: '9px 10px', borderBottom: '1px solid var(--linha)', textAlign: c.num ? 'right' : 'left', fontFamily: c.num ? MONO : undefined, color: 'var(--t1)', verticalAlign: 'top' }}>
                  {c.f ? c.f(l) : l[c.k]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const dataHora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—')

// ─────────────────────────────── abas ───────────────────────────────

function AbaVendas({ d, todas }) {
  const [comEntrega, setComEntrega] = useState(false)
  const [medida, setMedida] = useState('pedidos')
  const v = d.vendas
  const an = d.analytics
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--t1)', cursor: 'pointer' }}>
          <input type="checkbox" checked={comEntrega} onChange={(e) => setComEntrega(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--marca)' }} />
          Com taxa de entrega
        </label>
      </div>
      <div style={gradeKpi}>
        <Kpi rotulo="Total de vendas realizadas" valor={n0(v.pedidos)} sub="pedidos válidos (sem cancelados)" />
        <Kpi rotulo="Valor total das vendas" valor={brl(comEntrega ? v.valor_com_entrega : v.valor_itens)} sub={comEntrega ? 'itens + taxa de entrega' : 'valor dos itens'} />
        <Kpi rotulo="Ticket médio" valor={brl(comEntrega ? v.ticket_medio_com_entrega : v.ticket_medio)} sub="por pedido válido" />
        <Kpi rotulo="Cancelados" valor={n0(v.cancelados)} sub={`${pct(d.cancelamentos.taxa)} dos pedidos`} destaque={v.cancelados ? 'var(--bad)' : undefined} />
      </div>
      <Secao
        titulo={medida === 'pedidos' ? 'Pedidos por dia' : 'Valor das vendas por dia'}
        nota="Pedidos válidos de cada dia do período (fonte: Financial API do iFood, mesmo dia)."
      >
        <div style={{ alignSelf: 'flex-start' }}>
          <Segmentado rotulo="Medida" valor={medida} altura={32} onChange={setMedida} opcoes={[{ valor: 'pedidos', rotulo: 'Pedidos' }, { valor: 'valor', rotulo: 'Valor (itens)' }]} />
        </div>
        <Colunas
          dados={v.por_dia}
          valor={(x) => (medida === 'pedidos' ? x.pedidos : x.valor)}
          rotuloX={(x) => diaCurto(x.dia)}
          formatar={(x) => (medida === 'pedidos' ? `${n0(x.pedidos)} pedidos` : brl(x.valor)) + (x.cancelados ? ` · ${x.cancelados} canc.` : '')}
          descricao="Vendas por dia"
        />
      </Secao>
      <div style={gradeDupla}>
        <Secao titulo="Pedidos por hora do dia" nota="Horário de Brasília. Ajuda a escalar equipe e entregadores.">
          <Colunas dados={v.por_hora} valor={(x) => x.pedidos} rotuloX={(x) => `${String(x.hora).padStart(2, '0')}h`} formatar={(x) => `${n0(x.pedidos)} pedidos`} descricao="Pedidos por hora" altura={110} />
        </Secao>
        <Secao titulo="Por canal e logística">
          <Ranking linhas={[...v.por_canal.map((c) => ({ chave: 'c' + c.chave, rotulo: CANAL[c.chave] || c.chave, valor: c.valor, extra: `${n0(c.pedidos)} ped.` })), ...v.por_entrega.map((c) => ({ chave: 'e' + c.chave, rotulo: LOGISTICA[c.chave] || c.chave, valor: c.valor, extra: `${n0(c.pedidos)} ped.` }))]} formatarValor={brl} />
        </Secao>
      </div>
      {todas && v.por_loja.length > 1 && (
        <Secao titulo="Por loja">
          <Ranking linhas={v.por_loja.map((c) => ({ chave: c.chave, rotulo: c.chave, valor: c.valor, extra: `${n0(c.pedidos)} ped.` }))} formatarValor={brl} />
        </Secao>
      )}
      {an.pedidos_concluidos > 0 && (
        <Secao titulo={`Conferência pelo Analytics do iFood (até ${br(d.analytics_ate)})`} nota="Números oficiais agregados pelo iFood (D-1). Podem diferir um pouco dos de cima: o Analytics conta GMV descontando taxa de serviço e subsídios de parceiros.">
          <div style={gradeKpi}>
            <Kpi rotulo="Pedidos concluídos" valor={n0(an.pedidos_concluidos)} />
            <Kpi rotulo="GMV" valor={brl(an.gmv)} />
            <Kpi rotulo="Cancelados" valor={n0(an.pedidos_cancelados)} />
          </div>
        </Secao>
      )}
    </>
  )
}

function AbaPromocoes({ d }) {
  const p = d.promocoes
  const comInvest = p.patrocinadores.filter((x) => x.investimento > 0)
  return (
    <>
      <div style={gradeKpi}>
        <Kpi rotulo="Pedidos com promoção" valor={n0(p.pedidos_com_promocao)} sub={`${pct(p.percentual)} de ${n0(p.pedidos_total)} pedidos concluídos`} />
        <Kpi rotulo="Receita dos itens" valor={brl(p.receita_itens)} sub={`Ticket médio: ${brl(p.ticket_medio)}`} />
        <Kpi rotulo="Total investido" valor={brl(p.investimento_total)} sub="soma dos descontos de todos os patrocinadores" />
      </div>
      <Secao titulo="Investimentos" nota="Quem bancou os descontos dos pedidos do período (fonte: Financial API do iFood, campo benefits.sponsorships).">
        {comInvest.length > 0 && (
          <div role="img" aria-label="Participação de cada patrocinador no investimento" style={{ display: 'flex', height: 12, borderRadius: 99, overflow: 'hidden', gap: 2 }}>
            {comInvest.map((x) => (
              <div key={x.patrocinador} title={`${x.patrocinador}: ${pct(x.participacao)}`} style={{ width: `${x.participacao}%`, background: PATROCINADOR_COR[x.patrocinador] || 'var(--t3)' }} />
            ))}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
          {p.patrocinadores.map((x) => (
            <div key={x.patrocinador} style={{ border: '1px solid var(--borda)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14.5, color: 'var(--t1)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: PATROCINADOR_COR[x.patrocinador] || 'var(--t3)' }} />
                {x.patrocinador} <span style={{ fontWeight: 500, color: 'var(--t3)' }}>({pct(x.participacao)})</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>Total</div>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>{brl(x.investimento)}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>Por pedido {brl(x.por_pedido)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>Retorno a cada real investido</div>
                  <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>{x.retorno_por_real == null ? '—' : brl(x.retorno_por_real)}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>{n0(x.pedidos)} pedidos</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>
          Retorno = receita dos itens dos pedidos em que o patrocinador deu desconto ÷ quanto ele investiu. O Portal não publica a fórmula exata, então pode diferir um pouco do número de lá.
        </div>
      </Secao>
    </>
  )
}

function AbaOperacao({ d }) {
  const o = d.operacao
  const t = d.analytics.tempos
  const temAnalytics = t.some((x) => x.media_min != null)
  const tiles = [
    ['aceite', 'Tempo para aceitar', 'recebido → confirmado'],
    ['preparo', 'Tempo de preparo', 'início do preparo → pronto'],
    ['ate_despacho', 'Até despachar', 'recebido → despachado'],
    ['entrega', 'Tempo de entrega', 'despachado → entregue'],
    ['total', 'Tempo total do pedido', 'recebido → entregue'],
  ]
  return (
    <>
      <Secao titulo="Tempos da loja" nota="Pelos horários de cada pedido do período (eventos do pedido na Financial API, mesmo dia). Média e mediana em minutos.">
        <div style={gradeKpi}>
          {tiles.map(([k, rot, sub]) => (
            <Kpi key={k} rotulo={rot} valor={min(o[k].media)} sub={o[k].pedidos ? `mediana ${min(o[k].mediana)} · ${n0(o[k].pedidos)} pedidos · ${sub}` : `sem pedidos com esse dado · ${sub}`} />
          ))}
        </div>
      </Secao>
      <Secao titulo={`Logística e entregador (Analytics do iFood, até ${br(d.analytics_ate)})`} nota="Médias oficiais do iFood dos pedidos concluídos, atualizadas uma vez por dia (D-1). Inclui o tempo do entregador esperando na loja e o atraso na entrega.">
        {temAnalytics ? (
          <div style={gradeKpi}>
            {t.map((x) => (
              <Kpi key={x.chave} rotulo={x.rotulo} valor={min(x.media_min)} destaque={x.chave === 'timeAtOriginInMin' && x.media_min > 10 ? 'var(--warn)' : undefined} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>O iFood ainda não tem dados agregados desse período (o Analytics só traz pedidos concluídos até ontem).</div>
        )}
      </Secao>
    </>
  )
}

function AbaCancelamentos({ d }) {
  const c = d.cancelamentos
  const an = d.analytics.cancelamentos
  return (
    <>
      <div style={gradeKpi}>
        <Kpi rotulo="Pedidos cancelados" valor={n0(c.cancelados)} destaque={c.cancelados ? 'var(--bad)' : undefined} />
        <Kpi rotulo="Taxa de cancelamento" valor={pct(c.taxa)} sub="dos pedidos do período" />
        <Kpi rotulo="Valor perdido" valor={brl(c.valor_perdido)} sub="itens dos pedidos cancelados" />
        {an.total > 0 && <Kpi rotulo="Reembolsado (Analytics)" valor={brl(d.analytics.reembolsado)} sub={`até ${br(d.analytics_ate)}`} />}
      </div>
      <div style={gradeDupla}>
        <Secao titulo="Motivos">
          <Ranking linhas={c.motivos.map((m) => ({ chave: m.motivo, rotulo: m.motivo, valor: m.pedidos }))} vazio="Nenhum cancelamento no período." />
        </Secao>
        <Secao titulo="Quem cancelou">
          <Ranking linhas={c.origens.map((m) => ({ chave: m.origem, rotulo: m.origem, valor: m.pedidos }))} vazio="Nenhum cancelamento no período." />
        </Secao>
      </div>
      {an.total > 0 && (
        <div style={gradeDupla}>
          <Secao titulo={`Motivos no Analytics (até ${br(d.analytics_ate)})`}>
            <Ranking linhas={an.motivos.map((m) => ({ chave: m.motivo, rotulo: m.motivo, valor: m.pedidos }))} />
          </Secao>
          <Secao titulo="Em que momento foi cancelado">
            <Ranking linhas={an.estagios.map((m) => ({ chave: m.estagio, rotulo: m.estagio, valor: m.pedidos }))} />
          </Secao>
        </div>
      )}
      <Secao titulo="Pedidos cancelados">
        <Tabela
          vazio="Nenhum cancelamento no período."
          linhas={c.lista}
          colunas={[
            { k: 'criado_em', t: 'Quando', f: (l) => dataHora(l.criado_em) },
            { k: 'pedido', t: 'Pedido' },
            { k: 'loja', t: 'Loja' },
            { k: 'motivo', t: 'Motivo', f: (l) => (l.codigo_cancelamento ? `${l.motivo} (${l.codigo_cancelamento})` : l.motivo) },
            { k: 'origem', t: 'Quem cancelou' },
            { k: 'estagio', t: 'Momento', f: (l) => l.estagio || '—' },
            { k: 'valor', t: 'Valor', num: true, f: (l) => brl(l.valor) },
          ]}
        />
      </Secao>
    </>
  )
}

function AbaClientes({ d }) {
  const c = d.clientes
  const an = d.analytics
  const [lista, setLista] = useState('em_alerta')
  if (!c) return <Secao><div style={{ fontSize: 13, color: 'var(--t3)' }}>Não consegui ler o histórico de pedidos.</div></Secao>
  const r = c.regras
  return (
    <>
      <div style={gradeKpi}>
        <Kpi rotulo="Clientes no período" valor={n0(c.clientes_no_periodo)} sub={`${n0(c.clientes_total)} no histórico do painel`} />
        <Kpi rotulo="Novos" valor={n0(c.novos)} sub="1º pedido na loja" />
        <Kpi rotulo="Recorrentes" valor={n0(c.recorrentes)} sub="já tinham pedido antes" />
        <Kpi rotulo="Recuperados" valor={n0(c.recuperados)} sub={`voltaram após ${r.dias_recuperado}+ dias`} />
        <Kpi rotulo="Em alerta" valor={n0(c.em_alerta)} sub={`frequentes sem pedir há ${r.dias_alerta}–${r.dias_perdido} dias`} destaque={c.em_alerta ? 'var(--warn)' : undefined} />
        <Kpi rotulo="Perdidos" valor={n0(c.perdidos)} sub={`frequentes sem pedir há ${r.dias_perdido}+ dias`} />
      </div>
      {an.clientes_novos + an.clientes_recorrentes > 0 && (
        <Secao titulo={`Pelo Analytics do iFood (até ${br(d.analytics_ate)})`} nota="Contagem oficial de pedidos de 1ª compra na loja × recompra, inclusive de antes do painel existir.">
          <div style={gradeKpi}>
            <Kpi rotulo="Pedidos de clientes novos" valor={n0(an.clientes_novos)} />
            <Kpi rotulo="Pedidos de clientes que já compraram" valor={n0(an.clientes_recorrentes)} />
          </div>
        </Secao>
      )}
      <Secao titulo="Quem são" nota="O iFood não manda o telefone real do cliente (vem mascarado), só o nome e um identificador fixo — por isso a lista é pra acompanhar, não pra disparo.">
        <div style={{ alignSelf: 'flex-start', maxWidth: '100%', overflowX: 'auto' }}>
          <Segmentado
            rotulo="Lista"
            valor={lista}
            altura={32}
            onChange={setLista}
            opcoes={[
              { valor: 'em_alerta', rotulo: 'Em alerta' },
              { valor: 'perdidos', rotulo: 'Perdidos' },
              { valor: 'recuperados', rotulo: 'Recuperados' },
              { valor: 'novos', rotulo: 'Novos' },
              { valor: 'recorrentes', rotulo: 'Recorrentes' },
            ]}
          />
        </div>
        <Tabela
          vazio="Ninguém nessa lista."
          linhas={c.listas[lista] || []}
          colunas={[
            { k: 'nome', t: 'Cliente' },
            { k: 'pedidos', t: 'Pedidos', num: true },
            { k: 'ultimo', t: 'Último pedido', f: (l) => dataHora(l.ultimo) },
            ...(lista === 'em_alerta' || lista === 'perdidos' ? [{ k: 'dias_sem_pedir', t: 'Dias sem pedir', num: true }] : []),
          ]}
        />
        <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>Histórico conta a partir de quando o painel começou a receber os pedidos da loja.</div>
      </Secao>
    </>
  )
}

function AbaAvaliacoes({ d }) {
  const a = d.avaliacoes
  return (
    <>
      <div style={gradeKpi}>
        <Kpi rotulo="Nota geral" valor={a.nota_geral == null ? '—' : String(a.nota_geral).replace('.', ',')} sub="nota do iFood (últimos 3 meses)" />
        <Kpi rotulo="Avaliações no período" valor={n0(a.no_periodo)} sub={a.media_periodo == null ? 'sem avaliações' : `média ${String(a.media_periodo).replace('.', ',')}`} />
        <Kpi rotulo="Total de avaliações" valor={n0(a.total_avaliacoes)} />
      </div>
      <div style={gradeDupla}>
        <Secao titulo="Distribuição das notas">
          <Ranking linhas={a.distribuicao.map((x) => ({ chave: x.nota, rotulo: `${x.nota} ${x.nota === 1 ? 'estrela' : 'estrelas'}`, valor: x.avaliacoes }))} />
        </Secao>
        <Secao titulo="Comentários recentes">
          {a.lista.filter((x) => x.comentario).length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--t3)' }}>Nenhum comentário no período.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
              {a.lista
                .filter((x) => x.comentario)
                .slice(0, 50)
                .map((x) => (
                  <div key={x.id} style={{ borderBottom: '1px solid var(--linha)', paddingBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--t3)' }}>
                      <Star size={13} /> <b style={{ color: 'var(--t1)' }}>{x.nota}</b> · {dataHora(x.criado_em)} {x.loja ? `· ${x.loja}` : ''} {x.respondida ? '· respondida' : ''}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--t1)', marginTop: 4 }}>{x.comentario}</div>
                  </div>
                ))}
            </div>
          )}
        </Secao>
      </div>
    </>
  )
}

// ─────────────────────────────── relatórios CSV ───────────────────────────────

function relatorioVendas(d) {
  baixarCsv(`relatorio_vendas_${d.inicio}_${d.fim}.csv`, [
    ['Resumo', `${br(d.inicio)} a ${br(d.fim)}`],
    ['Número de pedidos', d.vendas.pedidos],
    ['Vendas totais (itens)', csvNum(d.vendas.valor_itens)],
    ['Vendas totais (com entrega)', csvNum(d.vendas.valor_com_entrega)],
    ['Ticket médio', csvNum(d.vendas.ticket_medio)],
    ['Cancelados', d.vendas.cancelados],
    [],
    ['Data', 'Hora', 'Loja', 'Pedido', 'Status', 'Canal', 'Logística', 'Itens', 'Taxa de entrega', 'Taxa de serviço', 'Total', 'Desconto', 'Pagamento', 'Preparo (min)', 'Tempo total (min)', 'Motivo do cancelamento'],
    ...d.linhas.map((l) => [
      l.dia ? l.dia.split('-').reverse().join('/') : '',
      l.hora != null ? `${String(l.hora).padStart(2, '0')}h` : '',
      l.loja,
      l.codigo,
      STATUS[l.status] || l.status,
      CANAL[l.canal] || l.canal,
      LOGISTICA[l.logistica] || l.logistica || '',
      csvNum(l.itens),
      csvNum(l.taxa_entrega),
      csvNum(l.taxa_servico),
      csvNum(l.total),
      csvNum(l.desconto_total),
      l.pagamentos,
      l.tempos?.preparo == null ? '' : String(l.tempos.preparo).replace('.', ','),
      l.tempos?.total == null ? '' : String(l.tempos.total).replace('.', ','),
      l.cancelamento?.motivo || '',
    ]),
  ])
}

function relatorioPromocoes(d) {
  const p = d.promocoes
  const nomes = p.patrocinadores.map((x) => x.patrocinador)
  baixarCsv(`relatorio_promocoes_${d.inicio}_${d.fim}.csv`, [
    ['Resumo', `${br(d.inicio)} a ${br(d.fim)}`],
    ['Pedidos com promoção', p.pedidos_com_promocao, `de ${p.pedidos_total} pedidos`],
    ['Receita dos itens', csvNum(p.receita_itens)],
    ['Total investido', csvNum(p.investimento_total)],
    [],
    ['Patrocinador', 'Investimento', 'Participação %', 'Pedidos', 'Por pedido', 'Retorno a cada R$ 1'],
    ...p.patrocinadores.map((x) => [x.patrocinador, csvNum(x.investimento), String(x.participacao).replace('.', ','), x.pedidos, csvNum(x.por_pedido), csvNum(x.retorno_por_real)]),
    [],
    ['Data', 'Loja', 'Pedido', 'Itens', 'Desconto total', ...nomes.map((n) => `Desconto ${n}`)],
    ...d.linhas
      .filter((l) => l.status !== 'CANCELLED' && l.desconto_total > 0)
      .map((l) => [l.dia ? l.dia.split('-').reverse().join('/') : '', l.loja, l.codigo, csvNum(l.itens), csvNum(l.desconto_total), ...nomes.map((n) => csvNum(l.desconto_por_patrocinador?.[n] || 0))]),
  ])
}

// ─────────────────────────────── tela ───────────────────────────────

export function DesempenhoView({ apiFetch, notificar, lojaAtual }) {
  const eh99 = lojaAtual?.plataforma === '99food'
  const [preset, setPreset] = useState('7d')
  const [periodo, setPeriodo] = useState(() => periodoPreset('7d'))
  const [todas, setTodas] = useState(eh99)
  const [aba, setAba] = useState('vendas')
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const apiFetchRef = useRef(apiFetch)
  apiFetchRef.current = apiFetch
  const somarTodas = todas || eh99

  async function carregar(atualizar = false) {
    setCarregando(true)
    setErro('')
    try {
      const qs = `?inicio=${periodo.inicio}&fim=${periodo.fim}${somarTodas ? '&todas=1' : ''}${atualizar ? '&atualizar=1' : ''}`
      setDados(await apiFetchRef.current(`/desempenho${qs}`))
    } catch (e) {
      setErro(e.message)
      notificar('erro', e.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo.inicio, periodo.fim, somarTodas, lojaAtual?.merchant_id])

  const rotuloPeriodo = periodo.inicio === periodo.fim ? br(periodo.inicio) : `${br(periodo.inicio)} a ${br(periodo.fim)}`
  const erros = Object.entries(dados?.erros || {})
  const escopo = somarTodas ? `${dados?.lojas?.length ?? '…'} lojas iFood` : lojaAtual?.nome || 'esta loja'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Segmentado
          rotulo="Período"
          valor={preset}
          altura={34}
          onChange={(v) => {
            setPreset(v)
            if (v !== 'custom') setPeriodo(periodoPreset(v))
          }}
          opcoes={[
            { valor: 'hoje', rotulo: 'Hoje' },
            { valor: '7d', rotulo: '7 dias' },
            { valor: '30d', rotulo: '30 dias' },
            { valor: 'mes', rotulo: 'Este mês' },
            { valor: 'custom', rotulo: 'Personalizado' },
          ]}
        />
        {preset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={periodo.inicio} max={periodo.fim} onChange={(e) => setPeriodo((p) => ({ ...p, inicio: e.target.value }))} className="ds-input" style={{ width: 'auto', height: 40, background: 'var(--card)' }} aria-label="Data inicial" />
            <span style={{ color: 'var(--t3)' }}>até</span>
            <input type="date" value={periodo.fim} min={periodo.inicio} onChange={(e) => setPeriodo((p) => ({ ...p, fim: e.target.value }))} className="ds-input" style={{ width: 'auto', height: 40, background: 'var(--card)' }} aria-label="Data final" />
          </div>
        )}
        <span style={{ fontSize: 13.5, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {rotuloPeriodo} · {escopo}
          {carregando && (
            <span role="status" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--t3)' }}>
              <Loader2 size={14} className="animate-spin" /> buscando no iFood…
            </span>
          )}
        </span>
        <span style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--t1)', cursor: eh99 ? 'default' : 'pointer' }} title={eh99 ? 'A loja ativa é 99Food (sem API de relatórios) — mostrando as lojas iFood' : undefined}>
          <input type="checkbox" checked={somarTodas} disabled={eh99} onChange={(e) => setTodas(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--marca)' }} />
          Somar todas as lojas iFood
        </label>
        <Botao variante="secundario" onClick={() => carregar(true)} disabled={carregando} title="Buscar de novo no iFood (ignora o cache de 3 min)">
          <RefreshCw size={16} /> Atualizar
        </Botao>
        <Botao variante="secundario" onClick={() => relatorioVendas(dados)} disabled={!dados}>
          <Download size={16} /> Relatório de vendas
        </Botao>
        <Botao variante="secundario" onClick={() => relatorioPromocoes(dados)} disabled={!dados}>
          <Download size={16} /> Relatório de promoções
        </Botao>
      </div>

      <Segmentado rotulo="Seção" valor={aba} altura={36} onChange={setAba} opcoes={ABAS} />

      {erros.length > 0 && (
        <div role="alert" style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--warn-bg)', border: '1px solid var(--warn-bd)', fontSize: 13, color: 'var(--t1)' }}>
          <AlertTriangle size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
          <div>
            Parte dos dados não veio do iFood — o resto da tela está certo.
            {erros.map(([k, v]) => (
              <div key={k} style={{ color: 'var(--t2)', marginTop: 2 }}>
                <b>{k}</b>: {Array.isArray(v) ? v.join(' | ') : String(v)}
              </div>
            ))}
          </div>
        </div>
      )}

      {erro && !dados ? (
        <section style={cartao}>
          <EstadoVazio icone={<AlertTriangle size={22} />} titulo="Não consegui carregar o desempenho" texto={erro} acao={<Botao variante="primario" onClick={() => carregar(true)}>Tentar de novo</Botao>} />
        </section>
      ) : !dados ? (
        <div style={gradeKpi}>
          {[0, 1, 2, 3].map((i) => (
            <Kpi key={i} rotulo=" " carregando />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: carregando ? 0.6 : 1, transition: 'opacity .15s' }}>
          {dados.vendas.pedidos === 0 && dados.vendas.cancelados === 0 && aba !== 'clientes' && aba !== 'avaliacoes' && (
            <section style={cartao}>
              <EstadoVazio icone={<TrendingUp size={22} />} titulo="Nenhum pedido nesse período" texto={`Entre ${br(dados.inicio)} e ${br(dados.fim)} o iFood não registrou venda em ${escopo}.`} />
            </section>
          )}
          {aba === 'vendas' && <AbaVendas d={dados} todas={somarTodas} />}
          {aba === 'promocoes' && <AbaPromocoes d={dados} />}
          {aba === 'operacao' && <AbaOperacao d={dados} />}
          {aba === 'cancelamentos' && <AbaCancelamentos d={dados} />}
          {aba === 'clientes' && <AbaClientes d={dados} />}
          {aba === 'avaliacoes' && <AbaAvaliacoes d={dados} />}
          <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>
            Fontes: Financial API do iFood (pedido a pedido, mesmo dia), Analytics do iFood (agregado até {br(dados.analytics_ate)}), Review API e o histórico de pedidos do painel. Conversão do cardápio, anúncios (Ads) e Super Restaurante ainda não têm API pública no iFood.
          </div>
        </div>
      )}
    </div>
  )
}
