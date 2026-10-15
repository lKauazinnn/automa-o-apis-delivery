import { useContext, useState } from 'react'
import { AlertTriangle, Check, Clock, Eye, EyeOff, Loader2, LogOut, Mail, ShieldAlert } from 'lucide-react'
import { definirSenha, login, recuperarSenha } from './auth'
import { SimboloPausaFast } from './Logo'
import { MarcaContext } from './marca'
import { Botao, Rotulo } from './ds'

const MIN_SENHA = 6

function Marca() {
  const { marca } = useContext(MarcaContext)
  if (marca.logo) return <img src={marca.logo} alt={marca.nome} style={{ height: 44, maxWidth: 200, objectFit: 'contain' }} />
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <SimboloPausaFast cor={marca.cor} tamanho={44} />
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--t1)' }}>{marca.nome}</div>
        <div style={{ fontSize: 13, color: 'var(--t3)' }}>Operação delivery</div>
      </div>
    </div>
  )
}

function Rodape() {
  const { marca } = useContext(MarcaContext)
  return (
    <div style={{ fontSize: 12.5, color: 'var(--t3)', textAlign: 'center' }}>
      {marca.nome === 'PausaFast' ? 'PausaFast · Operação delivery' : `${marca.nome} · Operação delivery com PausaFast`}
    </div>
  )
}

function Casca({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Marca />
        <div style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: 'var(--sh-sm)' }}>{children}</div>
        <Rodape />
      </div>
    </div>
  )
}

function Titulo({ children, eyebrow, texto }) {
  return (
    <div>
      {eyebrow && <Rotulo cor="var(--marca-tinta)">{eyebrow}</Rotulo>}
      <h1 style={{ margin: eyebrow ? '4px 0 0' : 0, fontSize: 21, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--t1)' }}>{children}</h1>
      {texto && <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--t2)', lineHeight: 1.5, textWrap: 'pretty' }}>{texto}</p>}
    </div>
  )
}

function Alerta({ tipo = 'bad', children }) {
  return (
    <div role="alert" style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 9, background: `var(--${tipo}-bg)`, border: `1px solid var(--${tipo}-bd)`, fontSize: 13.5, lineHeight: 1.45, color: 'var(--t1)' }}>
      <span style={{ color: `var(--${tipo})`, display: 'flex', paddingTop: 1 }}>
        <AlertTriangle size={16} />
      </span>
      <span>{children}</span>
    </div>
  )
}

// O link ao lado do rótulo ("Esqueci minha senha") fica FORA do <label> — botão dentro de label
// confunde leitor de tela e rouba o clique pro campo.
function CampoTexto({ rotulo, id, extra, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>
          {rotulo}
        </label>
        {extra}
      </div>
      {children}
    </div>
  )
}

const estiloCampo = { height: 44, fontSize: 14.5 }

function CampoSenha({ id, valor, onChange, autoComplete, autoFocus, placeholder, invalido }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="ds-campo" style={{ height: 44, padding: '0 4px 0 12px', borderColor: invalido ? 'var(--bad)' : undefined }}>
      <input
        id={id}
        type={ver ? 'text' : 'password'}
        required
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ fontSize: 14.5 }}
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}
        title={ver ? 'Esconder senha' : 'Mostrar senha'}
        className="ds-icone"
        style={{ width: 36, height: 36 }}
      >
        {ver ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

function Requisitos({ itens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {itens.map((r) => (
        <div key={r.l} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: r.ok ? 'var(--t1)' : 'var(--t3)' }}>
          <span style={{ width: 16, height: 16, borderRadius: 99, background: r.ok ? 'var(--good)' : 'transparent', border: `1.5px solid ${r.ok ? 'var(--good)' : 'var(--borda)'}`, color: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {r.ok && <Check size={10} strokeWidth={3.5} />}
          </span>
          {r.l}
        </div>
      ))}
    </div>
  )
}

function linkBotao(onClick, texto, estilo = {}) {
  return (
    <button type="button" onClick={onClick} style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--marca-tinta)', fontSize: 13.5, fontWeight: 600, ...estilo }}>
      {texto}
    </button>
  )
}

function PainelRecuperar({ onVoltar }) {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [reenviado, setReenviado] = useState(false)

  async function enviar(e) {
    e?.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await recuperarSenha(email.trim())
      if (enviado) setReenviado(true)
      setEnviado(true)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  if (enviado) {
    return (
      <>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--input)', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Mail size={22} />
        </div>
        <Titulo
          texto={
            <>
              Se <b style={{ color: 'var(--t1)' }}>{email.trim()}</b> tiver conta, o link chega em instantes. Olhe também a caixa de spam. Se o filtro do e-mail corporativo derrubar o link, peça pra um administrador redefinir sua senha direto no painel.
            </>
          }
        >
          Confira seu e-mail
        </Titulo>
        {erro && <Alerta>{erro}</Alerta>}
        <Botao variante="secundario" tamanho="lg" disabled={carregando || reenviado} onClick={() => enviar()}>
          {carregando && <Loader2 size={16} className="animate-spin" />}
          {reenviado ? 'Reenviado — aguarde antes de pedir de novo' : 'Reenviar link'}
        </Botao>
        <div style={{ textAlign: 'center' }}>{linkBotao(onVoltar, 'Voltar para o login')}</div>
      </>
    )
  }

  return (
    <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Titulo texto="Mandamos um link para você criar uma senha nova.">Recuperar senha</Titulo>
      <CampoTexto rotulo="E-mail da sua conta" id="rec-email">
        <input id="rec-email" className="ds-input" style={estiloCampo} type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" />
      </CampoTexto>
      {erro && <Alerta>{erro}</Alerta>}
      <Botao type="submit" variante="primario" tamanho="lg" disabled={carregando || !email.includes('@')} style={{ height: 46, fontSize: 15 }}>
        {carregando && <Loader2 size={16} className="animate-spin" />}
        {carregando ? 'Enviando…' : 'Enviar link'}
      </Botao>
      <div style={{ textAlign: 'center' }}>{linkBotao(onVoltar, 'Voltar para o login')}</div>
    </form>
  )
}

export function TelaLogin({ onLogar, avisoInicial }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [modo, setModo] = useState(avisoInicial ? 'expirado' : 'login')

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const sessao = await login(email.trim(), senha)
      await onLogar(sessao)
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  if (modo === 'recuperar') {
    return (
      <Casca>
        <PainelRecuperar onVoltar={() => setModo('login')} />
      </Casca>
    )
  }

  if (modo === 'expirado') {
    return (
      <Casca>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--warn-bg)', border: '1px solid var(--warn-bd)', color: 'var(--warn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Clock size={22} />
        </div>
        <Titulo texto={avisoInicial}>Esse link não vale mais</Titulo>
        <Botao variante="primario" tamanho="lg" onClick={() => setModo('recuperar')} style={{ height: 46, fontSize: 15 }}>
          Pedir novo link
        </Botao>
        <div style={{ textAlign: 'center' }}>{linkBotao(() => setModo('login'), 'Voltar para o login')}</div>
      </Casca>
    )
  }

  return (
    <Casca>
      <Titulo>Entrar</Titulo>
      <form onSubmit={entrar} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {erro && <Alerta>{erro}</Alerta>}
        <CampoTexto rotulo="E-mail" id="login-email">
          <input id="login-email" className="ds-input" style={estiloCampo} type="email" required autoFocus autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" />
        </CampoTexto>
        <CampoTexto rotulo="Senha" id="login-senha" extra={linkBotao(() => setModo('recuperar'), 'Esqueci minha senha', { fontSize: 13 })}>
          <CampoSenha id="login-senha" valor={senha} onChange={setSenha} autoComplete="current-password" placeholder="Sua senha" invalido={!!erro} />
        </CampoTexto>
        <Botao type="submit" variante="primario" tamanho="lg" disabled={carregando} style={{ height: 46, fontSize: 15 }}>
          {carregando && <Loader2 size={16} className="animate-spin" />}
          {carregando ? 'Entrando…' : 'Entrar'}
        </Botao>
      </form>
      <div style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.5, borderTop: '1px solid var(--linha)', paddingTop: 16 }}>
        Não existe cadastro aberto. Peça para um administrador criar a sua conta.
      </div>
    </Casca>
  )
}

// Serve dois fluxos: `modo="convite"` (link de convite/recuperação; o accessToken vem do #hash da
// URL) e `modo="obrigatoria"` (logou com senha provisória definida por um admin). A segunda não
// deixa pular: a única saída é "Sair".
export function TelaDefinirSenha({ accessToken, modo = 'convite', eyebrow, aviso, nomeUsuario, onDefinida, onSair }) {
  const { marca } = useContext(MarcaContext)
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const requisitos = [
    { l: `Pelo menos ${MIN_SENHA} caracteres`, ok: senha.length >= MIN_SENHA },
    { l: 'As duas senhas iguais', ok: senha.length > 0 && senha === confirmacao },
  ]
  const ok = requisitos.every((r) => r.ok)

  async function salvar(e) {
    e.preventDefault()
    setErro('')
    if (!ok) {
      setErro(senha.length < MIN_SENHA ? `A senha precisa ter pelo menos ${MIN_SENHA} caracteres.` : 'As senhas não são iguais.')
      return
    }
    setCarregando(true)
    try {
      await definirSenha(accessToken, senha)
      await onDefinida()
    } catch (err) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  const formulario = (
    <form onSubmit={salvar} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <CampoTexto rotulo="Nova senha" id="nova-senha">
        <CampoSenha id="nova-senha" valor={senha} onChange={setSenha} autoComplete="new-password" autoFocus />
      </CampoTexto>
      <CampoTexto rotulo="Repita a nova senha" id="nova-senha-2">
        <CampoSenha id="nova-senha-2" valor={confirmacao} onChange={setConfirmacao} autoComplete="new-password" invalido={confirmacao.length > 0 && confirmacao !== senha} />
      </CampoTexto>
      <Requisitos itens={requisitos} />
      {erro && <Alerta>{erro}</Alerta>}
      <Botao type="submit" variante="primario" tamanho="lg" disabled={carregando || !ok} style={{ height: 46, fontSize: 15 }}>
        {carregando && <Loader2 size={16} className="animate-spin" />}
        {carregando ? 'Salvando…' : modo === 'obrigatoria' ? 'Salvar e abrir o painel' : 'Criar senha e entrar'}
      </Botao>
    </form>
  )

  if (modo === 'obrigatoria') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', background: 'var(--card)', borderBottom: '1px solid var(--borda)' }}>
          <SimboloPausaFast cor={marca.cor} tamanho={30} />
          <span style={{ fontSize: 14, fontWeight: 700, flex: 1, color: 'var(--t1)' }}>{marca.nome}</span>
          {nomeUsuario && <span style={{ fontSize: 13, color: 'var(--t2)' }}>{nomeUsuario}</span>}
          {onSair && (
            <Botao variante="secundario" tamanho="xs" onClick={onSair}>
              <LogOut size={14} /> Sair
            </Botao>
          )}
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <div style={{ width: '100%', maxWidth: 400, background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 9, background: 'var(--warn-bg)', border: '1px solid var(--warn-bd)' }}>
              <span style={{ color: 'var(--warn)', display: 'flex', paddingTop: 2 }}>
                <ShieldAlert size={16} />
              </span>
              <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--t1)' }}>
                <b>Falta um passo para liberar o painel.</b> {aviso || 'Você entrou com uma senha provisória, definida por um administrador — e ela também viu essa senha. Crie uma que só você saiba.'}
              </div>
            </div>
            <Titulo>Troque sua senha para continuar</Titulo>
            {formulario}
            <div style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.45 }}>
              Não dá para pular esta etapa. Se não for você, use <b style={{ color: 'var(--t2)' }}>Sair</b> e avise a administração.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Casca>
      <Titulo eyebrow={eyebrow || 'Boas-vindas'} texto={aviso || 'Escolha a senha que você vai usar para entrar no painel.'}>
        Crie sua senha
      </Titulo>
      {formulario}
    </Casca>
  )
}

export function TelaCarregando() {
  const { marca } = useContext(MarcaContext)
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <SimboloPausaFast cor={marca.cor} tamanho={52} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>Abrindo o painel{marca.nome ? ` da ${marca.nome}` : ''}</div>
        <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>Conferindo sua sessão…</div>
      </div>
      <div style={{ width: 220, height: 4, borderRadius: 99, background: 'var(--input)', overflow: 'hidden' }}>
        <div className="barra-indeterminada" style={{ width: '40%', height: '100%', background: 'var(--marca)', borderRadius: 99 }} />
      </div>
    </div>
  )
}
