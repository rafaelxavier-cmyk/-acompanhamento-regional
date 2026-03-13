import { ipcMain } from 'electron'
import { query, queryOne, run, insert } from '../../database/connection'

export function registerDemandasHandlers() {
  ipcMain.handle('demandas:getByRegistro', (_, registroId: number) =>
    query('SELECT * FROM demandas WHERE registro_id = ? ORDER BY created_at DESC', [registroId])
  )

  ipcMain.handle('demandas:abertas', () =>
    query(`
      SELECT
        d.id, d.titulo, d.descricao, d.prioridade, d.responsavel, d.prazo,
        d.status_demanda, d.sync_status, d.created_at,
        u.nome        AS unidade_nome,
        u.regional_id AS regional_id,
        m.titulo      AS macrocaixa_titulo,
        m.codigo      AS macrocaixa_codigo
      FROM demandas d
      JOIN registros_macrocaixa r ON r.id = d.registro_id
      JOIN visitas v              ON v.id = r.visita_id
      JOIN unidades u             ON u.id = v.unidade_id
      JOIN macrocaixas m          ON m.id = r.macrocaixa_id
      WHERE d.status_demanda = 'aberta'
      ORDER BY
        CASE d.prioridade
          WHEN 'urgente' THEN 1
          WHEN 'alta'    THEN 2
          WHEN 'normal'  THEN 3
          WHEN 'baixa'   THEN 4
        END
    `)
  )

  ipcMain.handle('demandas:create', (_, registroId: number, data: {
    titulo: string
    descricao?: string
    prioridade?: string
    responsavel?: string
    prazo?: string
  }) => {
    const id = insert(
      `INSERT INTO demandas (registro_id, titulo, descricao, prioridade, responsavel, prazo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        registroId,
        data.titulo,
        data.descricao ?? null,
        data.prioridade ?? 'normal',
        data.responsavel ?? null,
        data.prazo ?? null,
      ]
    )
    return queryOne('SELECT * FROM demandas WHERE id = ?', [id])
  })

  ipcMain.handle('demandas:update', (_, id: number, data: {
    titulo?: string
    descricao?: string
    prioridade?: string
    responsavel?: string
    prazo?: string
    statusDemanda?: string
  }) => {
    const now = new Date().toISOString()
    const fields: string[] = ['updated_at = ?']
    const vals: (string | number | null)[] = [now]

    if (data.titulo !== undefined)        { fields.push('titulo = ?');         vals.push(data.titulo) }
    if (data.descricao !== undefined)     { fields.push('descricao = ?');      vals.push(data.descricao) }
    if (data.prioridade !== undefined)    { fields.push('prioridade = ?');     vals.push(data.prioridade) }
    if (data.responsavel !== undefined)   { fields.push('responsavel = ?');    vals.push(data.responsavel) }
    if (data.prazo !== undefined)         { fields.push('prazo = ?');          vals.push(data.prazo) }
    if (data.statusDemanda !== undefined) { fields.push('status_demanda = ?'); vals.push(data.statusDemanda) }

    vals.push(id)
    run(`UPDATE demandas SET ${fields.join(', ')} WHERE id = ?`, vals)
    return queryOne('SELECT * FROM demandas WHERE id = ?', [id])
  })

  ipcMain.handle('demandas:delete', (_, id: number) => {
    run('DELETE FROM demandas WHERE id = ?', [id])
    return { ok: true }
  })
}
