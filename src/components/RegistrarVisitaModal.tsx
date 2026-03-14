import { useState, useEffect } from 'react'
import { ClipboardList, X, ChevronDown, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useRegional } from '../context/RegionalContext'
import { hoje } from '../lib/utils'
import type { Unidade, Visita } from '../types'

interface Props {
  onClose: () => void
}

export default function RegistrarVisitaModal({ onClose }: Props) {
  const navigate = useNavigate()
  const { regionais, regionalAtiva } = useRegional()
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [unidadeId, setUnidadeId] = useState<number | ''>('')
  const [visitaEmAndamento, setVisitaEmAndamento] = useState<Visita | null>(null)
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    api.getUnidades().then(units => {
      const filtradas = regionalAtiva
        ? units.filter(u => u.regionalId === regionalAtiva.id && u.ativa)
        : units.filter(u => u.ativa)
      setUnidades(filtradas)
    })
  }, [regionalAtiva])

  useEffect(() => {
    if (!unidadeId) { setVisitaEmAndamento(null); return }
    api.getVisitasByUnidade(Number(unidadeId)).then(visitas => {
      const emAndamento = visitas.find(v => v.status === 'em_andamento') ?? null
      setVisitaEmAndamento(emAndamento)
    })
  }, [unidadeId])

  async function iniciar() {
    if (!unidadeId || criando) return
    setCriando(true); setErro('')
    try {
      if (visitaEmAndamento) {
        onClose()
        navigate(`/visita/${visitaEmAndamento.id}`)
      } else {
        const visita = await api.createVisita(Number(unidadeId), hoje())
        onClose()
        navigate(`/visita/${visita.id}`)
      }
    } catch {
      setErro('Erro ao criar visita. Tente novamente.')
      setCriando(false)
    }
  }

  const unidadeSelecionada = unidades.find(u => u.id === Number(unidadeId))
  const regionalNome = unidadeSelecionada
    ? regionais.find(r => r.id === unidadeSelecionada.regionalId)?.nome
    : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <ClipboardList size={16} className="text-green-700" />
            </div>
            <h2 className="font-semibold text-gray-900 text-sm">Registrar visita</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Unidade</label>
            <div className="relative">
              <select
                value={unidadeId}
                onChange={e => { setUnidadeId(Number(e.target.value) || ''); setErro('') }}
                className="w-full appearance-none text-sm border border-gray-200 rounded-lg px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
              >
                <option value="">Selecione uma unidade...</option>
                {unidades.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {unidadeSelecionada && regionalNome && (
              <p className="text-xs text-gray-400 mt-1">{regionalNome}</p>
            )}
          </div>

          {/* Aviso: visita em andamento */}
          {visitaEmAndamento && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Esta unidade já tem uma visita em andamento. Você será redirecionado para ela.
              </p>
            </div>
          )}

          {erro && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={iniciar}
            disabled={!unidadeId || criando}
            className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ClipboardList size={14} />
            {criando ? 'Abrindo...' : visitaEmAndamento ? 'Continuar visita' : 'Iniciar visita'}
          </button>
        </div>
      </div>
    </div>
  )
}
