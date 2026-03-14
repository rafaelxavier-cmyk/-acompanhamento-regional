import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { RegionalProvider } from './context/RegionalContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/Login'
import TrocarSenhaPage from './pages/TrocarSenha'
import Dashboard from './pages/Dashboard'
import RegionalPage from './pages/Regional'
import UnidadePage from './pages/Unidade'
import VisitaPage from './pages/Visita'
import DemandasPage from './pages/Demandas'
import HistoricoPage from './pages/Historico'
import ConfiguracoesPage from './pages/Configuracoes'
import PlanoVisitaPage from './pages/PlanoVisita'
import UsuariosPage from './pages/Usuarios'

function PrivateRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>
  if (!user) return <Navigate to="/login" replace />
  return (
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
          <Route path="usuarios" element={user.perfil === 'admin' ? <UsuariosPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </RegionalProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/trocar-senha" element={<TrocarSenhaPage />} />
          <Route path="/*" element={<PrivateRoutes />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}
