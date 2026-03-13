import { ipcMain } from 'electron'
import { query, queryOne, run, insert } from '../../database/connection'

export function registerUnidadesHandlers() {
  ipcMain.handle('unidades:getAll', (_, regionalId?: number) => {
    if (regionalId) return query('SELECT * FROM unidades WHERE regional_id = ? ORDER BY nome', [regionalId])
    return query('SELECT * FROM unidades ORDER BY nome')
  })

  ipcMain.handle('unidades:create', (_, nome: string, regionalId: number) => {
    const id = insert('INSERT INTO unidades (nome, regional_id) VALUES (?, ?)', [nome, regionalId])
    return queryOne('SELECT * FROM unidades WHERE id = ?', [id])
  })

  // Resumo por unidade filtrado por período
  ipcMain.handle('unidades:resumo', (_, dataInicio?: string, dataFim?: string) => {
    const ini = dataInicio ?? '2000-01-01'
    const fim = dataFim   ?? '2999-12-31'
    return query(`
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
    `, [ini, fim, ini, fim, ini, fim])
  })

  ipcMain.handle('unidades:update', (_, id: number, data: { nome?: string; regionalId?: number; ativa?: boolean }) => {
    if (data.nome !== undefined)      run('UPDATE unidades SET nome = ? WHERE id = ?', [data.nome, id])
    if (data.regionalId !== undefined) run('UPDATE unidades SET regional_id = ? WHERE id = ?', [data.regionalId, id])
    if (data.ativa !== undefined)     run('UPDATE unidades SET ativa = ? WHERE id = ?', [data.ativa ? 1 : 0, id])
    return queryOne('SELECT * FROM unidades WHERE id = ?', [id])
  })
}
