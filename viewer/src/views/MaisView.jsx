import { Activity, ChevronRight, Droplet, History, KeyRound, LogOut, Moon, PackageX, Store, Sun, Users, Wallet, Zap } from 'lucide-react'
import { Botao, Contador, Rotulo } from '../ds'
import { iniciaisDe } from '../ui'

const PAPEL_LABEL = { administrador: 'Administrador', gerente: 'Gerente', operador: 'Operador' }

function Grupo({ titulo, itens }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Rotulo style={{ padding: '0 4px' }}>{titulo}</Rotulo>
      <div style={{ background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden' }}>
        {itens.map((m) => (
          <button
            key={m.l}
            type="button"
            onClick={m.go}
            className="ds-opcao"
            style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', height: 54, padding: '0 16px', border: 0, borderBottom: '1px solid var(--linha)', background: 'var(--card)', color: 'var(--t1)', fontSize: 15, fontWeight: 500, textAlign: 'left', cursor: 'pointer' }}
          >
            <span style={{ color: 'var(--t2)', display: 'flex' }}>
              <m.Icon size={20} />
            </span>
            <span style={{ flex: 1 }}>{m.l}</span>
            {!!m.badge && <Contador tipo="warn">{m.badge}</Contador>}
            {m.extra}
            {!m.extra && (
              <span style={{ color: 'var(--t3)', display: 'flex' }}>
                <ChevronRight size={16} />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Celular: tudo que não está nas 4 abas principais (Painel, Pedidos, Cozinha, Cardápio).
export function MaisView({ usuario, lojaNome, totalRupturas, podeVerFinanceiro, souAdministrador, tema, onAlternarTema, onIr, onAbrirRupturas, onAbrirInsumo, onTrocarLoja, onMinhaSenha, onSair }) {
  const operacao = [
    { l: 'Rupturas', Icon: PackageX, badge: totalRupturas, go: onAbrirRupturas },
    { l: 'Pausar por insumo', Icon: Zap, go: onAbrirInsumo },
    { l: 'Status das lojas', Icon: Activity, go: () => onIr('lojas') },
    ...(podeVerFinanceiro ? [{ l: 'Financeiro', Icon: Wallet, go: () => onIr('financeiro') }] : []),
    { l: 'Histórico', Icon: History, go: () => onIr('auditoria') },
  ]
  const admin = [
    { l: 'Usuários', Icon: Users, go: () => onIr('usuarios') },
    { l: 'Lojas', Icon: Store, go: () => onIr('lojas-admin') },
    { l: 'Marca', Icon: Droplet, go: () => onIr('marca') },
  ]
  const preferencias = [
    {
      l: tema === 'escuro' ? 'Tema claro' : 'Tema escuro',
      Icon: tema === 'escuro' ? Sun : Moon,
      go: onAlternarTema,
      extra: <span style={{ fontSize: 13, color: 'var(--t3)' }}>{tema === 'escuro' ? 'escuro' : 'claro'}</span>,
    },
    { l: 'Trocar minha senha', Icon: KeyRound, go: onMinhaSenha },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        type="button"
        onClick={onTrocarLoja}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12, color: 'var(--t1)', textAlign: 'left', cursor: 'pointer' }}
      >
        <Store size={20} style={{ color: 'var(--t2)' }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--t3)' }}>Loja ativa</span>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lojaNome || 'Selecionar loja'}</span>
        </span>
        <span style={{ fontSize: 13, color: 'var(--marca-tinta)', fontWeight: 600 }}>Trocar</span>
      </button>
      <Grupo titulo="Operação" itens={operacao} />
      {souAdministrador && <Grupo titulo="Administração" itens={admin} />}
      <Grupo titulo="Preferências" itens={preferencias} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--card)', border: '1px solid var(--borda)', borderRadius: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 99, background: 'var(--marca-suave)', color: 'var(--marca-tinta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{iniciaisDe(usuario.nome)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)' }}>{usuario.nome}</div>
          <div style={{ fontSize: 12.5, color: 'var(--t3)' }}>{PAPEL_LABEL[usuario.papel] || usuario.papel}</div>
        </div>
        <Botao variante="secundario" onClick={onSair}>
          <LogOut size={16} /> Sair
        </Botao>
      </div>
    </div>
  )
}
