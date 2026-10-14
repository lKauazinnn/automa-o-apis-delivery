import { ArrowRight, Boxes, CheckCircle2, History, Layers, Pause, Play, ShieldCheck } from 'lucide-react'
import { GraficoItensReincidentes, GraficoTendenciaAtividade } from '../Graficos'
import { ACAO_LABEL, Avatar, formatarTimestamp, StatCard } from '../ui'

// Quando vários pausados compartilham as mesmas palavras no nome ("Com/Fam/Exec Ancho Black"),
// não são N problemas — é uma ruptura de insumo só. Vale dizer isso na cara do usuário.
const IGNORAR = new Set(['com', 'fam', 'exec', 'kids', 'promo', 'esp', 'def', 'fest'])

function palavrasChave(nome) {
  return (nome || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 4 && !IGNORAR.has(p) && !/\d/.test(p))
}

function insumoEmComum(itensPausados) {
  if (itensPausados.length < 2) return null
  const contagem = {}
  for (const item of itensPausados) {
    for (const p of new Set(palavrasChave(item.nome))) contagem[p] = (contagem[p] || 0) + 1
  }
  const [melhor, quantos] = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0] || []
  if (!melhor || quantos < 2) return null
  return { palavra: melhor, quantos }
}

export function DashboardView({
  itens,
  categorias,
  totalDisponiveis,
  totalPausados,
  auditoria,
  C,
  onIrAuditoria,
  onIrCatalogoPausados,
  onDespausarRapido,
  alterandoStatus,
}) {
  const itensPausados = itens
    .filter((i) => i.status === 'UNAVAILABLE')
    .map((item) => {
      const evento = auditoria.find(
        (a) => a.item_id === item.itemId && (a.acao === 'pausar' || a.acao === 'pausar_em_massa')
      )
      return { ...item, quando: evento ? formatarTimestamp(evento.timestamp) : null }
    })
    .sort((a, b) => a.nome.localeCompare(b.nome))

  const insumo = insumoEmComum(itensPausados)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard icon={Boxes} value={itens.length} label="Itens no cardápio" color={C.marcaTinta} />
        <StatCard icon={Layers} value={categorias.length} label="Categorias" color={C.text2} />
        <StatCard icon={CheckCircle2} value={totalDisponiveis} label="Disponíveis" color={C.good} />
        <StatCard
          icon={Pause}
          value={totalPausados}
          label="Pausados agora"
          color={C.neutral}
          destaque={totalPausados > 0}
        />
      </div>

      <div
        className="rounded-2xl border overflow-hidden"
        style={{ background: C.cardBg, borderColor: totalPausados > 0 ? C.neutralBd : C.cardBorder }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: C.cardBorder }}>
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${totalPausados > 0 ? 'pulso-vivo' : ''}`}
            style={{ background: totalPausados > 0 ? C.neutral : C.good }}
          />
          <h2 className="font-bold" style={{ color: C.text1, fontSize: 15.5, letterSpacing: '-0.01em' }}>
            Pausados agora
          </h2>
          <span
            className="font-semibold px-2.5 rounded-full flex-shrink-0 inline-flex items-center"
            style={{
              color: totalPausados > 0 ? C.neutral : C.good,
              background: totalPausados > 0 ? C.neutralBg : C.goodBg,
              border: `1px solid ${totalPausados > 0 ? C.neutralBd : C.goodBd}`,
              height: 26,
              fontSize: 12.5,
            }}
          >
            {itensPausados.length}
          </span>
          {itensPausados.length > 0 && (
            <button
              type="button"
              onClick={onIrCatalogoPausados}
              className="ml-auto flex-shrink-0 font-semibold inline-flex items-center gap-1.5"
              style={{ color: C.marcaTinta, fontSize: 13.5 }}
            >
              Ver no cardápio
              <ArrowRight size={15} />
            </button>
          )}
        </div>

        {itensPausados.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-12 px-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
              style={{ background: C.goodBg, border: `1px solid ${C.goodBd}`, color: C.good }}
            >
              <ShieldCheck size={26} />
            </div>
            <p className="font-bold" style={{ color: C.text1, fontSize: 16 }}>
              Tudo disponível
            </p>
            <p style={{ color: C.text2, fontSize: 13.5, maxWidth: 380, lineHeight: 1.55 }}>
              Nenhum item pausado agora. Quando faltar insumo, o item pausado aparece aqui na hora.
            </p>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-x-8 px-5 max-h-72 overflow-y-auto">
              {itensPausados.map((item) => (
                <div
                  key={item.itemId}
                  className="flex items-center gap-3.5 py-3 border-b min-w-0"
                  style={{ borderColor: C.rowBorder }}
                >
                  {item.foto ? (
                    <img
                      src={item.foto}
                      alt=""
                      loading="lazy"
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                      style={{ border: `1px solid ${C.cardBorder}` }}
                    />
                  ) : (
                    <span
                      className="w-10 h-10 rounded-xl flex-shrink-0"
                      style={{ border: `1px dashed ${C.cardBorder}`, background: C.inputBg }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate" style={{ color: C.text1, fontSize: 14 }} title={item.nome}>
                      {item.nome}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5" style={{ color: C.text3, fontSize: 12.5 }}>
                      <span className="truncate" style={{ maxWidth: 130 }}>
                        {item.categoria}
                      </span>
                      <span>·</span>
                      <span className="fonte-mono flex-shrink-0">
                        R$ {Number(item.preco).toFixed(2).replace('.', ',')}
                      </span>
                      {item.quando && (
                        <>
                          <span>·</span>
                          <span className="flex-shrink-0 truncate">{item.quando}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDespausarRapido(item)}
                    disabled={alterandoStatus === item.itemId}
                    title={`Despausar ${item.nome}`}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 rounded-lg font-semibold disabled:opacity-50"
                    style={{
                      color: C.good,
                      background: C.goodBg,
                      border: `1px solid ${C.goodBd}`,
                      height: 34,
                      fontSize: 13.5,
                    }}
                  >
                    <Play size={14} />
                    Despausar
                  </button>
                </div>
              ))}
            </div>

            {insumo && (
              <div
                className="flex items-start gap-2.5 px-5 py-3.5 border-t"
                style={{ borderColor: C.rowBorder }}
              >
                <Pause size={16} style={{ color: C.neutral, flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: C.text2, fontSize: 13, lineHeight: 1.55 }}>
                  {insumo.quantos} dos {itensPausados.length} pausados têm{' '}
                  <b style={{ color: C.text1, textTransform: 'capitalize' }}>{insumo.palavra}</b> no nome — provável
                  ruptura de um insumo só, não {itensPausados.length} problemas.
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <GraficoTendenciaAtividade auditoria={auditoria} C={C} />
        <GraficoItensReincidentes auditoria={auditoria} C={C} />
      </div>

      <div className="rounded-2xl border" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: C.cardBorder }}>
          <History size={17} color={C.marcaTinta} />
          <h2 className="font-bold" style={{ color: C.text1, fontSize: 15.5, letterSpacing: '-0.01em' }}>
            Atividade recente
          </h2>
          <button
            type="button"
            onClick={onIrAuditoria}
            className="ml-auto font-semibold flex-shrink-0 inline-flex items-center gap-1.5"
            style={{ color: C.marcaTinta, fontSize: 13.5 }}
          >
            Ver o histórico
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-8 px-5 max-h-80 overflow-y-auto">
          {auditoria.length === 0 && (
            <p className="py-8" style={{ color: C.text3, fontSize: 13.5 }}>
              Nenhuma ação registrada ainda.
            </p>
          )}
          {auditoria.slice(0, 20).map((a, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 py-3 border-b min-w-0"
              style={{ borderColor: C.rowBorder }}
            >
              <Avatar nome={a.operador} idx={idx} size={32} />
              <div className="min-w-0 flex-1">
                <p style={{ color: C.text2, fontSize: 13.5, lineHeight: 1.45 }}>
                  <b style={{ color: C.text1, fontWeight: 600 }}>{a.operador || 'desconhecido'}</b>{' '}
                  {ACAO_LABEL[a.acao] || a.acao}{' '}
                  {(a.nome || a.detalhe) && (
                    <b style={{ color: C.text1, fontWeight: 600 }}>{a.nome || a.detalhe}</b>
                  )}
                </p>
                <p className="mt-0.5" style={{ color: C.text3, fontSize: 12 }}>
                  {formatarTimestamp(a.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
