import { useState, useEffect, useRef } from 'react'
import logoUrl from '../assets/logo.png'
import { Sparkles, X, RefreshCw, Copy, Check, ChevronDown, AlertCircle, Pencil, Eye, FileDown } from 'lucide-react'
import { api } from '../lib/api'
import { useRegional } from '../context/RegionalContext'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../lib/utils'
import type { Unidade } from '../types'

interface Props { onClose: () => void }

interface PlanoResult {
  plano: string
  unidadeNome: string
  dataUltimaVisita: string
  totalDemandas: number
  scoreFinal?: number | null
  setoresData?: { setorNome: string; nota: number | null; peso: number; naoAplicavel?: boolean }[]
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

type Aba = 'plano' | 'periodo'

const hoje = new Date().toISOString().slice(0, 10)
const inicioSemana = (() => {
  const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10)
})()

export default function RelatorioIAModal({ onClose }: Props) {
  const { regionais, regionalAtiva } = useRegional()
  const { user } = useAuth()
  const [aba, setAba] = useState<Aba>('plano')

  // Aba plano de visita
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [unidadeId, setUnidadeId] = useState<number | ''>('')
  const [visitasUnidade, setVisitasUnidade] = useState<{ id: number; dataVisita: string; diretorNome: string | null }[]>([])
  const [visitaIdPlano, setVisitaIdPlano] = useState<number | ''>('')
  const [carregandoVisitas, setCarregandoVisitas] = useState(false)
  const [resultado, setResultado] = useState<PlanoResult | null>(null)
  const [textoEditado, setTextoEditado] = useState('')
  const [modoEdicao, setModoEdicao] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [semApiKey, setSemApiKey] = useState(false)

  // Aba relatório de período
  const [dataInicio, setDataInicio] = useState(inicioSemana)
  const [dataFim, setDataFim] = useState(hoje)
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState<Set<number>>(new Set())
  const [regionaisExpandidas, setRegionaisExpandidas] = useState<Set<number>>(new Set())
  const [filtroAberto, setFiltroAberto] = useState(false)
  const [todasUnidades, setTodasUnidades] = useState<Unidade[]>([])
  const [resultadoPeriodo, setResultadoPeriodo] = useState<{ relatorio: string; totalVisitas: number; totalDemandas: number; scoreMedia: number | null } | null>(null)
  const [textoPeriodo, setTextoPeriodo] = useState('')
  const [gerandoPeriodo, setGerandoPeriodo] = useState(false)
  const [erroPeriodo, setErroPeriodo] = useState<string | null>(null)
  const [copiadoPeriodo, setCopiadoPeriodo] = useState(false)
  const [modoEdicaoPeriodo, setModoEdicaoPeriodo] = useState(false)

  const filtroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([api.getUnidades(), api.iaGetConfig()]).then(([units, config]) => {
      const filtradas = regionalAtiva
        ? units.filter(u => u.regionalId === regionalAtiva.id && u.ativa)
        : units.filter(u => u.ativa)
      setUnidades(filtradas)
      setTodasUnidades(units.filter(u => u.ativa))
      if (!(config as any).configured) setSemApiKey(true)
    })
  }, [regionalAtiva])

  const regionaisComUnidades = regionais
    .map(r => ({ ...r, unidades: todasUnidades.filter(u => u.regionalId === r.id) }))
    .filter(r => r.unidades.length > 0)

  const labelFiltro = unidadesSelecionadas.size === 0
    ? 'Todas as unidades'
    : `${unidadesSelecionadas.size} unidade${unidadesSelecionadas.size !== 1 ? 's' : ''} selecionada${unidadesSelecionadas.size !== 1 ? 's' : ''}`

  async function selecionarUnidade(uid: number | '') {
    setUnidadeId(uid)
    setVisitaIdPlano('')
    setVisitasUnidade([])
    setResultado(null); setTextoEditado(''); setErro(null); setModoEdicao(false)
    if (!uid) return
    setCarregandoVisitas(true)
    try {
      const visitas = await api.getVisitasByUnidade(Number(uid))
      setVisitasUnidade(visitas.filter(v => v.status === 'concluida').sort((a, b) => b.dataVisita.localeCompare(a.dataVisita)))
    } finally {
      setCarregandoVisitas(false)
    }
  }

  async function gerar() {
    if (!unidadeId || !visitaIdPlano || gerando) return
    setGerando(true); setErro(null); setResultado(null); setModoEdicao(false)
    try {
      const res = await api.iaGerarPlano(Number(unidadeId), Number(visitaIdPlano))
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

    const getClassif = (s: number) => {
      if (s >= 90) return { texto: 'Excelência', bg: '#d1fae5', cor: '#065f46' }
      if (s >= 75) return { texto: 'Bom padrão', bg: '#dcfce7', cor: '#166534' }
      if (s >= 60) return { texto: 'Atenção', bg: '#fef3c7', cor: '#92400e' }
      return { texto: 'Crítico', bg: '#fee2e2', cor: '#991b1b' }
    }
    const getNotaCor = (n: number | null) => {
      if (n === null) return { bg: '#f3f4f6', cor: '#9ca3af' }
      if (n <= 1) return { bg: '#fee2e2', cor: '#dc2626' }
      if (n <= 3) return { bg: '#fef3c7', cor: '#92400e' }
      return { bg: '#dcfce7', cor: '#166534' }
    }

    let scorecardHtml = ''
    if (resultado.scoreFinal != null && resultado.setoresData?.length) {
      const classif = getClassif(resultado.scoreFinal)
      const rows = resultado.setoresData.map(s => {
        const isNA = s.naoAplicavel === true
        const nc = isNA ? { bg: '#f3f4f6', cor: '#9ca3af' } : getNotaCor(s.nota)
        const notaLabel = isNA ? 'N/A' : s.nota !== null ? String(s.nota) : '—'
        const opacity = isNA ? 'opacity:0.5;' : ''
        return `<tr style="border-bottom:1px solid #f3f4f6;${opacity}">
          <td style="padding:3px 0;color:#374151;${isNA ? 'text-decoration:line-through;color:#9ca3af;' : ''}">${esc(s.setorNome)}</td>
          <td style="padding:3px 8px;text-align:center;"><span style="display:inline-block;background:${nc.bg};color:${nc.cor};border-radius:4px;padding:1px 7px;font-weight:700;font-size:11px;">${notaLabel}</span></td>
          <td style="padding:3px 0;text-align:right;color:#6b7280;">${isNA ? '—' : s.peso + '%'}</td>
        </tr>`
      }).join('')
      scorecardHtml = `
<div style="background:#f0fdf4;border:2px solid #237f53;border-radius:10px;padding:18px 20px;margin-bottom:24px;display:flex;gap:24px;align-items:flex-start;">
  <div style="text-align:center;min-width:90px;padding-right:20px;border-right:1px solid #a7f3d0;">
    <div style="font-size:48px;font-weight:900;color:#16432e;line-height:1;">${resultado.scoreFinal.toFixed(1)}</div>
    <div style="font-size:10px;color:#4a7c59;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">Score NPS</div>
    <div style="margin-top:8px;display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${classif.bg};color:${classif.cor};">${classif.texto}</div>
  </div>
  <div style="flex:1;">
    <div style="font-size:10px;font-weight:700;color:#237f53;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Avaliação por setor</div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead><tr style="border-bottom:1px solid #d1fae5;">
        <th style="text-align:left;padding:3px 0;color:#6b7280;font-weight:600;">Setor</th>
        <th style="text-align:center;padding:3px 8px;color:#6b7280;font-weight:600;width:60px;">Nota</th>
        <th style="text-align:right;padding:3px 0;color:#6b7280;font-weight:600;width:40px;">Peso</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>`
    }

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
    .header-top img { height: 80px; }
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
  ${scorecardHtml}
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

  async function gerarPeriodo() {
    if (gerandoPeriodo) return
    setGerandoPeriodo(true); setErroPeriodo(null); setResultadoPeriodo(null); setModoEdicaoPeriodo(false)
    try {
      const ids = unidadesSelecionadas.size > 0 ? Array.from(unidadesSelecionadas) : undefined
      const res = await api.iaGerarRelatorioPeriodo(dataInicio, dataFim, ids)
      setResultadoPeriodo(res)
      setTextoPeriodo(res.relatorio)
    } catch (e: any) {
      const msg = e.message ?? ''
      if (msg.includes('Nenhuma visita')) setErroPeriodo('Nenhuma visita concluída encontrada no período selecionado.')
      else setErroPeriodo('Erro ao gerar relatório. Verifique a chave Groq nas Configurações.')
    } finally {
      setGerandoPeriodo(false)
    }
  }

  async function copiarPeriodo() {
    await navigator.clipboard.writeText(textoPeriodo)
    setCopiadoPeriodo(true)
    setTimeout(() => setCopiadoPeriodo(false), 2000)
  }

  function exportarPDFPeriodo() {
    if (!resultadoPeriodo) return
    const logoPdfUrl = `${window.location.origin}${logoUrl}`
    const scoreChip = resultadoPeriodo.scoreMedia != null
      ? `<span style="background:#d1fae5;color:#065f46;font-weight:600;">Score médio NPS: ${resultadoPeriodo.scoreMedia.toFixed(1)}</span>`
      : ''
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Relatório Consolidado — ${dataInicio} a ${dataFim}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1a202c; padding: 40px 48px; line-height: 1.6; }
    header { border-bottom: 2px solid #237f53; padding-bottom: 16px; margin-bottom: 24px; }
    .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .header-top img { height: 80px; }
    .header-top .data-gerado { font-size: 11px; color: #718096; }
    header h1 { font-size: 20px; color: #16432e; margin-bottom: 4px; }
    header .meta { color: #718096; font-size: 12px; display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap; }
    header .meta span { background: #edf2f7; padding: 2px 10px; border-radius: 20px; }
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
    @media print { body { padding: 20px 24px; } @page { margin: 1cm; } }
  </style>
</head>
<body>
  <header>
    <div class="header-top">
      <img src="${logoPdfUrl}" alt="Matriz Educação" />
      <span class="data-gerado">Gerado em ${new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })}</span>
    </div>
    <h1>Relatório Consolidado de Visitas</h1>
    <div class="meta">
      <span>Período: ${dataInicio} a ${dataFim}</span>
      <span>${resultadoPeriodo.totalVisitas} visita(s)</span>
      <span>${resultadoPeriodo.totalDemandas} demanda(s) aberta(s)</span>
      ${scoreChip}
    </div>
  </header>
  ${markdownParaHtml(textoPeriodo)}
  <footer>
    <span>Matriz Educação — Acompanhamento Regional</span>
    <span>Relatório para reunião de liderança</span>
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
              <h2 className="font-semibold text-gray-900 text-sm">Relatórios por IA</h2>
              <p className="text-xs text-gray-400">Análise de visitas com inteligência artificial</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          <button
            onClick={() => setAba('plano')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${aba === 'plano' ? 'text-brand-700 border-b-2 border-brand-600 -mb-px' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Plano de visita
          </button>
          <button
            onClick={() => setAba('periodo')}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${aba === 'periodo' ? 'text-brand-700 border-b-2 border-brand-600 -mb-px' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Relatório consolidado
          </button>
        </div>

        {/* ── ABA PERÍODO ─────────────────────────────────────── */}
        {aba === 'periodo' && (
          <>
            <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0 space-y-3">
              <div className="flex gap-2 items-end flex-wrap">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">De</label>
                  <input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setResultadoPeriodo(null) }}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Até</label>
                  <input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setResultadoPeriodo(null) }}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
                {/* Tree-select de unidades */}
                <div className="relative" ref={filtroRef}>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Unidades</label>
                  <button
                    type="button"
                    onClick={() => setFiltroAberto(v => !v)}
                    className="flex items-center justify-between gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-300 min-w-44"
                  >
                    <span className={unidadesSelecionadas.size === 0 ? 'text-gray-400' : 'text-gray-700 font-medium'}>
                      {labelFiltro}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${filtroAberto ? 'rotate-180' : ''}`} />
                  </button>

                  {filtroAberto && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setFiltroAberto(false)} />
                      <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-64 max-h-64 overflow-y-auto py-2">
                        {unidadesSelecionadas.size > 0 && (
                          <>
                            <button
                              onClick={() => { setUnidadesSelecionadas(new Set()); setResultadoPeriodo(null) }}
                              className="w-full text-left px-3 py-1.5 text-xs text-brand-600 hover:bg-brand-50 font-medium"
                            >
                              Limpar filtro (todas)
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                          </>
                        )}
                        {regionaisComUnidades.map(r => {
                          const idsR = r.unidades.map(u => u.id)
                          const qtd = idsR.filter(id => unidadesSelecionadas.has(id)).length
                          const todasMarcadas = qtd === idsR.length && qtd > 0
                          const alguma = qtd > 0 && !todasMarcadas
                          const expandida = regionaisExpandidas.has(r.id)
                          return (
                            <div key={r.id}>
                              <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
                                <input
                                  type="checkbox"
                                  checked={todasMarcadas}
                                  ref={el => { if (el) el.indeterminate = alguma }}
                                  onChange={() => {
                                    const nova = new Set(unidadesSelecionadas)
                                    if (todasMarcadas) idsR.forEach(id => nova.delete(id))
                                    else idsR.forEach(id => nova.add(id))
                                    setUnidadesSelecionadas(nova)
                                    setResultadoPeriodo(null)
                                  }}
                                  className="accent-brand-600 cursor-pointer flex-shrink-0"
                                />
                                <span
                                  className="text-sm font-medium text-gray-700 flex-1 cursor-pointer select-none"
                                  onClick={() => {
                                    const nova = new Set(regionaisExpandidas)
                                    if (nova.has(r.id)) { nova.delete(r.id) } else { nova.add(r.id) }
                                    setRegionaisExpandidas(nova)
                                  }}
                                >
                                  {r.nome}
                                </span>
                                <button
                                  onClick={() => {
                                    const nova = new Set(regionaisExpandidas)
                                    if (nova.has(r.id)) { nova.delete(r.id) } else { nova.add(r.id) }
                                    setRegionaisExpandidas(nova)
                                  }}
                                  className="text-gray-400 hover:text-gray-600 p-0.5 flex-shrink-0"
                                >
                                  <ChevronDown size={12} className={`transition-transform ${expandida ? 'rotate-180' : ''}`} />
                                </button>
                              </div>
                              {expandida && r.unidades.map(u => (
                                <label key={u.id} className="flex items-center gap-2 pl-9 pr-3 py-1 hover:bg-gray-50 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={unidadesSelecionadas.has(u.id)}
                                    onChange={() => {
                                      const nova = new Set(unidadesSelecionadas)
                                      if (nova.has(u.id)) { nova.delete(u.id) } else { nova.add(u.id) }
                                      setUnidadesSelecionadas(nova)
                                      setResultadoPeriodo(null)
                                    }}
                                    className="accent-brand-600"
                                  />
                                  <span className="text-xs text-gray-600">{u.nome}</span>
                                </label>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
                <button onClick={gerarPeriodo} disabled={gerandoPeriodo || semApiKey}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                  {gerandoPeriodo ? <><RefreshCw size={14} className="animate-spin" />Gerando...</> : resultadoPeriodo ? <><RefreshCw size={14} />Regerar</> : <><Sparkles size={14} />Gerar</>}
                </button>
                {resultadoPeriodo && !gerandoPeriodo && (
                  <>
                    <button onClick={() => setModoEdicaoPeriodo(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-2 border text-sm rounded-lg transition-colors whitespace-nowrap ${modoEdicaoPeriodo ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                      {modoEdicaoPeriodo ? <><Eye size={14} />Visualizar</> : <><Pencil size={14} />Editar</>}
                    </button>
                    <button onClick={copiarPeriodo}
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 hover:border-gray-300 text-gray-600 text-sm rounded-lg transition-colors whitespace-nowrap">
                      {copiadoPeriodo ? <><Check size={14} className="text-green-500" />Copiado</> : <><Copy size={14} />Copiar</>}
                    </button>
                    <button onClick={exportarPDFPeriodo}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap">
                      <FileDown size={14} />PDF
                    </button>
                  </>
                )}
              </div>
              {semApiKey && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5">
                  <AlertCircle size={14} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700">Chave Groq não configurada. Acesse <strong>Configurações</strong> para adicionar.</p>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {!resultadoPeriodo && !gerandoPeriodo && !erroPeriodo && (
                <div className="text-center py-12 text-gray-400">
                  <Sparkles size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Selecione o período e clique em <strong>Gerar</strong></p>
                  <p className="text-xs mt-1 max-w-xs mx-auto">A IA consolida todas as visitas do período para sua reunião semanal de liderança</p>
                </div>
              )}
              {gerandoPeriodo && (
                <div className="text-center py-12 text-gray-400">
                  <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-brand-400" />
                  <p className="text-sm font-medium text-gray-600">Analisando visitas do período...</p>
                  <p className="text-xs mt-1">Isso pode levar alguns segundos</p>
                </div>
              )}
              {erroPeriodo && !gerandoPeriodo && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{erroPeriodo}</p>
                </div>
              )}
              {resultadoPeriodo && !gerandoPeriodo && (
                <div>
                  <div className="flex gap-3 mb-4 text-xs text-gray-500 flex-wrap">
                    <span className="bg-gray-100 px-3 py-1 rounded-full">{resultadoPeriodo.totalVisitas} visita(s) no período</span>
                    {resultadoPeriodo.scoreMedia != null && (() => {
                      const s = resultadoPeriodo.scoreMedia!
                      const cls = s >= 90 ? 'bg-emerald-50 text-emerald-700' : s >= 75 ? 'bg-green-50 text-green-700' : s >= 60 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                      return <span className={`px-3 py-1 rounded-full font-bold ${cls}`}>Score médio: {s.toFixed(1)}</span>
                    })()}
                    <span className={`px-3 py-1 rounded-full font-medium ${resultadoPeriodo.totalDemandas > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                      {resultadoPeriodo.totalDemandas} demanda(s) aberta(s)
                    </span>
                    {modoEdicaoPeriodo && <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-full">Modo edição ativo</span>}
                  </div>
                  {modoEdicaoPeriodo ? (
                    <textarea value={textoPeriodo} onChange={e => setTextoPeriodo(e.target.value)}
                      className="w-full h-96 text-sm border border-brand-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-300 font-mono leading-relaxed resize-none bg-brand-50/30"
                      spellCheck={false} />
                  ) : (
                    <MarkdownSimples text={textoPeriodo} />
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── ABA PLANO ────────────────────────────────────────── */}
        {/* Controles */}
        {aba === 'plano' && <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex gap-2 items-end flex-wrap">
            {/* Seleção unidade */}
            <div className="min-w-40">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Unidade</label>
              <div className="relative">
                <select
                  value={unidadeId}
                  onChange={e => selecionarUnidade(Number(e.target.value) || '')}
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

            {/* Seleção de visita */}
            {unidadeId && (
              <div className="min-w-44 flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Visita</label>
                <div className="relative">
                  <select
                    value={visitaIdPlano}
                    onChange={e => { setVisitaIdPlano(Number(e.target.value) || ''); setResultado(null); setErro(null); setModoEdicao(false) }}
                    disabled={carregandoVisitas || visitasUnidade.length === 0}
                    className="w-full appearance-none text-sm border border-gray-200 rounded-lg px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    <option value="">{carregandoVisitas ? 'Carregando...' : visitasUnidade.length === 0 ? 'Sem visitas concluídas' : 'Selecione a visita...'}</option>
                    {visitasUnidade.map(v => (
                      <option key={v.id} value={v.id}>
                        {formatDate(v.dataVisita)}{v.diretorNome ? ` — ${v.diretorNome}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Botão gerar */}
            <button
              onClick={gerar}
              disabled={!unidadeId || !visitaIdPlano || gerando || semApiKey}
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
        </div>}

        {/* Conteúdo — aba plano */}
        {aba === 'plano' && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {!resultado && !gerando && !erro && (
              <div className="text-center py-12 text-gray-400">
                <Sparkles size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Selecione uma unidade e clique em <strong>Gerar</strong></p>
                <p className="text-xs mt-1 max-w-xs mx-auto">A IA analisa a última visita, pontos de atenção e demandas abertas</p>
              </div>
            )}
            {gerando && (
              <div className="text-center py-12 text-gray-400">
                <RefreshCw size={32} className="mx-auto mb-3 animate-spin text-brand-400" />
                <p className="text-sm font-medium text-gray-600">Analisando registros...</p>
                <p className="text-xs mt-1">Isso leva alguns segundos</p>
              </div>
            )}
            {erro && !gerando && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{erro}</p>
              </div>
            )}
            {resultado && !gerando && (
              <div>
                <div className="flex gap-3 mb-4 text-xs text-gray-500 flex-wrap">
                  <span className="bg-gray-100 px-3 py-1 rounded-full">
                    Última visita: <strong>{formatDate(resultado.dataUltimaVisita)}</strong>
                  </span>
                  {resultado.scoreFinal != null && (() => {
                    const s = resultado.scoreFinal!
                    const cls = s >= 90 ? 'bg-emerald-50 text-emerald-700' : s >= 75 ? 'bg-green-50 text-green-700' : s >= 60 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                    const label = s >= 90 ? 'Excelência' : s >= 75 ? 'Bom padrão' : s >= 60 ? 'Atenção' : 'Crítico'
                    return <span className={`px-3 py-1 rounded-full font-bold ${cls}`}>NPS {s.toFixed(1)} — {label}</span>
                  })()}
                  <span className={`px-3 py-1 rounded-full font-medium ${resultado.totalDemandas > 0 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                    {resultado.totalDemandas} demanda(s) aberta(s)
                  </span>
                  {modoEdicao && <span className="bg-brand-50 text-brand-600 px-3 py-1 rounded-full">Modo edição ativo</span>}
                </div>
                {modoEdicao ? (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Edite o texto livremente. Use **negrito**, # Título, ## Subtítulo, - item de lista.</p>
                    <textarea value={textoEditado} onChange={e => setTextoEditado(e.target.value)}
                      className="w-full h-96 text-sm border border-brand-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-brand-300 font-mono leading-relaxed resize-none bg-brand-50/30"
                      spellCheck={false} />
                  </div>
                ) : (
                  <MarkdownSimples text={textoEditado} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
