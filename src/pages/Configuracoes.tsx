import { useEffect, useState } from 'react'
import { Settings, Plus, ArrowLeftRight, Pencil, Check, X, Sparkles, Eye, EyeOff, Trash2, ClipboardList } from 'lucide-react'
import type { Regional, Unidade, ChecklistSetor } from '../types'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/utils'

interface EditState {
  type: 'regional' | 'unidade'
  id: number
  field: string
  value: string
}

function ChecklistAdmin() {
  const [setores, setSetores] = useState<ChecklistSetor[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [editVals, setEditVals] = useState({ nome: '', peso: '' })
  const [novoSetor, setNovoSetor] = useState<{ nome: string; peso: string } | null>(null)
  const [erroExcluir, setErroExcluir] = useState<string | null>(null)

  async function load() { setSetores(await api.getAllChecklistSetores()) }
  useEffect(() => { load() }, [])

  function startEdit(s: ChecklistSetor) {
    setEditId(s.id)
    setEditVals({ nome: s.nome, peso: String(s.peso) })
  }

  async function saveEdit(id: number) {
    const peso = parseInt(editVals.peso)
    if (!editVals.nome.trim() || isNaN(peso) || peso < 1 || peso > 100) return
    await api.updateChecklistSetor(id, { nome: editVals.nome.trim(), peso })
    setEditId(null)
    load()
  }

  async function toggleAtivo(s: ChecklistSetor) {
    await api.updateChecklistSetor(s.id, { ativa: !s.ativa })
    load()
  }

  async function deleteSetor(id: number) {
    setErroExcluir(null)
    try {
      await api.deleteChecklistSetor(id)
      load()
    } catch (e: any) {
      const msg = e.message ?? ''
      setErroExcluir(msg.includes('409') ? 'Este setor possui registros vinculados e não pode ser excluído.' : 'Erro ao excluir setor.')
      setTimeout(() => setErroExcluir(null), 4000)
    }
  }

  async function addSetor() {
    if (!novoSetor || !novoSetor.nome.trim()) return
    const peso = parseInt(novoSetor.peso)
    if (isNaN(peso) || peso < 1 || peso > 100) return
    await api.createChecklistSetor({ nome: novoSetor.nome.trim(), peso })
    setNovoSetor(null)
    load()
  }

  const totalPeso = setores.filter(s => s.ativa !== false).reduce((sum, s) => sum + s.peso, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
        <ClipboardList size={16} className="text-gray-400" />
        <div className="flex-1">
          <h2 className="font-semibold text-gray-900">Checklist de Visita</h2>
          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
            Setores e pesos do checklist oficial
            <span className={cn('font-semibold', totalPeso === 100 ? 'text-green-600' : 'text-orange-600')}>
              Σ pesos ativos: {totalPeso}%{totalPeso !== 100 ? ' ⚠ (esperado: 100%)' : ' ✓'}
            </span>
          </p>
        </div>
      </div>

      {erroExcluir && (
        <div className="mx-5 mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroExcluir}</div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-left">
            <th className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase w-10">#</th>
            <th className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Setor</th>
            <th className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase w-24 text-center">Peso</th>
            <th className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase w-20 text-center">Ativo</th>
            <th className="px-3 py-2 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {setores.map(s => (
            <tr key={s.id} className={cn('transition-colors', s.ativa === false && 'opacity-45')}>
              <td className="px-5 py-2.5 text-gray-400 text-xs">{s.ordem}</td>
              <td className="px-3 py-2.5">
                {editId === s.id ? (
                  <input autoFocus value={editVals.nome}
                    onChange={e => setEditVals(v => ({ ...v, nome: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(s.id); if (e.key === 'Escape') setEditId(null) }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-300" />
                ) : (
                  <span className="font-medium text-gray-800 cursor-pointer hover:text-brand-700" onClick={() => startEdit(s)}>{s.nome}</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-center">
                {editId === s.id ? (
                  <div className="flex items-center gap-1 justify-center">
                    <input type="number" min="1" max="100" value={editVals.peso}
                      onChange={e => setEditVals(v => ({ ...v, peso: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(s.id) }}
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-14 text-center focus:outline-none focus:ring-2 focus:ring-brand-300" />
                    <span className="text-gray-400 text-xs">%</span>
                  </div>
                ) : (
                  <span className="text-gray-600 cursor-pointer hover:text-brand-700" onClick={() => startEdit(s)}>{s.peso}%</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-center">
                <button onClick={() => toggleAtivo(s)}
                  className={cn('relative w-9 h-5 rounded-full transition-colors flex-shrink-0',
                    s.ativa !== false ? 'bg-brand-600' : 'bg-gray-200'
                  )}>
                  <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                    s.ativa !== false ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </button>
              </td>
              <td className="px-3 py-2.5 text-right">
                {editId === s.id ? (
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => saveEdit(s.id)} className="text-green-600 hover:text-green-800 p-0.5"><Check size={14} /></button>
                    <button onClick={() => setEditId(null)} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => deleteSetor(s.id)} className="text-gray-300 hover:text-red-400 transition-colors p-0.5">
                    <Trash2 size={14} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {novoSetor ? (
        <div className="flex items-center gap-2 px-5 py-3 border-t border-gray-100">
          <input autoFocus value={novoSetor.nome}
            onChange={e => setNovoSetor(v => v ? { ...v, nome: e.target.value } : v)}
            onKeyDown={e => { if (e.key === 'Enter') addSetor(); if (e.key === 'Escape') setNovoSetor(null) }}
            placeholder="Nome do setor..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300" />
          <input type="number" min="1" max="100" value={novoSetor.peso}
            onChange={e => setNovoSetor(v => v ? { ...v, peso: e.target.value } : v)}
            onKeyDown={e => { if (e.key === 'Enter') addSetor() }}
            placeholder="Peso"
            className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-300" />
          <span className="text-gray-400 text-sm">%</span>
          <button onClick={addSetor} className="bg-brand-700 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-brand-600">
            Adicionar
          </button>
          <button onClick={() => setNovoSetor(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
      ) : (
        <button onClick={() => setNovoSetor({ nome: '', peso: '10' })}
          className="w-full flex items-center gap-2 px-5 py-3 border-t border-gray-100 text-sm text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
          <Plus size={14} /> Adicionar setor
        </button>
      )}
    </div>
  )
}

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const isAdmin = user?.perfil === 'admin'
  const [regionais, setRegionais] = useState<Regional[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [edit, setEdit] = useState<EditState | null>(null)
  const [novaUnidade, setNovaUnidade] = useState<{ nome: string; regionalId: number } | null>(null)
  const [novaRegional, setNovaRegional] = useState('')
  const [adicionandoRegional, setAdicionandoRegional] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiKeySalva, setApiKeySalva] = useState(false)
  const [mostrarKey, setMostrarKey] = useState(false)

  useEffect(() => {
    load()
    api.iaGetConfig().then((cfg: any) => {
      if (cfg.configured) setApiKey('configurada')
    })
  }, [])

  async function load() {
    const [regs, units] = await Promise.all([api.getRegionais(), api.getUnidades()])
    setRegionais(regs)
    setUnidades(units)
  }

  async function salvarEdicao() {
    if (!edit) return
    if (edit.type === 'regional') {
      await api.updateRegional(edit.id, { [edit.field]: edit.value })
    } else {
      await api.updateUnidade(edit.id, { nome: edit.value })
    }
    setEdit(null)
    load()
  }

  async function moverUnidade(unidadeId: number, novoRegionalId: number) {
    await api.updateUnidade(unidadeId, { regionalId: novoRegionalId })
    load()
  }

  async function adicionarUnidade() {
    if (!novaUnidade || !novaUnidade.nome.trim()) return
    await api.createUnidade(novaUnidade.nome.trim(), novaUnidade.regionalId)
    setNovaUnidade(null)
    load()
  }

  async function adicionarRegional() {
    if (!novaRegional.trim()) return
    await api.createRegional(novaRegional.trim())
    setNovaRegional('')
    setAdicionandoRegional(false)
    load()
  }

  async function salvarApiKey() {
    await api.iaSaveApiKey(apiKey.trim())
    setApiKeySalva(true)
    setTimeout(() => setApiKeySalva(false), 2500)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={24} className="text-gray-500" />
          Configurações
        </h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie regionais, unidades e integrações</p>
      </div>

      {/* Integração IA — Groq (somente admin) */}
      {isAdmin && <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-5 py-4 flex items-center gap-3">
          <Sparkles size={18} className="text-brand-200" />
          <div>
            <h2 className="text-white font-bold text-base">Inteligência Artificial — Groq</h2>
            <p className="text-brand-200 text-xs mt-0.5">Geração de planos de visita com Llama 3.3 70B (gratuito)</p>
          </div>
        </div>
        <div className="p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            API Key do Groq
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Obtenha sua chave gratuita em <strong>console.groq.com</strong> → API Keys → Create API Key
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={mostrarKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-300 font-mono"
              />
              <button
                onClick={() => setMostrarKey(v => !v)}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                {mostrarKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              onClick={salvarApiKey}
              disabled={!apiKey.trim()}
              className="flex items-center gap-2 bg-brand-700 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {apiKeySalva ? <><Check size={14} /> Salvo!</> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>}

      {/* Checklist Admin (somente admin) */}
      {isAdmin && <div className="mb-6"><ChecklistAdmin /></div>}

      {/* Regionais e Unidades */}
      <div className="space-y-6">
        {regionais.map(r => {
          const units = unidades.filter(u => u.regionalId === r.id)
          const outrasRegionais = regionais.filter(or => or.id !== r.id)

          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header da regional */}
              <div className="bg-brand-800 px-5 py-4 flex items-center gap-4">
                {edit?.type === 'regional' && edit.id === r.id && edit.field === 'nome' ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      autoFocus
                      className="flex-1 text-white bg-brand-700 border border-brand-500 rounded px-2 py-1 text-sm focus:outline-none"
                      value={edit.value}
                      onChange={e => setEdit(ed => ed ? { ...ed, value: e.target.value } : ed)}
                      onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEdit(null) }}
                    />
                    <button onClick={salvarEdicao} className="text-green-300 hover:text-green-100"><Check size={16} /></button>
                    <button onClick={() => setEdit(null)} className="text-brand-300 hover:text-white"><X size={16} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <h2 className="text-white font-bold text-base">{r.nome}</h2>
                    <button
                      onClick={() => setEdit({ type: 'regional', id: r.id, field: 'nome', value: r.nome })}
                      className="text-brand-300 hover:text-white transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}

                {/* Diretor */}
                {edit?.type === 'regional' && edit.id === r.id && edit.field === 'diretorNome' ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      className="text-white bg-brand-700 border border-brand-500 rounded px-2 py-1 text-sm focus:outline-none"
                      placeholder="Nome do diretor"
                      value={edit.value}
                      onChange={e => setEdit(ed => ed ? { ...ed, value: e.target.value } : ed)}
                      onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEdit(null) }}
                    />
                    <button onClick={salvarEdicao} className="text-green-300 hover:text-green-100"><Check size={16} /></button>
                    <button onClick={() => setEdit(null)} className="text-brand-300 hover:text-white"><X size={16} /></button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEdit({ type: 'regional', id: r.id, field: 'diretorNome', value: r.diretorNome ?? '' })}
                    className="text-brand-300 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Pencil size={12} />
                    {r.diretorNome ?? 'Adicionar diretor'}
                  </button>
                )}

                <span className="text-brand-300 text-sm ml-auto">{units.filter(u => u.ativa).length} unidades</span>
              </div>

              {/* Lista de unidades */}
              <div className="divide-y divide-gray-100">
                {units.filter(u => u.ativa).map(u => (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                    {/* Editar nome */}
                    {edit?.type === 'unidade' && edit.id === u.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          autoFocus
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                          value={edit.value}
                          onChange={e => setEdit(ed => ed ? { ...ed, value: e.target.value } : ed)}
                          onKeyDown={e => { if (e.key === 'Enter') salvarEdicao(); if (e.key === 'Escape') setEdit(null) }}
                        />
                        <button onClick={salvarEdicao} className="text-green-600 hover:text-green-800"><Check size={16} /></button>
                        <button onClick={() => setEdit(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-medium text-gray-800">{u.nome}</span>
                        <button
                          onClick={() => setEdit({ type: 'unidade', id: u.id, field: 'nome', value: u.nome })}
                          className="text-gray-300 hover:text-gray-500 transition-colors"
                        >
                          <Pencil size={12} />
                        </button>
                      </div>
                    )}

                    {/* Mover para outra regional */}
                    {outrasRegionais.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <ArrowLeftRight size={12} className="text-gray-400" />
                        <select
                          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-300"
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value) moverUnidade(u.id, Number(e.target.value))
                            e.target.value = ''
                          }}
                        >
                          <option value="">Mover para...</option>
                          {outrasRegionais.map(or => (
                            <option key={or.id} value={or.id}>{or.nome}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ))}

                {/* Adicionar unidade */}
                {novaUnidade?.regionalId === r.id ? (
                  <div className="flex items-center gap-2 px-5 py-3">
                    <input
                      autoFocus
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                      placeholder="Nome da unidade..."
                      value={novaUnidade.nome}
                      onChange={e => setNovaUnidade(n => n ? { ...n, nome: e.target.value } : n)}
                      onKeyDown={e => { if (e.key === 'Enter') adicionarUnidade(); if (e.key === 'Escape') setNovaUnidade(null) }}
                    />
                    <button onClick={adicionarUnidade} className="text-sm bg-brand-700 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600">
                      Adicionar
                    </button>
                    <button onClick={() => setNovaUnidade(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNovaUnidade({ nome: '', regionalId: r.id })}
                    className="w-full flex items-center gap-2 px-5 py-3 text-sm text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                  >
                    <Plus size={14} /> Adicionar unidade
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Adicionar regional */}
        {adicionandoRegional ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-3">
            <input
              autoFocus
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="Nome da nova regional..."
              value={novaRegional}
              onChange={e => setNovaRegional(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') adicionarRegional(); if (e.key === 'Escape') setAdicionandoRegional(false) }}
            />
            <button onClick={adicionarRegional} className="bg-brand-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-brand-600">
              Criar regional
            </button>
            <button onClick={() => setAdicionandoRegional(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdicionandoRegional(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-all text-sm font-medium"
          >
            <Plus size={16} /> Adicionar regional
          </button>
        )}
      </div>
    </div>
  )
}
