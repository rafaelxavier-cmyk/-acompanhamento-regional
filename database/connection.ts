/**
 * Camada de banco de dados com sql.js (SQLite puro JS — sem compilação nativa).
 * O banco é carregado do disco na inicialização e salvo automaticamente após cada operação.
 */
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let _db: SqlJsDatabase | null = null
let _dbPath: string | null = null

export async function initDb(): Promise<void> {
  // require.resolve('sql.js') → .../node_modules/sql.js/dist/sql-wasm.js
  // dirname → .../node_modules/sql.js/dist/
  const wasmPath = path.join(
    path.dirname(require.resolve('sql.js')),
    'sql-wasm.wasm'
  )

  const SQL = await initSqlJs({
    locateFile: () => wasmPath
  })

  _dbPath = path.join(app.getPath('userData'), 'acompanhamento-regional.db')

  if (fs.existsSync(_dbPath)) {
    const fileBuffer = fs.readFileSync(_dbPath)
    _db = new SQL.Database(fileBuffer)
  } else {
    _db = new SQL.Database()
  }

  _db.run('PRAGMA foreign_keys = ON')
}

export function getDb(): SqlJsDatabase {
  if (!_db) throw new Error('Banco de dados não inicializado. Chame initDb() primeiro.')
  return _db
}

export function saveDb(): void {
  if (!_db || !_dbPath) return
  const data = _db.export()
  fs.writeFileSync(_dbPath, Buffer.from(data))
}

/** Executa SQL e salva automaticamente. Usa para INSERT/UPDATE/DELETE. */
export function run(sql: string, params: (string | number | null | boolean)[] = []): void {
  getDb().run(sql, params)
  saveDb()
}

/** Converte snake_case para camelCase em um objeto plano. */
function toCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = obj[key]
  }
  return out
}

/** Executa SELECT e retorna todos os resultados como objetos (camelCase). */
export function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null | boolean)[] = []
): T[] {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(toCamel(stmt.getAsObject() as Record<string, unknown>) as T)
  }
  stmt.free()
  return rows
}

/** Executa SELECT e retorna apenas o primeiro resultado (camelCase). */
export function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null | boolean)[] = []
): T | undefined {
  const rows = query<T>(sql, params)
  return rows[0]
}

/** Executa INSERT e retorna o lastInsertRowid. */
export function insert(sql: string, params: (string | number | null | boolean)[] = []): number {
  getDb().run(sql, params)
  const result = queryOne<{ id: number }>('SELECT last_insert_rowid() as id')
  saveDb()
  return result?.id ?? 0
}
