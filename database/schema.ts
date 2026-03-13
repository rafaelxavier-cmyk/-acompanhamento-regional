import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Regionais ────────────────────────────────────────────────────────────────
export const regionais = sqliteTable('regionais', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull().unique(),
  diretorNome: text('diretor_nome'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull()
})

// ─── Unidades ─────────────────────────────────────────────────────────────────
export const unidades = sqliteTable('unidades', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nome: text('nome').notNull(),
  regionalId: integer('regional_id').notNull().references(() => regionais.id),
  ativa: integer('ativa', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull()
})

// ─── Macrocaixas ──────────────────────────────────────────────────────────────
export const macrocaixas = sqliteTable('macrocaixas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  codigo: text('codigo').notNull().unique(),   // Ex: "#02"
  titulo: text('titulo').notNull(),
  descricao: text('descricao'),
  ordem: integer('ordem').notNull(),
  ativa: integer('ativa', { mode: 'boolean' }).default(true).notNull()
})

// ─── Visitas ──────────────────────────────────────────────────────────────────
export const visitas = sqliteTable('visitas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  unidadeId: integer('unidade_id').notNull().references(() => unidades.id),
  dataVisita: text('data_visita').notNull(),    // YYYY-MM-DD
  diretorNome: text('diretor_nome'),
  status: text('status').default('em_andamento').notNull(), // em_andamento | concluida
  observacaoGeral: text('observacao_geral'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at')
})

// ─── Registros por Macrocaixa (por Visita) ────────────────────────────────────
export const registrosMacrocaixa = sqliteTable('registros_macrocaixa', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  visitaId: integer('visita_id').notNull().references(() => visitas.id),
  macrocaixaId: integer('macrocaixa_id').notNull().references(() => macrocaixas.id),
  // nao_iniciado | em_dia | atencao | critico | nao_aplicavel
  status: text('status').default('nao_iniciado').notNull(),
  observacao: text('observacao'),
  pontosPositivos: text('pontos_positivos'),
  pontosAtencao: text('pontos_atencao'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at')
})

// ─── Demandas ─────────────────────────────────────────────────────────────────
export const demandas = sqliteTable('demandas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  registroId: integer('registro_id').notNull().references(() => registrosMacrocaixa.id),
  titulo: text('titulo').notNull(),
  descricao: text('descricao'),
  // baixa | normal | alta | urgente
  prioridade: text('prioridade').default('normal').notNull(),
  responsavel: text('responsavel'),
  prazo: text('prazo'),                         // YYYY-MM-DD
  // aberta | em_andamento | concluida | cancelada
  statusDemanda: text('status_demanda').default('aberta').notNull(),
  // ClickUp (integração futura)
  externalId: text('external_id'),
  syncStatus: text('sync_status').default('pendente').notNull(), // pendente | sincronizado | erro
  syncAt: text('sync_at'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  updatedAt: text('updated_at')
})

// ─── Tipos exportados ─────────────────────────────────────────────────────────
export type Regional = typeof regionais.$inferSelect
export type Unidade = typeof unidades.$inferSelect
export type Macrocaixa = typeof macrocaixas.$inferSelect
export type Visita = typeof visitas.$inferSelect
export type RegistroMacrocaixa = typeof registrosMacrocaixa.$inferSelect
export type Demanda = typeof demandas.$inferSelect

export type InsertRegional = typeof regionais.$inferInsert
export type InsertUnidade = typeof unidades.$inferInsert
export type InsertVisita = typeof visitas.$inferInsert
export type InsertRegistroMacrocaixa = typeof registrosMacrocaixa.$inferInsert
export type InsertDemanda = typeof demandas.$inferInsert
