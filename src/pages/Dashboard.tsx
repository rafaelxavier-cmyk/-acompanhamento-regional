import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ClipboardList, MapPin, TrendingUp, Calendar, RotateCcw } from 'lucide-react'
import CalendarioVisitas from '../components/CalendarioVisitas'
import type { Regional, UnidadeResumo, DemandaAberta } from '../types'
import { formatDate, diasSemVisita, semaforoVisita } from '../lib/utils'
import { cn } from '../lib/utils'
import { useRegional } from '../context/RegionalContext'
import { api } from '../lib/api'

const SEMAFORO_DOT  = { verde: 'bg-green-500', amarelo: 'bg-yellow-400', vermelho: 'bg-red-500', cinza: 'bg-gray-300' }
const SEMAFORO_TEXT = { verde: 'text-green-600', amarelo: 'text-yellow-600', vermelho: 'text-red-600', cinza: 'text-gray-400' }
const SEMAFORO_BG   = { verde: 'bg-green-50', amarelo: 'bg-yellow-50', vermelho: 'bg-red-50', cinza: 'bg-gray-50' }

const hoje     = new Date()
const inicioAno = new Date(hoje.getFullYear(), 0, 1)
const toISO = (d: Date) => d.toISOString().slice(0, 10)
const DEFAULT_INI = toISO(inicioAno)
const DEFAULT_FIM = toISO(hoje)

export default function Dashboard() {
  const navigate = useNavigate()
  const { regionalAtiva } = useRegional()
  const [regionais, setRegionais] = useState<Regional[]>([])
  const [resumos, setResumos] = useState<UnidadeResumo[]>([])
  const [demandas, setDemandas] = useState<DemandaAberta[]>([])
  const [dataInicio, setDataInicio] = useState(DEFAULT_INI)
  const [dataFim, setDataFim]       = useState(DEFAULT_FIM)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  function carregar() {
    setCarregando(true)
    setErro(false)
    Promise.all([
      api.getRegionais(),
      api.getUnidadesResumo(dataInicio, dataFim),
      api.getDemandasAbertas(),
    ]).then(([regs, res, dem]) => {
      setRegionais(regs)
      setResumos(res)
      setDemandas(dem)
    }).catch(() => setErro(true))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [dataInicio, dataFim])

  // Filtrar pela regional ativa
  const resumosFiltrados = regionalAtiva
    ? resumos.filter(r => r.regionalId === regionalAtiva.id)
    : resumos
  const demandasFiltradas = regionalAtiva
    ? demandas.filter(d => d.regionalId === regionalAtiva.id)
    : demandas

  // Totais da regional ativa
  const totalVisitas  = resumosFiltrados.reduce((s, r) => s + Number(r.totalVisitas ?? 0), 0)
  const totalDemandas = demandasFiltradas.length
  const totalCriticas = resumosFiltrados.reduce((s, r) => s + Number(r.macrocaixasCriticas ?? 0), 0)
  const semVisita     = resumosFiltrados.filter(r => !r.ultimaVisita).length

  const isPeriodoDefault = dataInicio === DEFAULT_INI && dataFim === DEFAULT_FIM

  if (carregando) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh] text-gray-400 text-sm gap-2">
      <RotateCcw size={16} className="animate-spin" /> Carregando...
    </div>
  )

  if (erro) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-gray-500 text-sm">Não foi possível carregar os dados.</p>
      <button onClick={carregar} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
        <RotateCcw size={14} /> Tentar novamente
      </button>
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-4 md:mb-6 flex flex-col md:flex-row md:items-start gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Visão geral — {regionalAtiva?.nome ?? 'Todas as regionais'}
          </p>
        </div>

        {/* Filtro de período */}
        <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <Calendar size={15} className="text-gray-400 flex-shrink-0" />
          <span className="text-xs text-gray-400 font-medium">De</span>
          <input
            type="date"
            value={dataInicio}
            max={dataFim}
            onChange={e => setDataInicio(e.target.value)}
            className="text-sm text-gray-700 border-none outline-none bg-transparent w-36"
          />
          <span className="text-xs text-gray-400 font-medium">até</span>
          <input
            type="date"
            value={dataFim}
            min={dataInicio}
            max={DEFAULT_FIM}
            onChange={e => setDataFim(e.target.value)}
            className="text-sm text-gray-700 border-none outline-none bg-transparent w-36"
          />
          {!isPeriodoDefault && (
            <button
              onClick={() => { setDataInicio(DEFAULT_INI); setDataFim(DEFAULT_FIM) }}
              title="Redefinir para o período padrão"
              className="ml-1 text-gray-400 hover:text-brand-600 transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Cards de resumo geral */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
              <Calendar size={16} className="text-brand-700" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total de visitas</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalVisitas}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <AlertCircle size={16} className="text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Demandas abertas</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalDemandas}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <TrendingUp size={16} className="text-red-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Macrocaixas críticas</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalCriticas}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
              <MapPin size={16} className="text-gray-500" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sem visitas</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{semVisita}</p>
        </div>
      </div>

      {/* Calendário de visitas */}
      <div className="mb-8">
        <CalendarioVisitas />
      </div>

      {/* Tabela por unidade */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto mb-8">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ClipboardList size={16} className="text-gray-400" />
            Situação por unidade
          </h2>
        </div>

        {regionais.filter(r => !regionalAtiva || r.id === regionalAtiva.id).map(regional => {
          const units = resumosFiltrados.filter(r => r.regionalId === regional.id)
          if (!units.length) return null
          return (
            <div key={regional.id}>
              {/* Separador de regional */}
              <div className="px-5 py-2 bg-gray-50 border-y border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{regional.nome}</span>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    <th className="px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Unidade</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Visitas</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">Última visita</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Ações abertas</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Crítico</th>
                    <th className="px-5 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Atenção</th>
                    <th className="px-5 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {units.map(u => {
                    const dias = diasSemVisita(u.ultimaVisita)
                    const cor = semaforoVisita(dias)
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/unidade/${u.id}`)}
                      >
                        {/* Nome */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', SEMAFORO_DOT[cor])} />
                            <span className="font-medium text-gray-800">{u.nome}</span>
                          </div>
                        </td>

                        {/* Total visitas */}
                        <td className="px-5 py-3 text-center">
                          <span className="text-gray-700 font-semibold">{Number(u.totalVisitas ?? 0)}</span>
                        </td>

                        {/* Última visita */}
                        <td className="px-5 py-3">
                          {u.ultimaVisita ? (
                            <div>
                              <span className={cn('font-medium', SEMAFORO_TEXT[cor])}>
                                {formatDate(u.ultimaVisita)}
                              </span>
                              <span className="text-gray-400 text-xs ml-1.5">({dias}d atrás)</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Sem visitas</span>
                          )}
                        </td>

                        {/* Demandas abertas */}
                        <td className="px-5 py-3 text-center">
                          {Number(u.demandasAbertas ?? 0) > 0 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs">
                              {Number(u.demandasAbertas)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        {/* Crítico */}
                        <td className="px-5 py-3 text-center">
                          {Number(u.macrocaixasCriticas ?? 0) > 0 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 font-bold text-xs">
                              {Number(u.macrocaixasCriticas)}
                            </span>
                          ) : (
                            <CheckCircle2 size={16} className="text-gray-200 mx-auto" />
                          )}
                        </td>

                        {/* Atenção */}
                        <td className="px-5 py-3 text-center">
                          {Number(u.macrocaixasAtencao ?? 0) > 0 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 font-bold text-xs">
                              {Number(u.macrocaixasAtencao)}
                            </span>
                          ) : (
                            <CheckCircle2 size={16} className="text-gray-200 mx-auto" />
                          )}
                        </td>

                        <td className="px-5 py-3 text-gray-300 text-right">›</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {/* Demandas abertas */}
      {demandasFiltradas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-500" />
              Demandas abertas
            </h3>
            <button onClick={() => navigate('/demandas')} className="text-sm text-brand-600 hover:text-brand-800 font-medium">
              Ver todas →
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {demandasFiltradas.slice(0, 6).map(d => (
              <div key={d.id} className="px-5 py-3 flex items-center gap-4">
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', `badge-${d.prioridade}`)}>
                  {d.prioridade}
                </span>
                <span className="flex-1 text-sm text-gray-800">{d.titulo}</span>
                <span className="text-xs text-gray-400">{d.unidadeNome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="flex gap-5 mt-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Visita até 15 dias</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 15–45 dias</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Mais de 45 dias</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Sem visitas</span>
      </div>
    </div>
  )
}
