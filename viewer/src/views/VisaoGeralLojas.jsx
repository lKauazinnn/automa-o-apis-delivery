import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardList, PackageX, RefreshCw, Store, Wallet } from 'lucide-react'
import { Botao, CabecalhoCartao, Cartao, Contador, Esqueleto, MONO, Segmentado } from '../ds'
import { brl } from '../periodo'
import { tempoDesde } from '../pausas'
import { ORDEM_GRUPO, tomDaLoja } from '../components/statusLoja'

const LIMITE_FECHADO = 12
const LIMITE_FECHADO_CELULAR = 6

function Indicador({ Icon, cor, rotulo, valor, sub, destaque, carregando }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px', borderRadius: 12, border: `1px solid ${destaque || 'var(--linha)'}`, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 500, color: 'var(--t2)' }}>
        <span style={{ color: cor, display: 'flex' }}>
          <Icon size={15} />
        </span>
        {rotulo}
      </div>
      {carregando ? <Esqueleto w="50%" h={26} /> : <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--t1)', fontVariantNumeric: 'tabular-nums' }}>{valor}</div>}
      <div style={{ fontSize: 12, color: 'var(--t3)', minHeight: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
    </div>
  )
}

function Metrica({ Icon, children, titulo }) {
  return (
    <span title={titulo} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--t2)', whiteSpace: 'nowrap' }}>
      <Icon size={13} style={{ color: 'var(--t3)' }} />
      {children}
    </span>
  )
}

function CartaoLoja({ loja, atual, ruptura, podeVerValor, indice, onAbrir }) {
  const st = tomDaLoja(loja)
  const problema = st.grupo === 'problema'
  const pausados = ruptura ? (ruptura.erro ? null : ruptura.n) : loja.pausas_abertas
  return (
    <button
      type="button"
      onClick={onAbrir}
      className="ds-opcao linha-entra"
      title={atual ? 'Loja ativa no painel' : `Abrir ${loja.nome} no painel`}
      style={{
        animationDelay: `${Math.min(indice, 16) * 25}ms`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        minHeight: 96,
        borderRadius: 12,
        border: `1px solid ${atual ? 'var(--marca-borda)' : problema ? 'var(--bad-bd)' : 'var(--linha)'}`,
        background: atual ? 'var(--marca-suave)' : problema ? 'var(--bad-bg)' : undefined,
        color: 'var(--t1)',
        textAlign: 'left',
        cursor: 'pointer',
        minWidth: 0,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', minWidth: 0 }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 99, background: st.cor, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loja.nome || loja.merchant_id}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--t3)', flexShrink: 0 }}>{loja.plataforma === '99food' ? '99' : 'iFood'}</span>
      </span>
      <span title={st.titulo} style={{ fontSize: 12.5, fontWeight: 600, color: st.corTexto, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
        {atual ? `${st.rotulo} · ativa no painel` : st.rotulo}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 'auto' }}>
        <Metrica Icon={ClipboardList} titulo="Pedidos de hoje (sem cancelados)">
          <span style={{ fontFamily: MONO, color: 'var(--t1)' }}>{loja.pedidos_hoje ?? '—'}</span>
        </Metrica>
        {podeVerValor && loja.faturamento_hoje != null && (
          <Metrica Icon={Wallet} titulo="Valor dos pedidos de hoje">
            <span style={{ fontFamily: MONO, color: 'var(--t1)' }}>{brl(loja.faturamento_hoje)}</span>
          </Metrica>
        )}
        <Metrica Icon={PackageX} titulo={ruptura ? (ruptura.erro ? `Não consegui ler: ${ruptura.erro}` : 'Itens pausados no cardápio (última leitura)') : 'Pausas abertas feitas pelo painel'}>
          <span style={{ fontFamily: MONO, color: pausados ? 'var(--warn)' : 'var(--t1)' }}>{pausados ?? '?'}</span>
          {pausados === 1 ? ' pausado' : ' pausados'}
        </Metrica>
      </span>
    </button>
  )
}

// Visão geral de TODAS as lojas no topo do Painel: quantas estão abertas, quais precisam de
// atenção, pedidos e valor de hoje e pausas. Os dados vêm de /visao-geral (só Supabase, barato);
// "Verificar agora" consulta as plataformas, e "Ler rupturas" lê o cardápio de cada loja.
export function VisaoGeralLojas({ dados, carregando, erro, verificando, onVerificarAgora, onRecarregar, lojaAtualId, onAbrirLoja, rupturas, lendoRupturas, onLerRupturas, podeVerValor, celular }) {
  const [filtro, setFiltro] = useState('todas')
  const [expandido, setExpandido] = useState(false)
  const lojas = useMemo(() => dados?.lojas || [], [dados])

  const comGrupo = useMemo(
    () =>
      lojas
        .map((l) => ({ ...l, _grupo: tomDaLoja(l).grupo }))
        .sort((a, b) => ORDEM_GRUPO[a._grupo] - ORDEM_GRUPO[b._grupo] || (b.pedidos_hoje || 0) - (a.pedidos_hoje || 0) || String(a.nome).localeCompare(String(b.nome), 'pt-BR')),
    [lojas],
  )
  const conta = (g) => comGrupo.filter((l) => l._grupo === g).length
  const n = { problema: conta('problema'), aberta: conta('aberta'), horario: conta('horario'), sem: conta('sem') }
  const pedidos = lojas.reduce((s, l) => s + (l.pedidos_hoje || 0), 0)
  const cancelados = lojas.reduce((s, l) => s + (l.cancelados_hoje || 0), 0)
  const valor = lojas.reduce((s, l) => s + (l.faturamento_hoje || 0), 0)
  const totalRuptura = rupturas ? Object.values(rupturas.porLoja).reduce((s, r) => s + (r.n || 0), 0) : null

  const filtradas = filtro === 'todas' ? comGrupo : comGrupo.filter((l) => l._grupo === filtro)
  const limite = celular ? LIMITE_FECHADO_CELULAR : LIMITE_FECHADO
  const visiveis = expandido ? filtradas : filtradas.slice(0, limite)
  const verificadoEm = lojas.map((l) => l.verificado_em).filter(Boolean).sort().pop()

  const opcoes = [
    { valor: 'todas', rotulo: 'Todas', contagem: lojas.length },
    n.problema && { valor: 'problema', rotulo: 'Atenção', contagem: n.problema },
    n.aberta && { valor: 'aberta', rotulo: 'Abertas', contagem: n.aberta },
    n.horario && { valor: 'horario', rotulo: 'Fora do horário', contagem: n.horario },
    n.sem && { valor: 'sem', rotulo: 'Sem status', contagem: n.sem },
  ]
    .filter(Boolean)
    .map((o) => ({ valor: o.valor, rotulo: o.rotulo, contagem: o.contagem }))

  return (
    <Cartao style={{ minWidth: 0 }}>
      <CabecalhoCartao
        icone={
          <span style={{ color: 'var(--marca-tinta)', display: 'flex' }}>
            <Store size={18} />
          </span>
        }
        titulo="Visão geral das lojas"
        extra={<Contador tipo="neutro">{lojas.length || '…'}</Contador>}
        style={{ padding: celular ? '14px 16px' : '18px 24px' }}
      >
        <Botao variante="secundario" tamanho="sm" disabled={!!lendoRupturas || !lojas.length} onClick={onLerRupturas} title="Lê o cardápio de cada loja e conta os itens pausados (leva alguns segundos)">
          {lendoRupturas ? <RefreshCw size={15} className="animate-spin" /> : <PackageX size={15} />}
          {lendoRupturas ? `Lendo ${lendoRupturas.feitas}/${lendoRupturas.total}…` : 'Contar rupturas'}
        </Botao>
        <Botao variante="secundario" tamanho="sm" disabled={verificando} onClick={onVerificarAgora} title="Consulta o iFood e o 99 agora">
          <RefreshCw size={15} className={verificando ? 'animate-spin' : ''} />
          {verificando ? 'Verificando…' : 'Verificar agora'}
        </Botao>
      </CabecalhoCartao>

      <div style={{ padding: celular ? 16 : '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {erro && !lojas.length ? (
          <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bad-bg)', border: '1px solid var(--bad-bd)', fontSize: 13, color: 'var(--t1)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>Não consegui carregar a visão geral: {erro}</span>
            <Botao variante="secundario" tamanho="xs" onClick={onRecarregar}>
              Tentar de novo
            </Botao>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: celular ? 'repeat(2, minmax(0, 1fr))' : 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              <Indicador Icon={CheckCircle2} cor="var(--good)" rotulo="Abertas agora" valor={`${n.aberta}/${lojas.length}`} sub={n.horario ? `${n.horario} fora do horário` : 'todas no ar'} carregando={carregando && !lojas.length} />
              <Indicador
                Icon={AlertTriangle}
                cor={n.problema ? 'var(--bad)' : 'var(--t3)'}
                rotulo="Precisam de atenção"
                valor={n.problema}
                sub={n.problema ? 'fechadas fora do horário normal' : n.sem ? `${n.sem} sem status` : 'nenhuma'}
                destaque={n.problema ? 'var(--bad-bd)' : undefined}
                carregando={carregando && !lojas.length}
              />
              <Indicador Icon={ClipboardList} cor="var(--info)" rotulo="Pedidos hoje" valor={pedidos} sub={cancelados ? `${cancelados} cancelado${cancelados === 1 ? '' : 's'}` : 'nas lojas cadastradas'} carregando={carregando && !lojas.length} />
              {podeVerValor ? (
                <Indicador Icon={Wallet} cor="var(--t2)" rotulo="Valor hoje" valor={brl(valor)} sub="pedidos que entraram no painel" carregando={carregando && !lojas.length} />
              ) : (
                <Indicador Icon={PackageX} cor="var(--warn)" rotulo="Rupturas" valor={totalRuptura ?? '—'} sub={rupturas ? `lidas ${tempoDesde(rupturas.em)}` : 'clique em Contar rupturas'} carregando={false} />
              )}
            </div>

            {lojas.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Segmentado rotulo="Filtrar lojas" valor={filtro} onChange={(v) => { setFiltro(v); setExpandido(false) }} opcoes={opcoes} altura={30} />
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>
                  {verificadoEm ? `Status ${tempoDesde(verificadoEm)}` : 'Status ainda não verificado'}
                  {rupturas ? ` · rupturas ${tempoDesde(rupturas.em)}` : ''}
                  {dados?.monitor && !dados.monitor.ativo ? ' · monitor desligado' : ''}
                </span>
              </div>
            )}

            {carregando && !lojas.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
                {[0, 1, 2, 3, 4, 5].map((k) => (
                  <Esqueleto key={k} h={96} r={12} />
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: celular ? 'minmax(0, 1fr)' : 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
                {visiveis.map((l, k) => (
                  <CartaoLoja key={l.merchant_id} loja={l} indice={k} atual={l.merchant_id === lojaAtualId} ruptura={rupturas?.porLoja?.[l.merchant_id]} podeVerValor={podeVerValor} onAbrir={() => onAbrirLoja(l)} />
                ))}
              </div>
            )}

            {filtradas.length > limite && (
              <Botao variante="link" onClick={() => setExpandido((v) => !v)} style={{ alignSelf: 'center' }}>
                {expandido ? 'Mostrar menos' : `Mostrar todas as ${filtradas.length}`}
                <ChevronDown size={16} style={{ transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </Botao>
            )}
          </>
        )}
      </div>
    </Cartao>
  )
}
