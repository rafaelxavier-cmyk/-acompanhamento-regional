import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Regional } from '../types'
import { api } from '../lib/api'

interface RegionalContextType {
  regionais: Regional[]
  regionalAtiva: Regional | null
  setRegionalAtiva: (r: Regional | null) => void
}

const RegionalContext = createContext<RegionalContextType>({
  regionais: [],
  regionalAtiva: null,
  setRegionalAtiva: () => { },
})

export function RegionalProvider({ children }: { children: ReactNode }) {
  const [regionais, setRegionais] = useState<Regional[]>([])
  const [regionalAtiva, setRegionalAtivaState] = useState<Regional | null>(null)

  useEffect(() => {
    api.getRegionais().then(regs => {
      setRegionais(regs)
      const savedId = localStorage.getItem('regionalAtiva')
      if (savedId === 'todas') {
        setRegionalAtivaState(null)
      } else {
        const saved = savedId ? regs.find(r => r.id === Number(savedId)) : null
        setRegionalAtivaState(saved ?? regs[0] ?? null)
      }
    })
  }, [])

  function setRegionalAtiva(r: Regional | null) {
    setRegionalAtivaState(r)
    localStorage.setItem('regionalAtiva', r ? String(r.id) : 'todas')
  }

  return (
    <RegionalContext.Provider value={{ regionais, regionalAtiva, setRegionalAtiva }}>
      {children}
    </RegionalContext.Provider>
  )
}

export function useRegional() {
  return useContext(RegionalContext)
}
