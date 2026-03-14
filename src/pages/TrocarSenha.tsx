import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function TrocarSenhaPage() {
  const navigate = useNavigate()
  const { login: saveAuth } = useAuth()
  const [form, setForm] = useState({ novaSenha: '', confirmar: '' })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.novaSenha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres'); return }
    if (form.novaSenha !== form.confirmar) { setErro('As senhas não coincidem'); return }
    setErro('')
    setCarregando(true)
    try {
      const res = await api.trocarSenha(form.novaSenha)
      saveAuth(res.token, res.user)
      navigate('/', { replace: true })
    } catch {
      setErro('Erro ao trocar senha. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-brand-300 text-xs font-semibold uppercase tracking-widest mb-1">Matriz Educação</p>
          <h1 className="text-white text-2xl font-bold">Acompanhamento Regional</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div className="text-center">
            <div className="inline-flex p-3 bg-brand-50 rounded-full mb-3">
              <KeyRound size={22} className="text-brand-600" />
            </div>
            <h2 className="text-gray-800 text-lg font-semibold">Crie sua senha</h2>
            <p className="text-sm text-gray-500 mt-1">Este é seu primeiro acesso. Escolha uma senha pessoal.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.novaSenha}
              onChange={e => setForm(f => ({ ...f, novaSenha: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirmar}
              onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="Repita a senha"
              required
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {carregando ? 'Salvando...' : 'Definir senha e entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
