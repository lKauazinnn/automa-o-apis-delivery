import { useContext } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Droplet,
  History,
  KeyRound,
  LayoutGrid,
  LogOut,
  PackageX,
  Pause,
  Store,
  Tag,
  Users,
  UtensilsCrossed,
  Wallet,
  Zap,
  Activity,
} from 'lucide-react'
import { MarcaContext } from './marca'
import { SimboloPausaFast } from './Logo'
import { Contador, MONO, Rotulo, tons } from './ds'

// Os itens que TROCAM DE TELA. "Ações rápidas" abre um painel por cima da tela atual — fica numa
// caixa tracejada justamente pra não se confundir com navegação.
export const VIEWS = [
  { chave: 'dashboard', label: 'Painel', Icon: LayoutGrid },
  { chave: 'pedidos', label: 'Pedidos', Icon: ClipboardList },
  { chave: 'kds', label: 'Cozinha', Icon: UtensilsCrossed },
  { chave: 'catalogo', label: 'Cardápio', Icon: Tag },
  { chave: 'lojas', label: 'Status das lojas', Icon: Activity },
  { chave: 'financeiro', label: 'Financeiro', Icon: Wallet, restrito: true },
  { chave: 'auditoria', label: 'Histórico', Icon: History },
]

export const VIEWS_ADMIN = [
  { chave: 'usuarios', label: 'Usuários', Icon: Users },
  { chave: 'lojas-admin', label: 'Lojas', Icon: Store },
  { chave: 'marca', label: 'Marca', Icon: Droplet },
]

const PAPEL_LABEL = { administrador: 'Administrador', gerente: 'Gerente', operador: 'Operador' }

function SecaoNav({ children, aberta, topo = 18 }) {
  if (!aberta) return null
  return (
    <Rotulo style={{ padding: `${topo}px 12px 6px`, flexShrink: 0 }}>
      {children}
    </Rotulo>
  )
}

function ItemNav({ Icon, label, ativo, badge, badgeTipo = 'warn', onClick, aberta }) {
  const t = tons(badgeTipo)
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-current={ativo ? 'page' : undefined}
      className="ds-nav"
      style={{ justifyContent: aberta ? 'flex-start' : 'center' }}
    >
      <span className="ds-nav__icone" style={{ display: 'flex', position: 'relative', color: ativo ? undefined : 'var(--t2)' }}>
        <Icon size={18} />
        {!!badge && !aberta && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -4,
              width: 9,
              height: 9,
              borderRadius: 99,
              background: t.fg,
              border: '2px solid var(--card)',
            }}
          />
        )}
      </span>
      {aberta && <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
      {aberta && !!badge && <Contador tipo={badgeTipo}>{badge}</Contador>}
    </button>
  )
}

function AcaoRapida({ Icon, label, badge, onClick, aberta }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="ds-opcao"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: aberta ? 'flex-start' : 'center',
        gap: 12,
        height: 38,
        padding: '0 8px',
        borderRadius: 7,
        border: 0,
        background: 'transparent',
        color: 'var(--t1)',
        fontSize: 13.5,
        fontWeight: 500,
        cursor: 'pointer',
        width: '100%',
        flexShrink: 0,
      }}
    >
      <span style={{ color: 'var(--t2)', display: 'flex', position: 'relative' }}>
        <Icon size={18} />
        {!!badge && !aberta && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -4,
              width: 9,
              height: 9,
              borderRadius: 99,
              background: 'var(--warn)',
              border: '2px solid var(--card)',
            }}
          />
        )}
      </span>
      {aberta && <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>{label}</span>}
      {aberta && !!badge && <Contador tipo="warn">{badge}</Contador>}
      {aberta && (
        <span style={{ color: 'var(--t3)', display: 'flex' }}>
          <ChevronRight size={14} />
        </span>
      )}
    </button>
  )
}

export function Sidebar({
  aberta,
  view,
  onMudarView,
  totalPausados,
  lojaNome,
  lojaPlataforma,
  totalLojas = 0,
  podeTrocarLoja = true,
  onTrocarLoja,
  userNome,
  userIniciais,
  userPapel,
  podeVerFinanceiro,
  souAdministrador,
  totalRupturas = 0,
  onPausarItem,
  onAbrirRupturas,
  onAbrirInsumo,
  onMinhaSenha,
  onSair,
  onExpandir,
}) {
  const { marca } = useContext(MarcaContext)
  const plataformaLabel = lojaPlataforma === '99food' ? '99Food' : 'iFood'

  return (
    <aside
      style={{
        width: aberta ? 256 : 72,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card)',
        borderRight: '1px solid var(--borda)',
        transition: 'width .18s ease',
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 16px 14px', justifyContent: aberta ? 'flex-start' : 'center' }}>
        {marca.logo && aberta ? (
          <img src={marca.logo} alt={marca.nome} style={{ height: 36, width: 'auto', maxWidth: 160, objectFit: 'contain' }} />
        ) : (
          <SimboloPausaFast cor={marca.cor} tamanho={36} />
        )}
        {aberta && !marca.logo && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--t1)' }}>
              {marca.nome}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap' }}>Operação delivery</div>
          </div>
        )}
      </div>

      <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {aberta && (
          <button
            type="button"
            onClick={podeTrocarLoja ? onTrocarLoja : undefined}
            disabled={!podeTrocarLoja}
            title={podeTrocarLoja ? 'Trocar de loja' : undefined}
            className="ds-btn--secundario"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '8px 10px',
              borderRadius: 9,
              border: '1px solid var(--borda)',
              background: 'var(--card2)',
              color: 'var(--t1)',
              cursor: podeTrocarLoja ? 'pointer' : 'default',
              textAlign: 'left',
            }}
          >
            <span style={{ color: 'var(--t2)', display: 'flex' }}>
              <Store size={18} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {lojaNome ? `${lojaNome} · ${plataformaLabel}` : 'Selecionar loja'}
              </span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--t3)' }}>
                {lojaNome ? `${totalLojas} ${totalLojas === 1 ? 'loja cadastrada' : 'lojas cadastradas'}` : 'nenhuma cadastrada'}
              </span>
            </span>
            {podeTrocarLoja && (
              <span style={{ color: 'var(--t3)', display: 'flex' }}>
                <ChevronDown size={16} />
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onPausarItem}
          title="Pausar item (P)"
          className="ds-btn--pausar-suave"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: aberta ? 'flex-start' : 'center',
            gap: 10,
            width: '100%',
            height: 44,
            padding: '0 12px',
            borderRadius: 9,
            border: '1px solid var(--warn-bd)',
            background: 'var(--warn-bg)',
            color: 'var(--t1)',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span style={{ color: 'var(--warn)', display: 'flex' }}>
            <Pause size={18} />
          </span>
          {aberta && (
            <>
              <span style={{ flex: 1, textAlign: 'left' }}>Pausar item</span>
              <kbd
                style={{
                  fontFamily: MONO,
                  fontSize: 11.5,
                  color: 'var(--t2)',
                  border: '1px solid var(--borda)',
                  background: 'var(--card)',
                  borderRadius: 5,
                  padding: '1px 6px',
                }}
              >
                P
              </kbd>
            </>
          )}
        </button>
      </div>

      <nav
        aria-label="Navegação principal"
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <SecaoNav aberta={aberta} topo={12}>
          Operação
        </SecaoNav>
        {VIEWS.filter((v) => !v.restrito || podeVerFinanceiro).map((v) => (
          <ItemNav
            key={v.chave}
            Icon={v.Icon}
            label={v.label}
            ativo={view === v.chave}
            badge={v.chave === 'catalogo' ? totalPausados : 0}
            onClick={() => onMudarView(v.chave)}
            aberta={aberta}
          />
        ))}

        <SecaoNav aberta={aberta}>Ações rápidas</SecaoNav>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            border: '1px dashed var(--borda)',
            borderRadius: 9,
            padding: 4,
            flexShrink: 0,
            marginTop: aberta ? 0 : 12,
          }}
        >
          <AcaoRapida Icon={PackageX} label="Rupturas" badge={totalRupturas} onClick={onAbrirRupturas} aberta={aberta} />
          <AcaoRapida Icon={Zap} label="Pausar por insumo" onClick={onAbrirInsumo} aberta={aberta} />
        </div>

        {souAdministrador && (
          <>
            <SecaoNav aberta={aberta}>Administração</SecaoNav>
            {!aberta && <div style={{ height: 12 }} />}
            {VIEWS_ADMIN.map((v) => (
              <ItemNav key={v.chave} Icon={v.Icon} label={v.label} ativo={view === v.chave} onClick={() => onMudarView(v.chave)} aberta={aberta} />
            ))}
          </>
        )}
      </nav>

      <div style={{ borderTop: '1px solid var(--linha)', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: aberta ? 'flex-start' : 'center' }}>
          {/* Recolhida, a sidebar esconde "trocar senha" e "sair": o avatar vira o jeito de abrir
              ela de volta, pra essas duas ações nunca ficarem inalcançáveis. */}
          <div
            role={aberta ? undefined : 'button'}
            tabIndex={aberta ? undefined : 0}
            onClick={aberta ? undefined : onExpandir}
            onKeyDown={aberta ? undefined : (e) => (e.key === 'Enter' || e.key === ' ') && onExpandir()}
            title={aberta ? undefined : `${userNome} · ${PAPEL_LABEL[userPapel] || userPapel} — abrir menu`}
            style={{
              cursor: aberta ? 'default' : 'pointer',
              width: 34,
              height: 34,
              borderRadius: 99,
              background: 'var(--marca-suave)',
              color: 'var(--marca-tinta)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12.5,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {userIniciais}
          </div>
          {aberta && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--t1)' }}>
                  {userNome}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>{PAPEL_LABEL[userPapel] || userPapel}</div>
              </div>
              <button type="button" onClick={onMinhaSenha} title="Trocar minha senha" aria-label="Trocar minha senha" className="ds-icone" style={{ width: 34, height: 34 }}>
                <KeyRound size={16} />
              </button>
              <button type="button" onClick={onSair} title="Sair" aria-label="Sair" className="ds-icone" style={{ width: 34, height: 34 }}>
                <LogOut size={16} />
              </button>
            </>
          )}
        </div>
        {aberta && <div style={{ fontSize: 12, color: 'var(--t3)', paddingLeft: 2 }}>com PausaFast</div>}
      </div>
    </aside>
  )
}
