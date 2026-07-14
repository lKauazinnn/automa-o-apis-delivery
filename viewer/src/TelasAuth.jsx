import { useState } from 'react'
import { CheckCircle2, Loader2, Lock, LogIn, Mail } from 'lucide-react'
import { definirSenha, login, recuperarSenha } from './auth'

const CARD_BG = '#12111a'
const BORDER = '#242433'
const INPUT_BG = '#1c1b26'
const TEXT_1 = '#f1f5f9'
const TEXT_2 = '#8a94a6'

function Casca({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <img src="/brand/logo-cajupar.png" alt="Cajupar" className="h-10 w-auto object-contain" />
        </div>
        <div className="rounded-2xl border p-6" style={{ background: CARD_BG, borderColor: BORDER }}>
          {children}
        </div>
        <p className="text-center text-[11px] mt-5" style={{ color: '#475569' }}>
          Cajupar · Automação iFood
        </p>
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none'
const inputStyle = { background: INPUT_BG, color: TEXT_1, border: `1px solid ${BORDER}` }

function AvisoErro({ children }) {
  return (
    <p
      className="text-xs rounded-lg px-3 py-2 mb-3.5"
      style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
    >
      {children}
    </p>
  )
}

function PainelEsqueciSenha({ onVoltar }) {
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      await recuperarSenha(email.trim())
      setEnviado(true)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <CheckCircle2 size={28} style={{ color: '#22c55e' }} />
        <p className="text-sm" style={{ color: TEXT_1 }}>
          Se esse e-mail tiver uma conta, um link de recuperação foi enviado.
        </p>
        <button type="button" onClick={onVoltar} className="text-xs font-semibold" style={{ color: '#F56C35' }}>
          Voltar pro login
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <p className="text-xs" style={{ color: TEXT_2 }}>
        Informe seu e-mail. Se preferir não esperar o e-mail chegar (às vezes o filtro de
        segurança corporativo derruba o link), peça pra um administrador redefinir sua senha
        direto pelo painel de Usuários.
      </p>
      <div className="relative">
        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_2 }} />
        <input
          className={inputCls}
          style={inputStyle}
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@empresa.com"
        />
      </div>
      {erro && <AvisoErro>{erro}</AvisoErro>}
      <button
        type="submit"
        disabled={carregando}
        className="botao-primario flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-40"
      >
        {carregando ? <Loader2 key="icone" size={15} className="animate-spin" /> : null}
        {carregando ? 'Enviando...' : 'Enviar link de recuperação'}
      </button>
      <button type="button" onClick={onVoltar} className="text-[11px] text-center" style={{ color: TEXT_2 }}>
        Voltar pro login
      </button>
    </form>
  )
}

export function TelaLogin({ onLogar, avisoInicial }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [modoRecuperar, setModoRecuperar] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const sessao = await login(email.trim(), senha)
      onLogar(sessao)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Casca>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#F56C35' }}>
        Catálogo iFood
      </p>
      <h1 className="text-lg font-bold mb-5" style={{ color: TEXT_1 }}>
        {modoRecuperar ? 'Recuperar senha' : 'Entrar'}
      </h1>

      {avisoInicial && !modoRecuperar && <AvisoErro>{avisoInicial}</AvisoErro>}

      {modoRecuperar ? (
        <PainelEsqueciSenha onVoltar={() => setModoRecuperar(false)} />
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_2 }} />
            <input
              className={inputCls}
              style={inputStyle}
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
            />
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_2 }} />
            <input
              className={inputCls}
              style={inputStyle}
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
            />
          </div>
          {erro && <AvisoErro>{erro}</AvisoErro>}
          <button
            type="submit"
            disabled={carregando}
            className="botao-primario flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-40"
          >
            {carregando ? <Loader2 key="carregando" size={15} className="animate-spin" /> : <LogIn key="entrar" size={15} />}
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setModoRecuperar(true)}
              className="text-[11px] font-semibold"
              style={{ color: '#F56C35' }}
            >
              Esqueci minha senha
            </button>
            <p className="text-[11px]" style={{ color: TEXT_2 }}>
              Sem conta? Peça pra um administrador criar a sua.
            </p>
          </div>
        </form>
      )}
    </Casca>
  )
}

// Serve dois fluxos: o convite/recuperação por link (accessToken vem do #hash da URL) e a
// troca obrigatória de senha temporária (accessToken vem da sessão já logada). `onSair` só
// existe no segundo caso — dá pra sair em vez de trocar, mas não dá pra fechar sem escolher.
export function TelaDefinirSenha({ accessToken, eyebrow, aviso, onDefinida, onSair }) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      setErro('As senhas não são iguais.')
      return
    }
    setCarregando(true)
    try {
      await definirSenha(accessToken, senha)
      await onDefinida()
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Casca>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#F56C35' }}>
        {eyebrow}
      </p>
      <h1 className="text-lg font-bold mb-2" style={{ color: TEXT_1 }}>
        Defina sua senha
      </h1>
      {aviso && (
        <p className="text-xs mb-4 leading-relaxed" style={{ color: TEXT_2 }}>
          {aviso}
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_2 }} />
          <input
            className={inputCls}
            style={inputStyle}
            type="password"
            required
            autoFocus
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Nova senha (mín. 6 caracteres)"
          />
        </div>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: TEXT_2 }} />
          <input
            className={inputCls}
            style={inputStyle}
            type="password"
            required
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            placeholder="Confirme a senha"
          />
        </div>
        {erro && (
          <p
            className="text-xs rounded-lg px-3 py-2"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={carregando}
          className="botao-primario flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-40"
        >
          {carregando && <Loader2 size={15} className="animate-spin" />}
          {carregando ? 'Salvando...' : 'Salvar e entrar'}
        </button>
      </form>
      {onSair && (
        <button
          type="button"
          onClick={onSair}
          className="text-[11px] text-center mt-4 w-full"
          style={{ color: TEXT_2 }}
        >
          Sair
        </button>
      )}
    </Casca>
  )
}
