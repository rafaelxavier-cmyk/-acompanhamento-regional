import { Router } from 'express'
import { query, queryOne, run, insert } from '../db/connection'
import { adminOnly } from '../middleware/auth'

const router = Router()

// Setores ativos (padrão) ou todos (admin, ?all=1)
router.get('/setores', async (req, res) => {
  const all = req.query.all === '1'
  const rows = all
    ? await query('SELECT * FROM checklist_setores ORDER BY ordem')
    : await query('SELECT * FROM checklist_setores WHERE ativa = true ORDER BY ordem')
  res.json(rows)
})

router.post('/setores', adminOnly, async (req, res) => {
  const { nome, peso } = req.body
  if (!nome || !peso) return res.status(400).json({ error: 'nome e peso são obrigatórios' })
  const maxOrdem = await queryOne<{ m: number }>('SELECT COALESCE(MAX(ordem), 0) AS m FROM checklist_setores')
  const novaOrdem = (maxOrdem?.m ?? 0) + 1
  const id = await insert(
    'INSERT INTO checklist_setores (nome, ordem, peso, ativa) VALUES (?, ?, ?, true)',
    [nome, novaOrdem, Number(peso)]
  )
  res.json(await queryOne('SELECT * FROM checklist_setores WHERE id = ?', [id]))
})

router.patch('/setores/:id', adminOnly, async (req, res) => {
  const id = Number(req.params.id)
  const { nome, peso, ativa } = req.body
  const fields: string[] = []
  const vals: (string | number | boolean)[] = []
  if (nome      !== undefined) { fields.push('nome = ?');  vals.push(nome) }
  if (peso      !== undefined) { fields.push('peso = ?');  vals.push(Number(peso)) }
  if (ativa     !== undefined) { fields.push('ativa = ?'); vals.push(Boolean(ativa)) }
  if (!fields.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' })
  vals.push(id)
  await run(`UPDATE checklist_setores SET ${fields.join(', ')} WHERE id = ?`, vals)
  res.json(await queryOne('SELECT * FROM checklist_setores WHERE id = ?', [id]))
})

router.delete('/setores/:id', adminOnly, async (req, res) => {
  const id = Number(req.params.id)
  const hasRecords = await queryOne<{ c: string }>(
    'SELECT COUNT(*) AS c FROM registros_checklist WHERE setor_id = ?', [id]
  )
  if (Number(hasRecords?.c ?? 0) > 0)
    return res.status(409).json({ error: 'Este setor possui registros de visita e não pode ser excluído.' })
  await run('DELETE FROM checklist_setores WHERE id = ?', [id])
  res.status(204).end()
})

router.get('/registros/ultimo', async (req, res) => {
  const unidadeId = Number(req.query.unidadeId)
  const setorId   = Number(req.query.setorId)
  const row = await queryOne(`
    SELECT rc.id, rc.nota, rc.observacao, rc.nao_aplicavel, v.data_visita, v.id AS visita_id
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
  const { visitaId, setorId, nota, observacao, naoAplicavel } = req.body
  const now = new Date().toISOString()

  const existing = await queryOne<{ id: number }>(
    'SELECT id FROM registros_checklist WHERE visita_id = ? AND setor_id = ?',
    [visitaId, setorId]
  )

  if (existing) {
    const fields: string[] = ['updated_at = ?']
    const vals: (string | number | boolean | null)[] = [now]
    if (nota         !== undefined) { fields.push('nota = ?');          vals.push(nota) }
    if (observacao   !== undefined) { fields.push('observacao = ?');    vals.push(observacao) }
    if (naoAplicavel !== undefined) { fields.push('nao_aplicavel = ?'); vals.push(Boolean(naoAplicavel)) }
    // When marking N/A, clear nota; when setting nota, clear N/A
    if (naoAplicavel === true)  { fields.push('nota = ?'); vals.push(null) }
    if (nota !== undefined && nota !== null) { fields.push('nao_aplicavel = ?'); vals.push(false) }
    vals.push(existing.id)
    await run(`UPDATE registros_checklist SET ${fields.join(', ')} WHERE id = ?`, vals)
    res.json(await queryOne('SELECT * FROM registros_checklist WHERE id = ?', [existing.id]))
  } else {
    const naVal = naoAplicavel === true
    const notaVal = naVal ? null : (nota ?? null)
    const id = await insert(
      'INSERT INTO registros_checklist (visita_id, setor_id, nota, observacao, nao_aplicavel) VALUES (?, ?, ?, ?, ?)',
      [visitaId, setorId, notaVal, observacao ?? null, naVal]
    )
    res.json(await queryOne('SELECT * FROM registros_checklist WHERE id = ?', [id]))
  }
})

export default router
