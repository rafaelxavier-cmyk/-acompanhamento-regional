import { Router } from 'express'
import { query, queryOne, run, insert } from '../db/connection'

const router = Router()

router.get('/abertas', async (req, res) => {
  res.json(await query(`
    SELECT
      d.id, d.titulo, d.descricao, d.prioridade, d.responsavel, d.prazo,
      d.status_demanda, d.sync_status, d.created_at,
      u.nome        AS unidade_nome,
      u.regional_id AS regional_id,
      m.titulo      AS macrocaixa_titulo,
      m.codigo      AS macrocaixa_codigo
    FROM demandas d
    JOIN registros_macrocaixa r ON r.id = d.registro_id
    JOIN visitas v              ON v.id = r.visita_id
    JOIN unidades u             ON u.id = v.unidade_id
    JOIN macrocaixas m          ON m.id = r.macrocaixa_id
    WHERE d.status_demanda = 'aberta'
    ORDER BY
      CASE d.prioridade
        WHEN 'urgente' THEN 1
        WHEN 'alta'    THEN 2
        WHEN 'normal'  THEN 3
        WHEN 'baixa'   THEN 4
      END
  `))
})

router.get('/', async (req, res) => {
  const registroId = Number(req.query.registroId)
  res.json(await query('SELECT * FROM demandas WHERE registro_id = ? ORDER BY created_at DESC', [registroId]))
})

router.post('/', async (req, res) => {
  const { registroId, titulo, descricao, prioridade, responsavel, prazo } = req.body
  const id = await insert(
    `INSERT INTO demandas (registro_id, titulo, descricao, prioridade, responsavel, prazo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [registroId, titulo, descricao ?? null, prioridade ?? 'normal', responsavel ?? null, prazo ?? null]
  )
  res.json(await queryOne('SELECT * FROM demandas WHERE id = ?', [id]))
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const data = req.body
  const now = new Date().toISOString()
  const fields: string[] = ['updated_at = ?']
  const vals: (string | number | null)[] = [now]

  if (data.titulo !== undefined)        { fields.push('titulo = ?');         vals.push(data.titulo) }
  if (data.descricao !== undefined)     { fields.push('descricao = ?');      vals.push(data.descricao) }
  if (data.prioridade !== undefined)    { fields.push('prioridade = ?');     vals.push(data.prioridade) }
  if (data.responsavel !== undefined)   { fields.push('responsavel = ?');    vals.push(data.responsavel) }
  if (data.prazo !== undefined)         { fields.push('prazo = ?');          vals.push(data.prazo) }
  if (data.statusDemanda !== undefined) { fields.push('status_demanda = ?'); vals.push(data.statusDemanda) }

  vals.push(id)
  await run(`UPDATE demandas SET ${fields.join(', ')} WHERE id = ?`, vals)
  res.json(await queryOne('SELECT * FROM demandas WHERE id = ?', [id]))
})

router.delete('/:id', async (req, res) => {
  await run('DELETE FROM demandas WHERE id = ?', [Number(req.params.id)])
  res.status(204).send()
})

export default router
