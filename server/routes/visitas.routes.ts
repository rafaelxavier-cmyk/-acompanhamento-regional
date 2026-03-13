import { Router } from 'express'
import { query, queryOne, run, insert } from '../db/connection'

const router = Router()

// IMPORTANT: /recentes must be before /:id
router.get('/recentes', async (req, res) => {
  const limite = req.query.limite ? Number(req.query.limite) : 10
  res.json(await query(`
    SELECT
      v.id, v.data_visita, v.status, v.diretor_nome,
      v.unidade_id,
      u.nome  AS unidade_nome,
      u.regional_id,
      (SELECT COUNT(*) FROM registros_macrocaixa r WHERE r.visita_id = v.id AND r.status != 'nao_iniciado') AS total_registros
    FROM visitas v
    LEFT JOIN unidades u ON u.id = v.unidade_id
    ORDER BY v.data_visita DESC
    LIMIT ?
  `, [limite]))
})

router.get('/', async (req, res) => {
  const unidadeId = Number(req.query.unidadeId)
  res.json(await query('SELECT * FROM visitas WHERE unidade_id = ? ORDER BY data_visita DESC', [unidadeId]))
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const visita = await queryOne('SELECT * FROM visitas WHERE id = ?', [id])
  if (!visita) return res.status(404).json({ error: 'Not found' })
  res.json(visita)
})

router.post('/', async (req, res) => {
  const { unidadeId, dataVisita, diretorNome } = req.body
  const id = await insert(
    'INSERT INTO visitas (unidade_id, data_visita, diretor_nome, status) VALUES (?, ?, ?, ?)',
    [unidadeId, dataVisita, diretorNome ?? null, 'em_andamento']
  )
  res.json(await queryOne('SELECT * FROM visitas WHERE id = ?', [id]))
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const data = req.body
  const now = new Date().toISOString()
  if (data.status !== undefined)
    await run('UPDATE visitas SET status = ?, updated_at = ? WHERE id = ?', [data.status, now, id])
  if (data.observacaoGeral !== undefined)
    await run('UPDATE visitas SET observacao_geral = ?, updated_at = ? WHERE id = ?', [data.observacaoGeral, now, id])
  if (data.diretorNome !== undefined)
    await run('UPDATE visitas SET diretor_nome = ?, updated_at = ? WHERE id = ?', [data.diretorNome, now, id])
  res.json(await queryOne('SELECT * FROM visitas WHERE id = ?', [id]))
})

export default router
