// Fala direto com o Supabase Auth (sem SDK — só fetch) e com a rota /api/eu do backend.
// A chave usada aqui é a "anon"/"publishable": ela é feita pra existir no navegador, ao
// contrário da service_role (que só existe no backend, nunca aqui).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function headersSupabase(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// O link do convite/recuperação redireciona pra cá com os tokens no #hash da URL.
export function lerConviteDaUrl() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  const params = new URLSearchParams(hash)
  const accessToken = params.get('access_token')
  const tipo = params.get('type')
  if (accessToken && (tipo === 'invite' || tipo === 'recovery')) {
    return { accessToken, tipo }
  }
  return null
}

// Quando o link expirou ou já foi usado (comum: scanner de segurança de e-mail corporativo
// "clica" no link antes da pessoa, queimando o token de um só uso), o Supabase redireciona
// pra cá com o erro no #hash em vez dos tokens.
export function lerErroDaUrl() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  const params = new URLSearchParams(hash)
  const erro = params.get('error')
  if (!erro) return null
  return { erro, codigo: params.get('error_code'), descricao: params.get('error_description') }
}

export function limparHashDaUrl() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

export async function recuperarSenha(email) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: headersSupabase(),
    // manda pra origem de onde a pessoa tá acessando agora (localhost, IP da rede, domínio
    // futuro etc.) — sem isso o link do e-mail usa a URL padrão configurada no Supabase, que
    // pode não ser onde essa pessoa realmente acessa o painel.
    body: JSON.stringify({ email, redirect_to: window.location.origin }),
  })
  if (!resp.ok) {
    const dados = await resp.json().catch(() => ({}))
    throw new Error(dados.error_description || dados.msg || 'Não consegui enviar o e-mail de recuperação.')
  }
}

export async function login(email, senha) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: headersSupabase(),
    body: JSON.stringify({ email, password: senha }),
  })
  const dados = await resp.json()
  if (!resp.ok) {
    throw new Error(dados.error_description || dados.msg || 'E-mail ou senha inválidos.')
  }
  return dados // { access_token, refresh_token, expires_in, user }
}

export async function definirSenha(accessToken, novaSenha) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: headersSupabase(accessToken),
    body: JSON.stringify({ password: novaSenha }),
  })
  const dados = await resp.json()
  if (!resp.ok) {
    throw new Error(dados.error_description || dados.msg || 'Não consegui definir a senha.')
  }
  return dados
}

// Troca o refresh_token por um access_token novo, sem precisar a pessoa logar de novo —
// usado pelo banner "sua sessão expira em Xmin" quando ela clica em "Renovar sessão".
export async function renovarSessao(refreshToken) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headersSupabase(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const dados = await resp.json()
  if (!resp.ok) {
    throw new Error(dados.error_description || dados.msg || 'Não consegui renovar a sessão.')
  }
  return dados // { access_token, refresh_token, expires_in, user }
}

export async function logoutSupabase(accessToken) {
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, { method: 'POST', headers: headersSupabase(accessToken) })
  } catch {
    // logout é best-effort — mesmo se a chamada falhar, a sessão local é limpa de qualquer jeito
  }
}

export async function buscarEu(accessToken) {
  let resp
  try {
    resp = await fetch(`${API}/eu`, { headers: { Authorization: `Bearer ${accessToken}` } })
  } catch {
    throw new Error('Não consegui falar com o servidor. Verifique se o backend está rodando.')
  }
  if (!resp.ok) throw new Error('sessão inválida')
  return resp.json()
}

// Chamado logo depois que a própria pessoa troca a senha — desliga a flag que força a troca
// no próximo login (senha deixou de ser a temporária que um admin definiu).
export async function marcarSenhaTrocada(accessToken) {
  await fetch(`${API}/eu/senha-trocada`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
