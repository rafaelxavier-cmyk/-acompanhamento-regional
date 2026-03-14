import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | null = null

function toCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = obj[key]
  }
  return out
}

// Converte ? para $1, $2, $3...
function toNumbered(sql: string): string {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

export function initDb(): void {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL não configurada')
  _sql = postgres(url, { ssl: 'require', max: 5 })
}

export function getClient() {
  if (!_sql) throw new Error('DB não inicializado')
  return _sql
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const rows = await getClient().unsafe(toNumbered(sql), params as any[])
  return rows.map(r => toCamel(r as Record<string, unknown>)) as T[]
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await getClient().unsafe(toNumbered(sql), params as any[])
  return rows[0] ? (toCamel(rows[0] as Record<string, unknown>) as T) : undefined
}

export async function run(sql: string, params: unknown[] = []): Promise<void> {
  await getClient().unsafe(toNumbered(sql), params as any[])
}

export async function insert(sql: string, params: unknown[] = []): Promise<number> {
  const rows = await getClient().unsafe(toNumbered(sql) + ' RETURNING id', params as any[])
  return Number(rows[0]?.id)
}
