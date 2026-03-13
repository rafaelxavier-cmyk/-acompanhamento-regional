import express from 'express'
import path from 'path'
import { initDb } from './db/connection'
import { runMigrations } from './db/migrate'
import apiRouter from './routes/index'

async function main() {
  const app = express()
  app.use(express.json())

  initDb()
  await runMigrations()

  app.use('/api/v1', apiRouter)

  // Serve React em produção
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '../dist')
    app.use(express.static(distPath))
    app.get('*', (_, res) => res.sendFile(path.join(distPath, 'index.html')))
  }

  const PORT = Number(process.env.PORT) || 3001
  app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
}

main().catch(err => {
  console.error('Erro ao iniciar servidor:', err)
  process.exit(1)
})
