import { Router } from 'express'
import { query, queryOne, run, insert } from '../db/connection'

const router = Router()

router.get('/ultimo', async (req, res) => {
  const unidadeId    = Number(req.query.unidadeId)
  const macrocaixaId = Number(req.query.macrocaixaId)
  const row = await queryOne(`
    SELECT
      r.id, r.status, r.observacao, r.pontos_positivos, r.pontos_atencao,
      v.data_visita, v.id AS visita_id
    FROM registros_macrocaixa r
    JOIN visitas v ON v.id = r.visita_id
    WHERE v.unidade_id = ? AND r.macrocaixa_id = ? AND v.status = 'concluida'
    ORDER BY v.data_visita DESC
    LIMIT 1
  `, [unidadeId, macrocaixaId])
  res.json(row ?? null)
})

router.get('/', async (req, res) => {
  const visitaId = Number(req.query.visitaId)
  res.json(await query('SELECT * FROM registros_macrocaixa WHERE visita_id = ?', [visitaId]))
})

router.post('/upsert', async (req, res) => {
  const { visitaId, macrocaixaId, status, observacao, pontosPositivos, pontosAtencao } = req.body
  const now = new Date().toISOString()

  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM registros_macrocaixa WHERE visita_id = ? AND macrocaixa_id = ?',
    [visitaId, macrocaixaId]
  )

  if (existing) {
    const fields: string[] = ['updated_at = ?']
    const vals: (string | number | null)[] = [now]

    if (status !== undefined)          { fields.push('status = ?');           vals.push(status) }
    if (observacao !== undefined)      { fields.push('observacao = ?');        vals.push(observacao) }
    if (pontosPositivos !== undefined) { fields.push('pontos_positivos = ?');  vals.push(pontosPositivos) }
    if (pontosAtencao !== undefined)   { fields.push('pontos_atencao = ?');    vals.push(pontosAtencao) }

    vals.push(existing.id)
    await run(`UPDATE registros_macrocaixa SET ${fields.join(', ')} WHERE id = ?`, vals)
    res.json(await queryOne('SELECT * FROM registros_macrocaixa WHERE id = ?', [existing.id]))
  } else {
    const id = await insert(
      `INSERT INTO registros_macrocaixa
         (visita_id, macrocaixa_id, status, observacao, pontos_positivos, pontos_atencao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [visitaId, macrocaixaId, status ?? 'nao_iniciado', observacao ?? null, pontosPositivos ?? null, pontosAtencao ?? null]
    )
    res.json(await queryOne('SELECT * FROM registros_macrocaixa WHERE id = ?', [id]))
  }
})

export default router
