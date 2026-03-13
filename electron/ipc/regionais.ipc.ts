import { ipcMain } from 'electron'
import { query, queryOne, run, insert } from '../../database/connection'

export function registerRegionaisHandlers() {
  ipcMain.handle('regionais:getAll', () =>
    query('SELECT * FROM regionais ORDER BY id')
  )

  ipcMain.handle('regionais:create', (_, nome: string) => {
    const id = insert('INSERT INTO regionais (nome) VALUES (?)', [nome])
    return queryOne('SELECT * FROM regionais WHERE id = ?', [id])
  })

  ipcMain.handle('regionais:update', (_, id: number, data: { nome?: string; diretorNome?: string }) => {
    if (data.nome !== undefined) run('UPDATE regionais SET nome = ? WHERE id = ?', [data.nome, id])
    if (data.diretorNome !== undefined) run('UPDATE regionais SET diretor_nome = ? WHERE id = ?', [data.diretorNome, id])
    return queryOne('SELECT * FROM regionais WHERE id = ?', [id])
  })
}
