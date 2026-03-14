// Espelha o schema do banco — usados em todo o frontend

export interface Regional {
  id: number
  nome: string
  diretorNome: string | null
  createdAt: string
}

export interface Unidade {
  id: number
  nome: string
  regionalId: number
  ativa: boolean
  iniciais: string
  createdAt: string
}

export interface VisitaCalendario {
  dataVisita: string
  unidadeId: number
  unidadeNome: string
  iniciais: string
  regionalId: number
  status: string
}

export interface Macrocaixa {
  id: number
  codigo: string
  titulo: string
  descricao: string | null
  ordem: number
  ativa: boolean
}

export type StatusVisita = 'em_andamento' | 'concluida'

export interface Visita {
  id: number
  unidadeId: number
  dataVisita: string
  diretorNome: string | null
  status: StatusVisita
  observacaoGeral: string | null
  createdAt: string
  updatedAt: string | null
}

export interface VisitaRecente extends Visita {
  unidadeNome: string
  regionalId: number
  totalRegistros: number
}

export type StatusRegistro = 'nao_iniciado' | 'em_dia' | 'atencao' | 'critico' | 'nao_aplicavel'

export interface RegistroMacrocaixa {
  id: number
  visitaId: number
  macrocaixaId: number
  status: StatusRegistro
  observacao: string | null
  pontosPositivos: string | null
  pontosAtencao: string | null
  createdAt: string
  updatedAt: string | null
}

export interface UltimoRegistro {
  id: number
  status: StatusRegistro
  observacao: string | null
  pontosPositivos: string | null
  pontosAtencao: string | null
  dataVisita: string
  visitaId: number
}

export interface UnidadeResumo {
  id: number
  nome: string
  regionalId: number
  totalVisitas: number
  ultimaVisita: string | null
  demandasAbertas: number
  macrocaixasCriticas: number
  macrocaixasAtencao: number
}

export type PrioridadeDemanda = 'baixa' | 'normal' | 'alta' | 'urgente'
export type StatusDemanda = 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'

export interface Demanda {
  id: number
  registroId: number
  titulo: string
  descricao: string | null
  prioridade: PrioridadeDemanda
  responsavel: string | null
  prazo: string | null
  statusDemanda: StatusDemanda
  externalId: string | null
  syncStatus: 'pendente' | 'sincronizado' | 'erro'
  syncAt: string | null
  createdAt: string
  updatedAt: string | null
}

export interface DemandaAberta extends Demanda {
  unidadeNome: string
  regionalId: number
  macrocaixaTitulo: string
  macrocaixaCodigo: string
}

