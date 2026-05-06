import { Router } from 'express'
import { query, queryOne } from '../db/connection'
import { adminOnly } from '../middleware/auth'

const router = Router()

async function coletarContextoVisita(unidadeId: number, visitaId?: number) {
  const unidade = await queryOne<{ id: number; nome: string; regionalId: number }>(
    'SELECT id, nome, regional_id FROM unidades WHERE id = ?', [unidadeId]
  )

  const ultimaVisita = visitaId
    ? await queryOne<{ id: number; dataVisita: string; observacaoGeral: string; diretorNome: string; scoreFinal: number | null }>(
        `SELECT id, data_visita, observacao_geral, diretor_nome, score_final
         FROM visitas WHERE id = ? AND status = 'concluida'`, [visitaId]
      )
    : await queryOne<{ id: number; dataVisita: string; observacaoGeral: string; diretorNome: string; scoreFinal: number | null }>(
        `SELECT id, data_visita, observacao_geral, diretor_nome, score_final
         FROM visitas WHERE unidade_id = ? AND status = 'concluida'
         ORDER BY data_visita DESC LIMIT 1`, [unidadeId]
      )

  if (!ultimaVisita) return null

  const registrosChecklist = await query<{
    nota: number | null; observacao: string | null; setorNome: string; peso: number; ordem: number; naoAplicavel: boolean
  }>(
    `SELECT rc.nota, rc.observacao, rc.nao_aplicavel, cs.nome AS setor_nome, cs.peso, cs.ordem
     FROM registros_checklist rc
     JOIN checklist_setores cs ON cs.id = rc.setor_id
     WHERE rc.visita_id = ?
     ORDER BY cs.ordem`, [ultimaVisita.id]
  )

  const demandas = await query<{
    titulo: string; prioridade: string; setorNome: string | null
  }>(
    `SELECT d.titulo, d.prioridade, cs.nome AS setor_nome
     FROM demandas d
     LEFT JOIN registros_checklist rc ON rc.id = d.registro_checklist_id
     LEFT JOIN checklist_setores cs   ON cs.id = rc.setor_id
     WHERE d.unidade_id = ? AND d.status_demanda = 'aberta'
     ORDER BY CASE d.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END`,
    [unidadeId]
  )

  return { unidade, ultimaVisita, registrosChecklist, demandas }
}

function notaLabel(nota: number | null): string {
  if (nota === null || nota === undefined) return 'Não avaliado'
  const labels = ['Inaceitável (0)', 'Muito abaixo (1)', 'Abaixo do padrão (2)', 'Adequado (3)', 'Bom padrão (4)', 'Excelência (5)']
  return labels[nota] ?? String(nota)
}

function montarPrompt(ctx: NonNullable<Awaited<ReturnType<typeof coletarContextoVisita>>>): string {
  const { unidade, ultimaVisita, registrosChecklist, demandas } = ctx

  const score = ultimaVisita.scoreFinal != null
    ? `**Score NPS da visita: ${Number(ultimaVisita.scoreFinal).toFixed(1)} / 100**`
    : ''

  const avaliadosTexto = registrosChecklist
    .filter(r => !r.naoAplicavel && r.nota !== null)
    .map(r => {
      const linhas = [`**${r.setorNome}** (peso ${r.peso}%) — ${notaLabel(r.nota)}`]
      if (r.observacao) linhas.push(`  Obs.: ${r.observacao}`)
      return linhas.join('\n')
    })
    .join('\n')

  const naAplicaveis = registrosChecklist
    .filter(r => r.naoAplicavel)
    .map(r => r.setorNome)

  const naoAvaliados = registrosChecklist
    .filter(r => !r.naoAplicavel && r.nota === null)
    .map(r => r.setorNome)

  const demandasTexto = demandas.length
    ? demandas.map(d => `- [${d.prioridade.toUpperCase()}] ${d.titulo}${d.setorNome ? ` (${d.setorNome})` : ''}`).join('\n')
    : 'Nenhuma demanda aberta.'

  return `Você é um assistente especializado em gestão educacional. Analise os dados da última visita à unidade escolar e gere um plano de ação objetivo e prático para a próxima visita.

## Dados da visita

**Unidade:** ${unidade?.nome}
**Data da última visita:** ${ultimaVisita.dataVisita}
${score}
${ultimaVisita.observacaoGeral ? `**Observação geral:** ${ultimaVisita.observacaoGeral}` : ''}

## Avaliação por setor (checklist oficial)

${avaliadosTexto || 'Nenhum setor avaliado.'}
${naAplicaveis.length ? `\nSetores N/A (excluídos da pontuação): ${naAplicaveis.join(', ')}` : ''}
${naoAvaliados.length ? `Setores não avaliados: ${naoAvaliados.join(', ')}` : ''}

## Demandas abertas

${demandasTexto}

---

Com base nesses dados, gere um documento estruturado com:

1. **Resumo da situação atual** — síntese dos setores mais críticos da unidade e o score geral
2. **Prioridades para a próxima visita** — o que checar primeiro, em ordem de urgência
3. **Plano de ação por setor** — apenas os que precisam de atenção (nota ≤ 3), com ações concretas
4. **Demandas para acompanhar** — lista organizada por prioridade com status esperado
5. **Pontos positivos a reforçar** — setores com boa nota (4 ou 5) que merecem reconhecimento

Seja direto, use linguagem de gestão, evite textos longos. Use listas e bullets. Responda em português.`
}

async function coletarContextoPeriodo(dataInicio: string, dataFim: string, unidadeIds?: number[]) {
  const filtroUnidade = unidadeIds && unidadeIds.length > 0
    ? `AND u.id IN (${unidadeIds.map(() => '?').join(',')})`
    : ''
  const params: any[] = [dataInicio, dataFim, ...(unidadeIds && unidadeIds.length > 0 ? unidadeIds : [])]

  const visitas = await query<{
    id: number; dataVisita: string; unidadeId: number; unidadeNome: string
    regionalNome: string; observacaoGeral: string; scoreFinal: number | null
  }>(`
    SELECT v.id, v.data_visita, v.unidade_id, u.nome AS unidade_nome,
           r.nome AS regional_nome, v.observacao_geral, v.score_final
    FROM visitas v
    JOIN unidades u ON u.id = v.unidade_id
    JOIN regionais r ON r.id = u.regional_id
    WHERE v.status = 'concluida'
      AND v.data_visita >= ? AND v.data_visita <= ?
      ${filtroUnidade}
    ORDER BY r.nome, u.nome, v.data_visita DESC
  `, params)

  if (visitas.length === 0) return null

  const visitaIds = visitas.map(v => v.id)
  const placeholders = visitaIds.map(() => '?').join(',')

  const registros = await query<{
    visitaId: number; setorNome: string; nota: number | null; peso: number
  }>(`
    SELECT rc.visita_id, cs.nome AS setor_nome, rc.nota, cs.peso
    FROM registros_checklist rc
    JOIN checklist_setores cs ON cs.id = rc.setor_id
    WHERE rc.visita_id IN (${placeholders})
    ORDER BY cs.ordem
  `, visitaIds)

  const demandas = await query<{
    unidadeId: number; titulo: string; prioridade: string
  }>(`
    SELECT d.unidade_id, d.titulo, d.prioridade
    FROM demandas d
    WHERE d.unidade_id IN (${visitas.map(() => '?').join(',')}) AND d.status_demanda = 'aberta'
    ORDER BY CASE d.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END
  `, visitas.map(v => v.unidadeId))

  return { visitas, registros, demandas, dataInicio, dataFim }
}

function montarPromptPeriodo(ctx: NonNullable<Awaited<ReturnType<typeof coletarContextoPeriodo>>>): string {
  const { visitas, registros, demandas, dataInicio, dataFim } = ctx

  const porUnidade = visitas.map(v => {
    const regs = registros.filter(r => r.visitaId === v.id && r.nota !== null)
    const criticos = regs.filter(r => r.nota !== null && r.nota <= 1).map(r => r.setorNome)
    const atencao  = regs.filter(r => r.nota !== null && r.nota >= 2 && r.nota <= 3).map(r => r.setorNome)
    const bons     = regs.filter(r => r.nota !== null && r.nota >= 4).length
    const scoreLabel = v.scoreFinal != null ? ` — Score: ${Number(v.scoreFinal).toFixed(1)}/100` : ''
    const demandasU = demandas.filter(d => d.unidadeId === v.unidadeId)
    const urgentes  = demandasU.filter(d => d.prioridade === 'urgente' || d.prioridade === 'alta')

    const linhas = [`### ${v.unidadeNome} (${v.regionalNome}) — ${v.dataVisita}${scoreLabel}`]
    if (criticos.length) linhas.push(`🔴 Crítico/Inaceitável: ${criticos.join(', ')}`)
    if (atencao.length)  linhas.push(`🟡 Atenção (2-3): ${atencao.join(', ')}`)
    if (bons > 0)        linhas.push(`🟢 Bom padrão/Excelência: ${bons} setor(es)`)
    if (urgentes.length) linhas.push(`⚠ Demandas urgentes/altas: ${urgentes.map(d => d.titulo).join('; ')}`)
    if (v.observacaoGeral) linhas.push(`Obs.: ${v.observacaoGeral}`)
    return linhas.join('\n')
  }).join('\n\n')

  const scores = visitas.filter(v => v.scoreFinal != null).map(v => Number(v.scoreFinal))
  const mediaScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A'
  const totalDemandas = demandas.length

  return `Você é um assistente especializado em gestão educacional. Analise os dados das visitas realizadas no período indicado e gere um relatório consolidado para apresentação à liderança da marca em reunião semanal.

## Período: ${dataInicio} a ${dataFim}
## Total de visitas: ${visitas.length} | Score médio NPS: ${mediaScore}/100 | Demandas abertas: ${totalDemandas}

## Dados por unidade

${porUnidade}

---

Com base nesses dados, gere um relatório executivo consolidado com:

1. **Panorama geral do período** — visão macro, score médio da rede e principais tendências
2. **Unidades que requerem atenção imediata** — as com score mais baixo ou setores críticos
3. **Padrões identificados** — problemas que se repetem em múltiplas unidades (sistêmicos)
4. **Demandas prioritárias da rede** — as mais urgentes que precisam de decisão da liderança
5. **Destaques positivos** — unidades com melhores scores e práticas que merecem reconhecimento
6. **Recomendações para a liderança** — ações estratégicas sugeridas para a semana

Seja direto e executivo. Use linguagem de gestão para reunião de liderança. Bullets e listas. Português.`
}

router.get('/config', (req, res) => {
  res.json({ configured: !!process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' })
})

router.post('/config', adminOnly, (req, res) => {
  const { apiKey } = req.body
  process.env.GROQ_API_KEY = apiKey
  res.json({ ok: true })
})

router.post('/plano/:unidadeId', async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return res.status(400).json({ error: 'API key do Groq não configurada. Acesse Configurações para adicionar.' })
    }

    const unidadeId = Number(req.params.unidadeId)
    const visitaId = req.body?.visitaId ? Number(req.body.visitaId) : undefined
    const ctx = await coletarContextoVisita(unidadeId, visitaId)
    if (!ctx) {
      return res.status(400).json({ error: 'Nenhuma visita concluída encontrada para esta unidade.' })
    }

    const prompt = montarPrompt(ctx)

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: `Erro na API Groq: ${response.status} — ${err}` })
    }

    const data = await response.json() as { choices: { message: { content: string } }[] }
    res.json({
      plano: data.choices[0].message.content,
      unidadeNome: ctx.unidade?.nome,
      dataUltimaVisita: ctx.ultimaVisita.dataVisita,
      totalDemandas: ctx.demandas.length,
      scoreFinal: ctx.ultimaVisita.scoreFinal != null ? Number(ctx.ultimaVisita.scoreFinal) : null,
      setoresData: ctx.registrosChecklist.map(r => ({ setorNome: r.setorNome, nota: r.nota ?? null, peso: r.peso, naoAplicavel: r.naoAplicavel ?? false })),
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Erro interno' })
  }
})

router.post('/relatorio-periodo', async (req, res) => {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) return res.status(400).json({ error: 'API key do Groq não configurada.' })

    const { dataInicio, dataFim, unidadeIds } = req.body
    if (!dataInicio || !dataFim) return res.status(400).json({ error: 'dataInicio e dataFim são obrigatórios' })

    const ids = Array.isArray(unidadeIds) && unidadeIds.length > 0 ? unidadeIds : undefined
    const ctx = await coletarContextoPeriodo(dataInicio, dataFim, ids)
    if (!ctx) return res.status(400).json({ error: 'Nenhuma visita concluída encontrada no período.' })

    const prompt = montarPromptPeriodo(ctx)

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        max_tokens: 3000,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: `Erro na API Groq: ${response.status} — ${err}` })
    }

    const data = await response.json() as { choices: { message: { content: string } }[] }
    const scoresArr = ctx.visitas.filter(v => v.scoreFinal != null).map(v => Number(v.scoreFinal))
    const scoreMedia = scoresArr.length ? scoresArr.reduce((a, b) => a + b, 0) / scoresArr.length : null
    res.json({
      relatorio: data.choices[0].message.content,
      totalVisitas: ctx.visitas.length,
      totalDemandas: ctx.demandas.length,
      dataInicio,
      dataFim,
      scoreMedia,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Erro interno' })
  }
})

export default router
