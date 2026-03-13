import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Sparkles, ChevronRight, AlertCircle, Copy, Check, RefreshCw } from 'lucide-react'
import type { Unidade, Regional } from '../types'
import { formatDate } from '../lib/utils'
import { api } from '../lib/api'

interface PlanoResult {
  plano: string
  unidadeNome: string
  dataUltimaVisita: string
  totalDemandas: number
}

// Renderiza markdown simples (bold, listas, headers)
function MarkdownSimples({ text }: { text: string }) {
  const linhas = text.split('\n')

  return (
    <div className="space-y-1 text-sm text-gray-800 leading-relaxed">
      {linhas.map((linha, i) => {
        // Header ##
        if (linha.startsWith('## ')) {
          return (
            <h3 key={i} className="font-bold text-base text-brand-800 mt-5 mb-2 first:mt-0">
              {linha.replace('## ', '')}
            </h3>
          )
        }
        // Header ###
        if (linha.startsWith('### ')) {
          return (
            <h4 key={i} className="font-semibold text-gray-700 mt-3 mb-1">
              {linha.replace('### ', '')}
            </h4>
          )
        }
        // Header #
        if (linha.startsWith('# ')) {
          return (
            <h2 key={i} className="font-bold text-lg text-brand-900 mt-4 mb-2 first:mt-0">
              {linha.replace('# ', '')}
            </h2>
          )
        }
        // Lista com -
        if (linha.match(/^[-*] /)) {
          const content = renderBold(linha.replace(/^[-*] /, ''))
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-brand-400 mt-0.5 flex-shrink-0">•</span>
              <span>{content}</span>
            </div>
          )
        }
        // Lista numerada
        if (linha.match(/^\d+\. /)) {
          const num = linha.match(/^(\d+)\. /)?.[1]
          const content = renderBold(linha.replace(/^\d+\. /, ''))
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-brand-500 font-bold flex-shrink-0 w-5">{num}.</span>
              <span>{content}</span>
            </div>
          )
        }
        // Linha em branco
        if (linha.trim() === '') return <div key={i} className="h-1" />
        // Linha normal
        return <p key={i}>{renderBold(linha)}</p>
      })}
    </div>
  )
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
  )
}

export default function PlanoVisitaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [unidade, setUnidade] = useState<Unidade | null>(null)
  const [regional, setRegional] = useState<Regional | null>(null)
  const [resultado, setResultado] = useState<PlanoResult | null>(null)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [semApiKey, setSemApiKey] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getUnidades(),
      api.getRegionais(),
      api.iaGetConfig(),
    ]).then(([units, regs, config]) => {
      const u = units.find(u => u.id === Number(id))!
      setUnidade(u)
      setRegional(regs.find(r => r.id === u.regionalId) ?? null)
      if (!(config as any).configured) setSemApiKey(true)
    })
  }, [id])

  async function gerarPlano() {
    if (!id || gerando) return
    setGerando(true)
    setErro(null)
    try {
      const res = await api.iaGerarPlano(Number(id))
      setResultado(res as PlanoResult)
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao gerar plano')
    } finally {
      setGerando(false)
    }
  }

  async function copiar() {
    if (!resultado) return
    await navigator.clipboard.writeText(resultado.plano)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (!unidade) return <div className="p-8 text-gray-400">Carregando...</div>

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
        <span className="text-gray-700 font-medium">Plano de visita</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles size={22} className="text-brand-500" />
            Plano de visita — {unidade.nome}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Gerado por IA com base nos registros da última visita
          </p>
        </div>

        <div className="flex gap-2">
          {resultado && (
            <button
              onClick={copiar}
              className="flex items-center gap-2 text-sm border border-gray-200 hover:border-gray-300 text-gray-600 px-4 py-2 rounded-lg transition-colors"
            >
              {copiado ? <><Check size={15} className="text-green-500" /> Copiado!</> : <><Copy size={15} /> Copiar</>}
            </button>
          )}
          <button
            onClick={gerarPlano}
            disabled={gerando || semApiKey}
            className="flex items-center gap-2 bg-brand-700 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {gerando
              ? <><RefreshCw size={15} className="animate-spin" /> Gerando...</>
              : resultado
              ? <><RefreshCw size={15} /> Regerar</>
              : <><Sparkles size={15} /> Gerar plano</>
            }
          </button>
        </div>
      </div>

      {/* Aviso sem API key */}
      {semApiKey && (
        <div className="mb-6 flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">API key do Groq não configurada</p>
            <p className="text-xs text-yellow-700 mt-1">
              Acesse <strong>Configurações</strong> e insira sua chave gratuita do Groq para usar a IA.
            </p>
            <button
              onClick={() => navigate('/configuracoes')}
              className="mt-2 text-xs text-yellow-700 underline hover:text-yellow-900"
            >
              Ir para Configurações →
            </button>
          </div>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      {/* Estado inicial */}
      {!resultado && !gerando && !erro && (
        <div className="text-center py-20 text-gray-400">
          <Sparkles size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">Clique em "Gerar plano" para criar o roteiro da próxima visita</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            A IA vai analisar os registros da última visita, as demandas abertas e gerar um plano de ação organizado.
          </p>
        </div>
      )}

      {/* Gerando */}
      {gerando && (
        <div className="text-center py-20 text-gray-400">
          <RefreshCw size={36} className="mx-auto mb-4 animate-spin text-brand-400" />
          <p className="font-medium text-gray-600">Analisando registros e gerando plano...</p>
          <p className="text-sm mt-1">Isso leva alguns segundos</p>
        </div>
      )}

      {/* Resultado */}
      {resultado && !gerando && (
        <div>
          {/* Meta info */}
          <div className="flex gap-4 mb-6 text-xs text-gray-500">
            <span className="bg-gray-100 px-3 py-1 rounded-full">
              Última visita: {formatDate(resultado.dataUltimaVisita)}
            </span>
            <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full">
              {resultado.totalDemandas} demanda(s) aberta(s)
            </span>
          </div>

          {/* Plano */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <MarkdownSimples text={resultado.plano} />
          </div>
        </div>
      )}
    </div>
  )
}
