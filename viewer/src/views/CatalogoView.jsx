import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, ImageOff, MoreHorizontal, Pause, Pencil, Play, RefreshCw, Search, Tag, Trash2, Zap } from 'lucide-react'
import { Botao, CampoBusca, EstadoVazio, Esqueleto, Marcador, MONO, Segmentado, Selo } from '../ds'
import { normalizar, tempoDesde, tempoRestante } from '../pausas'
import { MiniaturaItem } from './DashboardView'

// Mesma grade no cabeçalho e nas linhas. Larguras mínimas somam ~880px: cabe a partir de ~1180px
// de janela com o menu aberto; abaixo disso o celular usa a lista em cartões.
const GRADE = '52px minmax(200px,2.4fr) minmax(90px,1fr) 124px 120px minmax(150px,1.2fr) 156px'

const brl = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function CelulaEditavel({ tipo, texto, editando, valor, salvando, salvo, onAbrir, onInput, onSalvar, onCancelar }) {
  const direita = tipo === 'preco'
  if (editando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: direita ? 'flex-end' : 'flex-start', gap: 3 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            height: 34,
            padding: '0 8px',
            marginLeft: direita ? 0 : -8,
            borderRadius: 7,
            border: '1.5px solid var(--marca-tinta)',
            boxShadow: '0 0 0 3px var(--marca-anel)',
            background: 'var(--card)',
          }}
        >
          {tipo === 'preco' && <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--t3)' }}>R$</span>}
          <input
            autoFocus
            value={valor}
            inputMode={tipo === 'preco' ? 'decimal' : undefined}
            onChange={(e) => onInput(e.target.value)}
            onBlur={onSalvar}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSalvar()
              } else if (e.key === 'Escape') {
                e.stopPropagation()
                onCancelar()
              }
            }}
            aria-label={tipo === 'preco' ? 'Preço' : 'Código PDV'}
            style={{
              width: tipo === 'preco' ? 66 : 96,
              border: 0,
              outline: 0,
              boxShadow: 'none',
              background: 'transparent',
              fontFamily: MONO,
              fontSize: 14,
              color: 'var(--t1)',
              textAlign: direita ? 'right' : 'left',
            }}
          />
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--t3)', marginLeft: direita ? 0 : -8 }}>Enter salva · Esc cancela</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: direita ? 'flex-end' : 'flex-start' }}>
      <button
        type="button"
        onClick={onAbrir}
        title="Clique para editar"
        className="ds-celula-editavel"
        style={{
          fontFamily: MONO,
          fontSize: tipo === 'preco' ? 14 : 13.5,
          fontWeight: tipo === 'preco' ? 500 : 400,
          color: tipo === 'preco' ? 'var(--t1)' : 'var(--t2)',
          background: 'transparent',
          border: '1px solid transparent',
          borderRadius: 7,
          padding: '6px 8px',
          marginLeft: direita ? 0 : -8,
          cursor: 'text',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {texto || '—'}
      </button>
      {(salvando || salvo) && (
        <div style={{ fontSize: 12, color: salvo ? 'var(--good)' : 'var(--t3)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, padding: direita ? '0 8px 0 0' : 0 }}>
          {salvo && <Check size={14} />}
          {salvando ? 'Salvando…' : 'Salvo'}
        </div>
      )}
    </div>
  )
}

function SubStatus({ pausa }) {
  if (!pausa) return <span style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap' }}>pelo portal ou sem motivo</span>
  const r = pausa.volta_em ? tempoRestante(pausa.volta_em) : null
  const prazo = r ? (r.startsWith('em ') ? `volta ${r}` : r) : 'até reativar'
  return (
    <span title={[pausa.motivo, pausa.pausado_por, tempoDesde(pausa.pausado_em)].filter(Boolean).join(' · ')} style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
      {[prazo, pausa.motivo].filter(Boolean).join(' · ')}
    </span>
  )
}

function MenuLinha({ item, podeExcluir, onEditarPreco, onEditarPdv, onEditar, onExcluir, onFechar }) {
  const ref = useRef(null)
  useEffect(() => {
    function fora(e) {
      if (ref.current && !ref.current.contains(e.target)) onFechar()
    }
    function tecla(e) {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('mousedown', fora)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fora)
      document.removeEventListener('keydown', tecla)
    }
  }, [onFechar])
  const opcao = (Icon, texto, acao, perigo = false) => (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onFechar()
        acao()
      }}
      className={perigo ? 'ds-opcao-perigo' : 'ds-opcao'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 38,
        padding: '0 10px',
        borderRadius: 7,
        border: 0,
        background: 'transparent',
        color: perigo ? 'var(--bad)' : 'var(--t1)',
        fontSize: 13.5,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span style={{ color: perigo ? 'var(--bad)' : 'var(--t2)', display: 'flex' }}>
        <Icon size={16} />
      </span>
      {texto}
    </button>
  )
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Ações de ${item.nome}`}
      style={{
        position: 'absolute',
        top: 44,
        right: 12,
        zIndex: 10,
        width: 220,
        background: 'var(--card)',
        border: '1px solid var(--borda)',
        borderRadius: 12,
        boxShadow: 'var(--sh)',
        padding: 6,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {opcao(Pencil, 'Editar preço', onEditarPreco)}
      {opcao(Tag, 'Editar código PDV', onEditarPdv)}
      {opcao(Pencil, 'Editar item completo', onEditar)}
      {podeExcluir && (
        <>
          <div style={{ height: 1, background: 'var(--linha)', margin: '4px 0' }} />
          {opcao(Trash2, 'Excluir item…', onExcluir, true)}
        </>
      )}
    </div>
  )
}

export function CatalogoView({
  itens,
  categoriasFiltro,
  busca,
  onBusca,
  filtroCategoria,
  onFiltroCategoria,
  filtroStatus,
  onFiltroStatus,
  filtrados,
  idsVisiveis,
  todosVisiveisSelecionados,
  selecionados,
  onAlternarSelecao,
  onAlternarSelecaoTodos,
  onLimparSelecao,
  carregando,
  erroCarregamento,
  onRecarregar,
  alterandoStatus,
  onAlternarStatus,
  onAbrirEdicaoModal,
  onExcluirItem,
  podeCriarItem,
  edicaoInline,
  onAbrirEdicaoInline,
  onEdicaoInlineInput,
  onSalvarEdicaoInline,
  onCancelarEdicaoInline,
  linhaSalvando,
  linhaSalva,
  onPausarSelecionados,
  onReativarSelecionados,
  onAbrirInsumo,
  executando,
  pausasPorItem = {},
  plataforma,
}) {
  const [menuAberto, setMenuAberto] = useState(null)
  const temFiltro = busca.trim() !== '' || filtroCategoria !== 'TODAS' || filtroStatus !== 'TODOS'

  // Contagens do segmentado respeitam busca + categoria (o que a pessoa veria ao clicar).
  const termo = normalizar(busca)
  const base = itens.filter(
    (i) => (filtroCategoria === 'TODAS' || i.categoria === filtroCategoria) && (!termo || normalizar(`${i.nome} ${i.codigo_pdv}`).includes(termo)),
  )
  const nDisp = base.filter((i) => i.status === 'AVAILABLE').length

  const selecionadosItens = itens.filter((i) => selecionados.has(i.itemId))
  const selDisp = selecionadosItens.filter((i) => i.status === 'AVAILABLE').length
  const selPaus = selecionadosItens.length - selDisp
  const algunsSelecionados = idsVisiveis.some((id) => selecionados.has(id))

  function limparTudo() {
    onBusca('')
    onFiltroCategoria('TODAS')
    onFiltroStatus('TODOS')
  }

  const cabecalho = (
    <div
      role="row"
      style={{
        display: 'grid',
        gridTemplateColumns: GRADE,
        alignItems: 'center',
        height: 40,
        background: 'var(--card2)',
        borderBottom: '1px solid var(--linha)',
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        color: 'var(--t3)',
        position: 'sticky',
        top: -24,
        zIndex: 3,
      }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={todosVisiveisSelecionados ? true : algunsSelecionados ? 'mixed' : false}
        aria-label="Selecionar todos os itens visíveis"
        onClick={() => onAlternarSelecaoTodos(idsVisiveis)}
        style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 0, background: 'transparent' }}
      >
        <Marcador estado={todosVisiveisSelecionados ? true : algunsSelecionados ? 'parcial' : false} />
      </button>
      <div>Item</div>
      <div>Categoria</div>
      <div>Código PDV</div>
      <div style={{ textAlign: 'right', paddingRight: 8 }}>Preço</div>
      <div style={{ paddingLeft: 16 }}>Status</div>
      <div style={{ textAlign: 'right', paddingRight: 20 }}>Ações</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      <section style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--linha)', flexWrap: 'wrap' }}>
          <CampoBusca
            valor={busca}
            onChange={onBusca}
            onLimpar={() => onBusca('')}
            placeholder="Buscar por nome ou código PDV"
            icone={<Search size={16} />}
            aria-label="Buscar item"
            style={{ flex: '1 1 220px', maxWidth: 360 }}
          />
          <select
            value={filtroCategoria}
            onChange={(e) => onFiltroCategoria(e.target.value)}
            aria-label="Filtrar por categoria"
            className="ds-input"
            style={{ height: 40, width: 'auto', minWidth: 170, maxWidth: 240, cursor: 'pointer' }}
          >
            {categoriasFiltro.map((c) => (
              <option key={c} value={c}>
                {c === 'TODAS' ? 'Todas as categorias' : c}
              </option>
            ))}
          </select>
          <Segmentado
            rotulo="Filtrar por status"
            valor={filtroStatus}
            onChange={onFiltroStatus}
            opcoes={[
              { valor: 'TODOS', rotulo: 'Todos', contagem: base.length },
              { valor: 'AVAILABLE', rotulo: 'Disponíveis', contagem: nDisp },
              { valor: 'UNAVAILABLE', rotulo: 'Pausados', contagem: base.length - nDisp },
            ]}
          />
          <span style={{ flex: 1 }} />
          <Botao variante="secundario" onClick={onAbrirInsumo} title="Acabou um ingrediente? Pausa todos os pratos e complementos que usam ele">
            <span style={{ color: 'var(--warn)', display: 'flex' }}>
              <Zap size={16} />
            </span>
            Pausar por insumo
          </Botao>
        </div>

        {erroCarregamento ? (
          <EstadoVazio
            icone={<AlertTriangle size={22} />}
            tipo="bad"
            titulo="Não deu pra carregar o cardápio"
            texto={erroCarregamento}
            acao={
              <Botao variante="primario" tamanho="lg" onClick={onRecarregar}>
                <RefreshCw size={16} /> Tentar de novo
              </Botao>
            }
          />
        ) : (
          <div role="table" aria-label="Itens do cardápio" aria-rowcount={filtrados.length}>
            {cabecalho}

            {carregando &&
              Array.from({ length: 8 }).map((_, k) => (
                <div key={k} style={{ display: 'grid', gridTemplateColumns: GRADE, alignItems: 'center', minHeight: 64, borderBottom: '1px solid var(--linha)' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Esqueleto w={20} h={20} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Esqueleto w={40} h={40} r={7} />
                    <Esqueleto w={`${40 + ((k * 13) % 30)}%`} h={13} />
                  </div>
                  <Esqueleto w="60%" h={12} />
                  <Esqueleto w={70} h={12} />
                  <Esqueleto w={64} h={12} style={{ marginLeft: 'auto', marginRight: 8 }} />
                  <Esqueleto w={96} h={24} r={99} style={{ marginLeft: 16 }} />
                  <Esqueleto w={100} h={36} r={9} style={{ marginLeft: 'auto', marginRight: 12 }} />
                </div>
              ))}

            {!carregando && filtrados.length === 0 && (
              <EstadoVazio
                icone={<Search size={22} />}
                titulo={temFiltro ? 'Nenhum item encontrado' : 'Nenhum item no cardápio ainda'}
                texto={
                  temFiltro
                    ? busca.trim()
                      ? `Nada bate com “${busca.trim()}” nesse filtro.`
                      : `Existem ${itens.length} itens no cardápio — tire um filtro pra ver.`
                    : 'Assim que a loja tiver itens na plataforma, eles aparecem aqui.'
                }
                acao={
                  temFiltro && (
                    <Botao variante="secundario" tamanho="sm" onClick={limparTudo}>
                      Limpar filtros
                    </Botao>
                  )
                }
              />
            )}

            {!carregando &&
              filtrados.map((item) => {
                const sel = selecionados.has(item.itemId)
                const pausado = item.status !== 'AVAILABLE'
                const ePreco = edicaoInline?.itemId === item.itemId && edicaoInline.campo === 'preco'
                const ePdv = edicaoInline?.itemId === item.itemId && edicaoInline.campo === 'pdv'
                const salvandoPreco = linhaSalvando === `${item.itemId}:preco`
                const salvandoPdv = linhaSalvando === `${item.itemId}:pdv`
                const salvoPreco = linhaSalva === `${item.itemId}:preco`
                const salvoPdv = linhaSalva === `${item.itemId}:pdv`
                const descricao = item.descricao && normalizar(item.descricao) !== normalizar(item.nome) ? item.descricao : ''
                return (
                  <div
                    key={item.itemId}
                    role="row"
                    className={sel ? undefined : 'ds-linha'}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: GRADE,
                      alignItems: 'center',
                      minHeight: 64,
                      borderBottom: '1px solid var(--linha)',
                      background: sel ? 'var(--marca-suave)' : undefined,
                      boxShadow: sel ? 'inset 3px 0 0 var(--marca)' : undefined,
                    }}
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={sel}
                      aria-label={`Selecionar ${item.nome}`}
                      onClick={() => onAlternarSelecao(item.itemId)}
                      style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 0, background: 'transparent' }}
                    >
                      <Marcador estado={sel} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, paddingRight: 12 }}>
                      {item.foto ? (
                        <MiniaturaItem item={item} apagada={pausado} />
                      ) : (
                        <div title="Item sem foto" style={{ width: 40, height: 40, borderRadius: 7, border: '1.5px dashed var(--borda)', background: 'var(--card2)', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ImageOff size={16} />
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => onAbrirEdicaoModal(item)}
                          title={`Editar ${item.nome}`}
                          style={{ display: 'block', maxWidth: '100%', fontSize: 14.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: pausado ? 'var(--t2)' : 'var(--t1)', cursor: 'pointer', border: 0, background: 'transparent', padding: 0, textAlign: 'left' }}
                        >
                          {item.nome}
                        </button>
                        {descricao ? (
                          <div style={{ fontSize: 12.5, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{descricao}</div>
                        ) : (
                          !item.foto && (
                            <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>
                              Sem foto —{' '}
                              <button type="button" onClick={() => onAbrirEdicaoModal(item)} style={{ color: 'var(--marca-tinta)', fontWeight: 600, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', fontSize: 12.5 }}>
                                adicionar
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    <div title={item.categoria} style={{ fontSize: 13.5, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 8 }}>
                      {item.categoria}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <CelulaEditavel
                        tipo="pdv"
                        texto={item.codigo_pdv}
                        editando={ePdv}
                        valor={ePdv ? edicaoInline.valor : ''}
                        salvando={salvandoPdv}
                        salvo={salvoPdv}
                        onAbrir={() => onAbrirEdicaoInline(item, 'pdv')}
                        onInput={onEdicaoInlineInput}
                        onSalvar={onSalvarEdicaoInline}
                        onCancelar={onCancelarEdicaoInline}
                      />
                    </div>

                    <div style={{ paddingRight: 8 }}>
                      <CelulaEditavel
                        tipo="preco"
                        texto={brl(item.preco)}
                        editando={ePreco}
                        valor={ePreco ? edicaoInline.valor : ''}
                        salvando={salvandoPreco}
                        salvo={salvoPreco}
                        onAbrir={() => onAbrirEdicaoInline(item, 'preco')}
                        onInput={onEdicaoInlineInput}
                        onSalvar={onSalvarEdicaoInline}
                        onCancelar={onCancelarEdicaoInline}
                      />
                    </div>

                    <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, minWidth: 0 }}>
                      {pausado ? (
                        <Selo tipo="warn" icone={<Pause size={13} />}>
                          Pausado
                        </Selo>
                      ) : (
                        <Selo tipo="good" icone={<Check size={13} />}>
                          Disponível
                        </Selo>
                      )}
                      {pausado && <SubStatus pausa={pausasPorItem[item.itemId]} />}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, paddingRight: 12, position: 'relative' }}>
                      {pausado ? (
                        <Botao variante="reativar" tamanho="sm" disabled={alterandoStatus === item.itemId || executando} onClick={() => onAlternarStatus(item)} style={{ minWidth: 100 }} aria-label={`Reativar ${item.nome}`}>
                          <Play size={16} />
                          Reativar
                        </Botao>
                      ) : (
                        <Botao variante="pausar" tamanho="sm" disabled={alterandoStatus === item.itemId || executando} onClick={() => onAlternarStatus(item)} style={{ minWidth: 100 }} aria-label={`Pausar ${item.nome}`}>
                          <span style={{ color: 'var(--warn)', display: 'flex' }}>
                            <Pause size={16} />
                          </span>
                          Pausar
                        </Botao>
                      )}
                      <button
                        type="button"
                        aria-label={`Mais ações de ${item.nome}`}
                        aria-haspopup="menu"
                        aria-expanded={menuAberto === item.itemId}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => setMenuAberto(menuAberto === item.itemId ? null : item.itemId)}
                        className="ds-icone"
                        style={{ background: menuAberto === item.itemId ? 'var(--input)' : undefined }}
                      >
                        <MoreHorizontal size={20} />
                      </button>
                      {menuAberto === item.itemId && (
                        <MenuLinha
                          item={item}
                          podeExcluir={podeCriarItem}
                          onFechar={() => setMenuAberto(null)}
                          onEditarPreco={() => onAbrirEdicaoInline(item, 'preco')}
                          onEditarPdv={() => onAbrirEdicaoInline(item, 'pdv')}
                          onEditar={() => onAbrirEdicaoModal(item)}
                          onExcluir={() => onExcluirItem(item)}
                        />
                      )}
                    </div>
                  </div>
                )
              })}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', fontSize: 13, color: 'var(--t3)', flexWrap: 'wrap', gap: 8 }}>
              <span>
                Mostrando {filtrados.length} de {itens.length} {itens.length === 1 ? 'item' : 'itens'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                Cardápio do {plataforma === '99food' ? '99Food' : 'iFood'} · preço e PDV salvam direto na plataforma
                <Botao variante="secundario" tamanho="xs" onClick={onRecarregar} disabled={carregando}>
                  <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
                  Recarregar
                </Botao>
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Barra de seleção: grudada no rodapé da área rolável, centralizada no conteúdo. */}
      <div style={{ position: 'sticky', bottom: 20, display: 'flex', justifyContent: 'center', pointerEvents: 'none', height: 0, zIndex: 5 }}>
        {selecionados.size > 0 && (
          <div
            className="toast-entrada"
            style={{
              pointerEvents: 'auto',
              transform: 'translateY(-100%)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 8px 8px 16px',
              borderRadius: 12,
              background: 'var(--card)',
              border: '1px solid var(--borda)',
              boxShadow: 'var(--sh)',
            }}
          >
            <span style={{ minWidth: 24, height: 24, padding: '0 6px', borderRadius: 99, background: 'var(--marca)', color: 'var(--marca-texto)', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {selecionados.size}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', color: 'var(--t1)' }}>
              {selecionados.size === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
            <Botao variante="fantasma" tamanho="sm" onClick={onLimparSelecao}>
              Limpar
            </Botao>
            <div style={{ width: 1, height: 24, background: 'var(--borda)' }} />
            {selDisp > 0 && (
              <Botao variante="pausar-suave" disabled={executando} onClick={onPausarSelecionados} style={{ height: 38 }}>
                <span style={{ color: 'var(--warn)', display: 'flex' }}>
                  <Pause size={16} />
                </span>
                {selDisp === selecionados.size ? 'Pausar' : `Pausar ${selDisp}`}
              </Botao>
            )}
            {selPaus > 0 && (
              <Botao variante="reativar" disabled={executando} onClick={onReativarSelecionados} style={{ height: 38 }}>
                <Play size={16} />
                {selPaus === selecionados.size ? 'Reativar' : `Reativar ${selPaus}`}
              </Botao>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
