import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export interface AuthUser {
  id: number
  nome: string
  login: string
  perfil: 'admin' | 'usuario'
  regionalIds: number[]   // vazio = acesso a todas
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, loading: true,
  login: () => {}, logout: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = localStorage.getItem('token')
    const u = localStorage.getItem('user')
    if (t && u) {
      try { setToken(t); setUser(JSON.parse(u)) } catch { /* ignore */ }
    }
    setLoading(false)
  }, [])

  function login(t: string, u: AuthUser) {
    setToken(t); setUser(u)
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function logout() {
    setToken(null); setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('regionalAtiva')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
