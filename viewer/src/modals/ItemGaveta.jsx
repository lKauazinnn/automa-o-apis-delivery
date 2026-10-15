import { Check, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Botao, Campo, Etiqueta, Gaveta, Interruptor, MONO, Rotulo } from '../ds'

const DIAS = [
  ['monday', 'Seg'],
  ['tuesday', 'Ter'],
  ['wednesday', 'Qua'],
  ['thursday', 'Qui'],
  ['friday', 'Sex'],
  ['saturday', 'Sáb'],
  ['sunday', 'Dom'],
]

function CampoFoto({ src, onArquivo, desabilitado, aviso }) {
  return (
    <label
      title={aviso || 'Enviar foto (JPG ou PNG, até 5 MB)'}
      style={{
        width: 112,
        height: 112,
        flexShrink: 0,
        borderRadius: 12,
        border: src ? '1px solid var(--borda)' : '1.5px dashed var(--borda)',
        background: 'var(--card2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        color: 'var(--t3)',
        cursor: desabilitado ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        fontSize: 12.5,
        fontWeight: 600,
        textAlign: 'center',
        position: 'relative',
      }}
    >
      {src ? (
        <img src={src} alt="Foto do item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <>
          <ImagePlus size={22} />
          <span>Enviar foto</span>
        </>
      )}
      <input
        type="file"
        accept="image/png,image/jpeg"
        disabled={desabilitado}
        onChange={(e) => {
          const arquivo = e.target.files?.[0]
          if (arquivo) onArquivo(arquivo)
          e.target.value = ''
        }}
        style={{ display: 'none' }}
      />
    </label>
  )
}

// Editar um item que já existe. Nome/preço/PDV/foto salvam juntos ("Salvar"); o turno é outra
// chamada no iFood, então tem o próprio botão dentro do bloco.
export function ItemEditarGaveta({ estado, setEstado, plataforma, salvando, salvandoTurno, podeExcluir, onSalvar, onSalvarTurno, onFoto, onExcluir, onClose }) {
  const { item } = estado
  const eh99 = plataforma === '99food'
  const set = (campo) => (e) => setEstado((prev) => (prev ? { ...prev, [campo]: e.target.value } : prev))

  return (
    <Gaveta
      eyebrow="Editar item"
      titulo={item.nome}
      onClose={onClose}
      rodape={
        <>
          {podeExcluir && (
            <Botao variante="perigo-fantasma" tamanho="lg" onClick={onExcluir}>
              <Trash2 size={16} /> Excluir
            </Botao>
          )}
          <span style={{ flex: 1 }} />
          <Botao variante="secundario" tamanho="lg" onClick={onClose}>
            Cancelar
          </Botao>
          <Botao variante="primario" tamanho="lg" disabled={salvando} onClick={onSalvar}>
            {salvando && <Loader2 size={16} className="animate-spin" />}
            {salvando ? 'Salvando…' : 'Salvar'}
          </Botao>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <CampoFoto
          src={estado.fotoNova || estado.foto}
          onArquivo={onFoto}
          desabilitado={eh99}
          aviso={eh99 ? 'Foto ainda não é suportada no 99Food por aqui' : undefined}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <Campo rotulo="Nome">
            <input className="ds-input" value={estado.nome} onChange={set('nome')} />
          </Campo>
          <Campo rotulo="Categoria">
            <input className="ds-input" value={item.categoria || ''} disabled style={{ color: 'var(--t2)' }} title="Pra mover de categoria, use o portal da plataforma" />
          </Campo>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Campo rotulo="Preço">
          <div className="ds-campo" style={{ height: 42 }}>
            <span style={{ fontFamily: MONO, color: 'var(--t3)' }}>R$</span>
            <input value={estado.preco} onChange={set('preco')} inputMode="decimal" placeholder="0,00" style={{ fontFamily: MONO, textAlign: 'right' }} />
          </div>
        </Campo>
        <Campo rotulo="Código PDV">
          <input className="ds-input" value={estado.codigoPdv} onChange={set('codigoPdv')} style={{ fontFamily: MONO }} />
        </Campo>
      </div>

      {!eh99 && (
        <div style={{ border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--card)' }}>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>Vender só em um turno</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--t2)', marginTop: 2 }}>ex.: executivos só no almoço de segunda a sexta</span>
            </span>
            <Interruptor
              ligado={estado.turnoAtivo}
              rotulo="Vender só em um turno"
              onChange={() => setEstado((prev) => (prev ? { ...prev, turnoAtivo: !prev.turnoAtivo } : prev))}
            />
          </div>
          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--linha)', background: 'var(--card2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {estado.turnoAtivo ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="time" value={estado.turnoInicio} onChange={set('turnoInicio')} className="ds-input" style={{ width: 'auto', height: 40, background: 'var(--card)', fontFamily: MONO }} aria-label="Início do turno" />
                  <span style={{ color: 'var(--t3)' }}>até</span>
                  <input type="time" value={estado.turnoFim} onChange={set('turnoFim')} className="ds-input" style={{ width: 'auto', height: 40, background: 'var(--card)', fontFamily: MONO }} aria-label="Fim do turno" />
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DIAS.map(([chave, label]) => {
                    const on = estado.turnoDias.has(chave)
                    return (
                      <button
                        key={chave}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setEstado((prev) => {
                            if (!prev) return prev
                            const novo = new Set(prev.turnoDias)
                            if (novo.has(chave)) novo.delete(chave)
                            else novo.add(chave)
                            return { ...prev, turnoDias: novo }
                          })
                        }
                        style={{
                          width: 48,
                          height: 38,
                          borderRadius: 9,
                          border: `1px solid ${on ? 'var(--marca-tinta)' : 'var(--borda)'}`,
                          background: on ? 'var(--marca-suave)' : 'var(--card)',
                          color: on ? 'var(--t1)' : 'var(--t2)',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--t2)' }}>Desligado: o item fica à venda em todo o horário da loja.</span>
            )}
            <div>
              <Botao variante="secundario" tamanho="sm" disabled={salvandoTurno} onClick={onSalvarTurno}>
                {salvandoTurno && <Loader2 size={14} className="animate-spin" />}
                {salvandoTurno ? 'Salvando turno…' : 'Salvar turno'}
              </Botao>
            </div>
          </div>
        </div>
      )}
    </Gaveta>
  )
}

// Criar item novo. Combo fica visível como "em breve" (COMBO_HABILITADO = false no código).
export function ItemNovoGaveta({ form, setForm, categorias, requisitos, formValido, salvando, erro, onFoto, onCriar, onClose }) {
  const set = (campo) => (e) => setForm({ ...form, [campo]: e.target.value })
  return (
    <Gaveta
      eyebrow="Novo item"
      titulo="Adicionar ao cardápio"
      onClose={onClose}
      rodape={
        <>
          <span style={{ flex: 1 }} />
          <Botao variante="secundario" tamanho="lg" onClick={onClose}>
            Cancelar
          </Botao>
          <Botao variante="primario" tamanho="lg" disabled={!formValido || salvando} onClick={onCriar}>
            {salvando && <Loader2 size={16} className="animate-spin" />}
            {salvando ? 'Criando…' : 'Criar item'}
          </Botao>
        </>
      }
    >
      <div role="radiogroup" aria-label="Tipo" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 3, borderRadius: 9, background: 'var(--input)', border: '1px solid var(--borda)', gap: 2 }}>
        <button type="button" role="radio" aria-checked="true" style={{ height: 36, borderRadius: 7, border: 0, background: 'var(--card)', boxShadow: 'var(--sh-sm)', color: 'var(--t1)', fontSize: 13.5, fontWeight: 600 }}>
          Item
        </button>
        <button
          type="button"
          role="radio"
          aria-checked="false"
          disabled
          title="Combo ainda não está liberado"
          style={{ height: 36, borderRadius: 7, border: 0, background: 'transparent', color: 'var(--t3)', fontSize: 13.5, fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          Combo <Etiqueta style={{ background: 'var(--card)' }}>em breve</Etiqueta>
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <CampoFoto src={form.foto} onArquivo={onFoto} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          <Campo rotulo="Nome">
            <input autoFocus className="ds-input" value={form.nome} onChange={set('nome')} placeholder="ex.: Exec Fraldinha" />
          </Campo>
          <Campo rotulo="Categoria">
            <select className="ds-input" value={form.categoria} onChange={set('categoria')}>
              <option value="">Selecione…</option>
              <option value="__NOVA__">+ Criar nova categoria</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </div>

      {form.categoria === '__NOVA__' && (
        <Campo rotulo="Nome da nova categoria">
          <input className="ds-input" value={form.novaCategoria} onChange={set('novaCategoria')} placeholder="ex.: Sobremesas" />
        </Campo>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Campo rotulo="Preço">
          <div className="ds-campo" style={{ height: 42 }}>
            <span style={{ fontFamily: MONO, color: 'var(--t3)' }}>R$</span>
            <input value={form.preco} onChange={set('preco')} inputMode="decimal" placeholder="0,00" style={{ fontFamily: MONO, textAlign: 'right' }} />
          </div>
        </Campo>
        <Campo rotulo="Código PDV">
          <input className="ds-input" value={form.codigo_pdv} onChange={set('codigo_pdv')} placeholder="ex.: 20041" style={{ fontFamily: MONO }} />
        </Campo>
      </div>

      <div style={{ border: '1px solid var(--borda)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--card2)' }}>
        <Rotulo>Para publicar</Rotulo>
        {requisitos.map((r) => (
          <div key={r.chave} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: r.ok ? 'var(--t1)' : 'var(--t3)' }}>
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: 99,
                border: `1.5px solid ${r.ok ? 'var(--good)' : 'var(--borda)'}`,
                background: r.ok ? 'var(--good)' : 'transparent',
                color: 'var(--card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {r.ok && <Check size={13} strokeWidth={3} />}
            </span>
            {r.label}
          </div>
        ))}
      </div>

      {erro && (
        <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bad-bg)', border: '1px solid var(--bad-bd)', fontSize: 13.5, color: 'var(--t1)' }}>
          {erro}
        </div>
      )}
    </Gaveta>
  )
}
