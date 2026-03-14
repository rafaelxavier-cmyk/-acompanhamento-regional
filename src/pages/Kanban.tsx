import { useEffect, useState } from 'react'
import { Plus, X, Check, ChevronRight, ChevronLeft, Pencil, Trash2, MapPin, User, Calendar, Tag } from 'lucide-react'
import { api } from '../lib/api'
import type { DemandaKanban, PrioridadeDemanda, StatusDemanda, Unidade } from '../types'
import { formatDate } from '../lib/utils'
import { cn } from '../lib/utils'
import { useRegional } from '../context/RegionalContext'

// ─── Estilos ──────────────────────────────────────────────────────────────────

const PRIORIDADE_STYLE: Record<PrioridadeDemanda, string> = {
  urgente: 'bg-red-100 text-red-700 border-red-200',
  alta:    'bg-orange-100 text-orange-700 border-orange-200',
  normal:  'bg-gray-100 text-gray-600 border-gray-200',
  baixa:   'bg-blue-50 text-blue-600 border-blue-200',
}
const PRIORIDADE_LABEL: Record<PrioridadeDemanda, string> = {
  urgente: 'Urgente', alta: 'Alta', normal: 'Normal', baixa: 'Baixa',
}

export const COLUNAS: { key: StatusDemanda; label: string; borda: string; header: string }[] = [
  { key: 'aberta',       label: 'Aberta',      borda: 'border-gray-300',  header: 'bg-gray-50 border-gray-200' },
  { key: 'em_andamento', label: 'Em andamento', borda: 'border-blue-300',  header: 'bg-blue-50 border-blue-200' },
  { key: 'concluida',    label: 'Concluída',    borda: 'border-green-300', header: 'bg-green-50 border-green-200' },
]

const ORDEM_STATUS: StatusDemanda[] = ['aberta', 'em_andamento', 'concluida']

// ─── Modal ────────────────────────────────────────────────────────────────────

type FormData = {
  titulo: string; descricao: string; prioridade: PrioridadeDemanda
  responsavel: string; prazo: string; unidadeId: number | ''
}
const FORM_VAZIO: FormData = { titulo: '', descricao: '', prioridade: 'normal', responsavel: '', prazo: '', unidadeId: '' }

interface ModalProps {
  unidades: Unidade[]
  inicial?: Partial<FormData> & { statusDemanda?: StatusDemanda }
  titulo: string
  onSalvar: (data: FormData & { statusDemanda: StatusDemanda }) => Promise<void>
  onFechar: () => void
}

export function DemandaModal({ unidades, inicial, titulo, onSalvar, onFechar }: ModalProps) {
  const [form, setForm] = useState<FormData>({ ...FORM_VAZIO, ...inicial })
  const [status, setStatus] = useState<StatusDemanda>(inicial?.statusDemanda ?? 'aberta')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSalvar() {
    if (!form.titulo.trim()) { setErro('Título é obrigatório'); return }
    if (!form.unidadeId)     { setErro('Selecione uma unidade'); return }
    setSalvando(true); setErro('')
    try { await onSalvar({ ...form, statusDemanda: status }) }
    catch { setErro('Erro ao salvar') }
    finally { setSalvando(false) }
  }

  const campo = (label: string, el: React.ReactNode) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {el}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{titulo}</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {campo('Título *',
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="Ex: Revisar processo de matrícula" />
          )}
          {campo('Descrição',
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              rows={2} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
              placeholder="Detalhes adicionais..." />
          )}
          <div className="grid grid-cols-2 gap-3">
            {campo('Unidade *',
              <select value={form.unidadeId} onChange={e => setForm(f => ({ ...f, unidadeId: Number(e.target.value) }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="">Selecione...</option>
                {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            )}
            {campo('Prioridade',
              <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as PrioridadeDemanda }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300">
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {campo('Responsável',
              <input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                placeholder="Nome" />
            )}
            {campo('Prazo',
              <input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            )}
          </div>
          {campo('Coluna',
            <div className="flex gap-2">
              {COLUNAS.map(c => (
                <button key={c.key} onClick={() => setStatus(c.key)}
                  className={cn('flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors',
                    status === c.key ? 'bg-brand-600 text-white border-brand-600' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onFechar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">Cancelar</button>
          <button onClick={handleSalvar} disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
            <Check size={14} />{salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  demanda: DemandaKanban
  onMover: (id: number, para: StatusDemanda) => void
  onEditar: (d: DemandaKanban) => void
  onExcluir: (d: DemandaKanban) => void
}

function KanbanCard({ demanda: d, onMover, onEditar, onExcluir }: CardProps) {
  const idxAtual   = ORDEM_STATUS.indexOf(d.statusDemanda)
  const podeVoltar  = idxAtual > 0
  const podeAvancar = idxAtual < ORDEM_STATUS.length - 1
  const prazoVencido = d.prazo && d.statusDemanda !== 'concluida' && new Date(d.prazo) < new Date()

  return (
    <div className={cn('bg-white rounded-xl border shadow-sm p-3.5 flex flex-col gap-2.5', d.statusDemanda === 'concluida' && 'opacity-65')}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide flex-shrink-0', PRIORIDADE_STYLE[d.prioridade])}>
          {PRIORIDADE_LABEL[d.prioridade]}
        </span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onClick={() => onEditar(d)} className="p-1 rounded text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"><Pencil size={12} /></button>
          <button onClick={() => onExcluir(d)} className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
        </div>
      </div>

      <p className={cn('text-sm font-semibold text-gray-800 leading-snug', d.statusDemanda === 'concluida' && 'line-through text-gray-400')}>
        {d.titulo}
      </p>

      {d.descricao && <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{d.descricao}</p>}

      <div className="space-y-1">
        {d.unidadeNome && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin size={11} className="flex-shrink-0 text-gray-400" /><span className="truncate">{d.unidadeNome}</span>
          </div>
        )}
        {d.responsavel && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <User size={11} className="flex-shrink-0 text-gray-400" /><span className="truncate">{d.responsavel}</span>
          </div>
        )}
        {d.prazo && (
          <div className={cn('flex items-center gap-1.5 text-xs', prazoVencido ? 'text-red-500 font-medium' : 'text-gray-500')}>
            <Calendar size={11} className="flex-shrink-0" />
            <span>{formatDate(d.prazo)}{prazoVencido && ' ⚠'}</span>
          </div>
        )}
        {d.macrocaixaCodigo && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Tag size={11} className="flex-shrink-0" /><span>{d.macrocaixaCodigo}</span>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 pt-1 border-t border-gray-100">
        <button onClick={() => onMover(d.id, ORDEM_STATUS[idxAtual - 1])} disabled={!podeVoltar}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft size={12} /> Voltar
        </button>
        <div className="w-px bg-gray-100" />
        <button onClick={() => onMover(d.id, ORDEM_STATUS[idxAtual + 1])} disabled={!podeAvancar}
          className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded disabled:opacity-20 disabled:cursor-not-allowed transition-colors font-medium">
          Avançar <ChevronRight size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Board (componente embutível) ─────────────────────────────────────────────

interface KanbanBoardProps {
  filtroUnidade: string
  setFiltroUnidade: (v: string) => void
  onNovaAberta?: () => void
}

export default function KanbanBoard({ filtroUnidade, setFiltroUnidade, onNovaAberta }: KanbanBoardProps) {
  const { regionalAtiva } = useRegional()
  const [demandas, setDemandas] = useState<DemandaKanban[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [modalNovo, setModalNovo] = useState<StatusDemanda | null>(null)
  const [modalEditar, setModalEditar] = useState<DemandaKanban | null>(null)
  const [confirmarExcluir, setConfirmarExcluir] = useState<DemandaKanban | null>(null)

  useEffect(() => {
    Promise.all([api.getDemandasKanban(), api.getUnidades()]).then(([d, u]) => {
      setDemandas(d); setUnidades(u.filter(x => x.ativa))
    })
  }, [])

  const filtradas = demandas.filter(d => {
    if (regionalAtiva && d.regionalId !== regionalAtiva.id) return false
    if (filtroUnidade && d.unidadeNome !== filtroUnidade) return false
    return true
  })

  const unidadesFiltradas = regionalAtiva
    ? unidades.filter(u => u.regionalId === regionalAtiva.id)
    : unidades

  async function mover(id: number, para: StatusDemanda) {
    await api.updateDemanda(id, { statusDemanda: para })
    setDemandas(prev => prev.map(d => d.id === id ? { ...d, statusDemanda: para } : d))
  }

  async function criarDemanda(form: { titulo: string; descricao: string; prioridade: PrioridadeDemanda; responsavel: string; prazo: string; unidadeId: number | ''; statusDemanda: StatusDemanda }) {
    const criada = await api.createDemandaKanban({
      unidadeId: form.unidadeId as number,
      titulo: form.titulo,
      descricao: form.descricao || undefined,
      prioridade: form.prioridade,
      responsavel: form.responsavel || undefined,
      prazo: form.prazo || undefined,
    })
    const unidade = unidades.find(u => u.id === (form.unidadeId as number))
    if (form.statusDemanda !== 'aberta') {
      await api.updateDemanda(criada.id, { statusDemanda: form.statusDemanda })
    }
    setDemandas(prev => [{
      ...criada,
      statusDemanda: form.statusDemanda,
      unidadeNome: unidade?.nome ?? null,
      unidadeId: form.unidadeId as number,
      regionalId: unidade?.regionalId ?? null,
      macrocaixaCodigo: null,
      registroId: null,
    }, ...prev])
    setModalNovo(null)
  }

  async function salvarEdicao(form: { titulo: string; descricao: string; prioridade: PrioridadeDemanda; responsavel: string; prazo: string; unidadeId: number | ''; statusDemanda: StatusDemanda }) {
    if (!modalEditar) return
    await api.updateDemanda(modalEditar.id, {
      titulo: form.titulo,
      descricao: form.descricao || undefined,
      prioridade: form.prioridade,
      responsavel: form.responsavel || undefined,
      prazo: form.prazo || undefined,
      statusDemanda: form.statusDemanda,
      unidadeId: form.unidadeId as number,
    })
    const unidade = unidades.find(u => u.id === (form.unidadeId as number))
    setDemandas(prev => prev.map(d => d.id === modalEditar.id ? {
      ...d, titulo: form.titulo, descricao: form.descricao || null,
      prioridade: form.prioridade, responsavel: form.responsavel || null,
      prazo: form.prazo || null, statusDemanda: form.statusDemanda,
      unidadeId: form.unidadeId as number,
      unidadeNome: unidade?.nome ?? d.unidadeNome,
      regionalId: unidade?.regionalId ?? d.regionalId,
    } : d))
    setModalEditar(null)
  }

  async function excluir() {
    if (!confirmarExcluir) return
    await api.deleteDemanda(confirmarExcluir.id)
    setDemandas(prev => prev.filter(d => d.id !== confirmarExcluir.id))
    setConfirmarExcluir(null)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 md:px-6 py-2 border-b border-gray-100 bg-white flex-shrink-0">
        <p className="text-xs text-gray-400">{filtradas.length} demanda(s)</p>
        <div className="flex items-center gap-2">
          <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white">
            <option value="">Todas as unidades</option>
            {[...new Set(demandas.filter(d => !regionalAtiva || d.regionalId === regionalAtiva.id).map(d => d.unidadeNome).filter(Boolean))].sort().map(u => (
              <option key={u as string} value={u as string}>{u}</option>
            ))}
          </select>
          <button onClick={() => { setModalNovo('aberta'); onNovaAberta?.() }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700 transition-colors">
            <Plus size={13} /> Nova
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex gap-3 p-4 h-full" style={{ minWidth: 660 }}>
          {COLUNAS.map(coluna => {
            const cards = filtradas.filter(d => d.statusDemanda === coluna.key)
            return (
              <div key={coluna.key} className="flex flex-col flex-1 min-w-[200px]">
                <div className={cn('flex items-center justify-between px-3 py-2 rounded-t-xl border border-b-0', coluna.header)}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">{coluna.label}</span>
                    <span className="text-xs bg-white border border-gray-200 text-gray-500 rounded-full px-1.5 leading-5 font-medium">
                      {cards.length}
                    </span>
                  </div>
                  <button onClick={() => setModalNovo(coluna.key)} title={`Adicionar em ${coluna.label}`}
                    className="p-1 rounded hover:bg-white/70 text-gray-400 hover:text-gray-600 transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
                <div className={cn('flex-1 overflow-y-auto rounded-b-xl border p-2 space-y-2 bg-gray-50/60', coluna.borda)}>
                  {cards.length === 0
                    ? <div className="text-center py-8 text-gray-300 text-xs">Nenhuma demanda</div>
                    : cards.map(d => (
                        <KanbanCard key={d.id} demanda={d} onMover={mover} onEditar={setModalEditar} onExcluir={setConfirmarExcluir} />
                      ))
                  }
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modalNovo && (
        <DemandaModal titulo="Nova demanda" unidades={unidadesFiltradas}
          inicial={{ statusDemanda: modalNovo }}
          onSalvar={criarDemanda} onFechar={() => setModalNovo(null)} />
      )}
      {modalEditar && (
        <DemandaModal titulo="Editar demanda" unidades={unidadesFiltradas}
          inicial={{
            titulo: modalEditar.titulo, descricao: modalEditar.descricao ?? '',
            prioridade: modalEditar.prioridade, responsavel: modalEditar.responsavel ?? '',
            prazo: modalEditar.prazo ?? '', unidadeId: modalEditar.unidadeId ?? '',
            statusDemanda: modalEditar.statusDemanda,
          }}
          onSalvar={salvarEdicao} onFechar={() => setModalEditar(null)} />
      )}
      {confirmarExcluir && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-lg"><Trash2 size={18} className="text-red-600" /></div>
                <h2 className="font-semibold text-gray-900">Excluir demanda</h2>
              </div>
              <p className="text-sm text-gray-600">Excluir <strong>"{confirmarExcluir.titulo}"</strong>? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setConfirmarExcluir(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={excluir} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
