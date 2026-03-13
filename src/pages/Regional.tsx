import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, Clock } from 'lucide-react'
import type { Regional, Unidade, VisitaRecente } from '../types'
import { formatDate, diasSemVisita, semaforoVisita } from '../lib/utils'
import { api } from '../lib/api'

const SEMAFORO_BG = {
  verde:    'bg-green-50 border-green-200',
  amarelo:  'bg-yellow-50 border-yellow-200',
  vermelho: 'bg-red-50 border-red-200',
  cinza:    'bg-gray-50 border-gray-200',
}
const SEMAFORO_DOT = {
  verde: 'bg-green-500', amarelo: 'bg-yellow-400', vermelho: 'bg-red-500', cinza: 'bg-gray-300'
}

export default function RegionalPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [regional, setRegional] = useState<Regional | null>(null)
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [ultimasVisitas, setUltimasVisitas] = useState<Record<number, VisitaRecente>>({})

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getRegionais(),
      api.getUnidades(Number(id)),
      api.getVisitasRecentes(50),
    ]).then(([regs, units, vis]) => {
      setRegional(regs.find(r => r.id === Number(id)) ?? null)
      setUnidades(units.filter(u => u.ativa))
      const map: Record<number, VisitaRecente> = {}
      vis.filter(v => v.regionalId === Number(id)).forEach(v => {
        if (!map[v.unidadeId]) map[v.unidadeId] = v
      })
      setUltimasVisitas(map)
    })
  }, [id])

  if (!regional) return <div className="p-8 text-gray-400">Carregando...</div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <p className="text-sm text-gray-400 mb-1">Diretoria Regional</p>
        <h1 className="text-2xl font-bold text-gray-900">{regional.nome}</h1>
        {regional.diretorNome && (
          <p className="text-gray-500 mt-1">Diretor: <span className="font-medium">{regional.diretorNome}</span></p>
        )}
      </div>

      {/* Grid de unidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {unidades.map(u => {
          const ultima = ultimasVisitas[u.id]
          const dias = ultima ? diasSemVisita(ultima.dataVisita) : null
          const cor = semaforoVisita(dias)

          return (
            <div
              key={u.id}
              onClick={() => navigate(`/unidade/${u.id}`)}
              className={`rounded-xl border p-5 cursor-pointer hover:shadow-md transition-all ${SEMAFORO_BG[cor]}`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-base">{u.nome}</h3>
                <div className={`w-3 h-3 rounded-full mt-1 ${SEMAFORO_DOT[cor]}`} />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock size={12} />
                {ultima
                  ? <>Última visita: <strong>{formatDate(ultima.dataVisita)}</strong> ({dias}d)</>
                  : 'Nenhuma visita registrada'
                }
              </div>

              {ultima?.status === 'em_andamento' && (
                <span className="mt-2 inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  Visita em andamento
                </span>
              )}

              <div className="mt-3 flex items-center justify-end text-brand-600 text-xs font-medium">
                Ver unidade <ChevronRight size={14} />
              </div>
            </div>
          )
        })}

        {/* Botão adicionar unidade */}
        <div
          onClick={() => navigate('/configuracoes')}
          className="rounded-xl border-2 border-dashed border-gray-200 p-5 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-brand-600"
        >
          <Plus size={24} />
          <span className="text-sm font-medium">Adicionar unidade</span>
        </div>
      </div>
    </div>
  )
}
