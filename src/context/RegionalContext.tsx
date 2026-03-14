import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Regional } from '../types'
import { api } from '../lib/api'
import { useAuth } from './AuthContext'

interface RegionalContextType {
  regionais: Regional[]           // apenas as que o usuário tem acesso
  todasRegionais: boolean         // true se usuário tem acesso a todas
  regionalAtiva: Regional | null  // null = "todas"
  setRegionalAtiva: (r: Regional | null) => void
}

const RegionalContext = createContext<RegionalContextType>({
  regionais: [], todasRegionais: false, regionalAtiva: null, setRegionalAtiva: () => {},
})

export function RegionalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [todasRegionais, setTodasRegionais] = useState<Regional[]>([])
  const [regionais, setRegionais] = useState<Regional[]>([])
  const [regionalAtiva, setRegionalAtivaState] = useState<Regional | null>(null)

  useEffect(() => {
    api.getRegionais().then(regs => {
      setTodasRegionais(regs)

      // Filtra as regionais que o usuário tem acesso
      const disponiveis = user && user.regionalIds.length > 0
        ? regs.filter(r => user.regionalIds.includes(r.id))
        : regs  // admin ou regionalIds vazio = todas

      setRegionais(disponiveis)

      // Restaura seleção do localStorage
      const savedId = localStorage.getItem('regionalAtiva')
      const temAcessoTodas = !user || user.regionalIds.length === 0 || user.regionalIds.length >= regs.length

      if (savedId === 'todas' && temAcessoTodas) {
        setRegionalAtivaState(null)
      } else {
        const saved = savedId && savedId !== 'todas' ? disponiveis.find(r => r.id === Number(savedId)) : null
        setRegionalAtivaState(saved ?? disponiveis[0] ?? null)
      }
    })
  }, [user])

  function setRegionalAtiva(r: Regional | null) {
    setRegionalAtivaState(r)
    localStorage.setItem('regionalAtiva', r ? String(r.id) : 'todas')
  }

  const temAcessoTodas = !user || user.regionalIds.length === 0 || user.regionalIds.length >= todasRegionais.length

  return (
    <RegionalContext.Provider value={{ regionais, todasRegionais: temAcessoTodas, regionalAtiva, setRegionalAtiva }}>
      {children}
    </RegionalContext.Provider>
  )
}

export function useRegional() { return useContext(RegionalContext) }
