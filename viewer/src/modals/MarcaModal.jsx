import { useContext, useState } from 'react'
import { Check, ImagePlus, Loader2, Pause, Trash2 } from 'lucide-react'
import { Modal, PALETAS, Pill } from '../ui'
import { SimboloPausaFast } from '../Logo'
import { contraste, corValida, guardarMarcaEmCache, MARCA_PADRAO, MarcaContext, tokensDaMarca } from '../marca'

// Sugestões que funcionam bem nos dois temas. O cliente pode pôr qualquer hex — o sistema deriva
// rótulo, hover e a versão legível pra texto sozinho.
const SUGESTOES = ['#2B59C3', '#0B7A75', '#7A3FC4', '#C2410C', '#B4235A', '#1F2937']
const TIPOS_LOGO = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']
const LOGO_MAX = 220 * 1024 // o data URL cresce ~33% em base64; o backend aceita até 300 KB

function lerArquivo(arquivo) {
  return new Promise((resolve, reject) => {
    if (!TIPOS_LOGO.includes(arquivo.type)) return reject(new Error('Use PNG, SVG, JPEG ou WEBP.'))
    if (arquivo.size > LOGO_MAX) return reject(new Error('A logo passou de 220 KB. Exporte numa resolução menor.'))
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result)
    leitor.onerror = () => reject(new Error('Não consegui ler o arquivo.'))
    leitor.readAsDataURL(arquivo)
  })
}

export function MarcaModal({ onClose, apiFetch, notificar, C, inputCls, inputStyle }) {
  const { marca, setMarca } = useContext(MarcaContext)
  const [form, setForm] = useState({ nome: marca.nome, cor: marca.cor, logo: marca.logo })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const valida = corValida(form.cor)
  const tema = C.cardBg === PALETAS.escuro.cardBg ? 'escuro' : 'claro'
  const t = tokensDaMarca(valida ? form.cor : MARCA_PADRAO.cor, tema)
  const contrasteFundoClaro = contraste(t.marca, '#FFFFFF')

  async function escolherLogo(e) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      const logo = await lerArquivo(arquivo)
      setForm((f) => ({ ...f, logo }))
      setErro('')
    } catch (err) {
      setErro(err.message)
    }
  }

  async function salvar(e) {
    e.preventDefault()
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
      notificar('sucesso', 'Marca atualizada para toda a equipe.')
      onClose()
    } catch (err) {
      setErro(err.message)
    } finally {
      setSalvando(false)
    }
  }

  const rotulo = 'text-[11.5px] font-bold uppercase tracking-widest mb-2 block'

  return (
    <Modal titulo="Marca da empresa" eyebrow="Administração" onClose={onClose} largura="max-w-2xl">
      <form onSubmit={salvar} className="grid md:grid-cols-[1fr_240px] gap-6">
        <div className="flex flex-col gap-4 min-w-0">
          <div>
            <label htmlFor="marca-nome" className={rotulo} style={{ color: C.text2 }}>
              Nome
            </label>
            <input
              id="marca-nome"
              className={inputCls}
              style={inputStyle}
              maxLength={40}
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Nome que a equipe vê no painel"
            />
          </div>

          <div>
            <label htmlFor="marca-cor" className={rotulo} style={{ color: C.text2 }}>
              Cor de destaque
            </label>
            <div className="flex items-center gap-2.5 mb-2.5">
              <input
                type="color"
                aria-label="Escolher cor"
                value={valida ? form.cor : MARCA_PADRAO.cor}
                onChange={(e) => setForm({ ...form, cor: e.target.value.toUpperCase() })}
                className="w-11 h-11 rounded-lg cursor-pointer flex-shrink-0"
                style={{ border: `1px solid ${C.cardBorder}`, background: C.inputBg, padding: 3 }}
              />
              <input
                id="marca-cor"
                className={inputCls + ' fonte-mono'}
                style={inputStyle}
                value={form.cor}
                maxLength={7}
                onChange={(e) => setForm({ ...form, cor: e.target.value.trim() })}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {SUGESTOES.map((cor) => (
                <button
                  key={cor}
                  type="button"
                  onClick={() => setForm({ ...form, cor })}
                  aria-label={`Usar ${cor}`}
                  className="w-8 h-8 rounded-lg inline-flex items-center justify-center"
                  style={{ background: cor, border: `1px solid ${C.cardBorder}` }}
                >
                  {form.cor.toUpperCase() === cor && <Check size={15} color={tokensDaMarca(cor).marcaTexto} strokeWidth={3} />}
                </button>
              ))}
            </div>
            {valida && contrasteFundoClaro < 3 && (
              <p className="text-xs mt-2.5 leading-relaxed" style={{ color: C.neutral }}>
                Essa cor some um pouco sobre o fundo branco ({contrasteFundoClaro.toFixed(1)}:1). Funciona, mas botões e
                seleções vão ficar discretos no tema claro.
              </p>
            )}
          </div>

          <div>
            <span className={rotulo} style={{ color: C.text2 }}>
              Logo
            </span>
            <div className="flex items-center gap-2.5 flex-wrap">
              <label
                className="inline-flex items-center gap-2 px-3.5 rounded-xl font-semibold cursor-pointer botao-icone-fantasma"
                style={{ color: C.text1, border: `1px solid ${C.cardBorder}`, height: 40, fontSize: 13.5 }}
              >
                <ImagePlus size={15} />
                {form.logo ? 'Trocar logo' : 'Enviar logo'}
                <input type="file" accept={TIPOS_LOGO.join(',')} className="sr-only" onChange={escolherLogo} />
              </label>
              {form.logo && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, logo: null })}
                  className="botao-icone-fantasma inline-flex items-center gap-1.5 px-3 rounded-xl font-semibold"
                  style={{ color: C.bad, height: 40, fontSize: 13.5 }}
                >
                  <Trash2 size={14} />
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: C.text3 }}>
              PNG ou SVG com fundo transparente, até 220 KB. Sem logo, o painel usa o símbolo na sua cor.
            </p>
          </div>

          {erro && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ color: C.bad, background: C.badBg, border: `1px solid ${C.badBd}` }}>
              {erro}
            </p>
          )}

          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              disabled={salvando}
              className="botao-primario flex items-center gap-1.5 text-xs font-bold px-3.5 py-2.5 rounded-xl disabled:opacity-40"
            >
              {salvando && <Loader2 size={12} className="animate-spin" />}
              {salvando ? 'Salvando...' : 'Salvar marca'}
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...MARCA_PADRAO })}
              className="text-xs font-semibold px-3.5 py-2.5 rounded-xl"
              style={{ color: C.text2, background: C.inputBg, border: `1px solid ${C.cardBorder}` }}
            >
              Voltar ao padrão PausaFast
            </button>
          </div>
        </div>

        {/* Prévia: os mesmos elementos que a cor pinta no painel, com a cor ainda não salva. */}
        <div className="rounded-xl p-4 flex flex-col gap-3.5 self-start" style={{ background: C.bg, border: `1px solid ${C.cardBorder}` }}>
          <span className={rotulo + ' mb-0'} style={{ color: C.text3 }}>
            Prévia
          </span>
          <div className="flex items-center gap-2.5 min-w-0">
            {form.logo ? (
              <img src={form.logo} alt="" style={{ height: 32, maxWidth: 160 }} className="object-contain" />
            ) : (
              <>
                <SimboloPausaFast cor={t.marca} tamanho={32} />
                <span className="font-bold truncate" style={{ color: C.text1, fontSize: 15 }}>
                  {form.nome || 'Sua marca'}
                </span>
              </>
            )}
          </div>
          <button
            type="button"
            tabIndex={-1}
            className="inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl"
            style={{ background: t.marca, color: t.marcaTexto, height: 38, fontSize: 13.5 }}
          >
            <Pause size={14} />
            Pausar item
          </button>
          <div
            className="rounded-lg px-3 flex items-center font-semibold"
            style={{ background: t.marcaSuave, border: `1px solid ${t.marcaBorda}`, color: C.text1, height: 36, fontSize: 13 }}
          >
            Item selecionado
          </div>
          <span className="font-semibold" style={{ color: t.marcaTinta, fontSize: 13 }}>
            Link e ícone de destaque
          </span>
          <Pill color={t.contrasteRotulo >= 4.5 ? C.good : C.neutral} dot>
            Rótulo do botão {t.contrasteRotulo.toFixed(1)}:1
          </Pill>
        </div>
      </form>
    </Modal>
  )
}
