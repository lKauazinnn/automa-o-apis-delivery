import { Check, Clock, ImageOff, Layers, Loader2, Pause, Pencil, Play, Plus, RefreshCw, Search, SearchX, Tag, Trash2, X } from 'lucide-react'
import { Esqueleto, Modal, Pill, Toggle } from '../ui'
import { rotuloVolta } from '../pausas'

// Combo desativado: o payload de COMBO_V2 ainda não foi confirmado contra o iFood (dá 409
// "product already has this option group") e combo não faz parte do checklist de homologação.
// Voltar pra `true` quando o create_combo for consertado.
const COMBO_HABILITADO = false

function CelulaEditavel({ valor, texto, editando, salvando, salvo, tipo, onAbrir, onInput, onSalvar, onCancelar, C, inputStyle, alinhamento = 'left' }) {
  if (editando) {
    return (
      <div className="inline-flex flex-col items-stretch gap-1" style={{ minWidth: 110 }}>
        <input
          autoFocus
          value={valor}
          inputMode={tipo === 'preco' ? 'decimal' : undefined}
          onChange={(e) => onInput(e.target.value)}
          onBlur={onSalvar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSalvar()
            } else if (e.key === 'Escape') {
              onCancelar()
            }
          }}
          className="fonte-mono rounded-lg px-2.5 outline-none w-full"
          style={{
            ...inputStyle,
            height: 36,
            fontSize: 14,
            fontWeight: 600,
            textAlign: alinhamento,
            borderColor: C.marca,
            boxShadow: `0 0 0 3px ${C.marcaAnel}`,
          }}
        />
        <span style={{ color: C.text3, fontSize: 11.5, textAlign: alinhamento }}>Enter salva · Esc cancela</span>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onAbrir}
      title={tipo === 'preco' ? 'Clique pra editar o preço' : 'Clique pra editar o código PDV'}
      className="botao-icone-fantasma rounded-lg px-2 py-1.5 fonte-mono w-full"
      style={{
        color: tipo === 'preco' ? C.text1 : C.text2,
        fontSize: 14,
        fontWeight: tipo === 'preco' ? 600 : 400,
        textAlign: alinhamento,
        cursor: 'text',
        border: `1px solid ${tipo === 'pdv' ? C.cardBorder : 'transparent'}`,
        background: tipo === 'pdv' ? C.inputBg : 'transparent',
      }}
    >
      {texto}
      {(salvando || salvo) && (
        <span
          className="flex items-center gap-1 mt-0.5"
          style={{ color: salvo ? C.good : C.text3, fontSize: 11.5, fontFamily: 'Geist, sans-serif', justifyContent: alinhamento === 'right' ? 'flex-end' : 'flex-start' }}
        >
          {salvo && <Check size={11} strokeWidth={3} />}
          {salvando ? 'Salvando…' : 'Salvo'}
        </span>
      )}
    </button>
  )
}

function LinhaEsqueleto({ C }) {
  return (
    <tr style={{ borderTop: `1px solid ${C.rowBorder}`, height: 60 }}>
      <td className="px-4 text-center"><Esqueleto w={19} h={19} style={{ borderRadius: 6, margin: '0 auto' }} /></td>
      <td className="px-4">
        <div className="flex items-center gap-3">
          <Esqueleto w={40} h={40} style={{ borderRadius: 10 }} />
          <Esqueleto w="58%" h={13} />
        </div>
      </td>
      <td className="px-4"><Esqueleto w="70%" h={12} /></td>
      <td className="px-4"><Esqueleto w={64} h={12} /></td>
      <td className="px-4"><Esqueleto w={72} h={12} style={{ marginLeft: 'auto' }} /></td>
      <td className="px-4"><Esqueleto w={88} h={24} style={{ borderRadius: 999, margin: '0 auto' }} /></td>
      <td className="px-4"><Esqueleto w={110} h={24} style={{ borderRadius: 8, margin: '0 auto' }} /></td>
    </tr>
  )
}

// Pausado com prazo mostra quando volta ("volta 14:30"); o motivo e quem pausou ficam no title.
function SeloStatus({ item, pausa, C }) {
  if (item.status === 'AVAILABLE') {
    return (
      <Pill color={C.good} dot>
        Disponível
      </Pill>
    )
  }
  const dica = pausa
    ? [pausa.motivo, pausa.pausado_por && `pausado por ${pausa.pausado_por}`].filter(Boolean).join(' · ')
    : 'Pausado'
  return (
    <span title={dica} className="inline-flex">
      <Pill color={C.neutral} dot marcador={pausa?.volta_em ? <Clock size={12} className="flex-shrink-0" /> : null}>
        {pausa?.volta_em ? rotuloVolta(pausa.volta_em) : 'Pausado'}
      </Pill>
    </span>
  )
}

export function CatalogoView({
  itens,
  categorias,
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
  itemExcluindo,
  onAbrirCombo,
  totalDisponiveis,
  totalPausados,
  podeCriarItem,
  modalNovoItem,
  onAbrirNovoItem,
  onFecharNovoItem,
  form,
  setForm,
  onCriarItem,
  onSelecionarFoto,
  requisitos,
  formValido,
  salvando,
  erroForm,
  edicaoInline,
  onAbrirEdicaoInline,
  onEdicaoInlineInput,
  onSalvarEdicaoInline,
  onCancelarEdicaoInline,
  linhaSalvando,
  linhaSalva,
  onAbrirAcoesMassa,
  onPausarSelecionados,
  onAbrirInsumo,
  pausasPorItem = {},
  C,
  inputCls,
  inputStyle,
}) {
  const temFiltro = busca.trim() !== '' || filtroCategoria !== 'TODAS' || filtroStatus !== 'TODOS'
  const campoStyle = { ...inputStyle, height: 42, fontSize: 14 }

  function limparTudo() {
    onBusca('')
    onFiltroCategoria('TODAS')
    onFiltroStatus('TODOS')
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden min-w-0 relative flex flex-col"
      style={{ background: C.cardBg, borderColor: C.cardBorder, maxHeight: 'calc(100vh - 122px)' }}
    >
      <div
        className="px-6 py-4 flex items-center justify-between border-b flex-wrap gap-3 flex-shrink-0"
        style={{ borderColor: C.cardBorder }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Tag size={17} color={C.marcaTinta} />
            <h2 className="font-bold" style={{ color: C.text1, fontSize: 15.5, letterSpacing: '-0.01em' }}>
              Itens cadastrados
            </h2>
          </div>
          <Pill color={C.good} dot>{totalDisponiveis} disponíveis</Pill>
          {totalPausados > 0 && <Pill color={C.neutral} dot>{totalPausados} pausados</Pill>}
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="rounded-full px-3 inline-flex items-center"
            style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}`, height: 30, fontSize: 13 }}
          >
            {filtrados.length} de {itens.length}
          </span>
          {COMBO_HABILITADO && podeCriarItem && (
            <button
              type="button"
              onClick={onAbrirCombo}
              className="flex items-center gap-2 font-semibold px-4 rounded-xl"
              style={{ color: C.text1, background: C.inputBg, border: `1px solid ${C.cardBorder}`, height: 40, fontSize: 14 }}
            >
              <Layers size={16} />
              Criar combo
            </button>
          )}
          {podeCriarItem && (
            <button
              type="button"
              onClick={onAbrirNovoItem}
              className="botao-primario flex items-center gap-2 font-semibold px-4 rounded-xl"
              style={{ height: 40, fontSize: 14 }}
            >
              <Plus size={17} strokeWidth={2.4} />
              Adicionar item
            </button>
          )}
        </div>
      </div>

      <div
        className="px-6 py-3.5 border-b flex flex-col md:flex-row gap-2.5 md:items-center flex-shrink-0"
        style={{ borderColor: C.cardBorder }}
      >
        <div className="relative w-full md:max-w-xs">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: C.text3 }} />
          <input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar por nome ou código PDV"
            aria-label="Buscar item"
            className="w-full pl-11 pr-3 rounded-xl outline-none"
            style={campoStyle}
          />
        </div>

        <select
          value={filtroCategoria}
          onChange={(e) => onFiltroCategoria(e.target.value)}
          aria-label="Filtrar por categoria"
          className="px-3 rounded-xl outline-none"
          style={campoStyle}
        >
          {categoriasFiltro.map((c) => (
            <option key={c} value={c}>
              {c === 'TODAS' ? 'Todas as categorias' : c}
            </option>
          ))}
        </select>

        <div
          role="radiogroup"
          aria-label="Filtrar por status"
          className="flex rounded-xl p-1 gap-1"
          style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
        >
          {[
            { valor: 'TODOS', label: 'Todos', cor: null },
            { valor: 'AVAILABLE', label: 'Disponível', cor: C.good },
            { valor: 'UNAVAILABLE', label: 'Pausado', cor: C.neutral },
          ].map((op) => {
            const ativo = filtroStatus === op.valor
            return (
              <button
                key={op.valor}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => onFiltroStatus(op.valor)}
                className="px-3.5 rounded-lg font-semibold inline-flex items-center gap-2"
                style={
                  ativo
                    ? { background: C.card2, color: C.text1, boxShadow: C.shSm, height: 32, fontSize: 13.5 }
                    : { color: C.text2, background: 'transparent', height: 32, fontSize: 13.5 }
                }
              >
                {op.cor && ativo && <span className="w-1.5 h-1.5 rounded-full" style={{ background: op.cor }} />}
                {op.label}
              </button>
            )
          })}
        </div>

        {temFiltro && (
          <button
            type="button"
            onClick={limparTudo}
            className="botao-icone-fantasma inline-flex items-center gap-1.5 px-3 rounded-xl font-semibold"
            style={{ color: C.text3, height: 42, fontSize: 13.5 }}
          >
            <X size={14} />
            Limpar
          </button>
        )}

        <button
          type="button"
          onClick={onAbrirInsumo}
          className="botao-icone-fantasma flex items-center gap-2 px-3.5 rounded-xl font-semibold md:ml-auto"
          style={{ color: C.text2, border: `1px solid ${C.cardBorder}`, height: 42, fontSize: 13.5 }}
          title="Acabou um ingrediente? Pausa todos os pratos e complementos que usam ele"
        >
          <SearchX size={15} />
          Pausar por insumo
        </button>

        <button
          type="button"
          onClick={onRecarregar}
          disabled={carregando}
          className="botao-icone-fantasma flex items-center gap-2 px-3.5 rounded-xl font-semibold disabled:opacity-60"
          style={{ color: C.text2, border: `1px solid ${C.cardBorder}`, height: 42, fontSize: 13.5 }}
        >
          <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
          Recarregar
        </button>
      </div>

      {erroCarregamento && (
        <div className="flex flex-col items-center justify-center text-center gap-2.5 px-6 py-16">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
            style={{ background: C.badBg, border: `1px solid ${C.badBd}`, color: C.bad }}
          >
            <X size={26} />
          </div>
          <p className="font-bold" style={{ color: C.text1, fontSize: 16 }}>
            Não deu pra carregar o cardápio
          </p>
          <p style={{ color: C.text2, fontSize: 13.5, maxWidth: 380, lineHeight: 1.55 }}>
            {erroCarregamento}
          </p>
          <button
            type="button"
            onClick={onRecarregar}
            className="botao-primario flex items-center gap-2 font-semibold px-4 rounded-xl mt-3"
            style={{ height: 42, fontSize: 14 }}
          >
            <RefreshCw size={16} />
            Tentar de novo
          </button>
        </div>
      )}

      {!erroCarregamento && (
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full table-fixed" style={{ borderCollapse: 'collapse' }}>
            <colgroup>
              <col style={{ width: 52 }} />
              <col />
              <col style={{ width: 150 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 158 }} />
            </colgroup>
            <thead>
              <tr
                className="sticky top-0 z-10"
                style={{
                  color: C.text3,
                  background: C.card2,
                  fontSize: 11.5,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                <th className="px-4 text-center font-semibold" style={{ height: 44 }}>
                  <input
                    type="checkbox"
                    checked={todosVisiveisSelecionados}
                    onChange={() => onAlternarSelecaoTodos(idsVisiveis)}
                    aria-label="Selecionar todos os itens visíveis"
                    style={{ width: 17, height: 17, accentColor: C.marca }}
                  />
                </th>
                <th className="px-4 text-left font-semibold">Item</th>
                <th className="px-4 text-left font-semibold">Categoria</th>
                <th className="px-4 text-left font-semibold">Código PDV</th>
                <th className="px-4 text-right font-semibold">Preço</th>
                <th className="px-4 text-center font-semibold">Status</th>
                <th className="px-4 text-center font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {carregando &&
                Array.from({ length: 8 }).map((_, i) => <LinhaEsqueleto key={i} C={C} />)}

              {!carregando && filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-16">
                    <div className="flex flex-col items-center justify-center text-center gap-2.5">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1"
                        style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}`, color: C.text3 }}
                      >
                        <Search size={24} />
                      </div>
                      <p className="font-bold" style={{ color: C.text1, fontSize: 16 }}>
                        {temFiltro ? 'Nada com esses filtros' : 'Nenhum item no cardápio ainda'}
                      </p>
                      <p style={{ color: C.text2, fontSize: 13.5, maxWidth: 360, lineHeight: 1.55 }}>
                        {temFiltro
                          ? `Existem ${itens.length} itens no cardápio. Tire um filtro pra ver.`
                          : 'Assim que a loja tiver itens no iFood, eles aparecem aqui.'}
                      </p>
                      {temFiltro && (
                        <button
                          type="button"
                          onClick={limparTudo}
                          className="botao-primario font-semibold px-4 rounded-xl mt-3"
                          style={{ height: 42, fontSize: 14 }}
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {!carregando &&
                filtrados.map((item) => {
                  const editandoPreco = edicaoInline?.itemId === item.itemId && edicaoInline.campo === 'preco'
                  const editandoPdv = edicaoInline?.itemId === item.itemId && edicaoInline.campo === 'pdv'
                  const estaSalvando = linhaSalvando === item.itemId
                  const foiSalvo = linhaSalva === item.itemId
                  const selecionado = selecionados.has(item.itemId)
                  return (
                    <tr
                      key={item.itemId}
                      style={{
                        height: 60,
                        borderTop: `1px solid ${selecionado ? C.marca + '38' : C.rowBorder}`,
                        background: selecionado ? C.marca + '12' : undefined,
                      }}
                    >
                      <td className="px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={() => onAlternarSelecao(item.itemId)}
                          aria-label={`Selecionar ${item.nome}`}
                          style={{ width: 17, height: 17, accentColor: C.marca }}
                        />
                      </td>
                      <td className="px-4" title={item.nome}>
                        <div className="flex items-center gap-3 min-w-0">
                          {item.foto ? (
                            <img
                              src={item.foto}
                              alt=""
                              loading="lazy"
                              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                              style={{ border: `1px solid ${C.cardBorder}`, background: C.inputBg }}
                              onError={(e) => {
                                e.currentTarget.onerror = null
                                e.currentTarget.style.visibility = 'hidden'
                              }}
                            />
                          ) : (
                            <span
                              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ border: `1px dashed ${C.cardBorder}`, background: C.inputBg, color: C.text3 }}
                            >
                              <ImageOff size={16} />
                            </span>
                          )}
                          <span className="font-semibold truncate" style={{ color: C.text1, fontSize: 14 }}>
                            {item.nome}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 truncate" style={{ color: C.text2, fontSize: 14 }} title={item.categoria}>
                        {item.categoria}
                      </td>
                      <td className="px-4">
                        <CelulaEditavel
                          tipo="pdv"
                          editando={editandoPdv}
                          valor={editandoPdv ? edicaoInline.valor : ''}
                          texto={item.codigo_pdv}
                          salvando={estaSalvando}
                          salvo={foiSalvo}
                          onAbrir={() => onAbrirEdicaoInline(item, 'pdv')}
                          onInput={onEdicaoInlineInput}
                          onSalvar={onSalvarEdicaoInline}
                          onCancelar={onCancelarEdicaoInline}
                          C={C}
                          inputStyle={inputStyle}
                        />
                      </td>
                      <td className="px-4 text-right">
                        <CelulaEditavel
                          tipo="preco"
                          editando={editandoPreco}
                          valor={editandoPreco ? edicaoInline.valor : ''}
                          texto={`R$ ${Number(item.preco).toFixed(2).replace('.', ',')}`}
                          salvando={estaSalvando}
                          salvo={foiSalvo}
                          onAbrir={() => onAbrirEdicaoInline(item, 'preco')}
                          onInput={onEdicaoInlineInput}
                          onSalvar={onSalvarEdicaoInline}
                          onCancelar={onCancelarEdicaoInline}
                          C={C}
                          inputStyle={inputStyle}
                          alinhamento="right"
                        />
                      </td>
                      <td className="px-4 text-center">
                        <SeloStatus item={item} pausa={pausasPorItem[item.itemId]} C={C} />
                      </td>
                      <td className="px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAbrirEdicaoModal(item)}
                            title="Editar item (nome, preço, código PDV, foto, turnos)"
                            aria-label={`Editar ${item.nome}`}
                            className="botao-icone-fantasma inline-flex items-center justify-center w-9 h-9 rounded-lg"
                            style={{ color: C.text2 }}
                          >
                            <Pencil size={15} />
                          </button>
                          <Toggle
                            ligado={item.status === 'AVAILABLE'}
                            disabled={alterandoStatus === item.itemId}
                            onChange={() => onAlternarStatus(item)}
                            titulo={
                              item.status === 'AVAILABLE'
                                ? `Pausar ${item.nome} (some do cardápio no iFood)`
                                : `Despausar ${item.nome} (volta a aparecer no cardápio)`
                            }
                          />
                          {podeCriarItem && (
                            <button
                              type="button"
                              disabled={itemExcluindo === item.itemId}
                              onClick={() => onExcluirItem(item)}
                              title="Excluir item do catálogo"
                              aria-label={`Excluir ${item.nome}`}
                              className="botao-icone-fantasma inline-flex items-center justify-center w-9 h-9 rounded-lg disabled:opacity-40"
                              style={{ color: C.bad }}
                            >
                              {itemExcluindo === item.itemId ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Barra de seleção. Antes era `position: fixed` com `left: calc(50% + 115px)` — um número
          mágico amarrado à largura da sidebar, que saía do lugar assim que a sidebar mudava.
          Agora é absoluta dentro do próprio card, então centraliza sozinha. */}
      {selecionados.size > 0 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-2xl p-2.5 pl-4"
          style={{
            bottom: 24,
            background: C.card2,
            border: `1px solid ${C.modalBorder}`,
            boxShadow: '0 20px 50px -12px rgba(0,0,0,0.7)',
          }}
        >
          <div className="flex items-center gap-2.5 pr-3.5 border-r" style={{ borderColor: C.cardBorder }}>
            <span
              className="rounded-lg font-bold flex items-center justify-center px-2"
              style={{ background: C.marca, color: C.marcaTexto, minWidth: 26, height: 26, fontSize: 13.5 }}
            >
              {selecionados.size}
            </span>
            <span className="font-semibold whitespace-nowrap" style={{ color: C.text1, fontSize: 14 }}>
              {selecionados.size === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
          </div>
          <button
            type="button"
            onClick={onPausarSelecionados}
            className="flex items-center gap-2 px-3.5 rounded-xl font-semibold"
            style={{ background: C.neutralBg, border: `1px solid ${C.neutralBd}`, color: C.neutral, height: 38, fontSize: 13.5 }}
          >
            <Pause size={15} />
            Pausar
          </button>
          <button
            type="button"
            onClick={onAbrirAcoesMassa}
            className="flex items-center gap-2 px-3.5 rounded-xl font-semibold"
            style={{ background: C.goodBg, border: `1px solid ${C.goodBd}`, color: C.good, height: 38, fontSize: 13.5 }}
          >
            <Play size={15} />
            Despausar
          </button>
          <button
            type="button"
            onClick={onLimparSelecao}
            title="Limpar seleção"
            aria-label="Limpar seleção"
            className="botao-icone-fantasma w-9 h-9 rounded-lg inline-flex items-center justify-center"
            style={{ color: C.text3 }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {modalNovoItem && (
        <Modal titulo="Adicionar item ao cardápio" eyebrow="Novo item" onClose={onFecharNovoItem}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onCriarItem()
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <label className="block font-semibold mb-2" style={{ color: C.text2, fontSize: 12.5 }}>
                Nome do item
              </label>
              <input
                autoFocus
                className={inputCls}
                style={{ ...inputStyle, height: 44, fontSize: 14.5 }}
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Picanha Fatiada 400g"
              />
            </div>

            <div>
              <label className="block font-semibold mb-2" style={{ color: C.text2, fontSize: 12.5 }}>
                Categoria
              </label>
              <select
                className={inputCls}
                style={{ ...inputStyle, height: 44, fontSize: 14.5 }}
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                <option value="">Selecione...</option>
                <option value="__NOVA__">+ Criar nova categoria</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {form.categoria === '__NOVA__' && (
              <div>
                <label className="block font-semibold mb-2" style={{ color: C.text2, fontSize: 12.5 }}>
                  Nome da nova categoria
                </label>
                <input
                  className={inputCls}
                  style={{ ...inputStyle, height: 44, fontSize: 14.5 }}
                  type="text"
                  value={form.novaCategoria}
                  onChange={(e) => setForm({ ...form, novaCategoria: e.target.value })}
                  placeholder="Ex: Sobremesas"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3.5 min-w-0">
              <div className="min-w-0">
                <label className="block font-semibold mb-2" style={{ color: C.text2, fontSize: 12.5 }}>
                  Código PDV
                </label>
                <input
                  className={`${inputCls} fonte-mono`}
                  style={{ ...inputStyle, height: 44, fontSize: 14.5 }}
                  type="text"
                  value={form.codigo_pdv}
                  onChange={(e) => setForm({ ...form, codigo_pdv: e.target.value })}
                  placeholder="10452"
                />
              </div>
              <div className="min-w-0">
                <label className="block font-semibold mb-2" style={{ color: C.text2, fontSize: 12.5 }}>
                  Preço (R$)
                </label>
                <input
                  className={`${inputCls} fonte-mono`}
                  style={{ ...inputStyle, height: 44, fontSize: 14.5 }}
                  type="text"
                  inputMode="decimal"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  placeholder="124,90"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2" style={{ color: C.text2, fontSize: 12.5 }}>
                Foto (opcional)
              </label>
              <div className="flex items-center gap-3">
                {form.foto && (
                  <img
                    src={form.foto}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    style={{ border: `1px solid ${C.cardBorder}` }}
                  />
                )}
                <input
                  className={inputCls}
                  style={{ ...inputStyle, fontSize: 13.5, paddingTop: 8, paddingBottom: 8 }}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0]
                    if (arquivo) onSelecionarFoto(arquivo)
                  }}
                />
              </div>
            </div>

            <div
              className="rounded-xl p-4 flex flex-col gap-2.5"
              style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              {requisitos.map((r) => (
                <div
                  key={r.chave}
                  className="flex items-center gap-3"
                  style={{ color: r.ok ? C.text1 : C.text3, fontSize: 13.5 }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={r.ok ? { background: C.good } : { border: `1.5px solid ${C.cardBorder}` }}
                  >
                    {r.ok && <Check size={12} color={C.marcaTexto} strokeWidth={3.2} />}
                  </span>
                  {r.label}
                </div>
              ))}
            </div>

            {erroForm && (
              <p
                className="rounded-xl px-3.5 py-2.5"
                style={{ color: C.bad, background: C.badBg, border: `1px solid ${C.badBd}`, fontSize: 13.5 }}
              >
                {erroForm}
              </p>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onFecharNovoItem}
                className="font-semibold px-4 rounded-xl"
                style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}`, height: 46, fontSize: 14 }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!formValido || salvando}
                className={`flex-1 flex items-center justify-center gap-2 font-semibold px-4 rounded-xl disabled:opacity-40 ${formValido ? 'botao-primario' : ''}`}
                style={
                  formValido
                    ? { height: 46, fontSize: 14.5 }
                    : { height: 46, fontSize: 14.5, background: C.inputBg, color: C.text3, border: `1px solid ${C.cardBorder}` }
                }
              >
                {salvando && <Loader2 size={16} className="animate-spin" />}
                {salvando ? 'Criando...' : 'Criar item'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
