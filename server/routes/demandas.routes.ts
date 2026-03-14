import { Router } from 'express'
import { query, queryOne, run, insert } from '../db/connection'

const router = Router()

// Todas as demandas para o Kanban (exceto canceladas)
router.get('/kanban', async (req, res) => {
  res.json(await query(`
    SELECT
      d.id, d.titulo, d.descricao, d.prioridade, d.responsavel, d.prazo,
      d.status_demanda, d.registro_id, d.unidade_id, d.created_at,
      COALESCE(uv.nome, ud.nome)             AS unidade_nome,
      COALESCE(uv.regional_id, ud.regional_id) AS regional_id,
      m.codigo  AS macrocaixa_codigo
    FROM demandas d
    LEFT JOIN registros_macrocaixa rm ON rm.id = d.registro_id
    LEFT JOIN visitas v               ON v.id  = rm.visita_id
    LEFT JOIN unidades uv             ON uv.id = v.unidade_id
    LEFT JOIN unidades ud             ON ud.id = d.unidade_id
    LEFT JOIN macrocaixas m           ON m.id  = rm.macrocaixa_id
    WHERE d.status_demanda != 'cancelada'
    ORDER BY
      CASE d.prioridade
        WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2
        WHEN 'normal'  THEN 3 WHEN 'baixa' THEN 4
      END,
      d.created_at DESC
  `))
})

// Demandas abertas (dashboard)
router.get('/abertas', async (req, res) => {
  res.json(await query(`
    SELECT
      d.id, d.titulo, d.descricao, d.prioridade, d.responsavel, d.prazo,
      d.status_demanda, d.sync_status, d.created_at,
      COALESCE(uv.nome, ud.nome)             AS unidade_nome,
      COALESCE(uv.regional_id, ud.regional_id) AS regional_id,
      m.titulo AS macrocaixa_titulo,
      m.codigo AS macrocaixa_codigo
    FROM demandas d
    LEFT JOIN registros_macrocaixa rm ON rm.id = d.registro_id
    LEFT JOIN visitas v               ON v.id  = rm.visita_id
    LEFT JOIN unidades uv             ON uv.id = v.unidade_id
    LEFT JOIN unidades ud             ON ud.id = d.unidade_id
    LEFT JOIN macrocaixas m           ON m.id  = rm.macrocaixa_id
    WHERE d.status_demanda = 'aberta'
    ORDER BY
      CASE d.prioridade
        WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2
        WHEN 'normal'  THEN 3 WHEN 'baixa' THEN 4
      END
  `))
})

// Demandas de um registro específico (visita)
router.get('/', async (req, res) => {
  const registroId = Number(req.query.registroId)
  res.json(await query('SELECT * FROM demandas WHERE registro_id = ? ORDER BY created_at DESC', [registroId]))
})

// Criar demanda (de visita OU manual via Kanban)
router.post('/', async (req, res) => {
  const { registroId, unidadeId, titulo, descricao, prioridade, responsavel, prazo } = req.body

  // Resolve unidade_id: direto ou via registro→visita
  let resolvedUnidadeId: number | null = unidadeId ?? null
  if (!resolvedUnidadeId && registroId) {
    const row = await queryOne<{ unidade_id: number }>(
      `SELECT v.unidade_id FROM registros_macrocaixa rm
       JOIN visitas v ON v.id = rm.visita_id WHERE rm.id = ?`,
      [registroId]
    )
    resolvedUnidadeId = row?.unidade_id ?? null
  }

  const id = await insert(
    `INSERT INTO demandas (registro_id, unidade_id, titulo, descricao, prioridade, responsavel, prazo)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [registroId ?? null, resolvedUnidadeId, titulo,
     descricao ?? null, prioridade ?? 'normal', responsavel ?? null, prazo ?? null]
  )
  res.json(await queryOne('SELECT * FROM demandas WHERE id = ?', [id]))
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const data = req.body
  const now = new Date().toISOString()
  const fields: string[] = ['updated_at = ?']
  const vals: (string | number | null)[] = [now]

  if (data.titulo        !== undefined) { fields.push('titulo = ?');         vals.push(data.titulo) }
  if (data.descricao     !== undefined) { fields.push('descricao = ?');      vals.push(data.descricao) }
  if (data.prioridade    !== undefined) { fields.push('prioridade = ?');     vals.push(data.prioridade) }
  if (data.responsavel   !== undefined) { fields.push('responsavel = ?');    vals.push(data.responsavel) }
  if (data.prazo         !== undefined) { fields.push('prazo = ?');          vals.push(data.prazo) }
  if (data.statusDemanda !== undefined) { fields.push('status_demanda = ?'); vals.push(data.statusDemanda) }
  if (data.unidadeId     !== undefined) { fields.push('unidade_id = ?');     vals.push(data.unidadeId) }

  vals.push(id)
  await run(`UPDATE demandas SET ${fields.join(', ')} WHERE id = ?`, vals)
  res.json(await queryOne('SELECT * FROM demandas WHERE id = ?', [id]))
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM demandas WHERE id = ?', [Number(req.params.id)])
  res.status(204).send()
})

export default router
