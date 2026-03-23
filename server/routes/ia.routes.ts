import { Router } from 'express'
import { query, queryOne } from '../db/connection'
import { adminOnly } from '../middleware/auth'

const router = Router()

async function coletarContextoVisita(unidadeId: number, visitaId?: number) {
  const unidade = await queryOne<{ id: number; nome: string; regionalId: number }>(
    'SELECT id, nome, regional_id FROM unidades WHERE id = ?', [unidadeId]
  )

  const ultimaVisita = visitaId
    ? await queryOne<{ id: number; dataVisita: string; observacaoGeral: string; diretorNome: string }>(
        `SELECT id, data_visita, observacao_geral, diretor_nome
         FROM visitas WHERE id = ? AND status = 'concluida'`, [visitaId]
      )
    : await queryOne<{ id: number; dataVisita: string; observacaoGeral: string; diretorNome: string }>(
        `SELECT id, data_visita, observacao_geral, diretor_nome
         FROM visitas WHERE unidade_id = ? AND status = 'concluida'
         ORDER BY data_visita DESC LIMIT 1`, [unidadeId]
      )

  if (!ultimaVisita) return null

  const registros = await query<{
    status: string; observacao: string; pontosPositivos: string; pontosAtencao: string;
    macrocaixaCodigo: string; macrocaixaTitulo: string
  }>(
    `SELECT r.status, r.observacao, r.pontos_positivos, r.pontos_atencao,
            m.codigo AS macrocaixa_codigo, m.titulo AS macrocaixa_titulo
     FROM registros_macrocaixa r
     JOIN macrocaixas m ON m.id = r.macrocaixa_id
     WHERE r.visita_id = ?
     ORDER BY m.ordem`, [ultimaVisita.id]
  )

  const demandas = await query<{
    titulo: string; prioridade: string; macrocaixaCodigo: string; macrocaixaTitulo: string
  }>(
    `SELECT d.titulo, d.prioridade, m.codigo AS macrocaixa_codigo, m.titulo AS macrocaixa_titulo
     FROM demandas d
     JOIN registros_macrocaixa r ON r.id = d.registro_id
     JOIN visitas v ON v.id = r.visita_id
     JOIN macrocaixas m ON m.id = r.macrocaixa_id
     WHERE r.visita_id = ? AND d.status_demanda = 'aberta'
     ORDER BY CASE d.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END`,
    [ultimaVisita.id]
  )

  return { unidade, ultimaVisita, registros, demandas }
}

function montarPrompt(ctx: NonNullable<Awaited<ReturnType<typeof coletarContextoVisita>>>): string {
  const { unidade, ultimaVisita, registros, demandas } = ctx

  const registrosTexto = registros
    .filter(r => r.status !== 'nao_iniciado')
    .map(r => {
      const linhas = [`**${r.macrocaixaCodigo} — ${r.macrocaixaTitulo}**`, `Status: ${r.status}`]
      if (r.pontosPositivos) linhas.push(`Pontos positivos: ${r.pontosPositivos}`)
      if (r.pontosAtencao)   linhas.push(`Pontos de atenção: ${r.pontosAtencao}`)
      if (r.observacao)      linhas.push(`Observações: ${r.observacao}`)
      return linhas.join('\n')
    })
    .join('\n\n')

  const demandasTexto = demandas.length
    ? demandas.map(d => `- [${d.prioridade.toUpperCase()}] ${d.titulo} (${d.macrocaixaCodigo})`).join('\n')
    : 'Nenhuma demanda aberta.'

  return `Você é um assistente especializado em gestão educacional. Analise os dados da última visita à unidade escolar e gere um plano de ação objetivo e prático para a próxima visita.

## Dados da visita

**Unidade:** ${unidade?.nome}
**Data da última visita:** ${ultimaVisita.dataVisita}
${ultimaVisita.observacaoGeral ? `**Observação geral:** ${ultimaVisita.observacaoGeral}` : ''}

## Avaliação por macrocaixa

${registrosTexto || 'Nenhuma macrocaixa avaliada.'}

## Demandas abertas

${demandasTexto}

---

Com base nesses dados, gere um documento estruturado com:

1. **Resumo da situação atual** — síntese dos pontos mais críticos da unidade
2. **Prioridades para a próxima visita** — o que checar primeiro, em ordem de urgência
3. **Plano de ação por macrocaixa** — apenas as que precisam de atenção, com ações concretas
4. **Demandas para acompanhar** — lista organizada por prioridade com status esperado
5. **Pontos positivos a reforçar** — o que está funcionando bem e merece reconhecimento

Seja direto, use linguagem de gestão, evite textos longos. Use listas e bullets. Responda em português.`
}

async function coletarContextoPeriodo(dataInicio: string, dataFim: string, unidadeIds?: number[]) {
  const filtroUnidade = unidadeIds && unidadeIds.length > 0
    ? `AND u.id IN (${unidadeIds.map(() => '?').join(',')})`
    : ''
  const params: any[] = [dataInicio, dataFim, ...(unidadeIds && unidadeIds.length > 0 ? unidadeIds : [])]

  const visitas = await query<{
    id: number; dataVisita: string; unidadeId: number; unidadeNome: string
    regionalNome: string; observacaoGeral: string; diretorNome: string
  }>(`
    SELECT v.id, v.data_visita, v.unidade_id, u.nome AS unidade_nome,
           r.nome AS regional_nome, v.observacao_geral, v.diretor_nome
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
    visitaId: number; macrocaixaCodigo: string; macrocaixaTitulo: string
    status: string; pontosPositivos: string; pontosAtencao: string; observacao: string
  }>(`
    SELECT r.visita_id, m.codigo AS macrocaixa_codigo, m.titulo AS macrocaixa_titulo,
           r.status, r.pontos_positivos, r.pontos_atencao, r.observacao
    FROM registros_macrocaixa r
    JOIN macrocaixas m ON m.id = r.macrocaixa_id
    WHERE r.visita_id IN (${placeholders})
    ORDER BY m.ordem
  `, visitaIds)

  const demandas = await query<{
    visitaId: number; unidadeNome: string; titulo: string; prioridade: string; macrocaixaCodigo: string
  }>(`
    SELECT r.visita_id, u.nome AS unidade_nome, d.titulo, d.prioridade, m.codigo AS macrocaixa_codigo
    FROM demandas d
    JOIN registros_macrocaixa r ON r.id = d.registro_id
    JOIN visitas v ON v.id = r.visita_id
    JOIN unidades u ON u.id = v.unidade_id
    JOIN macrocaixas m ON m.id = r.macrocaixa_id
    WHERE r.visita_id IN (${placeholders}) AND d.status_demanda = 'aberta'
    ORDER BY CASE d.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END
  `, visitaIds)

  return { visitas, registros, demandas, dataInicio, dataFim }
}

function montarPromptPeriodo(ctx: NonNullable<Awaited<ReturnType<typeof coletarContextoPeriodo>>>): string {
  const { visitas, registros, demandas, dataInicio, dataFim } = ctx

  const porUnidade = visitas.map(v => {
    const regs = registros.filter(r => r.visitaId === v.id && r.status !== 'nao_iniciado')
    const criticos  = regs.filter(r => r.status === 'critico').map(r => r.macrocaixaTitulo)
    const atencao   = regs.filter(r => r.status === 'atencao').map(r => r.macrocaixaTitulo)
    const emDia     = regs.filter(r => r.status === 'em_dia').length
    const demandasU = demandas.filter(d => d.visitaId === v.id)
    const urgentes  = demandasU.filter(d => d.prioridade === 'urgente' || d.prioridade === 'alta')

    const linhas = [`### ${v.unidadeNome} (${v.regionalNome}) — ${v.dataVisita}`]
    if (criticos.length)  linhas.push(`🔴 Crítico: ${criticos.join(', ')}`)
    if (atencao.length)   linhas.push(`🟡 Atenção: ${atencao.join(', ')}`)
    if (emDia > 0)        linhas.push(`🟢 Em dia: ${emDia} macrocaixa(s)`)
    if (urgentes.length)  linhas.push(`⚠ Demandas urgentes/altas: ${urgentes.map(d => d.titulo).join('; ')}`)
    if (v.observacaoGeral) linhas.push(`Obs.: ${v.observacaoGeral}`)
    return linhas.join('\n')
  }).join('\n\n')

  const totalCriticos = registros.filter(r => r.status === 'critico').length
  const totalAtencao  = registros.filter(r => r.status === 'atencao').length
  const totalDemandas = demandas.length
  const urgentes      = demandas.filter(d => d.prioridade === 'urgente' || d.prioridade === 'alta')

  return `Você é um assistente especializado em gestão educacional. Analise os dados das visitas realizadas no período indicado e gere um relatório consolidado para apresentação à liderança da marca em reunião semanal.

## Período: ${dataInicio} a ${dataFim}
## Total de visitas: ${visitas.length} | Macrocaixas críticas: ${totalCriticos} | Em atenção: ${totalAtencao} | Demandas abertas: ${totalDemandas}

## Dados por unidade

${porUnidade}

---

Com base nesses dados, gere um relatório executivo consolidado com:

1. **Panorama geral do período** — visão macro do que aconteceu nas visitas, principais tendências
2. **Unidades que requerem atenção imediata** — as que têm macrocaixas críticas ou urgentes
3. **Padrões identificados** — problemas que se repetem em múltiplas unidades (sistêmicos)
4. **Demandas prioritárias da rede** — as mais urgentes que precisam de decisão da liderança
5. **Destaques positivos** — unidades com boas práticas que merecem reconhecimento
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
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
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
    res.json({
      relatorio: data.choices[0].message.content,
      totalVisitas: ctx.visitas.length,
      totalDemandas: ctx.demandas.length,
      dataInicio,
      dataFim,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? 'Erro interno' })
  }
})

export default router
