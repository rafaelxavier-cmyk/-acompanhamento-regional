import { Router } from 'express'
import { query, queryOne, run, insert } from '../db/connection'

const router = Router()

router.get('/', async (req, res) => {
  res.json(await query('SELECT * FROM regionais ORDER BY nome'))
})

router.post('/', async (req, res) => {
  const { nome } = req.body
  const id = await insert('INSERT INTO regionais (nome) VALUES (?)', [nome])
  res.json(await queryOne('SELECT * FROM regionais WHERE id = ?', [id]))
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const data = req.body
  if (data.nome !== undefined)        await run('UPDATE regionais SET nome = ? WHERE id = ?', [data.nome, id])
  if (data.diretorNome !== undefined) await run('UPDATE regionais SET diretor_nome = ? WHERE id = ?', [data.diretorNome, id])
  res.json(await queryOne('SELECT * FROM regionais WHERE id = ?', [id]))
})

export default router
