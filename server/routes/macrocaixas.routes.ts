import { Router } from 'express'
import { query } from '../db/connection'

const router = Router()

router.get('/', async (req, res) => {
  res.json(await query('SELECT * FROM macrocaixas WHERE ativa = 1 ORDER BY ordem'))
})

export default router
