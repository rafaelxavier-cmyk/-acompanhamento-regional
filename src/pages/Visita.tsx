import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, CheckCircle2, Save, Plus, Trash2 } from 'lucide-react'
import type {
  Visita, Unidade, Macrocaixa, RegistroMacrocaixa,
  StatusRegistro, UltimoRegistro, Demanda, Regional
} from '../types'
import { formatDateLong, STATUS_REGISTRO_LABEL, hoje } from '../lib/utils'
import { cn } from '../lib/utils'
import { api } from '../lib/api'

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_OPTIONS: { value: StatusRegistro; label: string; color: string; dot: string }[] = [
  { value: 'nao_iniciado',  label: 'Não avaliado', color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400'   },
  { value: 'em_dia',        label: 'Em dia',       color: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  { value: 'atencao',       label: 'Atenção',      color: 'bg-yellow-100 text-yellow-700',dot: 'bg-yellow-400' },
  { value: 'critico',       label: 'Crítico',      color: 'bg-red-100 text-red-700',      dot: 'bg-red-500'    },
  { value: 'nao_aplicavel', label: 'N/A',          color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-300'  },
]

function statusConfig(s: StatusRegistro) {
  return STATUS_OPTIONS.find(o => o.value === s) ?? STATUS_OPTIONS[0]
}

// ── Componente de uma macrocaixa ───────────────────────────────────────────────
interface MacrocaixaBlockProps {
  macrocaixa: Macrocaixa
  visita: Visita
  registro: RegistroMacrocaixa | undefined
  ultimoRegistro: UltimoRegistro | undefined
  onUpdate: (macrocaixaId: number, data: Partial<RegistroMacrocaixa>) => void
}

function MacrocaixaBlock({ macrocaixa, visita, registro, ultimoRegistro, onUpdate }: MacrocaixaBlockProps) {
  const [open, setOpen] = useState(false)
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [novaDemanda, setNovaDemanda] = useState('')
  const [adicionandoDemanda, setAdicionandoDemanda] = useState(false)

  const status: StatusRegistro = registro?.status as StatusRegistro ?? 'nao_iniciado'
  const cfg = statusConfig(status)

  // Carrega demandas do registro ao abrir
  useEffect(() => {
    if (open && registro) {
      api.getDemandasByRegistro(registro.id).then(setDemandas)
    }
  }, [open, registro])

  async function criarDemanda() {
    if (!novaDemanda.trim() || !registro) return
    const d = await api.createDemanda(registro.id, { titulo: novaDemanda.trim() })
    setDemandas(prev => [...prev, d])
    setNovaDemanda('')
    setAdicionandoDemanda(false)
  }

  async function concluirDemanda(id: number) {
    await api.updateDemanda(id, { statusDemanda: 'concluida' })
    setDemandas(prev => prev.map(d => d.id === id ? { ...d, statusDemanda: 'concluida' } : d))
  }

  async function excluirDemanda(id: number) {
    await api.deleteDemanda(id)
    setDemandas(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className={cn('border rounded-xl overflow-hidden', open ? 'border-brand-300' : 'border-gray-200')}>
      {/* Header da macrocaixa */}
      <div
        className={cn('flex items-center gap-4 px-5 py-3.5 cursor-pointer select-none transition-colors',
          open ? 'bg-brand-50' : 'bg-white hover:bg-gray-50'
        )}
        onClick={() => setOpen(o => !o)}
      >
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <span className="text-xs font-bold text-gray-400 w-8">{macrocaixa.codigo}</span>
        <span className="flex-1 font-medium text-gray-800 text-sm">{macrocaixa.titulo}</span>

        {/* Status selector — não propaga o click para o accordion */}
        <div onClick={e => e.stopPropagation()} className="relative">
          <select
            value={status}
            onChange={e => onUpdate(macrocaixa.id, { status: e.target.value as StatusRegistro })}
            className={cn('text-xs font-medium px-2.5 py-1 rounded-full border cursor-pointer appearance-none pr-6', cfg.color)}
            disabled={visita.status === 'concluida'}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <ChevronDown size={16} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
      </div>

      {/* Corpo expandido */}
      {open && (
        <div className="px-5 py-4 bg-white border-t border-gray-100 space-y-5">
          {/* Contexto da última visita */}
          {ultimoRegistro && ultimoRegistro.status !== 'nao_iniciado' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">
                Última visita — {formatDateLong(ultimoRegistro.dataVisita)}
              </p>
              <p className="text-xs text-amber-800">
                Status: <strong>{STATUS_REGISTRO_LABEL[ultimoRegistro.status as StatusRegistro]}</strong>
              </p>
              {ultimoRegistro.pontosAtencao && (
                <p className="text-xs text-amber-800 mt-1">
                  Pontos de atenção: {ultimoRegistro.pontosAtencao}
                </p>
              )}
              {ultimoRegistro.observacao && (
                <p className="text-xs text-amber-700 mt-1 italic">"{ultimoRegistro.observacao}"</p>
              )}
            </div>
          )}

          {/* Campos de observação */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-green-700 mb-1.5">Pontos positivos</label>
              <textarea
                rows={3}
                defaultValue={registro?.pontosPositivos ?? ''}
                placeholder="O que está funcionando bem?"
                disabled={visita.status === 'concluida'}
                onBlur={e => onUpdate(macrocaixa.id, { pontosPositivos: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-yellow-700 mb-1.5">Pontos de atenção</label>
              <textarea
                rows={3}
                defaultValue={registro?.pontosAtencao ?? ''}
                placeholder="O que precisa de acompanhamento?"
                disabled={visita.status === 'concluida'}
                onBlur={e => onUpdate(macrocaixa.id, { pontosAtencao: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-gray-50 disabled:text-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observações gerais</label>
            <textarea
              rows={2}
              defaultValue={registro?.observacao ?? ''}
              placeholder="Anotações livres sobre esta macrocaixa..."
              disabled={visita.status === 'concluida'}
              onBlur={e => onUpdate(macrocaixa.id, { observacao: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          {/* Demandas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">
                Demandas ({demandas.filter(d => d.statusDemanda === 'aberta').length} abertas)
              </label>
              {visita.status !== 'concluida' && !adicionandoDemanda && (
                <button
                  onClick={() => setAdicionandoDemanda(true)}
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
                >
                  <Plus size={12} /> Adicionar
                </button>
              )}
            </div>

            {adicionandoDemanda && (
              <div className="flex gap-2 mb-2">
                <input
                  autoFocus
                  type="text"
                  value={novaDemanda}
                  onChange={e => setNovaDemanda(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') criarDemanda(); if (e.key === 'Escape') setAdicionandoDemanda(false) }}
                  placeholder="Descreva a demanda..."
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <button onClick={criarDemanda} className="text-xs bg-brand-700 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600">
                  Salvar
                </button>
                <button onClick={() => setAdicionandoDemanda(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2">
                  ✕
                </button>
              </div>
            )}

            {demandas.length > 0 && (
              <div className="space-y-1.5">
                {demandas.map(d => (
                  <div key={d.id} className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
                    d.statusDemanda === 'concluida' ? 'bg-gray-50 opacity-60' : 'bg-orange-50'
                  )}>
                    <button
                      onClick={() => d.statusDemanda !== 'concluida' && concluirDemanda(d.id)}
                      className={cn('flex-shrink-0 w-4 h-4 rounded-full border-2 transition-colors',
                        d.statusDemanda === 'concluida'
                          ? 'bg-green-400 border-green-400'
                          : 'border-gray-300 hover:border-green-400'
                      )}
                    />
                    <span className={cn('flex-1', d.statusDemanda === 'concluida' && 'line-through text-gray-400')}>
                      {d.titulo}
                    </span>
                    {d.statusDemanda !== 'concluida' && visita.status !== 'concluida' && (
                      <button
                        onClick={() => excluirDemanda(d.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página de Visita ───────────────────────────────────────────────────────────
export default function VisitaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visita, setVisita] = useState<Visita | null>(null)
  const [unidade, setUnidade] = useState<Unidade | null>(null)
  const [regional, setRegional] = useState<Regional | null>(null)
  const [macrocaixas, setMacrocaixas] = useState<Macrocaixa[]>([])
  const [registros, setRegistros] = useState<RegistroMacrocaixa[]>([])
  const [ultimosRegistros, setUltimosRegistros] = useState<Record<number, UltimoRegistro>>({})
  const [salvando, setSalvando] = useState(false)
  const [concluindo, setConcluindo] = useState(false)

  useEffect(() => {
    if (!id) return
    api.getVisita(Number(id)).then(async v => {
      setVisita(v)
      const [units, regs, macros, recs] = await Promise.all([
        api.getUnidades(),
        api.getRegionais(),
        api.getMacrocaixas(),
        api.getRegistrosByVisita(v.id),
      ])
      const u = units.find(u => u.id === v.unidadeId)!
      const r = regs.find(r => r.id === u.regionalId)!
      setUnidade(u)
      setRegional(r)
      setMacrocaixas(macros)
      setRegistros(recs)

      // Carrega último registro de cada macrocaixa para esta unidade
      const ultimos: Record<number, UltimoRegistro> = {}
      await Promise.all(
        macros.map(async m => {
          const ult = await api.getUltimoRegistro(u.id, m.id)
          if (ult) ultimos[m.id] = ult
        })
      )
      setUltimosRegistros(ultimos)
    })
  }, [id])

  const handleUpdate = useCallback(async (macrocaixaId: number, data: Partial<RegistroMacrocaixa>) => {
    if (!visita) return
    const reg = await api.upsertRegistro(visita.id, macrocaixaId, data as any)
    setRegistros(prev => {
      const existing = prev.findIndex(r => r.macrocaixaId === macrocaixaId)
      if (existing >= 0) {
        const next = [...prev]
        next[existing] = reg
        return next
      }
      return [...prev, reg]
    })
  }, [visita])

  async function concluirVisita() {
    if (!visita || concluindo) return
    setConcluindo(true)
    try {
      await api.updateVisita(visita.id, { status: 'concluida' })
      setVisita(v => v ? { ...v, status: 'concluida' } : v)
    } finally {
      setConcluindo(false)
    }
  }

  const avaliados = registros.filter(r => r.status !== 'nao_iniciado').length
  const progresso = macrocaixas.length ? Math.round((avaliados / macrocaixas.length) * 100) : 0

  if (!visita || !unidade) return <div className="p-8 text-gray-400">Carregando...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <span className="cursor-pointer hover:text-brand-600" onClick={() => regional && navigate(`/regional/${regional.id}`)}>
          {regional?.nome}
        </span>
        <ChevronRight size={14} />
        <span className="cursor-pointer hover:text-brand-600" onClick={() => navigate(`/unidade/${unidade.id}`)}>
          {unidade.nome}
        </span>
        <ChevronRight size={14} />
        <span className="text-gray-700 font-medium">{formatDateLong(visita.dataVisita)}</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{unidade.nome}</h1>
          <p className="text-gray-500 mt-1">{formatDateLong(visita.dataVisita)}</p>
          {visita.status === 'concluida' && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              <CheckCircle2 size={12} /> Visita concluída
            </span>
          )}
        </div>

        {visita.status === 'em_andamento' && (
          <button
            onClick={concluirVisita}
            disabled={concluindo}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <CheckCircle2 size={16} />
            {concluindo ? 'Concluindo...' : 'Concluir visita'}
          </button>
        )}
      </div>

      {/* Barra de progresso */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-1.5">
          <span>{avaliados} de {macrocaixas.length} macrocaixas avaliadas</span>
          <span className="font-medium">{progresso}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-300"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* Observação geral */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Observação geral da visita</label>
        <textarea
          rows={2}
          defaultValue={visita.observacaoGeral ?? ''}
          placeholder="Impressão geral, contexto da visita..."
          disabled={visita.status === 'concluida'}
          onBlur={e => api.updateVisita(visita.id, { observacaoGeral: e.target.value })}
          className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </div>

      {/* Macrocaixas */}
      <div className="space-y-3">
        {macrocaixas.map(m => (
          <MacrocaixaBlock
            key={m.id}
            macrocaixa={m}
            visita={visita}
            registro={registros.find(r => r.macrocaixaId === m.id)}
            ultimoRegistro={ultimosRegistros[m.id]}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </div>
  )
}
