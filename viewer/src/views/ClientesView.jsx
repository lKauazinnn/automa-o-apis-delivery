import { useEffect, useMemo, useState } from 'react'
import { Building2, Loader2, Plus, X } from 'lucide-react'
import { Botao, BotaoIcone, Campo, Dialogo, EstadoVazio, MONO, Rotulo, Selo } from '../ds'

// Multi-cliente (só super admin): cada cliente é uma empresa com as suas lojas; cada pessoa tem um
// papel POR LOJA. Esta tela cria cliente e muda loja de cliente; AcessosDialogo edita as lojas de
// uma pessoa. O mesmo dá pra fazer pela CLI (scripts/gerenciar.py).

const PLATAFORMA_LABEL = { ifood: 'iFood', '99food': '99Food' }
const cartao = { background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 16, boxShadow: 'var(--brilho), var(--sh)' }
const OPCOES_PAPEL = [
  { valor: '', label: 'Sem acesso' },
  { valor: 'operador', label: 'Operador' },
  { valor: 'gerente', label: 'Gerente' },
  { valor: 'administrador', label: 'Administrador' },
]

function slugDe(nome) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Clientes ────────────────────────────────────────────────────────────────────────────────
export function ClientesSecao({ apiFetch, notificar, onMudou }) {
  const [clientes, setClientes] = useState(null)
  const [novoAberto, setNovoAberto] = useState(false)
  const [form, setForm] = useState({ nome: '', slug: '' })
  const [criando, setCriando] = useState(false)
  const [movendo, setMovendo] = useState(null)

  async function carregar() {
    try {
      setClientes(await apiFetch('/clientes'))
    } catch (e) {
      notificar('erro', `Não consegui carregar os clientes: ${e.message}`)
      setClientes([])
    }
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function criar(e) {
    e.preventDefault()
    setCriando(true)
    try {
      const novo = await apiFetch('/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), slug: form.slug || slugDe(form.nome) }),
      })
      setClientes((prev) => [...(prev || []), novo])
      setForm({ nome: '', slug: '' })
      setNovoAberto(false)
      notificar('sucesso', `Cliente "${novo.nome}" criado.`, { sub: 'Mova lojas pra ele aqui e dê acesso às pessoas em Usuários.' })
    } catch (err) {
      notificar('erro', err.message)
    } finally {
      setCriando(false)
    }
  }

  async function mover(loja, clienteId) {
    const destino = clientes.find((c) => c.id === clienteId)
    setMovendo(loja.id)
    try {
      await apiFetch(`/lojas/${loja.id}/cliente`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cliente_id: clienteId }),
      })
      setClientes((prev) =>
        prev.map((c) => ({
          ...c,
          lojas: c.id === clienteId ? [...c.lojas, loja] : c.lojas.filter((l) => l.id !== loja.id),
        })),
      )
      notificar('sucesso', `"${loja.nome}" agora é do cliente ${destino?.nome}.`, { sub: 'Quem já tinha acesso a ela continua tendo — revise em Usuários.' })
      onMudou?.()
    } catch (err) {
      notificar('erro', err.message)
    } finally {
      setMovendo(null)
    }
  }

  if (!clientes) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--t3)', fontSize: 14 }}>
        <Loader2 size={16} className="animate-spin" /> Carregando clientes…
      </div>
    )
  }

  const podeCriar = form.nome.trim().length > 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, color: 'var(--t2)', flex: '1 1 320px' }}>
          Cada cliente é uma empresa com as suas lojas. Quem só tem acesso às lojas de um cliente nunca vê os dados de outro.
        </span>
        {!novoAberto && (
          <Botao variante="primario" onClick={() => setNovoAberto(true)}>
            <Plus size={16} /> Novo cliente
          </Botao>
        )}
      </div>

      {novoAberto && (
        <section style={{ ...cartao, borderColor: 'var(--marca-borda)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderBottom: '1px solid var(--linha)' }}>
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>Novo cliente</h3>
            <BotaoIcone rotulo="Fechar" tamanho={32} onClick={() => setNovoAberto(false)}>
              <X size={16} />
            </BotaoIcone>
          </div>
          <form onSubmit={criar} style={{ padding: '16px 20px', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Campo rotulo="Nome da empresa" style={{ flex: '1 1 240px' }}>
              <input required autoFocus className="ds-input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Grupo Burger X" />
            </Campo>
            <Campo rotulo="Identificador do link" dica={`Login com a marca dele: ?cliente=${form.slug || slugDe(form.nome) || '…'}`} style={{ flex: '1 1 200px' }}>
              <input className="ds-input" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugDe(e.target.value) })} placeholder={slugDe(form.nome) || 'burger-x'} style={{ fontFamily: MONO }} />
            </Campo>
            <Botao type="submit" variante="primario" tamanho="lg" disabled={criando || !podeCriar}>
              {criando && <Loader2 size={16} className="animate-spin" />}
              {criando ? 'Criando…' : 'Criar cliente'}
            </Botao>
          </form>
        </section>
      )}

      {clientes.map((c) => (
        <section key={c.id} style={{ ...cartao, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--linha)', flexWrap: 'wrap' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--marca-suave)', color: 'var(--marca-tinta)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Building2 size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--t1)' }}>{c.nome}</div>
              <div style={{ fontSize: 12.5, color: 'var(--t3)', fontFamily: MONO }}>?cliente={c.slug}</div>
            </div>
            <Selo tipo="neutro">
              {c.lojas.length} {c.lojas.length === 1 ? 'loja' : 'lojas'}
            </Selo>
          </div>
          {c.lojas.length === 0 ? (
            <EstadoVazio compacto titulo="Nenhuma loja ainda" texto="Mova uma loja de outro cliente pra cá, ou cadastre em Lojas com este cliente ativo." />
          ) : (
            c.lojas.map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 54, padding: '6px 20px', borderBottom: '1px solid var(--linha)', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: MONO }}>{l.merchant_id}</div>
                </div>
                <Selo tipo="neutro" altura={22} style={{ fontSize: 12 }}>
                  {PLATAFORMA_LABEL[l.plataforma] || l.plataforma}
                </Selo>
                {clientes.length > 1 && (
                  <select
                    value={c.id}
                    disabled={movendo === l.id}
                    onChange={(e) => mover(l, e.target.value)}
                    className="ds-input"
                    style={{ height: 34, width: 190, background: 'var(--card)', cursor: 'pointer' }}
                    aria-label={`Cliente da loja ${l.nome}`}
                    title="Mover para outro cliente"
                  >
                    {clientes.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id === c.id ? `Cliente: ${o.nome}` : `Mover para ${o.nome}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))
          )}
        </section>
      ))}
    </div>
  )
}

// ── Acessos de uma pessoa ───────────────────────────────────────────────────────────────────
// Lojas agrupadas por cliente, com o papel em cada uma (ou "sem acesso"). O seletor do cabeçalho
// de cada cliente aplica o mesmo papel em todas as lojas dele.
export function AcessosDialogo({ usuario, apiFetch, notificar, onClose, onSalvo }) {
  const [clientes, setClientes] = useState(null)
  const [papeis, setPapeis] = useState({}) // loja_id -> papel
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    Promise.all([apiFetch('/clientes'), apiFetch(`/usuarios/${usuario.id}/acessos`)])
      .then(([cs, acessos]) => {
        setClientes(cs)
        setPapeis(Object.fromEntries(acessos.map((a) => [a.loja_id, a.papel])))
      })
      .catch((e) => {
        notificar('erro', `Não consegui carregar os acessos: ${e.message}`)
        onClose()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.id])

  const total = useMemo(() => Object.values(papeis).filter(Boolean).length, [papeis])

  function definir(lojas, papel) {
    setPapeis((prev) => {
      const novo = { ...prev }
      lojas.forEach((l) => (papel ? (novo[l.id] = papel) : delete novo[l.id]))
      return novo
    })
  }

  async function salvar() {
    setSalvando(true)
    try {
      await apiFetch(`/usuarios/${usuario.id}/acessos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: usuario.nome, acessos: Object.entries(papeis).map(([loja_id, papel]) => ({ loja_id, papel })) }),
      })
      notificar('sucesso', `Acessos de ${usuario.nome} salvos.`, { sub: `${total} ${total === 1 ? 'loja' : 'lojas'}. Vale no próximo carregamento do painel dela.` })
      onSalvo?.()
      onClose()
    } catch (e) {
      notificar('erro', e.message)
    } finally {
      setSalvando(false)
    }
  }

  const select = (valor, onChange, rotulo, extra = {}) => (
    <select value={valor} onChange={(e) => onChange(e.target.value)} className="ds-input" aria-label={rotulo} style={{ height: 34, width: 160, background: 'var(--card)', cursor: 'pointer', flexShrink: 0, ...extra }}>
      {OPCOES_PAPEL.map((p) => (
        <option key={p.valor} value={p.valor}>
          {p.label}
        </option>
      ))}
    </select>
  )

  return (
    <Dialogo
      largura={680}
      eyebrow="Acessos"
      titulo={usuario.nome}
      descricao={usuario.super_admin ? 'Super admin: já vê todas as lojas como administrador, independente do que estiver aqui.' : 'Escolha as lojas que esta pessoa vê e o papel dela em cada uma.'}
      onClose={onClose}
      rodape={
        <>
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            {total} {total === 1 ? 'loja' : 'lojas'} com acesso
          </span>
          <span style={{ flex: 1 }} />
          <Botao variante="secundario" tamanho="lg" onClick={onClose}>
            Cancelar
          </Botao>
          <Botao variante="primario" tamanho="lg" disabled={!clientes || salvando} onClick={salvar}>
            {salvando && <Loader2 size={16} className="animate-spin" />}
            {salvando ? 'Salvando…' : 'Salvar acessos'}
          </Botao>
        </>
      }
    >
      {!clientes ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--t3)', fontSize: 14 }}>
          <Loader2 size={16} className="animate-spin" /> Carregando lojas…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {clientes.map((c) => {
            const usados = new Set(c.lojas.map((l) => papeis[l.id] || ''))
            const todos = usados.size === 1 ? [...usados][0] : null
            return (
              <div key={c.id} style={{ border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--card2)', borderBottom: '1px solid var(--linha)' }}>
                  <Rotulo style={{ flex: 1 }}>
                    {c.nome} · {c.lojas.length} {c.lojas.length === 1 ? 'loja' : 'lojas'}
                  </Rotulo>
                  {c.lojas.length > 1 && (
                    <>
                      <span style={{ fontSize: 12.5, color: 'var(--t3)' }}>Em todas:</span>
                      {todos === null ? (
                        <select value="" onChange={(e) => definir(c.lojas, e.target.value === '-' ? '' : e.target.value)} className="ds-input" aria-label={`Papel em todas as lojas de ${c.nome}`} style={{ height: 34, width: 160, background: 'var(--card)', cursor: 'pointer' }}>
                          <option value="">Misto</option>
                          {OPCOES_PAPEL.map((p) => (
                            <option key={p.valor || '-'} value={p.valor || '-'}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        select(todos, (v) => definir(c.lojas, v), `Papel em todas as lojas de ${c.nome}`)
                      )}
                    </>
                  )}
                </div>
                {c.lojas.map((l, k) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', minHeight: 46, borderTop: k ? '1px solid var(--linha)' : 0 }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: papeis[l.id] ? 'var(--t1)' : 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--t3)', flexShrink: 0 }}>{PLATAFORMA_LABEL[l.plataforma] || l.plataforma}</span>
                    {select(papeis[l.id] || '', (v) => definir([l], v), `Papel em ${l.nome}`)}
                  </div>
                ))}
                {c.lojas.length === 0 && <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--t3)' }}>Sem lojas.</div>}
              </div>
            )
          })}
        </div>
      )}
    </Dialogo>
  )
}
