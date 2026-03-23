import { getDb, saveDb, query } from './connection'

export function runMigrations(): void {
  const db = getDb()

  db.run(`
    CREATE TABLE IF NOT EXISTS regionais (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL UNIQUE,
      diretor_nome TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS unidades (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nome        TEXT    NOT NULL,
      regional_id INTEGER NOT NULL REFERENCES regionais(id),
      ativa       INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS macrocaixas (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo    TEXT    NOT NULL UNIQUE,
      titulo    TEXT    NOT NULL,
      descricao TEXT,
      ordem     INTEGER NOT NULL,
      ativa     INTEGER NOT NULL DEFAULT 1
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS visitas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      unidade_id       INTEGER NOT NULL REFERENCES unidades(id),
      data_visita      TEXT    NOT NULL,
      diretor_nome     TEXT,
      status           TEXT    NOT NULL DEFAULT 'em_andamento',
      observacao_geral TEXT,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS registros_macrocaixa (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      visita_id        INTEGER NOT NULL REFERENCES visitas(id),
      macrocaixa_id    INTEGER NOT NULL REFERENCES macrocaixas(id),
      status           TEXT    NOT NULL DEFAULT 'nao_iniciado',
      observacao       TEXT,
      pontos_positivos TEXT,
      pontos_atencao   TEXT,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS demandas (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT
    )
  `)

  // Macrocaixas adicionadas após o seed inicial — idempotentes
  getDb().run(`INSERT OR IGNORE INTO macrocaixas (codigo, titulo, descricao, ordem) VALUES ('#11', 'Gestão de Pessoas', 'Gestão de colaboradores, contratações, desligamentos, afastamentos e clima organizacional', 11)`)

  runSeed()
  saveDb()
}

function runSeed(): void {
  const count = query<{ c: number }>('SELECT COUNT(*) as c FROM regionais')
  if ((count[0]?.c ?? 0) > 0) return   // Seed já executado

  // Regionais
  getDb().run("INSERT INTO regionais (nome) VALUES ('Regional 1')")
  const r1 = query<{ id: number }>('SELECT last_insert_rowid() as id')[0].id
  getDb().run("INSERT INTO regionais (nome) VALUES ('Regional 2')")
  const r2 = query<{ id: number }>('SELECT last_insert_rowid() as id')[0].id

  // Unidades
  const insUnit = (nome: string, rid: number) =>
    getDb().run('INSERT INTO unidades (nome, regional_id) VALUES (?, ?)', [nome, rid])

  ;['Bangu', 'Campo Grande', 'Retiro', 'São João de Meriti', 'Tijuca'].forEach(n => insUnit(n, r1))
  ;['Caxias', 'Madureira', 'Nova Iguaçu', 'Rocha Miranda', 'Taquara'].forEach(n => insUnit(n, r2))

  // Macrocaixas
  const macros: [string, string, string, number][] = [
    ['#02', 'Crescimento e Matrículas',         'Funil de vendas, campanhas de matrícula, recuperação de alunos',              1],
    ['#04', 'Experiência da Família e Atend.',   'Qualidade do atendimento, secretaria, jornada da família e NPS',             2],
    ['#05', 'Infraestrutura e Expansão',         'Obras, salas, capacidade física',                                            3],
    ['#06', 'Execução Comercial nas Unidades',   'Conversão presencial e atendimento comercial nas unidades',                  4],
    ['#07', 'Gestão Pedagógica Operacional',     'Problemas operacionais ligados ao pedagógico',                               5],
    ['#08', 'Infraestrutura e Expansão (Obras)', 'Obras, salas, capacidade física — projetos em andamento',                    6],
    ['#09', 'Manutenção e Facilities',           'Manutenção predial, limpeza, serviços gerais',                               7],
    ['#12', 'Treinamentos e Desenvolvimento',    'Capacitação de equipes e treinamentos obrigatórios',                         8],
    ['#13', 'Compliance, Segurança e Normas',    'Conformidade, segurança do trabalho e normas internas',                      9],
    ['#17', 'Comunicação e Gestão de Crises',    'Comunicação com famílias, posicionamento e gestão de crises',               10],
    ['#11', 'Gestão de Pessoas',                 'Gestão de colaboradores, contratações, desligamentos, afastamentos e clima organizacional', 11],
  ]

  macros.forEach(([c, t, d, o]) =>
    getDb().run(
      'INSERT INTO macrocaixas (codigo, titulo, descricao, ordem) VALUES (?, ?, ?, ?)',
      [c, t, d, o]
    )
  )
}
