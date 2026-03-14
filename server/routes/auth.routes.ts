import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query, queryOne, run } from '../db/connection'
import { authMiddleware } from '../middleware/auth'

const router = Router()
const SECRET = () => process.env.JWT_SECRET || 'dev_secret'

function makeToken(userId: number, login: string, perfil: string, regionalIds: number[]) {
  return jwt.sign({ userId, login, perfil, regionalIds }, SECRET(), { expiresIn: '12h' })
}

router.post('/login', async (req, res) => {
  const { login, senha } = req.body
  if (!login || !senha) return res.status(400).json({ error: 'Login e senha são obrigatórios' })

  const user = await queryOne<any>('SELECT * FROM usuarios WHERE login = ? AND ativo = 1', [login])
  if (!user) return res.status(401).json({ error: 'Usuário ou senha inválidos' })

  const ok = await bcrypt.compare(senha, user.senhaHash)
  if (!ok) return res.status(401).json({ error: 'Usuário ou senha inválidos' })

  const regs = await query<{ regionalId: number }>('SELECT regional_id AS "regionalId" FROM usuario_regionais WHERE usuario_id = ?', [user.id])
  const regionalIds = regs.map(r => r.regionalId)

  const token = makeToken(user.id, user.login, user.perfil, regionalIds)

  res.json({
    token,
    trocarSenha: user.trocarSenha === 1 || user.trocarSenha === true,
    user: { id: user.id, nome: user.nome, login: user.login, perfil: user.perfil, regionalIds },
  })
})

router.post('/trocar-senha', authMiddleware, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body
  if (!novaSenha || novaSenha.length < 6) return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' })

  const user = await queryOne<any>('SELECT * FROM usuarios WHERE id = ?', [req.user!.userId])
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  if (senhaAtual) {
    const ok = await bcrypt.compare(senhaAtual, user.senhaHash)
    if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' })
  }

  const hash = await bcrypt.hash(novaSenha, 10)
  await run('UPDATE usuarios SET senha_hash = ?, trocar_senha = 0, updated_at = ? WHERE id = ?',
    [hash, new Date().toISOString(), user.id])

  const regs = await query<{ regionalId: number }>('SELECT regional_id AS "regionalId" FROM usuario_regionais WHERE usuario_id = ?', [user.id])
  const regionalIds = regs.map(r => r.regionalId)
  const token = makeToken(user.id, user.login, user.perfil, regionalIds)

  res.json({ token, user: { id: user.id, nome: user.nome, login: user.login, perfil: user.perfil, regionalIds } })
})

router.get('/me', authMiddleware, async (req, res) => {
  const user = await queryOne<any>('SELECT id, nome, login, perfil, trocar_senha FROM usuarios WHERE id = ?', [req.user!.userId])
  if (!user) return res.status(404).json({ error: 'Não encontrado' })
  const regs = await query<{ regionalId: number }>('SELECT regional_id AS "regionalId" FROM usuario_regionais WHERE usuario_id = ?', [user.id])
  res.json({ ...user, regionalIds: regs.map(r => r.regionalId) })
})

export default router
