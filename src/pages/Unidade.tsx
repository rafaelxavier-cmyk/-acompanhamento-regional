import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import type { Unidade, Visita, Regional } from '../types'
import { formatDateLong, formatDate, hoje } from '../lib/utils'
import { api } from '../lib/api'

const STATUS_COLOR: Record<string, string> = {
  em_andamento: 'bg-blue-100 text-blue-700',
  concluida:    'bg-green-100 text-green-700',
}

export default function UnidadePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [unidade, setUnidade] = useState<Unidade | null>(null)
  const [regional, setRegional] = useState<Regional | null>(null)
  const [visitas, setVisitas] = useState<Visita[]>([])
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getUnidades(),
      api.getRegionais(),
      api.getVisitasByUnidade(Number(id)),
    ]).then(([units, regs, vis]) => {
      const u = units.find(u => u.id === Number(id)) ?? null
      setUnidade(u)
      if (u) setRegional(regs.find(r => r.id === u.regionalId) ?? null)
      setVisitas(vis)
    })
  }, [id])

  async function novaVisita() {
    if (!id || criando) return
    setCriando(true)
    try {
      const visita = await api.createVisita(Number(id), hoje())
      navigate(`/visita/${visita.id}`)
    } finally {
      setCriando(false)
    }
  }

  const visitaEmAndamento = visitas.find(v => v.status === 'em_andamento')

  if (!unidade) return <div className="p-8 text-gray-400">Carregando...</div>

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <span
          className="cursor-pointer hover:text-brand-600"
          onClick={() => regional && navigate(`/regional/${regional.id}`)}
        >
          {regional?.nome}
        </span>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{unidade.nome}</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{unidade.nome}</h1>
          <p className="text-gray-500 text-sm mt-1">{regional?.nome}</p>
        </div>

        <div className="flex gap-3">
          {visitas.some(v => v.status === 'concluida') && (
            <button
              onClick={() => navigate(`/unidade/${id}/plano`)}
              className="flex items-center gap-2 border border-brand-300 text-brand-700 hover:bg-brand-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Sparkles size={16} />
              Plano de visita
            </button>
          )}
          {visitaEmAndamento ? (
            <button
              onClick={() => navigate(`/visita/${visitaEmAndamento.id}`)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Clock size={16} />
              Continuar visita
            </button>
          ) : (
            <button
              onClick={novaVisita}
              disabled={criando}
              className="flex items-center gap-2 bg-brand-700 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <Plus size={16} />
              {criando ? 'Criando...' : 'Nova visita'}
            </button>
          )}
        </div>
      </div>

      {/* Timeline de visitas */}
      <h2 className="font-semibold text-gray-700 mb-4">Histórico de visitas ({visitas.length})</h2>

      {visitas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Clock size={32} className="mx-auto mb-3 opacity-40" />
          <p>Nenhuma visita registrada</p>
          <p className="text-sm mt-1">Clique em "Nova visita" para começar</p>
        </div>
      ) : (
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-4 top-3 bottom-3 w-px bg-gray-200" />

          <div className="space-y-4">
            {visitas.map((v, i) => (
              <div
                key={v.id}
                className="relative flex items-start gap-4 cursor-pointer group"
                onClick={() => navigate(`/visita/${v.id}`)}
              >
                {/* Ponto na timeline */}
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  v.status === 'concluida' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  {v.status === 'concluida'
                    ? <CheckCircle2 size={16} className="text-green-600" />
                    : <Clock size={16} className="text-blue-600" />
                  }
                </div>

                {/* Conteúdo */}
                <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 group-hover:border-brand-300 group-hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{formatDateLong(v.dataVisita)}</p>
                      {v.diretorNome && (
                        <p className="text-sm text-gray-500 mt-0.5">{v.diretorNome}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[v.status]}`}>
                      {v.status === 'em_andamento' ? 'Em andamento' : 'Concluída'}
                    </span>
                  </div>
                  {v.observacaoGeral && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{v.observacaoGeral}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
