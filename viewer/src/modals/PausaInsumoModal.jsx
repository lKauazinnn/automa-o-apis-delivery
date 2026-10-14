import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { Modal, Pill } from '../ui'
import { normalizar } from '../pausas'

// Ruptura de um insumo (ex: acabou o bacon): busca o termo no nome e na descrição dos pratos e
// no nome dos complementos, e devolve tudo que bate pra pausar de uma vez — os pratos E os
// adicionais, porque um "Adicional de bacon" esquecido no ar gera pedido que a cozinha não faz.
export function PausaInsumoModal({ itens, plataforma, apiFetch, onContinuar, onClose, C, inputStyle }) {
  const [termo, setTermo] = useState('')
  const [grupos, setGrupos] = useState([])
  const [carregandoGrupos, setCarregandoGrupos] = useState(plataforma !== '99food')
  const [erroGrupos, setErroGrupos] = useState('')

  useEffect(() => {
    if (plataforma === '99food') return
    let cancelado = false
    apiFetch('/grupos-opcao')
      .then((g) => !cancelado && setGrupos(g || []))
      .catch((e) => !cancelado && setErroGrupos(e.message))
      .finally(() => !cancelado && setCarregandoGrupos(false))
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const busca = normalizar(termo)

  const pratos = useMemo(() => {
    if (busca.length < 2) return []
    return itens.filter((i) => normalizar(`${i.nome} ${i.descricao || ''}`).includes(busca))
  }, [itens, busca])

  const complementos = useMemo(() => {
    if (busca.length < 2) return []
    return grupos.flatMap((g) =>
      (g.options || [])
        .filter((o) => normalizar(o.name).includes(busca))
        .map((o) => ({ ...o, grupoId: g.id, grupoNome: g.name })),
    )
  }, [grupos, busca])

  function continuar() {
    const alvos = [
      ...pratos.map((i) => ({
        chave: `item:${i.itemId}`,
        tipo: 'item',
        id: i.itemId,
        nome: i.nome,
        codigo_pdv: i.codigo_pdv || '',
        status: i.status,
        marcado: i.status === 'AVAILABLE',
      })),
      ...complementos.map((o) => ({
        chave: `opcao:${o.id}`,
        tipo: 'opcao',
        id: o.id,
        grupoId: o.grupoId,
        nome: `${o.name} (${o.grupoNome})`,
        codigo_pdv: o.externalCode || '',
        status: o.status,
        marcado: o.status !== 'UNAVAILABLE',
      })),
    ]
    onContinuar(alvos, termo.trim())
  }

  const total = pratos.length + complementos.length

  return (
    <Modal titulo="Pausar por insumo" onClose={onClose} largura="max-w-lg">
      <p className="text-xs mb-3 leading-relaxed" style={{ color: C.text2 }}>
        Digite o ingrediente que acabou. Aparecem os pratos que citam ele no nome ou na descrição
        {plataforma === '99food' ? '' : ' e os complementos/adicionais com esse nome'}.
      </p>
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.text3 }} />
        <input
          autoFocus
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Ex: bacon, cheddar, picanha"
          aria-label="Insumo"
          className="w-full pl-10 pr-3 rounded-xl outline-none text-sm"
          style={{ ...inputStyle, height: 42 }}
        />
      </div>

      {carregandoGrupos && (
        <p className="text-xs flex items-center gap-1.5 mb-2" style={{ color: C.text3 }}>
          <Loader2 size={12} className="animate-spin" /> Carregando complementos...
        </p>
      )}
      {erroGrupos && (
        <p className="text-xs mb-2" style={{ color: C.text3 }}>
          Complementos indisponíveis agora ({erroGrupos}) — a busca segue só nos pratos.
        </p>
      )}

      <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto mb-4">
        {busca.length >= 2 && total === 0 && !carregandoGrupos && (
          <p className="text-xs" style={{ color: C.text2 }}>
            Nada no cardápio cita "{termo.trim()}". Tente outra grafia (ex: singular).
          </p>
        )}
        {pratos.map((i) => (
          <div key={i.itemId} className="flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-2" style={{ background: C.inputBg }}>
            <span className="truncate" style={{ color: C.text1 }}>
              {i.nome}
            </span>
            <span className="truncate" style={{ color: C.text3 }}>
              {i.categoria}
            </span>
            <span className="ml-auto flex-shrink-0">
              <Pill color={i.status === 'AVAILABLE' ? C.good : C.neutral} dot>
                {i.status === 'AVAILABLE' ? 'Disponível' : 'Pausado'}
              </Pill>
            </span>
          </div>
        ))}
        {complementos.map((o) => (
          <div key={o.id} className="flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-2" style={{ background: C.inputBg }}>
            <span className="truncate" style={{ color: C.text1 }}>
              {o.name}
            </span>
            <span className="truncate" style={{ color: C.text3 }}>
              {o.grupoNome}
            </span>
            <span className="ml-auto flex-shrink-0 flex gap-1.5">
              <Pill color={C.info}>Complemento</Pill>
              <Pill color={o.status === 'UNAVAILABLE' ? C.neutral : C.good} dot>
                {o.status === 'UNAVAILABLE' ? 'Pausado' : 'Disponível'}
              </Pill>
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={total === 0}
          onClick={continuar}
          className="botao-primario text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
        >
          {total === 0
            ? 'Continuar'
            : `Continuar com ${pratos.length} prato(s)${complementos.length ? ` e ${complementos.length} complemento(s)` : ''}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold px-3.5 py-2.5 rounded-xl ml-auto"
          style={{ color: C.text2, background: 'transparent' }}
        >
          Cancelar
        </button>
      </div>
    </Modal>
  )
}
