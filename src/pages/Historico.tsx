import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History, ChevronRight, Pencil, Trash2, X, Check, RotateCcw } from 'lucide-react'
import type { VisitaRecente, Unidade } from '../types'
import { formatDate } from '../lib/utils'
import { useRegional } from '../context/RegionalContext'
import { api } from '../lib/api'

type EditForm = {
  dataVisita: string
  diretorNome: string
  status: string
  unidadeId: number
}

export default function HistoricoPage() {
  const navigate = useNavigate()
  const { regionalAtiva } = useRegional()
  const [visitas, setVisitas] = useState<VisitaRecente[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const [editando, setEditando] = useState<VisitaRecente | null>(null)
  const [form, setForm] = useState<EditForm>({ dataVisita: '', diretorNome: '', status: '', unidadeId: 0 })
  const [salvando, setSalvando] = useState(false)

  const [confirmandoExclusao, setConfirmandoExclusao] = useState<VisitaRecente | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  function carregar() {
    setCarregando(true)
    setErro(false)
    Promise.all([
      api.getVisitasRecentes(100),
      api.getUnidades(),
    ]).then(([vis, units]) => {
      setVisitas(vis)
      setUnidades(units)
    }).catch(() => setErro(true))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  const visitasDaRegional = regionalAtiva
    ? visitas.filter(v => v.regionalId === regionalAtiva.id)
    : visitas

  const unidadesDaRegional = regionalAtiva
    ? unidades.filter(u => u.regionalId === regionalAtiva.id)
    : unidades

  const filtradas = visitasDaRegional
    .filter(v => !filtroUnidade || v.unidadeId === Number(filtroUnidade))
    .filter(v => !filtroStatus || v.status === filtroStatus)

  function abrirEdicao(v: VisitaRecente, e: React.MouseEvent) {
    e.stopPropagation()
    setEditando(v)
    setForm({
      dataVisita: v.dataVisita.slice(0, 10),
      diretorNome: v.diretorNome ?? '',
      status: v.status,
      unidadeId: v.unidadeId,
    })
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    try {
      await api.updateVisita(editando.id, {
        dataVisita: form.dataVisita,
        diretorNome: form.diretorNome || undefined,
        status: form.status,
        unidadeId: form.unidadeId,
      })
      const atualizadas = await api.getVisitasRecentes(100)
      setVisitas(atualizadas)
      setEditando(null)
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarExclusao() {
    if (!confirmandoExclusao) return
    setExcluindo(true)
    try {
      await api.deleteVisita(confirmandoExclusao.id)
      setVisitas(prev => prev.filter(v => v.id !== confirmandoExclusao.id))
      setConfirmandoExclusao(null)
    } finally {
      setExcluindo(false)
    }
  }

  if (carregando) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh] text-gray-400 text-sm gap-2">
      <RotateCcw size={16} className="animate-spin" /> Carregando...
    </div>
  )

  if (erro) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-gray-500 text-sm">Não foi possível carregar o histórico.</p>
      <button onClick={carregar} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
        <RotateCcw size={14} /> Tentar novamente
      </button>
    </div>
  )

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
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
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
              {filtradas.map(v => (
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
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => abrirEdicao(v, e)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar visita"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmandoExclusao(v) }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir visita"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={16} className="text-gray-300 ml-1" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Editar visita</h2>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da visita</label>
                <input
                  type="date"
                  value={form.dataVisita}
                  onChange={e => setForm(f => ({ ...f, dataVisita: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                <select
                  value={form.unidadeId}
                  onChange={e => setForm(f => ({ ...f, unidadeId: Number(e.target.value) }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diretor responsável</label>
                <input
                  type="text"
                  value={form.diretorNome}
                  onChange={e => setForm(f => ({ ...f, diretorNome: e.target.value }))}
                  placeholder="Nome do diretor"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="em_andamento">Em andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setEditando(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicao}
                disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                <Check size={14} />
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmandoExclusao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 size={18} className="text-red-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Excluir visita</h2>
              </div>
              <p className="text-sm text-gray-600">
                Tem certeza que deseja excluir a visita de{' '}
                <strong>{formatDate(confirmandoExclusao.dataVisita)}</strong> em{' '}
                <strong>{confirmandoExclusao.unidadeNome}</strong>?
              </p>
              <p className="text-xs text-red-600 mt-2">
                Todos os registros e demandas desta visita serão excluídos permanentemente.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setConfirmandoExclusao(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao}
                disabled={excluindo}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={14} />
                {excluindo ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
