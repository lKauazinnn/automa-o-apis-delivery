import { useMemo, useState } from 'react'
import { Pause, Plus, Search, X } from 'lucide-react'
import { Botao, CampoBusca, Dialogo, Escolha, Etiqueta, OpcaoMarcavel, Rotulo, Segmentado } from '../ds'
import { encontrarRelacionados, horaCurta, MOTIVOS_PAUSA, normalizar, PRAZOS_PAUSA } from '../pausas'

const PLATAFORMA_LABEL = { ifood: 'iFood', '99food': '99Food' }

function voltaEm(prazo) {
  const min = prazo.minutos()
  if (min == null) return 'até reativar'
  return `volta ${horaCurta(new Date(Date.now() + min * 60000).toISOString())}`
}

// Uma tela só pra toda pausa de item/complemento, em 4 passos: o quê (com busca e os itens
// parecidos já sugeridos), por quê, por quanto tempo e em quais lojas. Abre vazia pelo botão
// "Pausar item" (ou a tecla P) e já preenchida pelo botão da linha, pela seleção ou pelo insumo.
//
// `alvos`: [{ chave, tipo, id, nome, codigo_pdv, status, marcado, sugerido }]. O que vem marcado e
// não é sugestão vira "chip"; o resto aparece como sugestão marcável.
export function PausarModal({
  alvos: alvosIniciais,
  itens = [],
  paraAlvo,
  motivoInicial = '',
  outrasLojas = [],
  lojaAtual,
  executando,
  onConfirmar,
  onClose,
}) {
  const [principais, setPrincipais] = useState(() => alvosIniciais.filter((a) => a.marcado && !a.sugerido))
  const [sugestoes, setSugestoes] = useState(() => alvosIniciais.filter((a) => !(a.marcado && !a.sugerido)))
  const [marcadosSug, setMarcadosSug] = useState(() => new Set(alvosIniciais.filter((a) => a.marcado && a.sugerido).map((a) => a.chave)))
  const [busca, setBusca] = useState('')
  const [motivo, setMotivo] = useState(MOTIVOS_PAUSA.includes(motivoInicial) ? motivoInicial : '')
  const [motivoLivre, setMotivoLivre] = useState(MOTIVOS_PAUSA.includes(motivoInicial) ? '' : motivoInicial)
  const [prazo, setPrazo] = useState('manual')
  const [lojasExtras, setLojasExtras] = useState(new Set())

  const chavesUsadas = useMemo(() => new Set([...principais, ...sugestoes].map((a) => a.chave)), [principais, sugestoes])

  const resultados = useMemo(() => {
    const termo = normalizar(busca)
    if (!termo || !paraAlvo) return []
    return itens
      .filter((i) => i.status === 'AVAILABLE' && !chavesUsadas.has(`item:${i.itemId}`))
      .filter((i) => normalizar(i.nome).includes(termo) || String(i.codigo_pdv || '').includes(termo))
      .slice(0, 6)
  }, [busca, itens, chavesUsadas, paraAlvo])

  function adicionar(item) {
    const alvo = paraAlvo(item, { marcado: true })
    setPrincipais((prev) => [...prev, alvo])
    setBusca('')
    // Os parecidos do item adicionado entram como sugestão (desmarcados: quem decide é a pessoa).
    const novos = encontrarRelacionados(item, itens)
      .filter((r) => r.status === 'AVAILABLE' && !chavesUsadas.has(`item:${r.itemId}`) && r.itemId !== item.itemId)
      .slice(0, 4)
      .map((r) => paraAlvo(r, { sugerido: true }))
    if (novos.length) setSugestoes((prev) => [...prev, ...novos.filter((n) => !prev.some((p) => p.chave === n.chave))])
  }

  function remover(chave) {
    setPrincipais((prev) => prev.filter((a) => a.chave !== chave))
  }

  function alternarSugestao(chave) {
    setMarcadosSug((prev) => {
      const novo = new Set(prev)
      if (novo.has(chave)) novo.delete(chave)
      else novo.add(chave)
      return novo
    })
  }

  function alternarLoja(id) {
    setLojasExtras((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const selecionados = [...principais, ...sugestoes.filter((s) => marcadosSug.has(s.chave))]
  const n = selecionados.length
  const opcaoPrazo = PRAZOS_PAUSA.find((p) => p.chave === prazo)
  const motivoFinal = (motivoLivre.trim() || motivo).slice(0, 120)
  const comPdv = selecionados.filter((a) => a.tipo === 'item' && a.codigo_pdv).length

  const titulo = n === 1 ? selecionados[0].nome : n > 1 ? `${n} itens` : 'O que acabou?'
  const temSugestaoParecida = sugestoes.some((s) => s.sugerido)

  function confirmar() {
    if (!n) return
    onConfirmar({
      alvos: selecionados,
      minutos: opcaoPrazo.minutos(),
      motivo: motivoFinal,
      lojasExtras: outrasLojas.filter((l) => lojasExtras.has(l.merchant_id)),
    })
  }

  const resumo = [
    n ? `${n} ${n === 1 ? 'item' : 'itens'}` : 'Nada escolhido ainda',
    motivoFinal || null,
    voltaEm(opcaoPrazo),
    lojasExtras.size ? `+ ${lojasExtras.size} ${lojasExtras.size === 1 ? 'loja' : 'lojas'}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Dialogo
      eyebrow="Pausar no cardápio"
      titulo={titulo}
      onClose={onClose}
      rodape={
        <>
          <span style={{ flex: 1, fontSize: 13, color: 'var(--t2)', minWidth: 160 }}>{resumo}</span>
          <Botao variante="secundario" tamanho="lg" onClick={onClose}>
            Cancelar
          </Botao>
          <Botao variante="primario" tamanho="lg" disabled={!n || executando} onClick={confirmar}>
            <Pause size={16} />
            {n > 1 ? `Pausar ${n} itens` : 'Pausar'}
          </Botao>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Rotulo>1 · O quê</Rotulo>
        {principais.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {principais.map((a) => (
              <span
                key={a.chave}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 34,
                  padding: '0 6px 0 12px',
                  borderRadius: 9,
                  background: 'var(--marca-suave)',
                  border: '1px solid var(--marca-borda)',
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: 'var(--t1)',
                }}
              >
                {a.nome}
                {a.tipo === 'opcao' && <Etiqueta tipo="info">Complemento</Etiqueta>}
                <button
                  type="button"
                  onClick={() => remover(a.chave)}
                  aria-label={`Tirar ${a.nome}`}
                  className="ds-icone"
                  style={{ width: 24, height: 24, borderRadius: 5 }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
        {paraAlvo && (
          <CampoBusca
            valor={busca}
            onChange={setBusca}
            onLimpar={() => setBusca('')}
            placeholder="Adicionar item — nome ou código PDV"
            icone={<Search size={16} />}
            autoFocus={principais.length === 0}
          />
        )}
        {resultados.length > 0 && (
          <div style={{ border: '1px solid var(--borda)', borderRadius: 9, overflow: 'hidden' }}>
            {resultados.map((i) => (
              <button
                key={i.itemId}
                type="button"
                onClick={() => adicionar(i)}
                className="ds-opcao"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  height: 42,
                  padding: '0 12px',
                  border: 0,
                  borderBottom: '1px solid var(--linha)',
                  background: 'var(--card)',
                  color: 'var(--t1)',
                  fontSize: 13.5,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ color: 'var(--t3)', display: 'flex' }}>
                  <Plus size={16} />
                </span>
                <span style={{ flex: 1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.nome}</span>
                <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>{i.categoria}</span>
              </button>
            ))}
          </div>
        )}
        {busca.trim() && resultados.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>Nenhum item disponível com esse nome ou código.</div>
        )}
        {sugestoes.length > 0 && (
          <div style={{ border: '1px solid var(--info-bd)', background: 'var(--info-bg)', borderRadius: 9, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)' }}>
              {temSugestaoParecida ? 'Parecidos — provavelmente usam o mesmo insumo' : 'Também encontrados'}
            </div>
            <div style={{ borderRadius: 7, overflow: 'hidden', border: '1px solid var(--linha)' }}>
              {sugestoes.map((s) => (
                <OpcaoMarcavel
                  key={s.chave}
                  marcado={marcadosSug.has(s.chave)}
                  onClick={() => alternarSugestao(s.chave)}
                  style={{ minHeight: 40 }}
                  extra={
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {s.tipo === 'opcao' && <Etiqueta tipo="info">Complemento</Etiqueta>}
                      {s.status === 'UNAVAILABLE' && <Etiqueta tipo="warn">Já pausado</Etiqueta>}
                    </span>
                  }
                >
                  <span style={{ fontWeight: 500 }}>{s.nome}</span>
                </OpcaoMarcavel>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Rotulo>2 · Por quê</Rotulo>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {MOTIVOS_PAUSA.map((m) => (
            <Escolha
              key={m}
              ativo={motivo === m && !motivoLivre}
              onClick={() => {
                setMotivo(motivo === m ? '' : m)
                setMotivoLivre('')
              }}
            >
              {m}
            </Escolha>
          ))}
        </div>
        <input
          className="ds-input"
          value={motivoLivre}
          maxLength={120}
          onChange={(e) => setMotivoLivre(e.target.value)}
          placeholder="Ou escreva o motivo (opcional)"
          style={{ height: 40 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Rotulo>3 · Por quanto tempo</Rotulo>
        <Segmentado
          rotulo="Prazo da pausa"
          valor={prazo}
          onChange={setPrazo}
          altura={44}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
          opcoes={PRAZOS_PAUSA.map((p) => ({ valor: p.chave, rotulo: p.label, cheio: true }))}
        />
        <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>
          {prazo === 'manual'
            ? 'Fica pausado até alguém reativar (em Rupturas ou no próprio cardápio).'
            : `Volta sozinho ao cardápio (${voltaEm(opcaoPrazo)}) — precisa do monitor rodando ou do painel aberto.`}
        </div>
      </div>

      {outrasLojas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Rotulo>4 · Em quais lojas</Rotulo>
          <div style={{ border: '1px solid var(--borda)', borderRadius: 9, overflow: 'hidden' }}>
            {lojaAtual && (
              <OpcaoMarcavel marcado disabled extra={<Etiqueta>{PLATAFORMA_LABEL[lojaAtual.plataforma] || 'iFood'}</Etiqueta>}>
                <span style={{ fontWeight: 500 }}>{lojaAtual.nome}</span>
                <span style={{ color: 'var(--t3)', fontSize: 12.5 }}> · esta loja</span>
              </OpcaoMarcavel>
            )}
            {outrasLojas.map((l) => (
              <OpcaoMarcavel
                key={l.merchant_id}
                marcado={lojasExtras.has(l.merchant_id)}
                onClick={() => alternarLoja(l.merchant_id)}
                extra={<Etiqueta>{PLATAFORMA_LABEL[l.plataforma] || l.plataforma}</Etiqueta>}
              >
                <span style={{ fontWeight: 500 }}>{l.nome}</span>
              </OpcaoMarcavel>
            ))}
          </div>
          {lojasExtras.size > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>
              Acha o mesmo item nas outras lojas pelo código PDV ({comPdv} de {n} escolhidos têm código). Complementos não são replicados.
            </div>
          )}
        </div>
      )}
    </Dialogo>
  )
}
