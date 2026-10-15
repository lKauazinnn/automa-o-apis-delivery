import { useContext, useState } from 'react'
import { AlertTriangle, Check, ImagePlus, KeyRound, Loader2, Plus, Search, Store, Trash2, X } from 'lucide-react'
import { Botao, BotaoIcone, CampoBusca, Campo, EstadoVazio, Etiqueta, MONO, Rotulo, Selo, useLarguraConteudo } from '../ds'
import { SimboloPausaFast } from '../Logo'
import { contraste, corValida, guardarMarcaEmCache, MARCA_PADRAO, MarcaContext, tokensDaMarca } from '../marca'
import { iniciaisDe } from '../ui'

const PAPEIS = [
  { valor: 'operador', label: 'Operador', desc: 'Vê tudo, pausa e reativa, edita preço e PDV, move pedidos na cozinha.' },
  { valor: 'gerente', label: 'Gerente', desc: 'Tudo do operador + cria itens, categorias, complementos, horário e interrupções.' },
  { valor: 'administrador', label: 'Administrador', desc: 'Tudo do gerente + usuários, lojas e marca.' },
]
const PLATAFORMA_LABEL = { ifood: 'iFood', '99food': '99Food' }
const cartao = { background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12 }

// ── Usuários ────────────────────────────────────────────────────────────────────────────────
export function UsuariosSecao({ usuarios, meuId, conviteForm, setConviteForm, convidando, onConvidar, onTrocarPapel, onDefinirSenha, resetandoSenha }) {
  const [busca, setBusca] = useState('')
  const [novoAberto, setNovoAberto] = useState(false)
  const termo = busca.trim().toLowerCase()
  const lista = usuarios.filter((u) => !termo || `${u.nome} ${u.email}`.toLowerCase().includes(termo))
  const pendentes = usuarios.filter((u) => u.senha_temporaria).length
  const grade = 'minmax(200px,1.6fr) 160px minmax(170px,1fr) 170px'
  // abaixo disso a tabela vira linhas empilhadas (pessoa em cima, papel/situação/ação embaixo)
  const empilhado = useLarguraConteudo() < (novoAberto ? 1120 : 760)
  const podeCriar = conviteForm.nome.trim().length > 1 && /.+@.+\..+/.test(conviteForm.email)

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', maxWidth: 1480 }}>
      <section style={{ ...cartao, flex: '1 1 640px', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--linha)', flexWrap: 'wrap' }}>
          <CampoBusca valor={busca} onChange={setBusca} onLimpar={() => setBusca('')} placeholder="Buscar por nome ou e-mail" icone={<Search size={16} />} style={{ flex: '0 1 300px' }} />
          <span style={{ fontSize: 13, color: 'var(--t3)' }}>
            {usuarios.length} {usuarios.length === 1 ? 'pessoa' : 'pessoas'}
            {pendentes ? ` · ${pendentes} com troca de senha pendente` : ''}
          </span>
          <span style={{ flex: 1 }} />
          {!novoAberto && (
            <Botao variante="primario" onClick={() => setNovoAberto(true)}>
              <Plus size={16} /> Criar usuário
            </Botao>
          )}
        </div>
        <div>
          <div>
            {!empilhado && (
            <div style={{ display: 'grid', gridTemplateColumns: grade, alignItems: 'center', height: 40, padding: '0 20px', background: 'var(--card2)', borderBottom: '1px solid var(--linha)', fontSize: 11.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>
              <div>Pessoa</div>
              <div>Papel</div>
              <div>Situação</div>
              <div />
            </div>
            )}
            {lista.length === 0 && <EstadoVazio compacto titulo={termo ? 'Ninguém com esse nome ou e-mail' : 'Nenhum usuário além de você'} />}
            {lista.map((u) => {
              const voce = u.id === meuId
              return (
                <div
                  key={u.id}
                  style={
                    empilhado
                      ? { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--linha)' }
                      : { display: 'grid', gridTemplateColumns: grade, alignItems: 'center', minHeight: 62, padding: '0 20px', borderBottom: '1px solid var(--linha)' }
                  }
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: empilhado ? '1 1 100%' : undefined }}>
                    <div style={{ width: 34, height: 34, borderRadius: 99, background: 'var(--marca-suave)', color: 'var(--marca-tinta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                      {iniciaisDe(u.nome)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center', color: 'var(--t1)' }}>
                        <span title={u.criado_em ? `Conta criada em ${new Date(u.criado_em).toLocaleDateString('pt-BR')}` : undefined} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.nome}
                        </span>
                        {voce && <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t3)' }}>(você)</span>}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                    </div>
                  </div>
                  <div>
                    <select
                      value={u.papel}
                      disabled={voce}
                      title={voce ? 'Você não pode trocar o próprio papel' : undefined}
                      onChange={(e) => onTrocarPapel(u.id, e.target.value, u.nome)}
                      className="ds-input"
                      style={{ height: 36, width: 150, background: 'var(--card)', cursor: voce ? 'not-allowed' : 'pointer' }}
                      aria-label={`Papel de ${u.nome}`}
                    >
                      {PAPEIS.map((p) => (
                        <option key={p.valor} value={p.valor}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    {u.senha_temporaria ? (
                      <Selo tipo="warn" ponto>
                        Troca de senha pendente
                      </Selo>
                    ) : (
                      <Selo tipo="good" ponto>
                        Ativo
                      </Selo>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginLeft: empilhado ? 'auto' : undefined }}>
                    <Botao variante="secundario" tamanho="sm" disabled={resetandoSenha === u.id} onClick={() => onDefinirSenha(u)}>
                      {resetandoSenha === u.id ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                      Redefinir senha
                    </Botao>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {novoAberto && (
        <section style={{ ...cartao, flex: '0 1 380px', minWidth: 300, overflow: 'hidden', borderColor: 'var(--marca-borda)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 20px', borderBottom: '1px solid var(--linha)' }}>
            <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>Novo usuário</h3>
            <BotaoIcone rotulo="Fechar" tamanho={32} onClick={() => setNovoAberto(false)}>
              <X size={16} />
            </BotaoIcone>
          </div>
          <form
            onSubmit={(e) => {
              onConvidar(e)
            }}
            style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <Campo rotulo="Nome">
              <input required className="ds-input" value={conviteForm.nome} onChange={(e) => setConviteForm({ ...conviteForm, nome: e.target.value })} placeholder="Nome e sobrenome" />
            </Campo>
            <Campo rotulo="E-mail">
              <input required type="email" className="ds-input" value={conviteForm.email} onChange={(e) => setConviteForm({ ...conviteForm, email: e.target.value })} placeholder="pessoa@empresa.com.br" />
            </Campo>
            <div role="radiogroup" aria-label="Papel" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Rotulo>Papel</Rotulo>
              {PAPEIS.map((p) => {
                const ativo = conviteForm.papel === p.valor
                return (
                  <button
                    key={p.valor}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setConviteForm({ ...conviteForm, papel: p.valor })}
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 9, border: `1px solid ${ativo ? 'var(--marca-tinta)' : 'var(--borda)'}`, background: ativo ? 'var(--marca-suave)' : 'var(--card)', color: 'var(--t1)', textAlign: 'left', cursor: 'pointer' }}
                  >
                    <span style={{ width: 18, height: 18, borderRadius: 99, border: `1.5px solid ${ativo ? 'var(--marca-tinta)' : 'var(--borda)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 99, background: ativo ? 'var(--marca-tinta)' : 'transparent' }} />
                    </span>
                    <span>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{p.label}</span>
                      <span style={{ display: 'block', fontSize: 12.5, color: 'var(--t2)', marginTop: 2, lineHeight: 1.4 }}>{p.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <Botao type="submit" variante="primario" tamanho="lg" disabled={convidando || !podeCriar}>
              {convidando && <Loader2 size={16} className="animate-spin" />}
              {convidando ? 'Criando…' : 'Criar e gerar senha'}
            </Botao>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.45 }}>A pessoa entra com a senha gerada e é obrigada a trocar no primeiro acesso.</div>
          </form>
        </section>
      )}
    </div>
  )
}

// ── Lojas ───────────────────────────────────────────────────────────────────────────────────
export function LojasSecao({ lojas, lojaAtual, verificacaoIfood, lojaForm, setLojaForm, criandoLoja, onCriar, onAtivar, onRemover, onDetalhes }) {
  const [formAberto, setFormAberto] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13.5, color: 'var(--t2)', flex: 1, minWidth: 240 }}>A loja ativa é a que o painel inteiro mostra — cardápio, pedidos e cozinha.</span>
        {!formAberto && (
          <Botao variante="primario" onClick={() => setFormAberto(true)}>
            <Plus size={16} /> Cadastrar loja
          </Botao>
        )}
      </div>

      {formAberto && (
        <form
          onSubmit={async (e) => {
            await onCriar(e)
          }}
          style={{ ...cartao, borderColor: 'var(--marca-borda)', padding: '18px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, alignItems: 'end' }}
        >
          <Campo rotulo="Nome da loja">
            <input required className="ds-input" value={lojaForm.nome} onChange={(e) => setLojaForm({ ...lojaForm, nome: e.target.value })} placeholder="ex.: Pampulha" />
          </Campo>
          <Campo rotulo="Plataforma">
            <select className="ds-input" value={lojaForm.plataforma} onChange={(e) => setLojaForm({ ...lojaForm, plataforma: e.target.value })}>
              <option value="ifood">iFood</option>
              <option value="99food">99Food</option>
            </select>
          </Campo>
          <Campo rotulo={lojaForm.plataforma === '99food' ? 'App Shop ID do 99Food' : 'Merchant ID do iFood'}>
            <input required className="ds-input" value={lojaForm.merchant_id} onChange={(e) => setLojaForm({ ...lojaForm, merchant_id: e.target.value })} placeholder={lojaForm.plataforma === '99food' ? 'ex.: 5764607576333878701' : 'UUID do merchant'} style={{ fontFamily: MONO }} />
          </Campo>
          <div style={{ display: 'flex', gap: 8 }}>
            <Botao variante="secundario" tamanho="lg" onClick={() => setFormAberto(false)}>
              Cancelar
            </Botao>
            <Botao type="submit" variante="primario" tamanho="lg" disabled={criandoLoja} style={{ flex: 1 }}>
              {criandoLoja && <Loader2 size={16} className="animate-spin" />}
              {criandoLoja ? 'Cadastrando…' : 'Cadastrar'}
            </Botao>
          </div>
        </form>
      )}

      {lojas.length === 0 ? (
        <section style={cartao}>
          <EstadoVazio icone={<Store size={22} />} titulo="Nenhuma loja cadastrada" texto="Cadastre o merchant do iFood ou o App Shop ID do 99Food pra começar." />
        </section>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: 16 }}>
          {lojas.map((l) => {
            const ativa = l.merchant_id === lojaAtual?.merchant_id
            const verificada = l.plataforma !== '99food' && verificacaoIfood?.disponivel ? verificacaoIfood.ids.has(String(l.merchant_id)) : null
            return (
              <section key={l.id} style={{ ...cartao, borderColor: ativa ? 'var(--marca-borda)' : 'var(--borda)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px', borderBottom: '1px solid var(--linha)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 9, background: 'var(--input)', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Store size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome || 'Loja sem nome'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Etiqueta>{PLATAFORMA_LABEL[l.plataforma] || 'iFood'}</Etiqueta>
                      {verificada === true && (
                        <Selo tipo="good" altura={22} icone={<Check size={12} />} style={{ fontSize: 12 }}>
                          verificada no iFood
                        </Selo>
                      )}
                      {verificada === false && (
                        <Selo tipo="warn" altura={22} style={{ fontSize: 12 }}>
                          não encontrada no iFood
                        </Selo>
                      )}
                    </div>
                  </div>
                  {ativa ? (
                    <Selo tipo="info" icone={<Check size={14} />} altura={28} style={{ background: 'var(--marca-suave)', borderColor: 'var(--marca-borda)', color: 'var(--marca-tinta)' }}>
                      Loja ativa
                    </Selo>
                  ) : (
                    <Botao variante="secundario" tamanho="sm" onClick={() => onAtivar(l.merchant_id)}>
                      Usar esta loja
                    </Botao>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 56, padding: '0 20px' }}>
                  <div style={{ flex: 1, minWidth: 0, fontFamily: MONO, fontSize: 13, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={l.merchant_id}>
                    {l.merchant_id}
                  </div>
                  {ativa && l.plataforma !== '99food' && (
                    <Botao variante="secundario" tamanho="xs" onClick={onDetalhes}>
                      Detalhes
                    </Botao>
                  )}
                  <BotaoIcone rotulo={`Remover ${l.nome || 'loja'}`} perigo onClick={() => onRemover(l)}>
                    <Trash2 size={16} />
                  </BotaoIcone>
                </div>
              </section>
            )
          })}
        </div>
      )}
      <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>
        Não sabe o Merchant ID? Rode <span style={{ fontFamily: MONO }}>python scripts/descobrir_lojas.py</span> no backend. No 99Food, é o ID que você deu à loja no portal.
      </div>
    </div>
  )
}

// ── Marca (white-label) ─────────────────────────────────────────────────────────────────────
const SUGESTOES = ['#2B59C3', '#0B8F3A', '#0B7A75', '#7A3FC4', '#C2410C', '#B4235A', '#FFD400', '#12151B']
const TIPOS_LOGO = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']
const LOGO_MAX = 220 * 1024 // o data URL cresce ~33% em base64; o backend aceita até 300 KB

function lerLogo(arquivo) {
  return new Promise((resolve, reject) => {
    if (!TIPOS_LOGO.includes(arquivo.type)) return reject(new Error('Use PNG, SVG, JPEG ou WEBP.'))
    if (arquivo.size > LOGO_MAX) return reject(new Error(`Arquivo com ${Math.round(arquivo.size / 1024)} KB — o limite é 220 KB.`))
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result)
    leitor.onerror = () => reject(new Error('Não consegui ler o arquivo.'))
    leitor.readAsDataURL(arquivo)
  })
}

export function MarcaSecao({ apiFetch, notificar, tema }) {
  const { marca, setMarca } = useContext(MarcaContext)
  const [form, setForm] = useState({ nome: marca.nome, cor: marca.cor, logo: marca.logo })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const valida = corValida(form.cor)
  const t = tokensDaMarca(valida ? form.cor : MARCA_PADRAO.cor, tema)
  const contrasteBranco = contraste(t.marca, '#FFFFFF')

  async function escolherLogo(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      const logo = await lerLogo(arquivo)
      setForm((f) => ({ ...f, logo }))
      setErro('')
    } catch (err) {
      setErro(err.message)
    }
  }

  async function salvar() {
    if (!form.nome.trim()) return setErro('Dê um nome à marca.')
    if (!valida) return setErro('A cor precisa ser um hex como #2B59C3.')
    setSalvando(true)
    setErro('')
    try {
      const salva = await apiFetch('/marca', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), cor: form.cor, logo: form.logo || null }),
      })
      const nova = { ...MARCA_PADRAO, ...salva }
      setMarca(nova)
      guardarMarcaEmCache(nova)
      notificar('sucesso', 'Marca aplicada no painel inteiro.', { sub: 'Toda a equipe vê a mudança no próximo carregamento.' })
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  // A prévia recebe os tokens da cor AINDA NÃO salva — o resto do painel continua com a atual.
  const varsPrevia = {
    '--marca': t.marca,
    '--marca-texto': t.marcaTexto,
    '--marca-hover': t.marcaHover,
    '--marca-tinta': t.marcaTinta,
    '--marca-suave': t.marcaSuave,
    '--marca-borda': t.marcaBorda,
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', gap: 16, alignItems: 'start', maxWidth: 1480 }}>
      <section style={{ ...cartao, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Campo rotulo="Nome da empresa" dica="Aparece no menu, no login e no título da aba.">
          <input className="ds-input" maxLength={40} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome que a equipe vê no painel" />
        </Campo>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Rotulo>Cor de destaque</Rotulo>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SUGESTOES.map((cor) => {
              const atual = form.cor.toUpperCase() === cor
              return (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setForm({ ...form, cor })}
                  title={cor}
                  aria-label={`Usar ${cor}`}
                  aria-pressed={atual}
                  style={{ width: 40, height: 40, borderRadius: 9, border: `2px solid ${atual ? 'var(--t1)' : 'transparent'}`, background: cor, cursor: 'pointer', padding: 0, boxShadow: 'inset 0 0 0 2px var(--card)' }}
                />
              )
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="color"
              aria-label="Escolher cor"
              value={valida ? form.cor : MARCA_PADRAO.cor}
              onChange={(e) => setForm({ ...form, cor: e.target.value.toUpperCase() })}
              style={{ width: 42, height: 42, padding: 2, borderRadius: 9, border: '1px solid var(--borda)', background: 'var(--card)', cursor: 'pointer' }}
            />
            <input className="ds-input" value={form.cor} maxLength={7} onChange={(e) => setForm({ ...form, cor: e.target.value.trim() })} aria-label="Cor em hexadecimal" style={{ width: 130, fontFamily: MONO, textTransform: 'uppercase' }} />
            <span style={{ fontSize: 12.5, color: 'var(--t2)' }}>
              {valida ? `Rótulo ${t.marcaTexto === '#FFFFFF' ? 'branco' : 'escuro'} · ${t.contrasteRotulo.toFixed(1).replace('.', ',')}:1` : 'hex inválido'}
            </span>
          </div>
          {valida && contrasteBranco < 3 && (
            <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--warn-bg)', border: '1px solid var(--warn-bd)', display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.45, color: 'var(--t1)' }}>
              <AlertTriangle size={16} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
              <span>Cor clara: os botões usam rótulo escuro e os textos na cor da marca são escurecidos para continuar legíveis. Vai ficar mais discreta.</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Rotulo>Logo</Rotulo>
          <label style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, border: '1.5px dashed var(--borda)', background: 'var(--card2)', cursor: 'pointer' }}>
            <div style={{ width: 56, height: 56, borderRadius: 9, background: 'var(--card)', border: '1px solid var(--borda)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', color: 'var(--t3)', flexShrink: 0 }}>
              {form.logo ? <img src={form.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <ImagePlus size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{form.logo ? 'Trocar logo' : 'Enviar logo'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>PNG, SVG, JPEG ou WEBP · até 220 KB · fundo transparente fica melhor</div>
            </div>
            <input type="file" accept={TIPOS_LOGO.join(',')} onChange={escolherLogo} style={{ display: 'none' }} />
          </label>
          {form.logo && (
            <div>
              <Botao variante="perigo-fantasma" tamanho="sm" onClick={() => setForm({ ...form, logo: null })}>
                <Trash2 size={14} /> Remover logo
              </Botao>
            </div>
          )}
        </div>

        {erro && (
          <div role="alert" style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bad-bg)', border: '1px solid var(--bad-bd)', fontSize: 13.5, color: 'var(--t1)' }}>
            {erro}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', borderTop: '1px solid var(--linha)', paddingTop: 18, flexWrap: 'wrap' }}>
          <Botao variante="secundario" tamanho="lg" onClick={() => setForm({ ...MARCA_PADRAO })}>
            Restaurar padrão
          </Botao>
          <Botao variante="primario" tamanho="lg" disabled={salvando} onClick={salvar}>
            {salvando && <Loader2 size={16} className="animate-spin" />}
            {salvando ? 'Salvando…' : 'Salvar e aplicar'}
          </Botao>
        </div>
      </section>

      <section style={{ ...cartao, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16, ...varsPrevia }}>
        <Rotulo>Prévia</Rotulo>
        <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(0,1fr)', border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden', minHeight: 260 }}>
          <div style={{ background: 'var(--card)', borderRight: '1px solid var(--borda)', padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px 12px', minWidth: 0 }}>
              {form.logo ? (
                <img src={form.logo} alt="" style={{ height: 30, maxWidth: 150, objectFit: 'contain' }} />
              ) : (
                <>
                  <SimboloPausaFast cor={t.marca} tamanho={30} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--t1)' }}>{form.nome || 'Sua marca'}</span>
                </>
              )}
            </div>
            <div style={{ height: 32, borderRadius: 7, background: 'var(--marca-suave)', border: '1px solid var(--marca-borda)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 12.5, fontWeight: 600, color: 'var(--t1)', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, border: '2px solid var(--marca-tinta)' }} />
              Cardápio
            </div>
            {['Pedidos', 'Cozinha'].map((x) => (
              <div key={x} style={{ height: 32, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 12.5, color: 'var(--t2)', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, border: '2px solid var(--t3)' }} />
                {x}
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--bg)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ height: 36, padding: '0 14px', borderRadius: 9, background: 'var(--marca)', color: 'var(--marca-texto)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' }}>Adicionar item</span>
              <span style={{ height: 36, padding: '0 14px', borderRadius: 9, background: 'var(--card)', border: '1px solid var(--borda)', color: 'var(--t1)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' }}>Pausar por insumo</span>
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 9, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, background: 'var(--marca)' }} />
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: 'var(--t1)' }}>Picanha Fatiada 400g</span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: 'var(--t1)' }}>R$ 119,90</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: 'var(--input)', overflow: 'hidden' }}>
                <div style={{ width: '62%', height: '100%', background: 'var(--marca)' }} />
              </div>
              <span style={{ fontSize: 12.5, color: 'var(--marca-tinta)', fontWeight: 600 }}>Ver no cardápio →</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>Rodapé das telas de acesso: “{form.nome || 'Sua marca'} · Operação delivery com PausaFast”</div>
      </section>
    </div>
  )
}
