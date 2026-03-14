import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthPayload {
  userId: number
  login: string
  perfil: 'admin' | 'usuario'
  regionalIds: number[]   // empty = acesso a todas
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Não autenticado' })
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as AuthPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.perfil !== 'admin') return res.status(403).json({ error: 'Acesso restrito a administradores' })
  next()
}
