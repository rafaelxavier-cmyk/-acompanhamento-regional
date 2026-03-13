import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ChevronRight } from 'lucide-react'
import type { VisitaRecente, Unidade } from '../types'
import { formatDate } from '../lib/utils'
import { useRegional } from '../context/RegionalContext'
import { api } from '../lib/api'

export default function HistoricoPage() {
  const navigate = useNavigate()
  const { regionalAtiva } = useRegional()
  const [visitas, setVisitas] = useState<VisitaRecente[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  useEffect(() => {
    Promise.all([
      api.getVisitasRecentes(100),
      api.getUnidades(),
    ]).then(([vis, units]) => {
      setVisitas(vis)
      setUnidades(units)
    })
  }, [])

  const visitasDaRegional = regionalAtiva
    ? visitas.filter(v => v.regionalId === regionalAtiva.id)
    : visitas

  const unidadesDaRegional = regionalAtiva
    ? unidades.filter(u => u.regionalId === regionalAtiva.id)
    : unidades

  const filtradas = visitasDaRegional
    .filter(v => !filtroUnidade || v.unidadeId === Number(filtroUnidade))
    .filter(v => !filtroStatus || v.status === filtroStatus)

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <History size={24} className="text-gray-500" />
          Histórico de visitas
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {filtradas.length} visita(s){regionalAtiva ? ` — ${regionalAtiva.nome}` : ''}
        </p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <select
          value={filtroUnidade}
          onChange={e => setFiltroUnidade(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todas as unidades</option>
          {unidadesDaRegional.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todos os status</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <History size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma visita encontrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Macrocaixas avaliadas</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map(v => {
                return (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/visita/${v.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-gray-800">{formatDate(v.dataVisita)}</td>
                    <td className="px-5 py-3 text-gray-600">{v.unidadeNome}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        v.status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {v.status === 'concluida' ? 'Concluída' : 'Em andamento'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{v.totalRegistros} / 10</td>
                    <td className="px-5 py-3 text-gray-300"><ChevronRight size={16} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
