import { createClient, type Client } from '@libsql/client'
import fs from 'fs'
import path from 'path'

let _client: Client | null = null

function toCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = obj[key]
  }
  return out
}

export function initDb(): void {
  const url = process.env.TURSO_DATABASE_URL || 'file:./data/app.db'
  const authToken = process.env.TURSO_AUTH_TOKEN

  // Garante o diretório para banco local
  if (url.startsWith('file:')) {
    const filePath = url.replace('file:', '')
    fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true })
  }

  _client = createClient({ url, authToken })
}

export function getClient(): Client {
  if (!_client) throw new Error('DB não inicializado')
  return _client
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getClient().execute({ sql, args: params as any[] })
  return result.rows.map(row => toCamel(row as unknown as Record<string, unknown>)) as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const result = await getClient().execute({ sql, args: params as any[] })
  const row = result.rows[0]
  return row ? (toCamel(row as unknown as Record<string, unknown>) as T) : undefined
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  await getClient().execute({ sql, args: params as any[] })
}

export async function insert(sql: string, params: unknown[] = []): Promise<number> {
  const result = await getClient().execute({ sql, args: params as any[] })
  return Number(result.lastInsertRowid)
}
