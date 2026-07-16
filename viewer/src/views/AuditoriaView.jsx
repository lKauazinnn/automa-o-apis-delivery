import { History, Users } from 'lucide-react'
import { ACAO_LABEL, Avatar, formatarTimestamp } from '../ui'

export function AuditoriaView({ auditoria, totalUsuarios, mostrarTotalUsuarios, C }) {
  return (
    <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 820 }}>
      <div className={mostrarTotalUsuarios ? 'grid grid-cols-2 gap-3.5' : 'grid grid-cols-1 gap-3.5'}>
        <div className="flex items-center gap-3.5 rounded-2xl border p-4" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(245,108,53,0.12)', border: '1px solid rgba(245,108,53,0.28)' }}
          >
            <History size={16} color="#F56C35" />
          </div>
          <div>
            <div className="text-xl font-black leading-none" style={{ color: C.text1 }}>
              {auditoria.length}
            </div>
            <div className="text-[11px] mt-1" style={{ color: C.text2 }}>
              Ações registradas
            </div>
          </div>
        </div>
        {mostrarTotalUsuarios && (
          <div className="flex items-center gap-3.5 rounded-2xl border p-4" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: C.infoBg, border: '1px solid rgba(91,140,255,0.3)' }}
            >
              <Users size={16} color={C.info} />
            </div>
            <div>
              <div className="text-xl font-black leading-none" style={{ color: C.text1 }}>
                {totalUsuarios}
              </div>
              <div className="text-[11px] mt-1" style={{ color: C.text2 }}>
                Pessoas com acesso
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: C.cardBorder }}>
          <History size={16} color="#F56C35" />
          <h3 className="text-sm font-bold" style={{ color: C.text1 }}>
            Linha do tempo completa
          </h3>
        </div>
        <div className="px-5 py-2">
          {auditoria.length === 0 && (
            <p className="text-xs py-6" style={{ color: C.text3 }}>
              Nenhuma ação registrada ainda.
            </p>
          )}
          {auditoria.map((a, idx) => {
            const temDelta = !!(a.valor_de && a.valor_para)
            return (
              <div key={idx} className="flex gap-3.5 py-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <Avatar nome={a.operador} idx={idx} />
                  {idx < auditoria.length - 1 && (
                    <div className="flex-1 w-0.5 mt-1" style={{ background: C.rowBorder, minHeight: 12 }} />
                  )}
                </div>
                <div className="min-w-0 flex-1 pb-1.5">
                  <p className="text-[13px] leading-relaxed" style={{ color: C.text2 }}>
                    <b style={{ color: C.text1 }}>{a.operador || 'desconhecido'}</b> {ACAO_LABEL[a.acao] || a.acao}{' '}
                    {(a.nome || a.detalhe) && <b style={{ color: C.text1 }}>{a.nome || a.detalhe}</b>}
                  </p>
                  {temDelta && (
                    <div className="mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11.5px]">
                      <span style={{ color: C.bad, textDecoration: 'line-through', opacity: 0.8 }}>{a.valor_de}</span>
                      <span style={{ color: C.text3 }}>→</span>
                      <span style={{ color: C.good, fontWeight: 600 }}>{a.valor_para}</span>
                    </div>
                  )}
                  <p className="text-[11px] mt-1" style={{ color: C.text3 }}>
                    {formatarTimestamp(a.timestamp)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
