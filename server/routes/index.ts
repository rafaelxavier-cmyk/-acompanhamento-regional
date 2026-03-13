import { Router } from 'express'
import regionaisRouter from './regionais.routes'
import unidadesRouter from './unidades.routes'
import macrocaixasRouter from './macrocaixas.routes'
import visitasRouter from './visitas.routes'
import registrosRouter from './registros.routes'
import demandasRouter from './demandas.routes'
import iaRouter from './ia.routes'

const router = Router()
router.use('/regionais', regionaisRouter)
router.use('/unidades', unidadesRouter)
router.use('/macrocaixas', macrocaixasRouter)
router.use('/visitas', visitasRouter)
router.use('/registros', registrosRouter)
router.use('/demandas', demandasRouter)
router.use('/ia', iaRouter)
export default router
