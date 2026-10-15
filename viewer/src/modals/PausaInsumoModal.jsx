import { useEffect, useMemo, useState } from 'react'
import { Loader2, Pause, Zap } from 'lucide-react'
import { Botao, Dialogo, Etiqueta, MONO, OpcaoMarcavel, Rotulo } from '../ds'
import { normalizar } from '../pausas'

// Ruptura de um insumo (ex: acabou o bacon): busca o termo no nome e na descrição dos pratos e
// no nome dos complementos, e devolve tudo que bate pra pausar de uma vez — os pratos E os
// adicionais, porque um "Adicional de bacon" esquecido no ar gera pedido que a cozinha não faz.
//
// Dois caminhos: "Pausar N" pausa já (motivo "Acabou: <termo>", até reativar); "Escolher prazo"
// leva a seleção pro modal de pausa completo (motivo, prazo, outras lojas).
export function PausaInsumoModal({ itens, plataforma, apiFetch, onContinuar, onPausarDireto, executando, onClose }) {
  const [termo, setTermo] = useState('')
  const [grupos, setGrupos] = useState([])
  const [carregandoGrupos, setCarregandoGrupos] = useState(plataforma !== '99food')
  const [erroGrupos, setErroGrupos] = useState('')
  const [desmarcados, setDesmarcados] = useState(new Set())

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

  // O que já está pausado começa desmarcado — pausar de novo só reescreveria o motivo.
  const alvos = useMemo(
    () => [
      ...pratos.map((i) => ({
        chave: `item:${i.itemId}`,
        tipo: 'item',
        id: i.itemId,
        nome: i.nome,
        sub: i.descricao && normalizar(i.descricao) !== normalizar(i.nome) ? i.descricao : i.categoria,
        codigo_pdv: i.codigo_pdv || '',
        status: i.status,
      })),
      ...complementos.map((o) => ({
        chave: `opcao:${o.id}`,
        tipo: 'opcao',
        id: o.id,
        grupoId: o.grupoId,
        nome: `${o.name} (${o.grupoNome})`,
        sub: o.grupoNome,
        codigo_pdv: o.externalCode || '',
        status: o.status,
      })),
    ],
    [pratos, complementos],
  )

  const marcado = (a) => a.status !== 'UNAVAILABLE' && !desmarcados.has(a.chave)
  const escolhidos = alvos.filter(marcado)
  const n = escolhidos.length

  function alternar(a) {
    if (a.status === 'UNAVAILABLE') return
    setDesmarcados((prev) => {
      const novo = new Set(prev)
      if (novo.has(a.chave)) novo.delete(a.chave)
      else novo.add(a.chave)
      return novo
    })
  }

  const secoes = [
    { titulo: 'Pratos', lista: alvos.filter((a) => a.tipo === 'item') },
    { titulo: 'Complementos', lista: alvos.filter((a) => a.tipo === 'opcao') },
  ].filter((s) => s.lista.length)

  return (
    <Dialogo
      largura={600}
      eyebrow="Pausar por insumo"
      titulo="O que acabou?"
      descricao={
        plataforma === '99food' ? (
          'Busca o ingrediente no nome e na descrição dos pratos.'
        ) : (
          <>
            Busca nos pratos <b>e</b> nos complementos — um adicional esquecido vira pedido que a cozinha não faz.
          </>
        )
      }
      onClose={onClose}
      rodape={
        <>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--t2)', minWidth: 150 }}>
            {n ? `Motivo: Acabou ${termo.trim()} · até reativar` : 'Digite o insumo e confira a lista'}
          </span>
          <Botao variante="secundario" tamanho="lg" disabled={!n || executando} onClick={() => onContinuar(alvos.map((a) => ({ ...a, marcado: marcado(a) })), termo.trim())}>
            Escolher prazo…
          </Botao>
          <Botao variante="primario" tamanho="lg" disabled={!n || executando} onClick={() => onPausarDireto(escolhidos, termo.trim())}>
            <Pause size={16} />
            {n ? `Pausar ${n} ${n > 1 ? 'itens' : 'item'}` : 'Pausar'}
          </Botao>
        </>
      }
    >
      <div
        className="ds-campo"
        style={{ height: 46, background: 'var(--card)', borderWidth: 1.5 }}
      >
        <span style={{ color: 'var(--warn)', display: 'flex' }}>
          <Zap size={20} />
        </span>
        <input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="ex.: bacon, cheddar, picanha" aria-label="Insumo que acabou" style={{ fontSize: 15 }} />
      </div>

      {carregandoGrupos && (
        <div style={{ fontSize: 13, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 6, marginTop: -8 }}>
          <Loader2 size={14} className="animate-spin" /> Carregando complementos…
        </div>
      )}
      {erroGrupos && (
        <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: -8 }}>Complementos indisponíveis agora ({erroGrupos}) — a busca segue só nos pratos.</div>
      )}

      {secoes.map((s) => (
        <div key={s.titulo} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Rotulo style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {s.titulo}
            <span style={{ fontFamily: MONO, letterSpacing: 0 }}>{s.lista.length}</span>
          </Rotulo>
          <div style={{ border: '1px solid var(--borda)', borderRadius: 9, overflow: 'hidden' }}>
            {s.lista.map((a) => (
              <OpcaoMarcavel
                key={a.chave}
                marcado={marcado(a)}
                disabled={a.status === 'UNAVAILABLE'}
                onClick={() => alternar(a)}
                extra={
                  <span style={{ display: 'flex', gap: 6 }}>
                    {a.tipo === 'opcao' && <Etiqueta tipo="info">Complemento</Etiqueta>}
                    {a.status === 'UNAVAILABLE' && <Etiqueta tipo="warn">Já pausado</Etiqueta>}
                  </span>
                }
              >
                <span style={{ display: 'block', fontWeight: 600 }}>{a.tipo === 'opcao' ? a.nome.replace(/ \([^)]*\)$/, '') : a.nome}</span>
                {a.sub && <span style={{ display: 'block', fontSize: 12.5, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.sub}</span>}
              </OpcaoMarcavel>
            ))}
          </div>
        </div>
      ))}

      {busca.length >= 2 && alvos.length === 0 && !carregandoGrupos && (
        <div style={{ padding: 24, textAlign: 'center', fontSize: 13.5, color: 'var(--t2)' }}>
          Nada no cardápio menciona “{termo.trim()}”. Tente outra grafia (ex.: singular).
        </div>
      )}
    </Dialogo>
  )
}
