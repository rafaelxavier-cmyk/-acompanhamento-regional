import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, LayoutGrid, List } from 'lucide-react'
import type { DemandaAberta, PrioridadeDemanda } from '../types'
import { formatDate, cn } from '../lib/utils'
import { useRegional } from '../context/RegionalContext'
import { api } from '../lib/api'
import KanbanBoard from './Kanban'

const PRIORIDADE_ORDER: PrioridadeDemanda[] = ['urgente', 'alta', 'normal', 'baixa']

const PRIORIDADE_STYLE: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  alta:    'bg-orange-100 text-orange-700',
  normal:  'bg-gray-100 text-gray-600',
  baixa:   'bg-blue-50 text-blue-600',
}

type View = 'lista' | 'kanban'

export default function DemandasPage() {
  const navigate = useNavigate()
  const { regionalAtiva } = useRegional()
  const [view, setView]   = useState<View>('lista')
  const [demandas, setDemandas] = useState<DemandaAberta[]>([])
  const [filtroUnidade, setFiltroUnidade]       = useState('')
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
    .sort((a, b) => PRIORIDADE_ORDER.indexOf(a.prioridade) - PRIORIDADE_ORDER.indexOf(b.prioridade))

  // Para kanban precisamos de flex-col h-full
  if (view === 'kanban') {
    return (
      <div className="flex flex-col h-full">
        {/* Header compartilhado */}
        <div className="px-4 md:px-8 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="text-orange-500" size={20} /> Demandas
              </h1>
              <p className="text-gray-400 text-xs mt-0.5">{regionalAtiva?.nome ?? 'Todas as regionais'}</p>
            </div>
            <ViewToggle view={view} setView={setView} />
          </div>
        </div>
        <KanbanBoard filtroUnidade={filtroUnidade} setFiltroUnidade={setFiltroUnidade} />
      </div>
    )
  }

  // ── Vista lista ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="text-orange-500" size={24} /> Demandas
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {filtradas.length} demanda(s) abertas{regionalAtiva ? ` — ${regionalAtiva.nome}` : ''}
          </p>
        </div>
        <ViewToggle view={view} setView={setView} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300">
          <option value="">Todas as unidades</option>
          {unidades.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300">
          <option value="">Todas as prioridades</option>
          {PRIORIDADE_ORDER.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma demanda aberta</p>
          <button onClick={() => setView('kanban')} className="mt-3 text-sm text-brand-600 hover:text-brand-800 font-medium">
            Adicionar no Kanban →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prioridade</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Demanda</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidade</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Macrocaixa</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Responsável</th>
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
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{d.macrocaixaCodigo}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{d.responsavel ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{d.prazo ? formatDate(d.prazo) : '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => concluir(d.id)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Concluir
                      </button>
                      <button onClick={() => setView('kanban')}
                        className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1">
                        <LayoutGrid size={12} /> Kanban
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ViewToggle({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
      <button onClick={() => setView('lista')}
        className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
          view === 'lista' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
        <List size={13} /> Lista
      </button>
      <button onClick={() => setView('kanban')}
        className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
          view === 'kanban' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
        <LayoutGrid size={13} /> Kanban
      </button>
    </div>
  )
}
