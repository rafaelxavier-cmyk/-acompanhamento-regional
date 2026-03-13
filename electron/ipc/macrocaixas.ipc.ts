import { ipcMain } from 'electron'
import { query } from '../../database/connection'

export function registerMacrocaixasHandlers() {
  ipcMain.handle('macrocaixas:getAll', () =>
    query('SELECT * FROM macrocaixas WHERE ativa = 1 ORDER BY ordem')
  )
}
