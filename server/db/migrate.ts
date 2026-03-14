import bcrypt from 'bcryptjs'
import { run, query, insert } from './connection'

export async function runMigrations(): Promise<void> {
  await run(`
    CREATE TABLE IF NOT EXISTS regionais (
      id           SERIAL PRIMARY KEY,
      nome         TEXT    NOT NULL UNIQUE,
      diretor_nome TEXT,
      created_at   TEXT    NOT NULL DEFAULT (to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS'))
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS unidades (
      id          SERIAL PRIMARY KEY,
      nome        TEXT    NOT NULL,
      regional_id INTEGER NOT NULL REFERENCES regionais(id),
      ativa       INTEGER NOT NULL DEFAULT 1,
      iniciais    TEXT,
      created_at  TEXT    NOT NULL DEFAULT (to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS'))
    )
  `)
  await run(`ALTER TABLE unidades ADD COLUMN IF NOT EXISTS iniciais TEXT`)

  // Kanban: unidade_id direto + registro_id opcional
  await run(`ALTER TABLE demandas ADD COLUMN IF NOT EXISTS unidade_id INTEGER REFERENCES unidades(id)`)
  await run(`ALTER TABLE demandas ALTER COLUMN registro_id DROP NOT NULL`)
  // Backfill unidade_id para demandas já existentes
  await run(`
    UPDATE demandas d SET unidade_id = (
      SELECT v.unidade_id FROM registros_macrocaixa rm
      JOIN visitas v ON v.id = rm.visita_id
      WHERE rm.id = d.registro_id
    ) WHERE d.unidade_id IS NULL AND d.registro_id IS NOT NULL
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS macrocaixas (
      id        SERIAL PRIMARY KEY,
      codigo    TEXT    NOT NULL UNIQUE,
      titulo    TEXT    NOT NULL,
      descricao TEXT,
      ordem     INTEGER NOT NULL,
      ativa     INTEGER NOT NULL DEFAULT 1
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS visitas (
      id               SERIAL PRIMARY KEY,
      unidade_id       INTEGER NOT NULL REFERENCES unidades(id),
      data_visita      TEXT    NOT NULL,
      diretor_nome     TEXT,
      status           TEXT    NOT NULL DEFAULT 'em_andamento',
      observacao_geral TEXT,
      created_at       TEXT    NOT NULL DEFAULT (to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS')),
      updated_at       TEXT
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS registros_macrocaixa (
      id               SERIAL PRIMARY KEY,
      visita_id        INTEGER NOT NULL REFERENCES visitas(id),
      macrocaixa_id    INTEGER NOT NULL REFERENCES macrocaixas(id),
      status           TEXT    NOT NULL DEFAULT 'nao_iniciado',
      observacao       TEXT,
      pontos_positivos TEXT,
      pontos_atencao   TEXT,
      created_at       TEXT    NOT NULL DEFAULT (to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS')),
      updated_at       TEXT
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS demandas (
      id             SERIAL PRIMARY KEY,
      registro_id    INTEGER NOT NULL REFERENCES registros_macrocaixa(id),
      titulo         TEXT    NOT NULL,
      descricao      TEXT,
      prioridade     TEXT    NOT NULL DEFAULT 'normal',
      responsavel    TEXT,
      prazo          TEXT,
      status_demanda TEXT    NOT NULL DEFAULT 'aberta',
      external_id    TEXT,
      sync_status    TEXT    NOT NULL DEFAULT 'pendente',
      sync_at        TEXT,
      created_at     TEXT    NOT NULL DEFAULT (to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS')),
      updated_at     TEXT
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id          SERIAL PRIMARY KEY,
      nome        TEXT    NOT NULL,
      login       TEXT    NOT NULL UNIQUE,
      senha_hash  TEXT    NOT NULL,
      perfil      TEXT    NOT NULL DEFAULT 'usuario',
      ativo       INTEGER NOT NULL DEFAULT 1,
      trocar_senha INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS')),
      updated_at  TEXT
    )
  `)

  await run(`
    CREATE TABLE IF NOT EXISTS usuario_regionais (
      usuario_id  INTEGER NOT NULL REFERENCES usuarios(id),
      regional_id INTEGER NOT NULL REFERENCES regionais(id),
      PRIMARY KEY (usuario_id, regional_id)
    )
  `)

  await runSeed()
}

async function runSeed(): Promise<void> {
  const count = await query<{ c: string }>('SELECT COUNT(*) as c FROM regionais')
  if (Number(count[0]?.c ?? 0) > 0) return

  const r1 = await insert("INSERT INTO regionais (nome) VALUES ('Regional 1')")
  const r2 = await insert("INSERT INTO regionais (nome) VALUES ('Regional 2')")

  for (const [nome, ini] of [['Bangu','BG'],['Campo Grande','CG'],['Retiro','RT'],['São João de Meriti','SJ'],['Tijuca','TJ']])
    await run('INSERT INTO unidades (nome, regional_id, iniciais) VALUES (?, ?, ?)', [nome, r1, ini])
  for (const [nome, ini] of [['Caxias','CX'],['Madureira','MD'],['Nova Iguaçu','NI'],['Rocha Miranda','RM'],['Taquara','TQ']])
    await run('INSERT INTO unidades (nome, regional_id, iniciais) VALUES (?, ?, ?)', [nome, r2, ini])

  const macros: [string, string, string, number][] = [
    ['#02', 'Crescimento e Matrículas',         'Funil de vendas, campanhas de matrícula, recuperação de alunos',             1],
    ['#04', 'Experiência da Família e Atend.',   'Qualidade do atendimento, secretaria, jornada da família e NPS',            2],
    ['#05', 'Operação das Unidades',              'Rotinas operacionais, processos e gestão do dia a dia das unidades',        3],
    ['#06', 'Execução Comercial nas Unidades',   'Conversão presencial e atendimento comercial nas unidades',                 4],
    ['#07', 'Gestão Pedagógica Operacional',     'Problemas operacionais ligados ao pedagógico',                              5],
    ['#08', 'Infraestrutura e Expansão (Obras)', 'Obras, salas, capacidade física — projetos em andamento',                   6],
    ['#09', 'Manutenção e Facilities',           'Manutenção predial, limpeza, serviços gerais',                              7],
    ['#12', 'Treinamentos e Desenvolvimento',    'Capacitação de equipes e treinamentos obrigatórios',                        8],
    ['#13', 'Compliance, Segurança e Normas',    'Conformidade, segurança do trabalho e normas internas',                     9],
    ['#17', 'Comunicação e Gestão de Crises',    'Comunicação com famílias, posicionamento e gestão de crises',              10],
  ]

  for (const [c, t, d, o] of macros)
    await run('INSERT INTO macrocaixas (codigo, titulo, descricao, ordem) VALUES (?, ?, ?, ?)', [c, t, d, o])

  // Seed admin user (trocar_senha=1 → obrigado a trocar na 1ª entrada)
  const adminExists = await query('SELECT id FROM usuarios WHERE login = ?', ['admin'])
  if (adminExists.length === 0) {
    const hash = await bcrypt.hash('admin123', 10)
    await insert(
      'INSERT INTO usuarios (nome, login, senha_hash, perfil, ativo, trocar_senha, created_at) VALUES (?, ?, ?, ?, 1, 1, ?)',
      ['Administrador', 'admin', hash, 'admin', new Date().toISOString()]
    )
  }
}
