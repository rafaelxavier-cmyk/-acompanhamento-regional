import { registerRegionaisHandlers } from './regionais.ipc'
import { registerUnidadesHandlers } from './unidades.ipc'
import { registerMacrocaixasHandlers } from './macrocaixas.ipc'
import { registerVisitasHandlers } from './visitas.ipc'
import { registerRegistrosHandlers } from './registros.ipc'
import { registerDemandasHandlers } from './demandas.ipc'
import { registerIAHandlers } from './ia.ipc'

export function registerAllIpcHandlers() {
  registerRegionaisHandlers()
  registerUnidadesHandlers()
  registerMacrocaixasHandlers()
  registerVisitasHandlers()
  registerRegistrosHandlers()
  registerDemandasHandlers()
  registerIAHandlers()
}
