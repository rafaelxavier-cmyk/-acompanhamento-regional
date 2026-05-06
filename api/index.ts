import express from 'express'
import { initDb } from '../server/db/connection'
import { runMigrations } from '../server/db/migrate'
import apiRouter from '../server/routes/index'

const app = express()
app.use(express.json())
app.use('/api/v1', apiRouter)
app.get('/health', (_, res) => res.json({ ok: true }))

// Inicializa o banco uma vez por container (warm start reusa a conexão)
let ready: Promise<void> | null = null
function ensureReady() {
  if (!ready) {
    initDb()
    ready = runMigrations()
  }
  return ready
}

export default async function handler(req: any, res: any) {
  await ensureReady()
  return app(req, res)
}
