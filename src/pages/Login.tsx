import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ login: '', senha: '' })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    try {
      const res = await api.login(form.login, form.senha)
      login(res.token, res.user)
      if (res.trocarSenha) {
        navigate('/trocar-senha', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err: any) {
      setErro(err.message?.includes('401') ? 'Usuário ou senha inválidos' : 'Erro ao conectar. Tente novamente.')
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
          <h2 className="text-gray-800 text-lg font-semibold text-center">Entrar</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Login</label>
            <input
              type="text"
              autoComplete="username"
              value={form.login}
              onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="seu.login"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              autoComplete="current-password"
              value={form.senha}
              onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
              placeholder="••••••"
              required
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            <LogIn size={16} />
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
