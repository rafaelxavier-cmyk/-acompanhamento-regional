import { ipcMain } from 'electron'
import { query, queryOne, run, insert } from '../../database/connection'

export function registerVisitasHandlers() {
  ipcMain.handle('visitas:getByUnidade', (_, unidadeId: number) =>
    query('SELECT * FROM visitas WHERE unidade_id = ? ORDER BY data_visita DESC', [unidadeId])
  )

  ipcMain.handle('visitas:get', (_, id: number) =>
    queryOne('SELECT * FROM visitas WHERE id = ?', [id])
  )

  ipcMain.handle('visitas:create', (_, unidadeId: number, dataVisita: string, diretorNome?: string) => {
    const id = insert(
      'INSERT INTO visitas (unidade_id, data_visita, diretor_nome, status) VALUES (?, ?, ?, ?)',
      [unidadeId, dataVisita, diretorNome ?? null, 'em_andamento']
    )
    return queryOne('SELECT * FROM visitas WHERE id = ?', [id])
  })

  ipcMain.handle('visitas:update', (_, id: number, data: {
    status?: string
    observacaoGeral?: string
    diretorNome?: string
  }) => {
    const now = new Date().toISOString()
    if (data.status !== undefined)
      run('UPDATE visitas SET status = ?, updated_at = ? WHERE id = ?', [data.status, now, id])
    if (data.observacaoGeral !== undefined)
      run('UPDATE visitas SET observacao_geral = ?, updated_at = ? WHERE id = ?', [data.observacaoGeral, now, id])
    if (data.diretorNome !== undefined)
      run('UPDATE visitas SET diretor_nome = ?, updated_at = ? WHERE id = ?', [data.diretorNome, now, id])
    return queryOne('SELECT * FROM visitas WHERE id = ?', [id])
  })

  ipcMain.handle('visitas:recentes', (_, limite = 10) =>
    query(`
      SELECT
        v.id, v.data_visita, v.status, v.diretor_nome,
        v.unidade_id,
        u.nome  AS unidade_nome,
        u.regional_id,
        (SELECT COUNT(*) FROM registros_macrocaixa r WHERE r.visita_id = v.id AND r.status != 'nao_iniciado') AS total_registros
      FROM visitas v
      LEFT JOIN unidades u ON u.id = v.unidade_id
      ORDER BY v.data_visita DESC
      LIMIT ?
    `, [limite])
  )
}
