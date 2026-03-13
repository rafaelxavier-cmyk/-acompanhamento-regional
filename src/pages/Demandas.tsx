import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react'
import type { DemandaAberta, PrioridadeDemanda } from '../types'
import { formatDate } from '../lib/utils'
import { cn } from '../lib/utils'
import { useRegional } from '../context/RegionalContext'
import { api } from '../lib/api'

const PRIORIDADE_ORDER: PrioridadeDemanda[] = ['urgente', 'alta', 'normal', 'baixa']

const PRIORIDADE_STYLE: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  alta:    'bg-orange-100 text-orange-700',
  normal:  'bg-gray-100 text-gray-600',
  baixa:   'bg-blue-50 text-blue-600',
}

export default function DemandasPage() {
  const navigate = useNavigate()
  const { regionalAtiva } = useRegional()
  const [demandas, setDemandas] = useState<DemandaAberta[]>([])
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroPrioridade, setFiltroPrioridade] = useState('')

  useEffect(() => {
    api.getDemandasAbertas().then(setDemandas)
  }, [])

  async function concluir(id: number) {
    await api.updateDemanda(id, { statusDemanda: 'concluida' })
    setDemandas(prev => prev.filter(d => d.id !== id))
  }

  const demandasDaRegional = regionalAtiva
    ? demandas.filter(d => d.regionalId === regionalAtiva.id)
    : demandas

  const unidades = [...new Set(demandasDaRegional.map(d => d.unidadeNome))].sort()

  const filtradas = demandasDaRegional
    .filter(d => !filtroUnidade || d.unidadeNome === filtroUnidade)
    .filter(d => !filtroPrioridade || d.prioridade === filtroPrioridade)
    .sort((a, b) =>
      PRIORIDADE_ORDER.indexOf(a.prioridade) - PRIORIDADE_ORDER.indexOf(b.prioridade)
    )

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="text-orange-500" size={24} />
            Demandas abertas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
          {filtradas.length} demanda(s){regionalAtiva ? ` — ${regionalAtiva.nome}` : ''}
        </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <select
          value={filtroUnidade}
          onChange={e => setFiltroUnidade(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todas as unidades</option>
          {unidades.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          value={filtroPrioridade}
          onChange={e => setFiltroPrioridade(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="">Todas as prioridades</option>
          {PRIORIDADE_ORDER.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {/* Tabela de demandas */}
      {filtradas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma demanda aberta</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prioridade</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Demanda</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Macrocaixa</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prazo</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', PRIORIDADE_STYLE[d.prioridade])}>
                      {d.prioridade}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-800">{d.titulo}</p>
                    {d.descricao && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{d.descricao}</p>}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{d.unidadeNome}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {d.macrocaixaCodigo}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {d.prazo ? formatDate(d.prazo) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => concluir(d.id)}
                      className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Concluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info ClickUp */}
      <div className="mt-6 flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <ExternalLink size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Integração com ClickUp</p>
          <p className="text-xs text-blue-600 mt-0.5">
            As demandas estão estruturadas para integração futura com o ClickUp. Por ora, copie os títulos manualmente ao criar as tasks.
          </p>
        </div>
      </div>
    </div>
  )
}
