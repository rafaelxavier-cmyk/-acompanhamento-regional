import { Router } from 'express'
import { query, queryOne, run, insert } from '../db/connection'

const router = Router()

router.get('/setores', async (_req, res) => {
  res.json(await query('SELECT * FROM checklist_setores ORDER BY ordem'))
})

router.get('/registros/ultimo', async (req, res) => {
  const unidadeId = Number(req.query.unidadeId)
  const setorId   = Number(req.query.setorId)
  const row = await queryOne(`
    SELECT rc.id, rc.nota, rc.observacao, v.data_visita, v.id AS visita_id
    FROM registros_checklist rc
    JOIN visitas v ON v.id = rc.visita_id
    WHERE v.unidade_id = ? AND rc.setor_id = ? AND v.status = 'concluida'
    ORDER BY v.data_visita DESC
    LIMIT 1
  `, [unidadeId, setorId])
  res.json(row ?? null)
})

router.get('/registros', async (req, res) => {
  const visitaId = Number(req.query.visitaId)
  res.json(await query(
    'SELECT * FROM registros_checklist WHERE visita_id = ? ORDER BY setor_id',
    [visitaId]
  ))
})

router.post('/registros/upsert', async (req, res) => {
  const { visitaId, setorId, nota, observacao } = req.body
  const now = new Date().toISOString()

  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM registros_checklist WHERE visita_id = ? AND setor_id = ?',
    [visitaId, setorId]
  )

  if (existing) {
    const fields: string[] = ['updated_at = ?']
    const vals: (string | number | null)[] = [now]
    if (nota      !== undefined) { fields.push('nota = ?');      vals.push(nota) }
    if (observacao !== undefined) { fields.push('observacao = ?'); vals.push(observacao) }
    vals.push(existing.id)
    await run(`UPDATE registros_checklist SET ${fields.join(', ')} WHERE id = ?`, vals)
    res.json(await queryOne('SELECT * FROM registros_checklist WHERE id = ?', [existing.id]))
  } else {
    const id = await insert(
      'INSERT INTO registros_checklist (visita_id, setor_id, nota, observacao) VALUES (?, ?, ?, ?)',
      [visitaId, setorId, nota ?? null, observacao ?? null]
    )
    res.json(await queryOne('SELECT * FROM registros_checklist WHERE id = ?', [id]))
  }
})

export default router
