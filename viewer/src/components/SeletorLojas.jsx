import { useMemo, useRef, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Botao, CampoBusca, Dialogo, EstadoVazio, MONO } from '../ds'
import { normalizar } from '../pausas'
import { tomDaLoja } from './statusLoja'

// "Trocar de loja". As linhas ficam com fundo transparente de propósito: o diálogo já é vidro
// denso (--card-forte) e cada linha com `background: var(--card)` ganhava um segundo desfoque
// por cima — o conteúdo embaçava e a lista parecia suja. Hover vem de .ds-opcao.
export function SeletorLojas({ lojas, lojaAtualId, statusPorLoja = {}, podeGerenciar, onEscolher, onGerenciar, onClose }) {
  const [busca, setBusca] = useState('')
  const inputRef = useRef(null)
  const comBusca = lojas.length > 6

  const filtradas = useMemo(() => {
    const termo = normalizar(busca).trim()
    if (!termo) return lojas
    return lojas.filter((l) => normalizar(`${l.nome} ${l.merchant_id} ${l.plataforma === '99food' ? '99food' : 'ifood'}`).includes(termo))
  }, [lojas, busca])

  return (
    <Dialogo
      largura={560}
      eyebrow="Loja ativa"
      titulo="Trocar de loja"
      descricao="O painel inteiro — cardápio, pedidos e cozinha — passa a mostrar a loja escolhida."
      onClose={onClose}
      rodape={
        <>
          {podeGerenciar && (
            <Botao variante="link" onClick={onGerenciar}>
              Gerenciar lojas
            </Botao>
          )}
          <span style={{ flex: 1 }} />
          <Botao variante="secundario" tamanho="lg" onClick={onClose}>
            Fechar
          </Botao>
        </>
      }
    >
      {lojas.length === 0 ? (
        <div style={{ fontSize: 13.5, color: 'var(--t2)' }}>Nenhuma loja cadastrada ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          {comBusca && (
            <CampoBusca
              inputRef={inputRef}
              autoFocus
              valor={busca}
              onChange={setBusca}
              onLimpar={() => {
                setBusca('')
                inputRef.current?.focus()
              }}
              placeholder={`Buscar entre ${lojas.length} lojas`}
              icone={<Search size={16} />}
              aria-label="Buscar loja"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtradas.length === 1) onEscolher(filtradas[0])
              }}
            />
          )}
          {filtradas.length === 0 ? (
            <EstadoVazio compacto titulo="Nenhuma loja encontrada" texto={`Nenhuma das ${lojas.length} lojas tem "${busca}" no nome.`} acao={<Botao variante="secundario" tamanho="sm" onClick={() => setBusca('')}>Limpar busca</Botao>} />
          ) : (
            <div role="radiogroup" aria-label="Lojas" style={{ border: '1px solid var(--borda)', borderRadius: 12, overflow: 'hidden' }}>
              {filtradas.map((l, k) => {
                const ativa = l.merchant_id === lojaAtualId
                const st = tomDaLoja(statusPorLoja[l.merchant_id])
                return (
                  <button
                    key={l.id || l.merchant_id}
                    type="button"
                    role="radio"
                    aria-checked={ativa}
                    onClick={() => onEscolher(l)}
                    className={ativa ? undefined : 'ds-opcao'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      minHeight: 56,
                      padding: '8px 14px',
                      border: 0,
                      borderTop: k ? '1px solid var(--linha)' : 0,
                      background: ativa ? 'var(--marca-suave)' : undefined,
                      boxShadow: ativa ? 'inset 3px 0 0 var(--marca)' : undefined,
                      color: 'var(--t1)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      title={st.titulo}
                      aria-label={st.titulo}
                      style={{ width: 9, height: 9, borderRadius: 99, background: st.cor, flexShrink: 0 }}
                    />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.nome || 'Loja sem nome'}</span>
                      <span style={{ display: 'block', fontSize: 12, color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ color: st.corTexto }}>{st.rotulo}</span>
                        <span style={{ fontFamily: MONO }}> · {l.merchant_id}</span>
                      </span>
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 6, background: 'var(--input)', border: '1px solid var(--borda)', color: 'var(--t2)', flexShrink: 0 }}>
                      {l.plataforma === '99food' ? '99Food' : 'iFood'}
                    </span>
                    <span style={{ width: 18, display: 'flex', justifyContent: 'center', color: 'var(--marca-tinta)', flexShrink: 0 }}>{ativa && <Check size={18} strokeWidth={2.5} />}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </Dialogo>
  )
}
