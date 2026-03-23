import { useEffect, useState } from 'react'
import { Users, Plus, Pencil, Trash2, X, Check, Shield, User, RotateCcw, Clock, History } from 'lucide-react'
import { api } from '../lib/api'
import type { Regional } from '../types'

interface Usuario {
  id: number
  nome: string
  login: string
  perfil: 'admin' | 'usuario'
  ativo: number
  trocarSenha: number
  regionalIds: number[]
  ultimoAcesso?: string
  totalSegundosOnline?: number
  totalSessoes?: number
}

interface Sessao {
  id: number
  iniciadaEm: string
  encerradaEm?: string
  duracaoSeg?: number
}

function formatTempo(segundos: number): string {
  if (!segundos || segundos <= 0) return '—'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min`
  return '< 1min'
}

function formatDataHora(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

type Form = {
  nome: string
  login: string
  senha: string
  perfil: 'admin' | 'usuario'
  ativo: boolean
  regionalIds: number[]
}

const FORM_VAZIO: Form = { nome: '', login: '', senha: '', perfil: 'usuario', ativo: true, regionalIds: [] }

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [regionais, setRegionais] = useState<Regional[]>([])
  const [modal, setModal] = useState<'novo' | Usuario | null>(null)
  const [form, setForm] = useState<Form>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState<Usuario | null>(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erroLoad, setErroLoad] = useState(false)
  const [historico, setHistorico] = useState<{ usuario: Usuario; sessoes: Sessao[] } | null>(null)
  const [loadingHistorico, setLoadingHistorico] = useState(false)

  function carregar() {
    setCarregando(true)
    setErroLoad(false)
    Promise.all([api.getUsuarios(), api.getRegionais()])
      .then(([u, r]) => { setUsuarios(u); setRegionais(r) })
      .catch(() => setErroLoad(true))
      .finally(() => setCarregando(false))
  }

  useEffect(() => { carregar() }, [])

  async function abrirHistorico(u: Usuario) {
    setLoadingHistorico(true)
    setHistorico({ usuario: u, sessoes: [] })
    const sessoes = await api.getSessoesUsuario(u.id).catch(() => [])
    setHistorico({ usuario: u, sessoes })
    setLoadingHistorico(false)
  }

  function abrirNovo() {
    setForm(FORM_VAZIO); setErro(''); setModal('novo')
  }

  function abrirEditar(u: Usuario) {
    setForm({
      nome: u.nome, login: u.login, senha: '',
      perfil: u.perfil, ativo: u.ativo === 1,
      regionalIds: u.regionalIds,
    })
    setErro(''); setModal(u)
  }

  function toggleRegional(id: number) {
    setForm(f => ({
      ...f,
      regionalIds: f.regionalIds.includes(id)
        ? f.regionalIds.filter(r => r !== id)
        : [...f.regionalIds, id],
    }))
  }

  async function salvar() {
    if (!form.nome || !form.login) { setErro('Nome e login são obrigatórios'); return }
    if (modal === 'novo' && !form.senha) { setErro('Senha é obrigatória para novo usuário'); return }
    if (form.senha && form.senha.length < 6) { setErro('Senha deve ter pelo menos 6 caracteres'); return }
    setSalvando(true); setErro('')
    try {
      if (modal === 'novo') {
        const u = await api.criarUsuario({ ...form, regionalIds: form.regionalIds })
        setUsuarios(prev => [...prev, u])
      } else {
        const payload: any = { nome: form.nome, login: form.login, perfil: form.perfil, ativo: form.ativo, regionalIds: form.regionalIds }
        if (form.senha) payload.senha = form.senha
        const u = await api.atualizarUsuario((modal as Usuario).id, payload)
        setUsuarios(prev => prev.map(x => x.id === u.id ? u : x))
      }
      setModal(null)
    } catch (e: any) {
      setErro(e.message?.includes('409') ? 'Login já em uso' : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!excluindo) return
    await api.excluirUsuario(excluindo.id)
    setUsuarios(prev => prev.filter(u => u.id !== excluindo.id))
    setExcluindo(null)
  }

  async function resetarSenha(u: Usuario, novaSenha: string) {
    if (!novaSenha || novaSenha.length < 6) return
    await api.atualizarUsuario(u.id, { senha: novaSenha })
    alert(`Senha de ${u.nome} redefinida. Ele será obrigado a trocar no próximo acesso.`)
  }

  if (carregando) return (
    <div className="p-8 flex items-center justify-center min-h-[60vh] text-gray-400 text-sm gap-2">
      <RotateCcw size={16} className="animate-spin" /> Carregando...
    </div>
  )

  if (erroLoad) return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-gray-500 text-sm">Não foi possível carregar os usuários.</p>
      <button onClick={carregar} className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
        <RotateCcw size={14} /> Tentar novamente
      </button>
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} className="text-gray-500" /> Usuários
          </h1>
          <p className="text-gray-500 text-sm mt-1">{usuarios.length} usuário(s) cadastrado(s)</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 transition-colors"
        >
          <Plus size={15} /> Novo usuário
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {usuarios.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum usuário cadastrado</p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {usuarios.map(u => (
                <div key={u.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{u.nome}</p>
                      <p className="text-gray-400 font-mono text-xs mt-0.5">{u.login}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => abrirEditar(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setExcluindo(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${u.perfil === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.perfil === 'admin' ? <Shield size={9} /> : <User size={9} />}
                      {u.perfil === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    {u.trocarSenha === 1 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">Senha prov.</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    Regionais: {u.regionalIds.length === 0
                      ? <span className="text-blue-600">Todas</span>
                      : u.regionalIds.map(id => regionais.find(r => r.id === id)?.nome).filter(Boolean).join(', ')}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>Último acesso: {formatDataHora(u.ultimoAcesso)}</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {formatTempo(u.totalSegundosOnline ?? 0)}</span>
                    <button onClick={() => abrirHistorico(u)} className="text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                      <History size={10} /> histórico
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Login</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Perfil</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Último acesso</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tempo online</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{u.nome}</td>
                    <td className="px-5 py-3 text-gray-500 font-mono text-xs">{u.login}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${u.perfil === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.perfil === 'admin' ? <Shield size={10} /> : <User size={10} />}
                        {u.perfil === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {formatDataHora(u.ultimoAcesso)}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-gray-300" />
                        {formatTempo(u.totalSegundosOnline ?? 0)}
                        {(u.totalSessoes ?? 0) > 0 && (
                          <span className="text-gray-300 ml-0.5">({u.totalSessoes}x)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      {u.trocarSenha === 1 && (
                        <span className="ml-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600 font-medium">Senha prov.</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => abrirHistorico(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Histórico de sessões">
                          <History size={14} />
                        </button>
                        <button onClick={() => abrirEditar(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setExcluindo(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Modal novo/editar */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{modal === 'novo' ? 'Novo usuário' : 'Editar usuário'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" placeholder="Ex: João Silva" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
                <input type="text" value={form.login} onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 font-mono" placeholder="joao.silva" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modal === 'novo' ? 'Senha provisória' : 'Nova senha provisória'}{modal !== 'novo' && <span className="text-gray-400 font-normal"> (deixe em branco para manter)</span>}
                </label>
                <input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" placeholder="Mínimo 6 caracteres" />
                <p className="text-xs text-gray-400 mt-1">O usuário será obrigado a trocar no 1º acesso.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select value={form.perfil} onChange={e => setForm(f => ({ ...f, perfil: e.target.value as any }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="usuario">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Acesso às regionais</label>
                <p className="text-xs text-gray-400 mb-2">Marque todas para liberar a opção "Todas as regionais" no menu.</p>
                <div className="space-y-2">
                  {regionais.map(r => (
                    <label key={r.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.regionalIds.includes(r.id)} onChange={() => toggleRegional(r.id)}
                        className="w-4 h-4 rounded accent-brand-600" />
                      <span className="text-sm text-gray-700">{r.nome}</span>
                    </label>
                  ))}
                  {form.regionalIds.length === regionais.length && regionais.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1">✓ Acesso a todas as regionais — opção "Todas" disponível no menu</p>
                  )}
                </div>
              </div>
              {modal !== 'novo' && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
                    className="w-4 h-4 rounded accent-brand-600" />
                  <label htmlFor="ativo" className="text-sm text-gray-700">Usuário ativo</label>
                </div>
              )}
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={salvar} disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                <Check size={14} />{salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal exclusão */}
      {excluindo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-100 rounded-lg"><Trash2 size={18} className="text-red-600" /></div>
                <h2 className="font-semibold text-gray-900">Excluir usuário</h2>
              </div>
              <p className="text-sm text-gray-600">Tem certeza que deseja excluir <strong>{excluindo.nome}</strong>?</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setExcluindo(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={excluir} className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <Trash2 size={14} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal histórico de sessões */}
      {historico && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <History size={16} className="text-indigo-500" />
                  Histórico — {historico.usuario.nome}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Último acesso: {formatDataHora(historico.usuario.ultimoAcesso)} &nbsp;·&nbsp;
                  Total online: {formatTempo(historico.usuario.totalSegundosOnline ?? 0)}
                </p>
              </div>
              <button onClick={() => setHistorico(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {loadingHistorico ? (
                <div className="flex items-center justify-center py-10 text-gray-400 text-sm gap-2">
                  <RotateCcw size={14} className="animate-spin" /> Carregando...
                </div>
              ) : historico.sessoes.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">Nenhuma sessão registrada</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-100">
                      <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Início</th>
                      <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Encerramento</th>
                      <th className="pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historico.sessoes.map(s => (
                      <tr key={s.id}>
                        <td className="py-2.5 text-gray-700">{formatDataHora(s.iniciadaEm)}</td>
                        <td className="py-2.5 text-gray-500">
                          {s.encerradaEm
                            ? formatDataHora(s.encerradaEm)
                            : <span className="text-green-600 text-xs font-medium">Ativa</span>}
                        </td>
                        <td className="py-2.5 text-gray-500 text-right">{formatTempo(s.duracaoSeg ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
