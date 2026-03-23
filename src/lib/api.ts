import type {
  Regional, Unidade, Macrocaixa, Visita, VisitaRecente,
  RegistroMacrocaixa, UltimoRegistro, UnidadeResumo,
  Demanda, DemandaAberta, DemandaKanban
} from '../types'
import type { AuthUser } from '../context/AuthContext'

const BASE = '/api/v1'

async function req<T>(method: string, path: string, body?: unknown, query?: Record<string, string | undefined>, _retries = 2): Promise<T> {
  let url = BASE + path
  if (query) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params.set(k, v)
    }
    if (params.toString()) url += '?' + params.toString()
  }
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`${res.status}: ${text}`)
    }
    if (res.status === 204) return undefined as T
    return res.json()
  } catch (err: any) {
    // Retry em erros de rede (não em 4xx — são erros do cliente)
    const isNetworkError = !err.message?.match(/^[45]\d\d:/)
    if (isNetworkError && _retries > 0) {
      await new Promise(r => setTimeout(r, 1500))
      return req(method, path, body, query, _retries - 1)
    }
    throw err
  }
}

export const api = {
  // Auth
  login: (login: string, senha: string) =>
    req<{ token: string; trocarSenha: boolean; user: AuthUser }>('POST', '/auth/login', { login, senha }),
  trocarSenha: (novaSenha: string, senhaAtual?: string) =>
    req<{ token: string; user: AuthUser }>('POST', '/auth/trocar-senha', { novaSenha, senhaAtual }),
  me: () => req<AuthUser>('GET', '/auth/me'),
  logout: () => req<{ ok: boolean }>('POST', '/auth/logout'),
  heartbeat: () => req<{ ok: boolean }>('POST', '/auth/heartbeat'),

  // Usuarios (admin only)
  getUsuarios: () => req<any[]>('GET', '/usuarios'),
  criarUsuario: (data: { nome: string; login: string; senha: string; perfil: string; regionalIds: number[] }) =>
    req<any>('POST', '/usuarios', data),
  atualizarUsuario: (id: number, data: Record<string, unknown>) => req<any>('PATCH', `/usuarios/${id}`, data),
  excluirUsuario: (id: number) => req<void>('DELETE', `/usuarios/${id}`),
  getSessoesUsuario: (id: number) => req<any[]>('GET', `/usuarios/${id}/sessoes`),

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
  updateVisita: (id: number, data: { status?: string; observacaoGeral?: string; diretorNome?: string; dataVisita?: string; unidadeId?: number }) => req<Visita>('PATCH', `/visitas/${id}`, data),
  deleteVisita: (id: number) => req<void>('DELETE', `/visitas/${id}`),
  getVisitasRecentes: (limite?: number) => req<VisitaRecente[]>('GET', '/visitas/recentes', undefined, { limite: limite?.toString() }),
  getVisitasCalendario: (ini: string, fim: string) => req<import('../types').VisitaCalendario[]>('GET', '/visitas/calendario', undefined, { ini, fim }),

  // Registros
  getRegistrosByVisita: (visitaId: number) => req<RegistroMacrocaixa[]>('GET', '/registros', undefined, { visitaId: String(visitaId) }),
  upsertRegistro: (visitaId: number, macrocaixaId: number, data: { status?: string; observacao?: string; pontosPositivos?: string; pontosAtencao?: string }) =>
    req<RegistroMacrocaixa>('POST', '/registros/upsert', { visitaId, macrocaixaId, ...data }),
  getUltimoRegistro: (unidadeId: number, macrocaixaId: number) =>
    req<UltimoRegistro | undefined>('GET', '/registros/ultimo', undefined, { unidadeId: String(unidadeId), macrocaixaId: String(macrocaixaId) }),

  // Demandas
  getDemandasByRegistro: (registroId: number) => req<Demanda[]>('GET', '/demandas', undefined, { registroId: String(registroId) }),
  getDemandasAbertas: () => req<DemandaAberta[]>('GET', '/demandas/abertas'),
  getDemandasKanban: () => req<DemandaKanban[]>('GET', '/demandas/kanban'),
  createDemanda: (registroId: number, data: { titulo: string; descricao?: string; prioridade?: string; responsavel?: string; prazo?: string }) =>
    req<Demanda>('POST', '/demandas', { registroId, ...data }),
  createDemandaKanban: (data: { unidadeId: number; titulo: string; descricao?: string; prioridade?: string; responsavel?: string; prazo?: string }) =>
    req<Demanda>('POST', '/demandas', data),
  updateDemanda: (id: number, data: { titulo?: string; descricao?: string; prioridade?: string; responsavel?: string; prazo?: string; statusDemanda?: string; unidadeId?: number }) =>
    req<Demanda>('PATCH', `/demandas/${id}`, data),
  deleteDemanda: (id: number) => req<void>('DELETE', `/demandas/${id}`),

  // IA
  iaGetConfig: () => req<Record<string, string>>('GET', '/ia/config'),
  iaSaveApiKey: (apiKey: string) => req<{ ok: boolean }>('POST', '/ia/config', { apiKey }),
  iaGerarPlano: (unidadeId: number, visitaId?: number) => req<{ plano: string; unidadeNome: string; dataUltimaVisita: string; totalDemandas: number }>('POST', `/ia/plano/${unidadeId}`, visitaId ? { visitaId } : {}),
  iaGerarRelatorioPeriodo: (dataInicio: string, dataFim: string, unidadeIds?: number[]) =>
    req<{ relatorio: string; totalVisitas: number; totalDemandas: number; dataInicio: string; dataFim: string }>(
      'POST', '/ia/relatorio-periodo', { dataInicio, dataFim, unidadeIds }
    ),
}
