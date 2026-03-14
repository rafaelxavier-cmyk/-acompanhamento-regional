import { useState, useEffect } from 'react'
import logoUrl from '../assets/logo.jpg'
import { Sparkles, X, RefreshCw, Copy, Check, ChevronDown, AlertCircle, Pencil, Eye, FileDown } from 'lucide-react'
import { api } from '../lib/api'
import { useRegional } from '../context/RegionalContext'
import { formatDate } from '../lib/utils'
import type { Unidade } from '../types'

interface Props { onClose: () => void }

interface PlanoResult {
  plano: string
  unidadeNome: string
  dataUltimaVisita: string
  totalDemandas: number
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-gray-900">{part}</strong> : part
  )
}

function MarkdownSimples({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm text-gray-800 leading-relaxed">
      {text.split('\n').map((linha, i) => {
        if (linha.startsWith('## '))  return <h3 key={i} className="font-bold text-base text-brand-800 mt-5 mb-2 first:mt-0">{linha.slice(3)}</h3>
        if (linha.startsWith('### ')) return <h4 key={i} className="font-semibold text-gray-700 mt-3 mb-1">{linha.slice(4)}</h4>
        if (linha.startsWith('# '))  return <h2 key={i} className="font-bold text-lg text-brand-900 mt-4 mb-2 first:mt-0">{linha.slice(2)}</h2>
        if (linha.match(/^[-*] /)) return (
          <div key={i} className="flex gap-2 ml-2">
            <span className="text-brand-400 mt-0.5 flex-shrink-0">•</span>
            <span>{renderBold(linha.replace(/^[-*] /, ''))}</span>
          </div>
        )
        if (linha.match(/^\d+\. /)) {
          const num = linha.match(/^(\d+)\. /)?.[1]
          return (
            <div key={i} className="flex gap-2 ml-2">
              <span className="text-brand-500 font-bold flex-shrink-0 w-5">{num}.</span>
              <span>{renderBold(linha.replace(/^\d+\. /, ''))}</span>
            </div>
          )
        }
        if (!linha.trim()) return <div key={i} className="h-1" />
        return <p key={i}>{renderBold(linha)}</p>
      })}
    </div>
  )
}

// Converte markdown para HTML simples para o PDF
function markdownParaHtml(texto: string): string {
  return texto
    .split('\n')
    .map(l => {
      if (l.startsWith('# '))   return `<h1>${esc(l.slice(2))}</h1>`
      if (l.startsWith('## '))  return `<h2>${esc(l.slice(3))}</h2>`
      if (l.startsWith('### ')) return `<h3>${esc(l.slice(4))}</h3>`
      if (l.match(/^[-*] /))   return `<li>${bold(esc(l.replace(/^[-*] /, '')))}</li>`
      if (l.match(/^\d+\. /))  return `<li>${bold(esc(l.replace(/^\d+\. /, '')))}</li>`
      if (!l.trim())            return '<br>'
      return `<p>${bold(esc(l))}</p>`
    })
    .join('\n')
    .replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`)
}
function esc(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function bold(s: string) { return s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }

export default function RelatorioIAModal({ onClose }: Props) {
  const { regionais, regionalAtiva } = useRegional()
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [unidadeId, setUnidadeId] = useState<number | ''>('')
  const [resultado, setResultado] = useState<PlanoResult | null>(null)
  const [textoEditado, setTextoEditado] = useState('')
  const [modoEdicao, setModoEdicao] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [semApiKey, setSemApiKey] = useState(false)

  useEffect(() => {
    Promise.all([api.getUnidades(), api.iaGetConfig()]).then(([units, config]) => {
      const filtradas = regionalAtiva
        ? units.filter(u => u.regionalId === regionalAtiva.id && u.ativa)
        : units.filter(u => u.ativa)
      setUnidades(filtradas)
      if (!(config as any).configured) setSemApiKey(true)
    })
  }, [regionalAtiva])

  async function gerar() {
    if (!unidadeId || gerando) return
    setGerando(true); setErro(null); setResultado(null); setModoEdicao(false)
    try {
      const res = await api.iaGerarPlano(Number(unidadeId))
      setResultado(res as PlanoResult)
      setTextoEditado(res.plano)
    } catch (e: any) {
      const msg = e.message ?? ''
      if (msg.includes('Nenhuma visita concluída')) setErro('Esta unidade não possui visitas concluídas ainda.')
      else setErro('Erro ao gerar relatório. Verifique a chave Groq nas Configurações.')
    } finally {
      setGerando(false)
    }
  }

  async function copiar() {
    await navigator.clipboard.writeText(textoEditado)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  function exportarPDF() {
    if (!resultado) return
    const data = formatDate(resultado.dataUltimaVisita)
    const logoPdfUrl = `${window.location.origin}${logoUrl}`
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório — ${resultado.unidadeNome}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a202c; padding: 40px 48px; line-height: 1.6; }
    header { border-bottom: 2px solid #237f53; padding-bottom: 16px; margin-bottom: 24px; }
    .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .header-top img { height: 36px; }
    .header-top .data-gerado { font-size: 11px; color: #718096; }
    header h1 { font-size: 20px; color: #16432e; margin-bottom: 4px; }
    header .meta { color: #718096; font-size: 12px; display: flex; gap: 16px; margin-top: 8px; }
    header .meta span { background: #edf2f7; padding: 2px 10px; border-radius: 20px; }
    header .meta span.demandas { background: #fff3e0; color: #c05621; }
    h1 { font-size: 18px; color: #16432e; margin: 20px 0 8px; }
    h2 { font-size: 15px; color: #237f53; margin: 18px 0 6px; border-left: 3px solid #237f53; padding-left: 8px; }
    h3 { font-size: 13px; color: #2d3748; margin: 14px 0 4px; font-weight: 600; }
    p { margin: 4px 0; }
    ul { margin: 4px 0 8px 0; padding-left: 0; list-style: none; }
    li { padding: 2px 0 2px 16px; position: relative; }
    li::before { content: "•"; position: absolute; left: 4px; color: #237f53; }
    strong { font-weight: 600; }
    br { display: block; margin: 4px 0; }
    footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #a0aec0; font-size: 11px; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 20px 24px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-top">
      <img src="${logoPdfUrl}" alt="Matriz Educação" />
      <span class="data-gerado">Gerado em ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}</span>
    </div>
    <h1>Relatório de Visita — ${resultado.unidadeNome}</h1>
    <div class="meta">
      <span>Última visita: ${data}</span>
      <span class="${resultado.totalDemandas > 0 ? 'demandas' : ''}">${resultado.totalDemandas} demanda(s) aberta(s)</span>
    </div>
  </header>
  ${markdownParaHtml(textoEditado)}
  <footer>
    <span>Matriz Educação — Acompanhamento Regional</span>
    <span>${resultado.unidadeNome}</span>
  </footer>
</body>
</html>`

    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) { alert('Permita pop-ups para exportar o PDF'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print() }, 600)
  }

  const unidadeSelecionada = unidades.find(u => u.id === Number(unidadeId))
  const regionalNome = unidadeSelecionada
    ? regionais.find(r => r.id === unidadeSelecionada.regionalId)?.nome
    : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-brand-100 rounded-lg">
              <Sparkles size={16} className="text-brand-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Relatório de visita por IA</h2>
              <p className="text-xs text-gray-400">Analisa a última visita e demandas abertas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        {/* Controles */}
        <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-2 items-end flex-wrap">
            {/* Seleção unidade */}
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Unidade</label>
              <div className="relative">
                <select
                  value={unidadeId}
                  onChange={e => { setUnidadeId(Number(e.target.value) || ''); setResultado(null); setTextoEditado(''); setErro(null); setModoEdicao(false) }}
                  className="w-full appearance-none text-sm border border-gray-200 rounded-lg px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
                >
                  <option value="">Selecione uma unidade...</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              {unidadeSelecionada && regionalNome && (
                <p className="text-xs text-gray-400 mt-1">{regionalNome}</p>
              )}
            </div>

            {/* Botão gerar */}
            <button
              onClick={gerar}
              disabled={!unidadeId || gerando || semApiKey}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-700 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              {gerando ? <><RefreshCw size={14} className="animate-spin" />Gerando...</> : resultado ? <><RefreshCw size={14} />Regerar</> : <><Sparkles size={14} />Gerar</>}
            </button>

            {/* Botões pós-geração */}
            {resultado && !gerando && (
              <>
                <button
                  onClick={() => setModoEdicao(v => !v)}
                  title={modoEdicao ? 'Visualizar' : 'Editar relatório'}
                  className={`flex items-center gap-1.5 px-3 py-2.5 border text-sm rounded-lg transition-colors whitespace-nowrap ${modoEdicao ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                >
                  {modoEdicao ? <><Eye size={14} />Visualizar</> : <><Pencil size={14} />Editar</>}
                </button>
                <button
                  onClick={copiar}
                  title="Copiar texto"
                  className="flex items-center gap-1.5 px-3 py-2.5 border border-gray-200 hover:border-gray-300 text-gray-600 text-sm rounded-lg transition-colors whitespace-nowrap"
                >
                  {copiado ? <><Check size={14} className="text-green-500" />Copiado</> : <><Copy size={14} />Copiar</>}
                </button>
                <button
                  onClick={exportarPDF}
                  title="Exportar como PDF"
                  className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                >
                  <FileDown size={14} />PDF
                </button>
              </>
            )}
          </div>

          {semApiKey && (
            <div className="mt-3 flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5">
              <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700">Chave Groq não configurada. Acesse <strong>Configurações</strong> para adicionar.</p>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Estado inicial */}
          {!resultado && !gerando && !erro && (
            <div className="text-center py-12 text-gray-400">
              <Sparkles size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Selecione uma unidade e clique em <strong>Gerar</strong></p>
              <p className="text-xs mt-1 max-w-xs mx-auto">A IA analisa a última visita, pontos de atenção e demandas abertas</p>
            </div>
          )}

          {/* Gerando */}
          {gerando && (
            <div className="text-center py-12 text-gray-400">
              <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-brand-400" />
              <p className="text-sm font-medium text-gray-600">Analisando registros...</p>
              <p className="text-xs mt-1">Isso leva alguns segundos</p>
            </div>
          )}

          {/* Erro */}
          {erro && !gerando && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{erro}</p>
            </div>
          )}

          {/* Resultado */}
          {resultado && !gerando && (
            <div>
              <div className="flex gap-3 mb-4 text-xs text-gray-500 flex-wrap">
                <span className="bg-gray-100 px-3 py-1 rounded-full">
                  Última visita: <strong>{formatDate(resultado.dataUltimaVisita)}</strong>
                </span>
                <span className={`px-3 py-1 rounded-full font-medium ${resultado.totalDemandas > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                  {resultado.totalDemandas} demanda(s) aberta(s)
                </span>
                {modoEdicao && (
                  <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-full">Modo edição ativo</span>
                )}
              </div>

              {/* Modo edição */}
              {modoEdicao ? (
                <div>
                  <p className="text-xs text-gray-400 mb-2">Edite o texto livremente. Use **negrito**, # Título, ## Subtítulo, - item de lista.</p>
                  <textarea
                    value={textoEditado}
                    onChange={e => setTextoEditado(e.target.value)}
                    className="w-full h-96 text-sm border border-brand-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-300 font-mono leading-relaxed resize-none bg-brand-50/30"
                    spellCheck={false}
                  />
                </div>
              ) : (
                <MarkdownSimples text={textoEditado} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
