import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Rede de segurança: um crash de render (ex: conflito do React com autofill/extensão do
// navegador) não deve deixar a tela preta pro usuário — mostra um botão de recarregar.
export class ErroFatal extends Component {
  constructor(props) {
    super(props)
    this.state = { crashou: false }
  }

  static getDerivedStateFromError() {
    return { crashou: true }
  }

  render() {
    if (!this.state.crashou) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <AlertTriangle size={28} style={{ color: '#ef4444' }} />
          <p className="text-sm" style={{ color: '#f1f5f9' }}>
            Algo travou a tela. Isso não deveria ter acontecido.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg,#F56C35,#AF2D0A)', color: '#fff' }}
          >
            <RefreshCw size={13} />
            Recarregar
          </button>
        </div>
      </div>
    )
  }
}
