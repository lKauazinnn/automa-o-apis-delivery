import { Boxes, CheckCircle2, Layers, Pause, Play, History } from 'lucide-react'
import { GraficoItensReincidentes, GraficoTendenciaAtividade } from '../Graficos'
import { ACAO_LABEL, Avatar, formatarTimestamp, StatCard } from '../ui'

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

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Boxes} value={itens.length} label="Itens no catálogo" color="#F56C35" />
        <StatCard icon={Layers} value={categorias.length} label="Categorias" color="#FBB34A" />
        <StatCard icon={CheckCircle2} value={totalDisponiveis} label="Disponíveis" color={C.good} />
        <StatCard icon={Pause} value={totalPausados} label="Pausados" color={C.neutral} />
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
        <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: C.cardBorder }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0 pulso-vivo" style={{ background: C.neutral }} />
          <h2 className="text-sm font-bold" style={{ color: C.text1 }}>
            Pausados agora
          </h2>
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ color: C.neutral, background: C.neutralBg, border: `1px solid ${C.neutralBd}` }}
          >
            {itensPausados.length}
          </span>
          {itensPausados.length > 0 && (
            <button
              type="button"
              onClick={onIrCatalogoPausados}
              className="ml-auto flex-shrink-0 text-xs font-semibold"
              style={{ color: '#F56C35' }}
            >
              Ver no catálogo →
            </button>
          )}
        </div>

        {itensPausados.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-9">
            <CheckCircle2 size={16} color={C.good} />
            <span className="text-xs" style={{ color: C.text2 }}>
              Tudo disponível — nenhum item pausado no momento.
            </span>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-x-10 px-5 py-1 max-h-64 overflow-y-auto">
            {itensPausados.map((item) => (
              <div
                key={item.itemId}
                className="flex items-center gap-3 py-2.5 border-b min-w-0"
                style={{ borderColor: C.rowBorder }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold truncate" style={{ color: C.text1 }} title={item.nome}>
                    {item.nome}
                  </p>
                  <p className="text-[11px] mt-0.5 flex items-center gap-1.5" style={{ color: C.text3 }}>
                    <span className="truncate" style={{ maxWidth: 120 }}>
                      {item.categoria}
                    </span>
                    <span>·</span>
                    <span className="fonte-mono flex-shrink-0">R$ {Number(item.preco).toFixed(2)}</span>
                    {item.quando && (
                      <>
                        <span>·</span>
                        <span className="flex-shrink-0">{item.quando}</span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDespausarRapido(item)}
                  disabled={alterandoStatus === item.itemId}
                  title="Despausar item"
                  className="botao-icone-fantasma flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ color: C.good }}
                >
                  <Play size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <GraficoTendenciaAtividade auditoria={auditoria} C={C} />
        <GraficoItensReincidentes auditoria={auditoria} C={C} />
      </div>

      <div className="rounded-2xl border p-5" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <History size={15} color="#F56C35" />
            <h2 className="text-sm font-bold" style={{ color: C.text1 }}>
              Atividade recente
            </h2>
          </div>
          <button type="button" onClick={onIrAuditoria} className="text-xs font-semibold flex-shrink-0" style={{ color: '#F56C35' }}>
            Ver tudo →
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-x-6 max-h-80 overflow-y-auto">
          {auditoria.length === 0 && (
            <p className="text-xs" style={{ color: C.text3 }}>
              Nenhuma ação registrada ainda.
            </p>
          )}
          {auditoria.slice(0, 20).map((a, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs py-2 border-b" style={{ borderColor: C.rowBorder }}>
              <Avatar nome={a.operador} idx={idx} size={26} />
              <div className="min-w-0 flex-1">
                <p style={{ color: C.text1 }}>
                  <span className="font-semibold">{a.operador || 'desconhecido'}</span>{' '}
                  <span style={{ color: C.text2 }}>{ACAO_LABEL[a.acao] || a.acao}</span>{' '}
                  {(a.nome || a.detalhe) && <span className="font-semibold">{a.nome || a.detalhe}</span>}
                </p>
                <p style={{ color: C.text3 }}>{formatarTimestamp(a.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
