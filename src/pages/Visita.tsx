import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, CheckCircle2, Plus, Trash2, User, Calendar } from 'lucide-react'
import type {
  Visita, Unidade, Regional, ChecklistSetor, RegistroChecklist,
  UltimoRegistroChecklist, Demanda, PrioridadeDemanda, StatusDemanda
} from '../types'
import { formatDateLong, formatDate } from '../lib/utils'
import { cn } from '../lib/utils'
import { api } from '../lib/api'
import { DemandaModal } from './Kanban'

// ── Critérios por setor (referência visual durante avaliação) ─────────────────
const CRITERIOS: Record<number, { categoria: string; itens: string[] }[]> = {
  1: [
    { categoria: 'Fluxo e organização', itens: ['Fluxo organizado e sem gargalos', 'Entrada iniciando pontualmente', 'Tempo de entrada adequado', 'Organização das filas', 'Ausência de aglomeração excessiva'] },
    { categoria: 'Segurança', itens: ['Controle adequado de responsáveis', 'Portaria ativa e atenta', 'Controle de acesso funcional', 'Equipe posicionada estrategicamente'] },
    { categoria: 'Atendimento e postura', itens: ['Colaboradores receptivos', 'Comunicação clara com responsáveis', 'Postura profissional da equipe', 'Uniformização adequada dos alunos'] },
  ],
  2: [
    { categoria: 'Organização', itens: ['Horário sendo respeitado', 'Fluxo organizado dos alunos', 'Espaços bem distribuídos', 'Cantina organizada'] },
    { categoria: 'Disciplina', itens: ['Inspetores circulando ativamente', 'Ausência de tumultos', 'Intervenção rápida em conflitos', 'Boa postura dos alunos'] },
    { categoria: 'Conservação', itens: ['Limpeza durante o intervalo', 'Limpeza após o intervalo', 'Ausência de lixo acumulado'] },
  ],
  3: [
    { categoria: 'Banheiros', itens: ['Sem odor forte', 'Papel disponível', 'Sabonete disponível', 'Limpeza adequada', 'Conservação satisfatória', 'Lixeiras controladas'] },
    { categoria: 'Salas e áreas comuns', itens: ['Corredores limpos', 'Pátios organizados', 'Lixeiras distribuídas adequadamente', 'Ausência de lixo visível'] },
    { categoria: 'Infraestrutura', itens: ['Iluminação funcionando', 'Ventiladores/ar-condicionado funcionando', 'Pintura conservada', 'Equipamentos operacionais', 'Mobiliário em bom estado'] },
  ],
  4: [
    { categoria: 'Ambiente físico', itens: ['Sala limpa', 'Carteiras organizadas', 'Quadro limpo', 'Boa iluminação', 'Ventilação adequada'] },
    { categoria: 'Comunicação visual', itens: ['Mural atualizado', 'Materiais pedagógicos expostos', 'Ausência de poluição visual', 'Identidade institucional preservada'] },
    { categoria: 'Aula e dinâmica pedagógica', itens: ['Professor presente', 'Professor pontual', 'Aula acontecendo efetivamente', 'Boa condução da turma', 'Alunos engajados', 'Uso adequado do material didático'] },
    { categoria: 'Rotina pedagógica', itens: ['Chamada sendo realizada', 'Conteúdo registrado', 'Planejamento sendo seguido', 'Boa organização da aula'] },
  ],
  5: [
    { categoria: 'Organização e estrutura', itens: ['Ambiente limpo', 'Mesas organizadas', 'Materiais disponíveis', 'Ambiente funcional'] },
    { categoria: 'Cultura e clima', itens: ['Clima profissional saudável', 'Comunicação institucional visível', 'Professores alinhados institucionalmente', 'Uso adequado do espaço'] },
  ],
  6: [
    { categoria: 'Atendimento', itens: ['Recepção rápida', 'Cordialidade no atendimento', 'Clareza nas informações', 'Boa postura profissional'] },
    { categoria: 'Organização', itens: ['Documentação organizada', 'Ambiente limpo', 'Fluxo operacional organizado', 'Tempo de espera adequado'] },
    { categoria: 'Comercial', itens: ['Equipe conhece os produtos da escola', 'Boa apresentação dos diferenciais', 'Atendimento consultivo/comercial', 'Follow-up acontecendo'] },
  ],
  7: [
    { categoria: 'Gestão comercial', itens: ['Metas visíveis', 'Equipe conhece metas', 'Conversão sendo acompanhada', 'Leads sendo trabalhados'] },
    { categoria: 'Captação', itens: ['Campanhas visíveis na unidade', 'Ações externas acontecendo', 'Comunicação institucional atualizada', 'Materiais comerciais organizados'] },
  ],
  8: [
    { categoria: 'Atuação da liderança', itens: ['Diretor presente e atuante', 'Coordenação circulando pela unidade', 'Liderança acessível à equipe'] },
    { categoria: 'Gestão operacional', itens: ['Rotinas acontecendo adequadamente', 'Acompanhamentos frequentes', 'Plano de ação ativo', 'Boa comunicação interna'] },
    { categoria: 'Gestão por dados', itens: ['Uso de indicadores', 'Acompanhamento de matrícula', 'Controle de evasão', 'Gestão de ocorrências'] },
  ],
  9: [
    { categoria: 'Marca e identidade', itens: ['Comunicação visual padronizada', 'Murais institucionais atualizados', 'Resultados expostos adequadamente', 'Ambiente transmite organização e qualidade'] },
    { categoria: 'Cultura institucional', itens: ['Equipe alinhada ao discurso institucional', 'Boa apresentação da unidade', 'Percepção de cuidado e excelência'] },
  ],
  10: [
    { categoria: 'Segurança', itens: ['Extintores válidos', 'Saídas de emergência desobstruídas', 'Controle de acesso adequado', 'Ambientes seguros'] },
    { categoria: 'Conformidade', itens: ['Registro adequado de ocorrências', 'Cumprimento das normas internas', 'Processos funcionando corretamente'] },
  ],
}

// ── Escala 0–5 ────────────────────────────────────────────────────────────────
const NOTA_LABELS = ['Inaceitável', 'Muito abaixo', 'Abaixo do padrão', 'Adequado', 'Bom padrão', 'Excelência']

const NOTA_ACTIVE: Record<number, string> = {
  0: 'bg-red-500 text-white border-red-500',
  1: 'bg-orange-500 text-white border-orange-500',
  2: 'bg-amber-400 text-white border-amber-400',
  3: 'bg-yellow-400 text-gray-800 border-yellow-400',
  4: 'bg-lime-500 text-white border-lime-500',
  5: 'bg-green-500 text-white border-green-500',
}

const NOTA_DOT: Record<number, string> = {
  0: 'bg-red-500', 1: 'bg-orange-500', 2: 'bg-amber-400',
  3: 'bg-yellow-400', 4: 'bg-lime-500', 5: 'bg-green-500',
}

function calcScore(setores: ChecklistSetor[], registros: RegistroChecklist[]): number {
  const evaluated = setores.filter(s => {
    const reg = registros.find(r => r.setorId === s.id)
    return reg && !reg.naoAplicavel && reg.nota !== null && reg.nota !== undefined
  })
  if (!evaluated.length) return 0
  const pesoTotal = evaluated.reduce((sum, s) => sum + s.peso, 0)
  if (!pesoTotal) return 0
  return evaluated.reduce((sum, s) => {
    const reg = registros.find(r => r.setorId === s.id)!
    return sum + reg.nota! * s.peso
  }, 0) * 20 / pesoTotal
}

function getClassificacao(score: number) {
  if (score >= 90) return { label: 'Excelência', color: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-emerald-500', border: 'border-emerald-200' }
  if (score >= 75) return { label: 'Bom padrão', color: 'text-green-700',   bg: 'bg-green-50',   bar: 'bg-green-500',   border: 'border-green-200' }
  if (score >= 60) return { label: 'Atenção',     color: 'text-yellow-700',  bg: 'bg-yellow-50',  bar: 'bg-yellow-400',  border: 'border-yellow-200' }
  return              { label: 'Crítico',       color: 'text-red-700',     bg: 'bg-red-50',     bar: 'bg-red-500',     border: 'border-red-200' }
}

const PRIORIDADE_STYLE: Record<PrioridadeDemanda, string> = {
  urgente: 'bg-red-100 text-red-700 border-red-200',
  alta:    'bg-orange-100 text-orange-700 border-orange-200',
  normal:  'bg-gray-100 text-gray-600 border-gray-200',
  baixa:   'bg-blue-50 text-blue-600 border-blue-200',
}
const PRIORIDADE_LABEL: Record<PrioridadeDemanda, string> = {
  urgente: 'Urgente', alta: 'Alta', normal: 'Normal', baixa: 'Baixa',
}

// ── Bloco de um setor ─────────────────────────────────────────────────────────
interface SetorBlockProps {
  setor: ChecklistSetor
  visita: Visita
  unidade: Unidade
  registro: RegistroChecklist | undefined
  ultimoRegistro: UltimoRegistroChecklist | undefined
  onUpdate: (setorId: number, data: { nota?: number | null; observacao?: string; naoAplicavel?: boolean }) => void
}

function SetorBlock({ setor, visita, unidade, registro, ultimoRegistro, onUpdate }: SetorBlockProps) {
  const [open, setOpen] = useState(false)
  const [demandas, setDemandas] = useState<Demanda[]>([])
  const [modalDemanda, setModalDemanda] = useState(false)

  const nota = registro?.nota ?? null
  const naoAplicavel = registro?.naoAplicavel ?? false

  useEffect(() => {
    if (open && registro) {
      api.getDemandasByRegistroChecklist(registro.id).then(setDemandas)
    }
  }, [open, registro])

  async function criarDemanda(form: {
    titulo: string; descricao: string; prioridade: PrioridadeDemanda
    responsavel: string; prazo: string; unidadeId: number | ''; statusDemanda: StatusDemanda
  }) {
    if (!registro) return
    const d = await api.createDemandaChecklist(registro.id, {
      titulo: form.titulo,
      descricao: form.descricao || undefined,
      prioridade: form.prioridade,
      responsavel: form.responsavel || undefined,
      prazo: form.prazo || undefined,
    })
    setDemandas(prev => [...prev, d])
    setModalDemanda(false)
  }

  async function concluirDemanda(id: number) {
    await api.updateDemanda(id, { statusDemanda: 'concluida' })
    setDemandas(prev => prev.map(d => d.id === id ? { ...d, statusDemanda: 'concluida' } : d))
  }

  async function excluirDemanda(id: number) {
    await api.deleteDemanda(id)
    setDemandas(prev => prev.filter(d => d.id !== id))
  }

  const dotClass = naoAplicavel
    ? 'bg-gray-200 ring-2 ring-gray-200 ring-offset-1'
    : nota !== null ? NOTA_DOT[nota] : 'bg-gray-300'

  return (
    <div className={cn('border rounded-xl overflow-hidden', open ? 'border-brand-300' : 'border-gray-200', naoAplicavel && 'opacity-60')}>
      {/* Header — dois níveis para caber bem no mobile */}
      <div
        className={cn('cursor-pointer select-none transition-colors', open ? 'bg-brand-50' : 'bg-white hover:bg-gray-50')}
        onClick={() => setOpen(o => !o)}
      >
        {/* Linha 1: identificação */}
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-1">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotClass}`} />
          <span className={cn('flex-1 font-medium text-sm min-w-0 truncate', naoAplicavel ? 'text-gray-400 line-through' : 'text-gray-800')}>
            {setor.nome}
          </span>
          {naoAplicavel && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">N/A</span>
          )}
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {setor.peso}%
          </span>
          <ChevronDown size={16} className={cn('text-gray-400 transition-transform flex-shrink-0', open && 'rotate-180')} />
        </div>

        {/* Linha 2: botões de nota */}
        <div
          className="flex gap-1 items-center px-4 pb-3 pl-7 flex-wrap"
          onClick={e => e.stopPropagation()}
        >
          {([0, 1, 2, 3, 4, 5] as const).map(n => (
            <button
              key={n}
              disabled={visita.status === 'concluida' || naoAplicavel}
              title={`${n} — ${NOTA_LABELS[n]}`}
              onClick={() => onUpdate(setor.id, { nota: nota === n ? null : n, naoAplicavel: false })}
              className={cn(
                'w-9 h-8 rounded-lg text-sm font-bold border transition-colors flex-shrink-0',
                nota === n && !naoAplicavel
                  ? NOTA_ACTIVE[n]
                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40'
              )}
            >
              {n}
            </button>
          ))}
          <div className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />
          <button
            disabled={visita.status === 'concluida'}
            title="Não aplicável — exclui da pontuação"
            onClick={() => onUpdate(setor.id, naoAplicavel ? { naoAplicavel: false } : { nota: null, naoAplicavel: true })}
            className={cn(
              'px-2.5 h-8 rounded-lg text-xs font-bold border transition-colors flex-shrink-0',
              naoAplicavel
                ? 'bg-gray-500 text-white border-gray-500'
                : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 disabled:cursor-not-allowed'
            )}
          >
            N/A
          </button>
        </div>
      </div>

      {/* Corpo expandido */}
      {open && (
        <div className="px-5 py-4 bg-white border-t border-gray-100 space-y-5">
          {/* Nota selecionada */}
          {nota !== null && (
            <div className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg',
              nota <= 1 ? 'bg-red-50' : nota <= 3 ? 'bg-yellow-50' : 'bg-green-50'
            )}>
              <span className={cn('text-2xl font-black',
                nota <= 1 ? 'text-red-600' : nota <= 3 ? 'text-yellow-600' : 'text-green-600'
              )}>{nota}</span>
              <span className="text-sm font-medium text-gray-700">{NOTA_LABELS[nota]}</span>
            </div>
          )}

          {/* Última visita */}
          {ultimoRegistro && ultimoRegistro.nota !== null && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">
                Última visita — {formatDateLong(ultimoRegistro.dataVisita)}
              </p>
              <p className="text-xs text-amber-800">
                Nota: <strong>{ultimoRegistro.nota} — {NOTA_LABELS[ultimoRegistro.nota]}</strong>
              </p>
              {ultimoRegistro.observacao && (
                <p className="text-xs text-amber-700 mt-1 italic">"{ultimoRegistro.observacao}"</p>
              )}
            </div>
          )}

          {/* Critérios (expansível) */}
          {(() => {
            const criterios = setor.criteriosJson ?? CRITERIOS[setor.ordem]
            if (!criterios?.length) return null
            return (
              <details className="group">
                <summary className="text-xs font-semibold text-gray-500 cursor-pointer list-none flex items-center gap-1 select-none">
                  <ChevronRight size={12} className="transition-transform group-open:rotate-90" />
                  Critérios de avaliação
                </summary>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 pl-4 pt-1">
                  {criterios.map(cat => (
                    <div key={cat.categoria}>
                      <p className="text-xs font-semibold text-gray-600 mb-1">{cat.categoria}</p>
                      <ul className="space-y-0.5">
                        {cat.itens.map(item => (
                          <li key={item} className="text-xs text-gray-400 flex items-start gap-1">
                            <span className="text-gray-300 flex-shrink-0 mt-0.5">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            )
          })()}

          {/* Observação */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Observações</label>
            <textarea
              rows={3}
              defaultValue={registro?.observacao ?? ''}
              placeholder="Anotações sobre este setor..."
              disabled={visita.status === 'concluida'}
              onBlur={e => onUpdate(setor.id, { observacao: e.target.value })}
              spellCheck={true}
              lang="pt-BR"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-gray-50"
            />
          </div>

          {/* Demandas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">
                Demandas ({demandas.filter(d => d.statusDemanda === 'aberta').length} abertas)
              </label>
              {visita.status !== 'concluida' && (
                <button
                  onClick={() => setModalDemanda(true)}
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium flex items-center gap-1"
                >
                  <Plus size={12} /> Adicionar
                </button>
              )}
            </div>

            {demandas.length > 0 && (
              <div className="space-y-2">
                {demandas.map(d => {
                  const prazoVencido = d.prazo && d.statusDemanda !== 'concluida' && new Date(d.prazo) < new Date()
                  return (
                    <div key={d.id} className={cn(
                      'rounded-lg border px-3 py-2.5 text-sm',
                      d.statusDemanda === 'concluida' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-orange-50 border-orange-100'
                    )}>
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => d.statusDemanda !== 'concluida' && concluirDemanda(d.id)}
                          className={cn('flex-shrink-0 w-4 h-4 rounded-full border-2 mt-0.5 transition-colors',
                            d.statusDemanda === 'concluida'
                              ? 'bg-green-400 border-green-400'
                              : 'border-gray-300 hover:border-green-400'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wide flex-shrink-0', PRIORIDADE_STYLE[d.prioridade])}>
                              {PRIORIDADE_LABEL[d.prioridade]}
                            </span>
                            <span className={cn('font-medium text-gray-800', d.statusDemanda === 'concluida' && 'line-through text-gray-400')}>
                              {d.titulo}
                            </span>
                          </div>
                          {d.descricao && <p className="text-xs text-gray-400 mt-0.5">{d.descricao}</p>}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {d.responsavel && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <User size={10} />{d.responsavel}
                              </span>
                            )}
                            {d.prazo && (
                              <span className={cn('flex items-center gap-1 text-xs', prazoVencido ? 'text-red-500 font-medium' : 'text-gray-500')}>
                                <Calendar size={10} />{formatDate(d.prazo)}{prazoVencido && ' ⚠'}
                              </span>
                            )}
                          </div>
                        </div>
                        {d.statusDemanda !== 'concluida' && visita.status !== 'concluida' && (
                          <button onClick={() => excluirDemanda(d.id)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {modalDemanda && (
        <DemandaModal
          titulo="Nova demanda"
          unidades={[unidade]}
          inicial={{ unidadeId: unidade.id, statusDemanda: 'aberta' }}
          onSalvar={criarDemanda}
          onFechar={() => setModalDemanda(false)}
        />
      )}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function VisitaPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visita, setVisita]         = useState<Visita | null>(null)
  const [unidade, setUnidade]       = useState<Unidade | null>(null)
  const [regional, setRegional]     = useState<Regional | null>(null)
  const [setores, setSetores]       = useState<ChecklistSetor[]>([])
  const [registros, setRegistros]   = useState<RegistroChecklist[]>([])
  const [ultimosReg, setUltimosReg] = useState<Record<number, UltimoRegistroChecklist>>({})
  const [concluindo, setConcluindo] = useState(false)

  useEffect(() => {
    if (!id) return
    api.getVisita(Number(id)).then(async v => {
      setVisita(v)
      const [units, regs, slist, recs] = await Promise.all([
        api.getUnidades(),
        api.getRegionais(),
        api.getChecklistSetores(),
        api.getRegistrosChecklist(v.id),
      ])
      const u = units.find(u => u.id === v.unidadeId)!
      const r = regs.find(r => r.id === u.regionalId)!
      setUnidade(u)
      setRegional(r)
      setSetores(slist)
      setRegistros(recs)

      const ultimos: Record<number, UltimoRegistroChecklist> = {}
      await Promise.all(
        slist.map(async s => {
          const ult = await api.getUltimoRegistroChecklist(u.id, s.id)
          if (ult) ultimos[s.id] = ult
        })
      )
      setUltimosReg(ultimos)
    })
  }, [id])

  const handleUpdate = useCallback(async (setorId: number, data: { nota?: number | null; observacao?: string; naoAplicavel?: boolean }) => {
    if (!visita) return
    const reg = await api.upsertRegistroChecklist(visita.id, setorId, data)
    setRegistros(prev => {
      const idx = prev.findIndex(r => r.setorId === setorId)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = reg; return next
      }
      return [...prev, reg]
    })
  }, [visita])

  async function concluirVisita() {
    if (!visita || concluindo) return
    setConcluindo(true)
    try {
      const updated = await api.updateVisita(visita.id, { status: 'concluida' })
      setVisita(updated)
    } finally {
      setConcluindo(false)
    }
  }

  const score = calcScore(setores, registros)
  const naAplicaveisCount = registros.filter(r => r.naoAplicavel).length
  const avaliados = registros.filter(r => r.nota !== null && !r.naoAplicavel).length
  const tratados = avaliados + naAplicaveisCount
  const classificacao = getClassificacao(avaliados > 0 ? score : 0)

  if (!visita || !unidade) return <div className="p-8 text-gray-400">Carregando...</div>

  const scoreDisplay = visita.status === 'concluida' && visita.scoreFinal != null
    ? Number(visita.scoreFinal)
    : (avaliados > 0 ? score : null)

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
        <span className="text-gray-700 font-medium">{formatDateLong(visita.dataVisita)}</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{unidade.nome}</h1>
          <p className="text-gray-500 mt-1">{formatDateLong(visita.dataVisita)}</p>
          {visita.status === 'concluida' && (
            <span className="inline-flex items-center gap-1.5 mt-2 text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              <CheckCircle2 size={12} /> Visita concluída
            </span>
          )}
        </div>
        {visita.status === 'em_andamento' && (
          <button
            onClick={concluirVisita}
            disabled={concluindo}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
          >
            <CheckCircle2 size={16} />
            {concluindo ? 'Concluindo...' : 'Concluir visita'}
          </button>
        )}
      </div>

      {/* Card NPS da Visita */}
      <div className={cn('rounded-2xl border p-5 mb-6', classificacao.bg, classificacao.border)}>
        <div className="flex items-start justify-between gap-6">
          {/* Score principal */}
          <div className="flex-shrink-0">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">NPS da Visita</p>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-5xl font-black tabular-nums', classificacao.color)}>
                {scoreDisplay !== null ? scoreDisplay.toFixed(1) : '—'}
              </span>
              {scoreDisplay !== null && <span className="text-lg text-gray-400 font-medium">/ 100</span>}
            </div>
            {scoreDisplay !== null && (
              <span className={cn('inline-block mt-2 text-sm font-semibold px-3 py-1 rounded-full bg-white/60', classificacao.color)}>
                {classificacao.label}
              </span>
            )}
            <p className="text-xs text-gray-400 mt-3">
              {avaliados} avaliados{naAplicaveisCount > 0 ? `, ${naAplicaveisCount} N/A` : ''} de {setores.length}
            </p>
          </div>

          {/* Mini barras por setor */}
          <div className="flex-1 space-y-1.5 min-w-0">
            {setores.map(s => {
              const reg = registros.find(r => r.setorId === s.id)
              const n = reg?.nota ?? null
              const na = reg?.naoAplicavel ?? false
              return (
                <div key={s.id} className={cn('flex items-center gap-2 text-xs', na && 'opacity-40')}>
                  <span className="text-gray-500 truncate w-36 flex-shrink-0 text-right">{s.nome}</span>
                  <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                    {na ? (
                      <div className="h-full w-full bg-gray-300/50 rounded-full" style={{backgroundImage:'repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(0,0,0,0.1) 3px,rgba(0,0,0,0.1) 6px)'}} />
                    ) : (
                      <div
                        className={cn('h-full rounded-full transition-all duration-300',
                          n === null ? '' : n <= 1 ? 'bg-red-400' : n <= 3 ? 'bg-yellow-400' : 'bg-green-500'
                        )}
                        style={{ width: `${n !== null ? (n / 5) * 100 : 0}%` }}
                      />
                    )}
                  </div>
                  <span className={cn('w-5 text-center font-bold flex-shrink-0 tabular-nums',
                    na ? 'text-gray-400' :
                    n === null ? 'text-gray-300' :
                    n <= 1 ? 'text-red-600' : n <= 3 ? 'text-yellow-600' : 'text-green-600'
                  )}>
                    {na ? 'N/A' : n !== null ? n : '—'}
                  </span>
                  <span className="text-gray-300 w-6 flex-shrink-0 text-right">{s.peso}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Barra de progresso de conclusão */}
        <div className="mt-4 pt-3 border-t border-white/40">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progresso do checklist</span>
            <span className="font-medium">{setores.length > 0 ? Math.round((tratados / setores.length) * 100) : 0}%</span>
          </div>
          <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-300', classificacao.bar)}
              style={{ width: `${setores.length > 0 ? (tratados / setores.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Legenda da escala */}
      <div className="flex items-center gap-1.5 mb-6 flex-wrap">
        <span className="text-xs text-gray-400 mr-1">Escala:</span>
        {NOTA_LABELS.map((label, n) => (
          <span key={n} className={cn(
            'text-xs px-2 py-0.5 rounded-full border font-medium',
            n === 0 ? 'bg-red-50 text-red-600 border-red-200' :
            n === 1 ? 'bg-orange-50 text-orange-600 border-orange-200' :
            n === 2 ? 'bg-amber-50 text-amber-600 border-amber-200' :
            n === 3 ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
            n === 4 ? 'bg-lime-50 text-lime-700 border-lime-200' :
                      'bg-green-50 text-green-700 border-green-200'
          )}>
            {n} — {label}
          </span>
        ))}
      </div>

      {/* Observação geral */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Observação geral da visita</label>
        <textarea
          rows={2}
          defaultValue={visita.observacaoGeral ?? ''}
          placeholder="Impressão geral, contexto da visita..."
          disabled={visita.status === 'concluida'}
          onBlur={e => api.updateVisita(visita.id, { observacaoGeral: e.target.value })}
          spellCheck={true}
          lang="pt-BR"
          className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 disabled:bg-gray-50"
        />
      </div>

      {/* Setores */}
      <div className="space-y-3">
        {setores.map(s => (
          <SetorBlock
            key={s.id}
            setor={s}
            visita={visita}
            unidade={unidade}
            registro={registros.find(r => r.setorId === s.id)}
            ultimoRegistro={ultimosReg[s.id]}
            onUpdate={handleUpdate}
          />
        ))}
      </div>
    </div>
  )
}
