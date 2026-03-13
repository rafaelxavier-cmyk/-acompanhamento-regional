import type {
  Regional, Unidade, Macrocaixa, Visita, VisitaRecente,
  RegistroMacrocaixa, UltimoRegistro, UnidadeResumo,
  Demanda, DemandaAberta
} from '../types'

const BASE = '/api/v1'

async function req<T>(method: string, path: string, body?: unknown, query?: Record<string, string | undefined>): Promise<T> {
  let url = BASE + path
  if (query) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, v)
    }
    if (params.toString()) url += '?' + params.toString()
  }
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  // Regionais
  getRegionais: () => req<Regional[]>('GET', '/regionais'),
  updateRegional: (id: number, data: { nome?: string; diretorNome?: string }) => req<Regional>('PATCH', `/regionais/${id}`, data),
  createRegional: (nome: string) => req<Regional>('POST', '/regionais', { nome }),

  // Unidades
  getUnidades: (regionalId?: number) => req<Unidade[]>('GET', '/unidades', undefined, { regionalId: regionalId?.toString() }),
  getUnidadesResumo: (dataInicio?: string, dataFim?: string) => req<UnidadeResumo[]>('GET', '/unidades/resumo', undefined, { dataInicio, dataFim }),
  createUnidade: (nome: string, regionalId: number) => req<Unidade>('POST', '/unidades', { nome, regionalId }),
  updateUnidade: (id: number, data: { nome?: string; regionalId?: number; ativa?: boolean }) => req<Unidade>('PATCH', `/unidades/${id}`, data),

  // Macrocaixas
  getMacrocaixas: () => req<Macrocaixa[]>('GET', '/macrocaixas'),

  // Visitas
  getVisitasByUnidade: (unidadeId: number) => req<Visita[]>('GET', '/visitas', undefined, { unidadeId: String(unidadeId) }),
  getVisita: (id: number) => req<Visita>('GET', `/visitas/${id}`),
  createVisita: (unidadeId: number, dataVisita: string, diretorNome?: string) => req<Visita>('POST', '/visitas', { unidadeId, dataVisita, diretorNome }),
  updateVisita: (id: number, data: { status?: string; observacaoGeral?: string; diretorNome?: string }) => req<Visita>('PATCH', `/visitas/${id}`, data),
  getVisitasRecentes: (limite?: number) => req<VisitaRecente[]>('GET', '/visitas/recentes', undefined, { limite: limite?.toString() }),

  // Registros
  getRegistrosByVisita: (visitaId: number) => req<RegistroMacrocaixa[]>('GET', '/registros', undefined, { visitaId: String(visitaId) }),
  upsertRegistro: (visitaId: number, macrocaixaId: number, data: { status?: string; observacao?: string; pontosPositivos?: string; pontosAtencao?: string }) =>
    req<RegistroMacrocaixa>('POST', '/registros/upsert', { visitaId, macrocaixaId, ...data }),
  getUltimoRegistro: (unidadeId: number, macrocaixaId: number) =>
    req<UltimoRegistro | undefined>('GET', '/registros/ultimo', undefined, { unidadeId: String(unidadeId), macrocaixaId: String(macrocaixaId) }),

  // Demandas
  getDemandasByRegistro: (registroId: number) => req<Demanda[]>('GET', '/demandas', undefined, { registroId: String(registroId) }),
  getDemandasAbertas: () => req<DemandaAberta[]>('GET', '/demandas/abertas'),
  createDemanda: (registroId: number, data: { titulo: string; descricao?: string; prioridade?: string; responsavel?: string; prazo?: string }) =>
    req<Demanda>('POST', '/demandas', { registroId, ...data }),
  updateDemanda: (id: number, data: { titulo?: string; descricao?: string; prioridade?: string; responsavel?: string; prazo?: string; statusDemanda?: string }) =>
    req<Demanda>('PATCH', `/demandas/${id}`, data),
  deleteDemanda: (id: number) => req<void>('DELETE', `/demandas/${id}`),

  // IA
  iaGetConfig: () => req<Record<string, string>>('GET', '/ia/config'),
  iaSaveApiKey: (apiKey: string) => req<{ ok: boolean }>('POST', '/ia/config', { apiKey }),
  iaGerarPlano: (unidadeId: number) => req<{ plano: string; unidadeNome: string; dataUltimaVisita: string; totalDemandas: number }>('POST', `/ia/plano/${unidadeId}`),
}
