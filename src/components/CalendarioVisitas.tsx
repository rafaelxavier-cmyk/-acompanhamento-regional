import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../lib/api'
import type { VisitaCalendario } from '../types'
import { useRegional } from '../context/RegionalContext'
import { cn } from '../lib/utils'

// Cores por unidade (índice fixo pela ordem alfabética ou regionalId)
const CORES_R1 = ['bg-blue-500',   'bg-blue-400',   'bg-indigo-500', 'bg-violet-500', 'bg-sky-500']
const CORES_R2 = ['bg-emerald-500','bg-teal-500',    'bg-green-500',  'bg-cyan-500',   'bg-lime-600']

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function primeiroDiaMes(ano: number, mes: number) {
  return new Date(ano, mes, 1).getDay()
}
function diasNoMes(ano: number, mes: number) {
  return new Date(ano, mes + 1, 0).getDate()
}
function pad(n: number) { return String(n).padStart(2, '0') }

export default function CalendarioVisitas() {
  const { regionalAtiva } = useRegional()
  const hoje = new Date()
  const [ano,  setAno]  = useState(hoje.getFullYear())
  const [mes,  setMes]  = useState(hoje.getMonth())
  const [visitas, setVisitas] = useState<VisitaCalendario[]>([])

  // Mapa: unidadeId → cor
  const [corMap, setCorMap] = useState<Record<number, string>>({})

  useEffect(() => {
    const ini = `${ano}-${pad(mes + 1)}-01`
    const fim = `${ano}-${pad(mes + 1)}-${pad(diasNoMes(ano, mes))}`
    api.getVisitasCalendario(ini, fim).then(data => {
      setVisitas(data)
      // Atribui cor estável por unidade × regional
      const mapa: Record<number, string> = {}
      const vistasR1 = data.filter(v => v.regionalId === 1)
      const vistasR2 = data.filter(v => v.regionalId === 2)
      const uniqR1 = [...new Set(vistasR1.map(v => v.unidadeId))]
      const uniqR2 = [...new Set(vistasR2.map(v => v.unidadeId))]
      uniqR1.forEach((id, i) => { mapa[id] = CORES_R1[i % CORES_R1.length] })
      uniqR2.forEach((id, i) => { mapa[id] = CORES_R2[i % CORES_R2.length] })
      setCorMap(mapa)
    })
  }, [ano, mes])

  function navMes(delta: number) {
    let m = mes + delta, a = ano
    if (m < 0)  { m = 11; a-- }
    if (m > 11) { m = 0;  a++ }
    setMes(m); setAno(a)
  }

  // Filtra pela regional ativa
  const visitasFiltradas = useMemo(() => {
    return regionalAtiva ? visitas.filter(v => v.regionalId === regionalAtiva.id) : visitas
  }, [visitas, regionalAtiva])

  // Agrupa por data
  const porData = useMemo(() => {
    const map: Record<string, VisitaCalendario[]> = {}
    for (const v of visitasFiltradas) {
      const d = v.dataVisita.slice(0, 10)
      if (!map[d]) map[d] = []
      // Evita duplicar a mesma unidade no mesmo dia
      if (!map[d].find(x => x.unidadeId === v.unidadeId)) map[d].push(v)
    }
    return map
  }, [visitasFiltradas])

  const totalMes = visitasFiltradas.length
  const diasComVisita = Object.keys(porData).length
  const primeiroDia = primeiroDiaMes(ano, mes)
  const totalDias   = diasNoMes(ano, mes)
  const hojeStr     = `${hoje.getFullYear()}-${pad(hoje.getMonth()+1)}-${pad(hoje.getDate())}`

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-800 text-sm">Calendário de visitas</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {diasComVisita} dia(s) com visita · {totalMes} visita(s) no mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navMes(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-gray-700 w-32 text-center">
            {MESES[mes]} {ano}
          </span>
          <button onClick={() => navMes(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grade */}
      <div className="p-3">
        {/* Dias da semana */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Dias do mês */}
        <div className="grid grid-cols-7 gap-0.5">
          {/* Células vazias antes do primeiro dia */}
          {Array.from({ length: primeiroDia }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16" />
          ))}

          {/* Dias */}
          {Array.from({ length: totalDias }).map((_, i) => {
            const dia = i + 1
            const dataStr = `${ano}-${pad(mes + 1)}-${pad(dia)}`
            const visitasDia = porData[dataStr] ?? []
            const isHoje = dataStr === hojeStr
            const temVisita = visitasDia.length > 0

            return (
              <div
                key={dia}
                className={cn(
                  'h-16 rounded-lg p-1 flex flex-col',
                  isHoje ? 'bg-brand-50 border border-brand-200' : temVisita ? 'bg-gray-50' : 'hover:bg-gray-50',
                )}
              >
                <span className={cn(
                  'text-xs font-medium mb-0.5 leading-none',
                  isHoje ? 'text-brand-700 font-bold' : 'text-gray-500'
                )}>
                  {dia}
                </span>
                <div className="flex flex-wrap gap-0.5 overflow-hidden">
                  {visitasDia.slice(0, 6).map(v => (
                    <span
                      key={v.unidadeId}
                      title={`${v.unidadeNome} (${v.status === 'concluida' ? 'Concluída' : 'Em andamento'})`}
                      className={cn(
                        'text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none',
                        corMap[v.unidadeId] ?? 'bg-gray-400',
                        v.status !== 'concluida' && 'opacity-60'
                      )}
                    >
                      {v.iniciais}
                    </span>
                  ))}
                  {visitasDia.length > 6 && (
                    <span className="text-[9px] text-gray-400 font-medium">+{visitasDia.length - 6}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legenda */}
        {Object.keys(corMap).length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
            {visitasFiltradas
              .filter((v, i, arr) => arr.findIndex(x => x.unidadeId === v.unidadeId) === i)
              .sort((a, b) => a.unidadeNome.localeCompare(b.unidadeNome))
              .map(v => (
                <span key={v.unidadeId} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className={cn('w-4 h-4 rounded text-white text-[8px] font-bold flex items-center justify-center', corMap[v.unidadeId] ?? 'bg-gray-400')}>
                    {v.iniciais}
                  </span>
                  {v.unidadeNome}
                </span>
              ))}
            <span className="flex items-center gap-1 text-xs text-gray-400 ml-1">
              <span className="w-3 h-3 rounded border border-gray-300 opacity-50 inline-block" /> Em andamento (opaco)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
