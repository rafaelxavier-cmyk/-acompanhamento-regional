import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, MapPin, History, Settings, AlertCircle, ChevronDown, Layers, Menu, X, Users, LogOut, Shield, User, Sparkles, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import { useRegional } from '../../context/RegionalContext'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'
import RelatorioIAModal from '../RelatorioIAModal'
import RegistrarVisitaModal from '../RegistrarVisitaModal'

export default function Sidebar() {
  const { regionais, todasRegionais, regionalAtiva, setRegionalAtiva } = useRegional()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [relatorioOpen, setRelatorioOpen] = useState(false)
  const [registrarOpen, setRegistrarOpen] = useState(false)

  const navItems = [
    { to: '/',              icon: LayoutDashboard, label: 'Dashboard'     },
    { to: '/demandas',      icon: AlertCircle,     label: 'Demandas'      },
    { to: '/historico',     icon: History,         label: 'Histórico'     },
    { to: '/configuracoes', icon: Settings,        label: 'Configurações' },
    ...(user?.perfil === 'admin' ? [{ to: '/usuarios', icon: Users, label: 'Usuários' }] : []),
  ]

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-brand-700">
        <p className="text-brand-300 text-xs font-medium uppercase tracking-widest">Matriz Educação</p>
        <h1 className="text-white font-bold text-base leading-tight mt-0.5">Acompanhamento<br/>Regional</h1>
      </div>

      {/* Regional selector */}
      {regionais.length > 0 && (
        <div className="px-3 py-3 border-b border-brand-700">
          <p className="px-2 text-xs font-semibold text-brand-400 uppercase tracking-wider mb-1.5">Regional ativa</p>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(v => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-700 text-white text-sm font-medium transition-colors hover:bg-brand-600"
            >
              {regionalAtiva === null
                ? <Layers size={14} className="text-brand-300 flex-shrink-0" />
                : <MapPin size={14} className="text-brand-300 flex-shrink-0" />
              }
              <span className="flex-1 text-left truncate">{regionalAtiva?.nome ?? 'Todas as regionais'}</span>
              {(todasRegionais || regionais.length > 1) && (
                <ChevronDown size={14} className={cn('text-brand-300 transition-transform flex-shrink-0', dropdownOpen && 'rotate-180')} />
              )}
            </button>

            {dropdownOpen && (todasRegionais || regionais.length > 1) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-brand-800 border border-brand-600 rounded-lg overflow-hidden shadow-xl z-50">
                {todasRegionais && (
                  <button
                    onClick={() => { setRegionalAtiva(null); setDropdownOpen(false) }}
                    className={cn('w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors border-b border-brand-700',
                      regionalAtiva === null ? 'bg-brand-600 text-white font-medium' : 'text-brand-200 hover:bg-brand-700 hover:text-white')}
                  >
                    <Layers size={13} /> Todas as regionais
                  </button>
                )}
                {regionais.map(r => (
                  <button
                    key={r.id}
                    onClick={() => { setRegionalAtiva(r); setDropdownOpen(false) }}
                    className={cn('w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors',
                      r.id === regionalAtiva?.id ? 'bg-brand-600 text-white font-medium' : 'text-brand-200 hover:bg-brand-700 hover:text-white')}
                  >
                    <MapPin size={13} /> {r.nome}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ações rápidas */}
      <div className="px-3 py-3 border-b border-brand-700 space-y-2">
        <button
          onClick={() => { setRegistrarOpen(true); setMobileOpen(false) }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-500 hover:bg-green-400 text-white text-sm font-semibold transition-colors"
        >
          <ClipboardList size={15} className="flex-shrink-0" />
          <span>Registrar visita</span>
        </button>
        <button
          onClick={() => { setRelatorioOpen(true); setMobileOpen(false) }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-brand-700 hover:bg-brand-600 text-white text-sm font-medium transition-colors"
        >
          <Sparkles size={15} className="flex-shrink-0" />
          <span>Relatório por IA</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => { setDropdownOpen(false); setMobileOpen(false) }}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive ? 'bg-brand-700 text-white font-medium' : 'text-brand-200 hover:bg-brand-800 hover:text-white'
            )}
          >
            <Icon size={16} /> {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-3 border-t border-brand-700">
        <div className="flex items-center gap-2 px-2 py-1 mb-1">
          <div className="p-1 bg-brand-700 rounded-full">
            {user?.perfil === 'admin' ? <Shield size={12} className="text-brand-300" /> : <User size={12} className="text-brand-300" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.nome}</p>
            <p className="text-brand-400 text-xs truncate">{user?.perfil === 'admin' ? 'Administrador' : 'Usuário'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-brand-300 hover:bg-brand-800 hover:text-white text-sm transition-colors"
        >
          <LogOut size={14} /> Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-12 bg-brand-900 flex items-center px-4 z-40 border-b border-brand-700">
        <button onClick={() => setMobileOpen(true)} className="text-white mr-3">
          <Menu size={20} />
        </button>
        <span className="text-white font-semibold text-sm">Acompanhamento Regional</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-brand-900 flex flex-col h-full overflow-y-auto">
            <div className="flex justify-end p-3">
              <button onClick={() => setMobileOpen(false)} className="text-brand-300 hover:text-white">
                <X size={20} />
              </button>
            </div>
            {sidebarContent}
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-brand-900 flex-col h-full flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Modais */}
      {registrarOpen && <RegistrarVisitaModal onClose={() => setRegistrarOpen(false)} />}
      {relatorioOpen && <RelatorioIAModal onClose={() => setRelatorioOpen(false)} />}
    </>
  )
}
