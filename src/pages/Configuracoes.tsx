import { useEffect, useState } from 'react'
import { Settings, Plus, ArrowLeftRight, Pencil, Check, X, Sparkles, Eye, EyeOff } from 'lucide-react'
import type { Regional, Unidade } from '../types'
import { api } from '../lib/api'

interface EditState {
  type: 'regional' | 'unidade'
  id: number
  field: string
  value: string
}

export default function ConfiguracoesPage() {
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

      {/* Integração IA — Groq */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
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
      </div>

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
