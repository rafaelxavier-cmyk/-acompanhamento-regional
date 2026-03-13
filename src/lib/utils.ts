import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { StatusRegistro, PrioridadeDemanda } from '../types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(iso: string) {
  return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR })
}

export function formatDateLong(iso: string) {
  return format(parseISO(iso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function diasSemVisita(dataVisita: string | null): number | null {
  if (!dataVisita) return null
  return differenceInDays(new Date(), parseISO(dataVisita))
}

export function semaforoVisita(dias: number | null): 'verde' | 'amarelo' | 'vermelho' | 'cinza' {
  if (dias === null) return 'cinza'
  if (dias <= 30) return 'verde'
  if (dias <= 60) return 'amarelo'
  return 'vermelho'
}

export const STATUS_REGISTRO_LABEL: Record<StatusRegistro, string> = {
  nao_iniciado:  'Não avaliado',
  em_dia:        'Em dia',
  atencao:       'Atenção',
  critico:       'Crítico',
  nao_aplicavel: 'N/A',
}

export const PRIORIDADE_LABEL: Record<PrioridadeDemanda, string> = {
  baixa:   'Baixa',
  normal:  'Normal',
  alta:    'Alta',
  urgente: 'Urgente',
}

export function hoje(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
