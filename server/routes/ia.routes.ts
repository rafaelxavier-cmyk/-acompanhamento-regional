import { Router } from 'express'
import { query, queryOne } from '../db/connection'

const router = Router()

async function coletarContextoVisita(unidadeId: number) {
  const unidade = await queryOne<{ id: number; nome: string; regionalId: number }>(
    'SELECT id, nome, regional_id FROM unidades WHERE id = ?', [unidadeId]
  )

  const ultimaVisita = await queryOne<{
    id: number; dataVisita: string; observacaoGeral: string; diretorNome: string
  }>(
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
     WHERE v.unidade_id = ? AND d.status_demanda = 'aberta'
     ORDER BY CASE d.prioridade WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END`,
    [unidadeId]
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

router.get('/config', (req, res) => {
  res.json({ configured: !!process.env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' })
})

router.post('/config', (req, res) => {
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
    const ctx = await coletarContextoVisita(unidadeId)
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

export default router
