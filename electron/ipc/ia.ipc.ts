import { ipcMain, app } from 'electron'
import path from 'path'
import fs from 'fs'
import { query, queryOne } from '../../database/connection'

// ── Configuração da API key ────────────────────────────────────────────────────
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')

function loadConfig(): Record<string, string> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return {}
  }
}

function saveConfig(data: Record<string, string>) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2))
}

// ── Coleta dados da última visita para contexto da IA ─────────────────────────
function coletarContextoVisita(unidadeId: number) {
  const unidade = queryOne<{ id: number; nome: string; regionalId: number }>(
    'SELECT id, nome, regional_id FROM unidades WHERE id = ?', [unidadeId]
  )

  // Última visita concluída
  const ultimaVisita = queryOne<{
    id: number; dataVisita: string; observacaoGeral: string; diretorNome: string
  }>(
    `SELECT id, data_visita, observacao_geral, diretor_nome
     FROM visitas WHERE unidade_id = ? AND status = 'concluida'
     ORDER BY data_visita DESC LIMIT 1`, [unidadeId]
  )

  if (!ultimaVisita) return null

  // Registros das macrocaixas desta visita
  const registros = query<{
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

  // Demandas abertas da unidade
  const demandas = query<{
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

// ── Monta o prompt para a IA ──────────────────────────────────────────────────
function montarPrompt(ctx: NonNullable<ReturnType<typeof coletarContextoVisita>>): string {
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

// ── Handler IPC ───────────────────────────────────────────────────────────────
export function registerIAHandlers() {
  ipcMain.handle('ia:getConfig', () => loadConfig())

  ipcMain.handle('ia:saveApiKey', (_, apiKey: string) => {
    const config = loadConfig()
    saveConfig({ ...config, groqApiKey: apiKey })
    return { ok: true }
  })

  ipcMain.handle('ia:gerarPlano', async (_, unidadeId: number) => {
    const config = loadConfig()
    if (!config.groqApiKey) {
      throw new Error('API key do Groq não configurada. Acesse Configurações para adicionar.')
    }

    const ctx = coletarContextoVisita(unidadeId)
    if (!ctx) {
      throw new Error('Nenhuma visita concluída encontrada para esta unidade.')
    }

    const prompt = montarPrompt(ctx)

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2048
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Erro na API Groq: ${response.status} — ${err}`)
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[]
    }

    return {
      plano: data.choices[0].message.content,
      unidadeNome: ctx.unidade?.nome,
      dataUltimaVisita: ctx.ultimaVisita.dataVisita,
      totalDemandas: ctx.demandas.length
    }
  })
}
