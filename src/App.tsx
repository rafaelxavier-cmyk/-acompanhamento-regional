import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RegionalProvider } from './context/RegionalContext'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import RegionalPage from './pages/Regional'
import UnidadePage from './pages/Unidade'
import VisitaPage from './pages/Visita'
import DemandasPage from './pages/Demandas'
import HistoricoPage from './pages/Historico'
import ConfiguracoesPage from './pages/Configuracoes'
import PlanoVisitaPage from './pages/PlanoVisita'

export default function App() {
  return (
    <BrowserRouter>
      <RegionalProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="regional/:id" element={<RegionalPage />} />
          <Route path="unidade/:id" element={<UnidadePage />} />
          <Route path="visita/:id" element={<VisitaPage />} />
          <Route path="demandas" element={<DemandasPage />} />
          <Route path="historico" element={<HistoricoPage />} />
          <Route path="configuracoes" element={<ConfiguracoesPage />} />
          <Route path="unidade/:id/plano" element={<PlanoVisitaPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      </RegionalProvider>
    </BrowserRouter>
  )
}
