export type OrderStatus =
  | 'Pendente'
  | 'Confirmado'
  | 'Pronto'
  | 'Saiu para entrega'
  | 'Retirado'
  | 'Concluído'
  | 'Cancelado'

export type OrderType = 'Agendado' | 'Manual' | 'Retirada' | 'Entrega'

export interface OrderSummary {
  id: number
  codigo: string
  tipo: string
  status: OrderStatus
  pagamento_forma: string | null
  documento: string | null
  loja_nome: string | null
  total: number
  itens_count: number
  oculto_no_kds: boolean
  recebido_em: string
}

export interface Complement {
  id: number
  nome: string
  nivel: string | null
  preco: number
}

export interface Item {
  id: number
  quantidade: number
  nome: string
  tag: string | null
  codigo_pdv: string | null
  preco: number
  complements: Complement[]
}

export interface OrderEvent {
  id: number
  tipo: string
  info: string | null
  timestamp: string
}

export interface Store {
  id: number
  nome: string
  endereco: string | null
  status_integracao: string
}

export interface OrderDetail {
  id: number
  codigo: string
  identificador_ifood: string | null
  tipo: string
  status: OrderStatus
  pagamento_forma: string | null
  pagamento_online: boolean
  pre_pago: number
  a_receber: number
  documento: string | null
  store: Store | null
  entrega_endereco: string | null
  entrega_bairro: string | null
  entrega_cidade: string | null
  entrega_cep: string | null
  entrega_complemento: string | null
  entrega_referencia: string | null
  entrega_modo: string | null
  entrega_descricao: string | null
  entregue_por: string | null
  cod_retirada: string | null
  previsto_em: string | null
  observacoes: string | null
  separacao_responsavel: string | null
  subtotal: number
  taxa_entrega: number
  outras_taxas: number
  total: number
  cancelamento_solicitado: boolean
  cancelamento_status: string | null
  oculto_no_kds: boolean
  recebido_em: string
  items: Item[]
  events: OrderEvent[]
}

export interface Paginated {
  registros: OrderSummary[]
  total: number
  page: number
  per_page: number
}
