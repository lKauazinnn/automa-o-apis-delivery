import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PedidosPage } from './pages/PedidosPage'
import { StubPage } from './pages/StubPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/orders" replace />} />
        <Route path="/orders" element={<PedidosPage />} />
        <Route path="/orders/kds" element={<StubPage titulo="KDS" descricao="Quadro de pedidos por status — chega na Fase 4." />} />
        <Route path="/dashboard" element={<StubPage titulo="Painel" descricao="Visão de hoje por loja." />} />
        <Route path="/reviews" element={<StubPage titulo="Avaliações" />} />
        <Route path="/menu/manage" element={<StubPage titulo="Gerenciar Cardápio" />} />
        <Route path="/menu" element={<StubPage titulo="Cardápio (clássico)" />} />
        <Route path="/trash" element={<StubPage titulo="Lixeira" />} />
        <Route path="/problems" element={<StubPage titulo="Problemas" />} />
        <Route path="/stores" element={<StubPage titulo="Lojas" />} />
        <Route path="/events" element={<StubPage titulo="Eventos" />} />
        <Route path="/agent" element={<StubPage titulo="Agente" />} />
        <Route path="/configurations" element={<StubPage titulo="Configurações" />} />
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Routes>
    </Layout>
  )
}
