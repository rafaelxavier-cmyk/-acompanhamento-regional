import { Router } from 'express'
import { authMiddleware } from '../middleware/auth'
import authRouter from './auth.routes'
import usuariosRouter from './usuarios.routes'
import regionaisRouter from './regionais.routes'
import unidadesRouter from './unidades.routes'
import macrocaixasRouter from './macrocaixas.routes'
import visitasRouter from './visitas.routes'
import registrosRouter from './registros.routes'
import demandasRouter from './demandas.routes'
import iaRouter from './ia.routes'

const router = Router()

// Rotas públicas
router.use('/auth', authRouter)

// Rotas protegidas
router.use('/usuarios',    usuariosRouter)
router.use('/regionais',   authMiddleware, regionaisRouter)
router.use('/unidades',    authMiddleware, unidadesRouter)
router.use('/macrocaixas', authMiddleware, macrocaixasRouter)
router.use('/visitas',     authMiddleware, visitasRouter)
router.use('/registros',   authMiddleware, registrosRouter)
router.use('/demandas',    authMiddleware, demandasRouter)
router.use('/ia',          authMiddleware, iaRouter)

export default router
