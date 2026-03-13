import { ipcMain } from 'electron'
import { query, queryOne, run, insert } from '../../database/connection'

export function registerRegistrosHandlers() {
  ipcMain.handle('registros:getByVisita', (_, visitaId: number) =>
    query('SELECT * FROM registros_macrocaixa WHERE visita_id = ?', [visitaId])
  )

  ipcMain.handle('registros:upsert', (_, visitaId: number, macrocaixaId: number, data: {
    status?: string
    observacao?: string
    pontosPositivos?: string
    pontosAtencao?: string
  }) => {
    const now = new Date().toISOString()
    const existing = queryOne<{ id: number }>(
      'SELECT id FROM registros_macrocaixa WHERE visita_id = ? AND macrocaixa_id = ?',
      [visitaId, macrocaixaId]
    )

    if (existing) {
      const fields: string[] = ['updated_at = ?']
      const vals: (string | number | null)[] = [now]

      if (data.status !== undefined)         { fields.push('status = ?');           vals.push(data.status) }
      if (data.observacao !== undefined)      { fields.push('observacao = ?');        vals.push(data.observacao) }
      if (data.pontosPositivos !== undefined) { fields.push('pontos_positivos = ?');  vals.push(data.pontosPositivos) }
      if (data.pontosAtencao !== undefined)   { fields.push('pontos_atencao = ?');    vals.push(data.pontosAtencao) }

      vals.push(existing.id)
      run(`UPDATE registros_macrocaixa SET ${fields.join(', ')} WHERE id = ?`, vals)
      return queryOne('SELECT * FROM registros_macrocaixa WHERE id = ?', [existing.id])
    } else {
      const id = insert(
        `INSERT INTO registros_macrocaixa
           (visita_id, macrocaixa_id, status, observacao, pontos_positivos, pontos_atencao)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          visitaId,
          macrocaixaId,
          data.status ?? 'nao_iniciado',
          data.observacao ?? null,
          data.pontosPositivos ?? null,
          data.pontosAtencao ?? null,
        ]
      )
      return queryOne('SELECT * FROM registros_macrocaixa WHERE id = ?', [id])
    }
  })

  ipcMain.handle('registros:getUltimo', (_, unidadeId: number, macrocaixaId: number) =>
    queryOne(`
      SELECT
        r.id, r.status, r.observacao, r.pontos_positivos, r.pontos_atencao,
        v.data_visita, v.id AS visita_id
      FROM registros_macrocaixa r
      JOIN visitas v ON v.id = r.visita_id
      WHERE v.unidade_id = ? AND r.macrocaixa_id = ? AND v.status = 'concluida'
      ORDER BY v.data_visita DESC
      LIMIT 1
    `, [unidadeId, macrocaixaId])
  )
}
