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
  app.get('/health', (_, res) => res.json({ ok: true }))

  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`)

    // Keep-alive: evita hibernação no Render (plano gratuito hiberna após 15min)
    if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
      const url = `${process.env.RENDER_EXTERNAL_URL}/health`
      setInterval(() => {
        fetch(url).catch(() => {/* silencioso */})
      }, 14 * 60 * 1000) // a cada 14 minutos
    }
  })
}

main().catch(err => {
  console.error('Erro ao iniciar servidor:', err)
  process.exit(1)
})
