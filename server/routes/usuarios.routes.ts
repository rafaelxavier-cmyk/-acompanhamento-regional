import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { query, queryOne, run, insert } from '../db/connection'
import { authMiddleware, adminOnly } from '../middleware/auth'

const router = Router()
router.use(authMiddleware, adminOnly)

router.get('/', async (_req, res) => {
  const users = await query<any>(`
    SELECT id, nome, login, perfil, ativo, trocar_senha, created_at
    FROM usuarios ORDER BY nome
  `)
  for (const u of users) {
    const regs = await query<{ regionalId: number }>(
      'SELECT regional_id AS "regionalId" FROM usuario_regionais WHERE usuario_id = ?', [u.id]
    )
    u.regionalIds = regs.map(r => r.regionalId)
  }
  res.json(users)
})

router.post('/', async (req, res) => {
  const { nome, login, senha, perfil = 'usuario', regionalIds = [] } = req.body
  if (!nome || !login || !senha) return res.status(400).json({ error: 'nome, login e senha são obrigatórios' })

  const exists = await queryOne('SELECT id FROM usuarios WHERE login = ?', [login])
  if (exists) return res.status(409).json({ error: 'Login já em uso' })

  const hash = await bcrypt.hash(senha, 10)
  const id = await insert(
    'INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo, trocar_senha, created_at) VALUES (?, ?, ?, ?, 1, 1, ?)',
    [nome, login, hash, perfil, new Date().toISOString()]
  )

  await run('DELETE FROM usuario_regionais WHERE usuario_id = ?', [id])
  for (const rid of regionalIds) {
    await run('INSERT INTO usuario_regionais (usuario_id, regional_id) VALUES (?, ?)', [id, rid])
  }

  res.json(await _getUser(id))
})

router.patch('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const { nome, login, senha, perfil, ativo, regionalIds, resetarSenha } = req.body
  const now = new Date().toISOString()

  if (nome !== undefined) await run('UPDATE usuarios SET nome = ?, updated_at = ? WHERE id = ?', [nome, now, id])
  if (login !== undefined) {
    const exists = await queryOne('SELECT id FROM usuarios WHERE login = ? AND id != ?', [login, id])
    if (exists) return res.status(409).json({ error: 'Login já em uso' })
    await run('UPDATE usuarios SET login = ?, updated_at = ? WHERE id = ?', [login, now, id])
  }
  if (perfil !== undefined) await run('UPDATE usuarios SET perfil = ?, updated_at = ? WHERE id = ?', [perfil, now, id])
  if (ativo !== undefined) await run('UPDATE usuarios SET ativo = ?, updated_at = ? WHERE id = ?', [ativo ? 1 : 0, now, id])
  if (senha !== undefined) {
    const hash = await bcrypt.hash(senha, 10)
    await run('UPDATE usuarios SET senha_hash = ?, trocar_senha = 1, updated_at = ? WHERE id = ?', [hash, now, id])
  }
  if (resetarSenha && req.body.novaSenhaPadrao) {
    const hash = await bcrypt.hash(req.body.novaSenhaPadrao, 10)
    await run('UPDATE usuarios SET senha_hash = ?, trocar_senha = 1, updated_at = ? WHERE id = ?', [hash, now, id])
  }
  if (regionalIds !== undefined) {
    await run('DELETE FROM usuario_regionais WHERE usuario_id = ?', [id])
    for (const rid of regionalIds) {
      await run('INSERT INTO usuario_regionais (usuario_id, regional_id) VALUES (?, ?)', [id, rid])
    }
  }

  res.json(await _getUser(id))
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  await run('DELETE FROM usuario_regionais WHERE usuario_id = ?', [id])
  await run('DELETE FROM usuarios WHERE id = ?', [id])
  res.status(204).end()
})

async function _getUser(id: number) {
  const u = await queryOne<any>('SELECT id, nome, login, perfil, ativo, trocar_senha, created_at FROM usuarios WHERE id = ?', [id])
  const regs = await query<{ regionalId: number }>('SELECT regional_id AS "regionalId" FROM usuario_regionais WHERE usuario_id = ?', [id])
  return { ...u, regionalIds: regs.map(r => r.regionalId) }
}

export default router
