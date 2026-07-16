import { Check, Layers, Loader2, Pause, Pencil, Play, Plus, RefreshCw, Search, Tag, Trash2, X } from 'lucide-react'
import { Modal, Pill } from '../ui'

function CelulaEditavel({ valor, texto, editando, salvando, salvo, tipo, onAbrir, onInput, onSalvar, onCancelar, C, inputCls, inputStyle, alinhamento = 'left' }) {
  if (editando) {
    return (
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
        className={`${inputCls} py-1.5`}
        style={{ ...inputStyle, textAlign: alinhamento, fontFamily: tipo === 'preco' ? 'monospace' : undefined }}
      />
    )
  }
  const estiloChip =
    tipo === 'pdv'
      ? { background: C.inputBg, border: `1px solid ${C.cardBorder}` }
      : { background: 'transparent', border: '1px solid transparent' }

  return (
    <button
      type="button"
      onClick={onAbrir}
      title={tipo === 'preco' ? 'Editar preço' : 'Editar código PDV'}
      className="rounded-lg px-2 py-1 font-mono text-xs w-full botao-icone-fantasma"
      style={{ color: tipo === 'preco' ? C.text1 : C.text2, textAlign: alinhamento, cursor: 'text', ...estiloChip }}
    >
      {texto}
      {(salvando || salvo) && (
        <span className="block text-[10px] font-sans mt-0.5" style={{ color: salvo ? C.good : C.text2 }}>
          {salvando ? 'Salvando…' : '✓ Salvo'}
        </span>
      )}
    </button>
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
  C,
  inputCls,
  inputStyle,
}) {
  return (
    <div className="rounded-2xl border overflow-hidden min-w-0" style={{ background: C.cardBg, borderColor: C.cardBorder }}>
      <div className="px-6 py-4 flex items-center justify-between border-b flex-wrap gap-3" style={{ borderColor: C.cardBorder }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Tag size={15} color="#F56C35" />
            <h2 className="text-sm font-bold" style={{ color: C.text1 }}>
              Itens cadastrados
            </h2>
          </div>
          <Pill color={C.good} dot>{totalDisponiveis} disp.</Pill>
          <Pill color={C.neutral} dot>{totalPausados} pausados</Pill>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className="text-[11px] px-2.5 py-1 rounded-full"
            style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
          >
            {filtrados.length} de {itens.length} itens
          </span>
          {podeCriarItem && (
            <button
              type="button"
              onClick={onAbrirCombo}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl"
              style={{ color: C.text1, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              <Layers size={14} />
              Criar combo
            </button>
          )}
          {podeCriarItem && (
            <button
              type="button"
              onClick={onAbrirNovoItem}
              className="botao-primario flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl"
            >
              <Plus size={14} />
              Adicionar item
            </button>
          )}
        </div>
      </div>

      <div className="px-6 py-3.5 border-b flex flex-col md:flex-row gap-2 md:items-center" style={{ borderColor: C.cardBorder }}>
        <div className="relative w-full md:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.text2 }} />
          <input
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Buscar por nome ou código PDV"
            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs"
            style={inputStyle}
          />
        </div>

        <select value={filtroCategoria} onChange={(e) => onFiltroCategoria(e.target.value)} className="px-3 py-2 rounded-lg text-xs" style={inputStyle}>
          {categoriasFiltro.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}>
          {[
            { valor: 'TODOS', label: 'Todos' },
            { valor: 'AVAILABLE', label: 'Disponível' },
            { valor: 'UNAVAILABLE', label: 'Pausado' },
          ].map((op) => (
            <button
              key={op.valor}
              type="button"
              onClick={() => onFiltroStatus(op.valor)}
              className="text-xs px-3 py-1.5 rounded-md font-semibold"
              style={
                filtroStatus === op.valor
                  ? { background: C.cardBg, color: C.text1, boxShadow: C.shSm }
                  : { color: C.text2, background: 'transparent' }
              }
            >
              {op.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onRecarregar}
          disabled={carregando}
          className="botao-icone-fantasma flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold md:ml-auto disabled:opacity-60"
          style={{ color: C.text2, border: `1px solid ${C.cardBorder}` }}
        >
          <RefreshCw size={12} className={carregando ? 'animate-spin' : ''} />
          Recarregar
        </button>
      </div>

      {erroCarregamento && (
        <p className="px-6 py-8 text-center text-xs" style={{ color: '#ef4444' }}>
          {erroCarregamento}
        </p>
      )}

      {!erroCarregamento && (
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 290px)' }}>
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col className="w-[4%]" />
              <col className="w-[25%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead>
              <tr className="text-[10px] uppercase tracking-wider border-b sticky top-0" style={{ color: C.text3, borderColor: C.cardBorder, background: C.cardBg }}>
                <th className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={todosVisiveisSelecionados}
                    onChange={() => onAlternarSelecaoTodos(idsVisiveis)}
                    aria-label="Selecionar todos os itens visíveis"
                  />
                </th>
                <th className="px-3 py-3 text-left">Item</th>
                <th className="px-3 py-3 text-left">Categoria</th>
                <th className="px-3 py-3 text-left">Código PDV</th>
                <th className="px-3 py-3 text-right">Preço</th>
                <th className="px-3 py-3 text-center">Status</th>
                <th className="px-3 py-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={7} className="px-3 py-10 text-center text-xs" style={{ color: C.text2 }}>
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" />
                      Carregando catálogo...
                    </div>
                  </td>
                </tr>
              )}

              {!carregando && filtrados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-xs" style={{ color: C.text2 }}>
                    Nenhum item encontrado com esses filtros.
                  </td>
                </tr>
              )}

              {!carregando &&
                filtrados.map((item) => {
                  const editandoPreco = edicaoInline?.itemId === item.itemId && edicaoInline.campo === 'preco'
                  const editandoPdv = edicaoInline?.itemId === item.itemId && edicaoInline.campo === 'pdv'
                  const estaSalvando = linhaSalvando === item.itemId
                  const foiSalvo = linhaSalva === item.itemId
                  return (
                    <tr
                      key={item.itemId}
                      className="border-t"
                      style={{ borderColor: C.rowBorder, background: selecionados.has(item.itemId) ? 'rgba(245,108,53,0.06)' : undefined }}
                    >
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selecionados.has(item.itemId)}
                          onChange={() => onAlternarSelecao(item.itemId)}
                          aria-label={`Selecionar ${item.nome}`}
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold truncate" style={{ color: C.text1 }} title={item.nome}>
                        {item.nome}
                      </td>
                      <td className="px-3 py-3 text-xs truncate" style={{ color: C.text2 }} title={item.categoria}>
                        {item.categoria}
                      </td>
                      <td className="px-3 py-3">
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
                          inputCls={inputCls}
                          inputStyle={inputStyle}
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <CelulaEditavel
                          tipo="preco"
                          editando={editandoPreco}
                          valor={editandoPreco ? edicaoInline.valor : ''}
                          texto={`R$ ${Number(item.preco).toFixed(2)}`}
                          salvando={estaSalvando}
                          salvo={foiSalvo}
                          onAbrir={() => onAbrirEdicaoInline(item, 'preco')}
                          onInput={onEdicaoInlineInput}
                          onSalvar={onSalvarEdicaoInline}
                          onCancelar={onCancelarEdicaoInline}
                          C={C}
                          inputCls={inputCls}
                          inputStyle={inputStyle}
                          alinhamento="right"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Pill color={item.status === 'AVAILABLE' ? C.good : C.neutral} dot>
                          {item.status === 'AVAILABLE' ? 'Disponível' : 'Pausado'}
                        </Pill>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onAbrirEdicaoModal(item)}
                            title="Editar preço e código PDV"
                            className="botao-icone-fantasma inline-flex items-center justify-center w-7 h-7 rounded-lg"
                            style={{ color: C.text2 }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            disabled={alterandoStatus === item.itemId}
                            onClick={() => onAlternarStatus(item)}
                            title={item.status === 'AVAILABLE' ? 'Pausar item (some do cardápio no iFood)' : 'Despausar item (volta a aparecer no cardápio)'}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg disabled:opacity-40"
                            style={
                              item.status === 'AVAILABLE'
                                ? { background: C.neutralBg, border: `1px solid ${C.neutralBd}`, color: C.neutral }
                                : { background: C.goodBg, border: `1px solid ${C.goodBd}`, color: C.good }
                            }
                          >
                            {item.status === 'AVAILABLE' ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                          {podeCriarItem && (
                            <button
                              type="button"
                              disabled={itemExcluindo === item.itemId}
                              onClick={() => onExcluirItem(item)}
                              title="Excluir item do catálogo"
                              className="botao-icone-fantasma inline-flex items-center justify-center w-7 h-7 rounded-lg disabled:opacity-40"
                              style={{ color: C.bad }}
                            >
                              {itemExcluindo === item.itemId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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

      {selecionados.size > 0 && (
        <div
          className="fixed bottom-6 z-30 flex items-center gap-1.5 rounded-2xl p-2 pl-4"
          style={{
            left: 'calc(50% + 115px)',
            transform: 'translateX(-50%)',
            background: C.cardBg,
            border: `1px solid ${C.cardBorder}`,
            boxShadow: '0 20px 50px -12px rgba(0,0,0,0.6)',
          }}
        >
          <div className="flex items-center gap-2.5 pr-3.5 border-r" style={{ borderColor: C.cardBorder }}>
            <span
              className="w-6 h-6 rounded-lg text-white text-xs font-bold flex items-center justify-center"
              style={{ background: '#F56C35' }}
            >
              {selecionados.size}
            </span>
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: C.text1 }}>
              {selecionados.size === 1 ? 'item selecionado' : 'itens selecionados'}
            </span>
          </div>
          <button
            type="button"
            onClick={onAbrirAcoesMassa}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
            style={{ background: C.neutralBg, border: `1px solid ${C.neutralBd}`, color: C.neutral }}
          >
            <Pause size={13} />
            Pausar
          </button>
          <button
            type="button"
            onClick={onAbrirAcoesMassa}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold"
            style={{ background: C.goodBg, border: `1px solid ${C.goodBd}`, color: C.good }}
          >
            <Play size={13} />
            Despausar
          </button>
          <button
            type="button"
            onClick={onLimparSelecao}
            title="Limpar seleção"
            className="botao-icone-fantasma w-8 h-8 rounded-lg inline-flex items-center justify-center"
            style={{ color: C.text3 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {modalNovoItem && (
        <Modal titulo="Adicionar item ao catálogo" eyebrow="Novo material" onClose={onFecharNovoItem}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              onCriarItem()
            }}
            className="flex flex-col gap-3.5"
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                Nome do material
              </label>
              <input
                autoFocus
                className={inputCls}
                style={inputStyle}
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Coca-Cola 350ml"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                Categoria
              </label>
              <select className={inputCls} style={inputStyle} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
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
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                  Nome da nova categoria
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="text"
                  value={form.novaCategoria}
                  onChange={(e) => setForm({ ...form, novaCategoria: e.target.value })}
                  placeholder="Ex: Sobremesas"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 min-w-0">
              <div className="min-w-0">
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                  Código PDV
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="text"
                  value={form.codigo_pdv}
                  onChange={(e) => setForm({ ...form, codigo_pdv: e.target.value })}
                  placeholder="10452"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: C.text2 }}>
                  Preço (R$)
                </label>
                <input
                  className={inputCls}
                  style={inputStyle}
                  type="text"
                  inputMode="decimal"
                  value={form.preco}
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  placeholder="12,90"
                />
              </div>
            </div>

            <div className="rounded-xl p-3.5 flex flex-col gap-2" style={{ background: C.inputBg, border: `1px solid ${C.cardBorder}` }}>
              {requisitos.map((r) => (
                <div key={r.chave} className="flex items-center gap-2.5 text-xs" style={{ color: r.ok ? C.text1 : C.text3 }}>
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={r.ok ? { background: '#F56C35' } : { border: `1.5px solid ${C.cardBorder}` }}
                  >
                    {r.ok && <Check size={11} color="#fff" strokeWidth={3} />}
                  </span>
                  {r.label}
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={!formValido || salvando}
                className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-3 rounded-xl disabled:opacity-40 transition-all ${formValido ? 'botao-primario' : ''}`}
                style={formValido ? {} : { background: C.inputBg, color: C.text2, border: `1px solid ${C.cardBorder}` }}
              >
                {salvando && <Loader2 size={14} className="animate-spin" />}
                {salvando ? 'Criando...' : 'Criar item'}
              </button>
              <button
                type="button"
                onClick={onFecharNovoItem}
                className="text-xs font-semibold px-3.5 py-2.5 rounded-xl"
                style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
              >
                Cancelar
              </button>
            </div>

            {erroForm && (
              <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                {erroForm}
              </p>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}
