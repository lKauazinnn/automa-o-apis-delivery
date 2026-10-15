// Rótulos e cores de pedido compartilhados pelas telas que falam de pedido: Pedidos, Cozinha
// (KDS), Financeiro e o modal de detalhes. Antes cada arquivo tinha a sua cópia de TIPO_LABEL e
// STATUS_LABEL, e o METODO_LABEL (pt-BR das formas de pagamento) existia só no modal — por isso
// a tabela de Pedidos e o Financeiro mostravam o código cru da API ("MEAL_VOUCHER") pra quem
// está no balcão. Uma fonte só evita a próxima divergência.

export const STATUS_LABEL = {
  NOVO: 'Novo',
  CONFIRMADO: 'Confirmado',
  DESPACHADO: 'Despachado',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

// Novo e a caminho são o mesmo azul de "em andamento"; em preparo é âmbar (pede atenção);
// concluído verde; cancelado vermelho. Recebe a paleta ativa porque os tons mudam por tema.
export const STATUS_COR = (C) => ({
  NOVO: C.info,
  CONFIRMADO: C.neutral,
  DESPACHADO: C.info,
  CONCLUIDO: C.good,
  CANCELADO: C.bad,
})

export const PROXIMO_STATUS = { NOVO: 'CONFIRMADO', CONFIRMADO: 'DESPACHADO', DESPACHADO: 'CONCLUIDO' }

export const TIPO_LABEL = { ENTREGA: 'Entrega', RETIRADA: 'Retirada', MESA: 'Mesa' }

export const METODO_LABEL = {
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  CASH: 'Dinheiro',
  MEAL_VOUCHER: 'Vale-refeição',
  FOOD_VOUCHER: 'Vale-alimentação',
  PIX: 'Pix',
  DIGITAL_WALLET: 'Carteira digital',
  GIFT_CARD: 'Vale-presente',
}

// O campo `pagamento` do pedido é a lista crua de métodos vinda da plataforma, separada por
// vírgula ("CREDIT, MEAL_VOUCHER"). Traduz cada um e devolve já pronto pra tela.
export function rotularPagamento(bruto) {
  const texto = String(bruto || '').trim()
  if (!texto) return '—'
  return texto
    .split(',')
    .map((m) => {
      const chave = m.trim().toUpperCase()
      return METODO_LABEL[chave] || m.trim()
    })
    .filter(Boolean)
    .join(' · ')
}

// O identificador do pedido na plataforma é um UUID (iFood) ou "99-<número>" (99Food). Inteiro
// ele ocupa três linhas no card do KDS e empurra pra baixo o que a cozinha precisa ler — nome e
// itens. Na tela entra o final curto, que é o que a equipe usa pra conferir com a sacola; o
// identificador completo continua acessível no `title` e no modal de detalhes.
export function codigoCurto(ifoodOrderId) {
  const id = String(ifoodOrderId || '').trim()
  if (!id) return '—'
  if (id.startsWith('99-')) return id
  const ultimo = id.split('-').pop()
  return (ultimo || id).slice(-6).toUpperCase()
}
