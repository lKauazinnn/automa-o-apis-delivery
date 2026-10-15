import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Rede de segurança: um crash de render (ex: conflito do React com autofill/extensão do
// navegador) não deve deixar a tela em branco — explica que nada se perdeu e oferece recarregar.
export class ErroFatal extends Component {
  constructor(props) {
    super(props)
    this.state = { crashou: false, erro: null, detalhes: false }
  }

  static getDerivedStateFromError(erro) {
    return { crashou: true, erro }
  }

  render() {
    if (!this.state.crashou) return this.props.children
    const { erro, detalhes } = this.state
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{ maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--bad-bg)', border: '1px solid var(--bad-bd)', color: 'var(--bad)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--t1)' }}>Algo travou a tela</div>
            <div style={{ fontSize: 14, color: 'var(--t2)', marginTop: 6, lineHeight: 1.5, textWrap: 'pretty' }}>
              Foi só a tela — o cardápio e as pausas no iFood e no 99Food continuam como estavam. Recarregar resolve quase sempre.
            </div>
          </div>
          <button type="button" onClick={() => window.location.reload()} className="ds-btn ds-btn--primario ds-btn--xl">
            <RefreshCw size={16} />
            Recarregar
          </button>
          {erro && (
            <button type="button" onClick={() => this.setState({ detalhes: !detalhes })} style={{ border: 0, background: 'transparent', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {detalhes ? 'Esconder detalhes técnicos' : 'Ver detalhes técnicos'}
            </button>
          )}
          {erro && detalhes && (
            <div style={{ width: '100%', padding: '10px 12px', borderRadius: 9, background: 'var(--card)', border: '1px solid var(--borda)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--t2)', textAlign: 'left', lineHeight: 1.5, overflowWrap: 'anywhere' }}>
              {String(erro?.message || erro)}
            </div>
          )}
        </div>
      </div>
    )
  }
}
