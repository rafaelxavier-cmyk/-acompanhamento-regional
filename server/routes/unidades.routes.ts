import { Router } from 'express'
import { query, queryOne, run, insert } from '../db/connection'

const router = Router()

// IMPORTANT: /resumo must be before /:id
router.get('/resumo', async (req, res) => {
  const ini = (req.query.dataInicio as string) || '2000-01-01'
  const fim = (req.query.dataFim   as string) || '2999-12-31'
  res.json(await query(`
    SELECT
      u.id,
      u.nome,
      u.regional_id,
      COUNT(DISTINCT v.id)                                          AS total_visitas,
      MAX(v.data_visita)                                            AS ultima_visita,
      (SELECT COUNT(*) FROM demandas d
         JOIN registros_macrocaixa r ON r.id = d.registro_id
         JOIN visitas vv             ON vv.id = r.visita_id
       WHERE vv.unidade_id = u.id AND d.status_demanda = 'aberta') AS demandas_abertas,
      (SELECT COUNT(*) FROM registros_macrocaixa r
         JOIN visitas vv ON vv.id = r.visita_id
       WHERE vv.unidade_id = u.id
         AND vv.id = (SELECT id FROM visitas
                      WHERE unidade_id = u.id AND data_visita BETWEEN ? AND ?
                      ORDER BY data_visita DESC LIMIT 1)
         AND r.status = 'critico')                                  AS macrocaixas_criticas,
      (SELECT COUNT(*) FROM registros_macrocaixa r
         JOIN visitas vv ON vv.id = r.visita_id
       WHERE vv.unidade_id = u.id
         AND vv.id = (SELECT id FROM visitas
                      WHERE unidade_id = u.id AND data_visita BETWEEN ? AND ?
                      ORDER BY data_visita DESC LIMIT 1)
         AND r.status = 'atencao')                                  AS macrocaixas_atencao
    FROM unidades u
    LEFT JOIN visitas v ON v.unidade_id = u.id AND v.data_visita BETWEEN ? AND ?
    WHERE u.ativa = 1
    GROUP BY u.id
    ORDER BY u.nome
  `, [ini, fim, ini, fim, ini, fim]))
})

router.get('/', async (req, res) => {
  const regionalId = req.query.regionalId ? Number(req.query.regionalId) : undefined
  if (regionalId) {
    res.json(await query('SELECT * FROM unidades WHERE regional_id = ? ORDER BY nome', [regionalId]))
  } else {
    res.json(await query('SELECT * FROM unidades ORDER BY nome'))
  }
})

router.post('/', async (req, res) => {
  const { nome, regionalId } = req.body
  const id = await insert('INSERT INTO unidades (nome, regional_id) VALUES (?, ?)', [nome, regionalId])
  res.json(await queryOne('SELECT * FROM unidades WHERE id = ?', [id]))
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const data = req.body
  if (data.nome !== undefined)       await run('UPDATE unidades SET nome = ? WHERE id = ?', [data.nome, id])
  if (data.regionalId !== undefined) await run('UPDATE unidades SET regional_id = ? WHERE id = ?', [data.regionalId, id])
  if (data.ativa !== undefined)      await run('UPDATE unidades SET ativa = ? WHERE id = ?', [data.ativa ? 1 : 0, id])
  res.json(await queryOne('SELECT * FROM unidades WHERE id = ?', [id]))
})

export default router
