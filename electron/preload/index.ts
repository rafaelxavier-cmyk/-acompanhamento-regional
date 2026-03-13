import { contextBridge, ipcRenderer } from 'electron'

// Bridge segura: expõe apenas os canais IPC necessários para o React
contextBridge.exposeInMainWorld('api', {
  // ── Regionais ──────────────────────────────────────────────────────────────
  getRegionais: () => ipcRenderer.invoke('regionais:getAll'),
  updateRegional: (id: number, data: { nome?: string; diretorNome?: string }) =>
    ipcRenderer.invoke('regionais:update', id, data),
  createRegional: (nome: string) => ipcRenderer.invoke('regionais:create', nome),

  // ── Unidades ───────────────────────────────────────────────────────────────
  getUnidades: (regionalId?: number) => ipcRenderer.invoke('unidades:getAll', regionalId),
  getUnidadesResumo: (dataInicio?: string, dataFim?: string) => ipcRenderer.invoke('unidades:resumo', dataInicio, dataFim),
  createUnidade: (nome: string, regionalId: number) =>
    ipcRenderer.invoke('unidades:create', nome, regionalId),
  updateUnidade: (id: number, data: { nome?: string; regionalId?: number; ativa?: boolean }) =>
    ipcRenderer.invoke('unidades:update', id, data),

  // ── Macrocaixas ────────────────────────────────────────────────────────────
  getMacrocaixas: () => ipcRenderer.invoke('macrocaixas:getAll'),

  // ── Visitas ────────────────────────────────────────────────────────────────
  getVisitasByUnidade: (unidadeId: number) =>
    ipcRenderer.invoke('visitas:getByUnidade', unidadeId),
  getVisita: (id: number) => ipcRenderer.invoke('visitas:get', id),
  createVisita: (unidadeId: number, dataVisita: string, diretorNome?: string) =>
    ipcRenderer.invoke('visitas:create', unidadeId, dataVisita, diretorNome),
  updateVisita: (id: number, data: { status?: string; observacaoGeral?: string; diretorNome?: string }) =>
    ipcRenderer.invoke('visitas:update', id, data),
  getVisitasRecentes: (limite?: number) =>
    ipcRenderer.invoke('visitas:recentes', limite),

  // ── Registros por Macrocaixa ───────────────────────────────────────────────
  getRegistrosByVisita: (visitaId: number) =>
    ipcRenderer.invoke('registros:getByVisita', visitaId),
  upsertRegistro: (visitaId: number, macrocaixaId: number, data: {
    status?: string
    observacao?: string
    pontosPositivos?: string
    pontosAtencao?: string
  }) => ipcRenderer.invoke('registros:upsert', visitaId, macrocaixaId, data),
  getUltimoRegistro: (unidadeId: number, macrocaixaId: number) =>
    ipcRenderer.invoke('registros:getUltimo', unidadeId, macrocaixaId),

  // ── Demandas ───────────────────────────────────────────────────────────────
  getDemandasByRegistro: (registroId: number) =>
    ipcRenderer.invoke('demandas:getByRegistro', registroId),
  getDemandasAbertas: () => ipcRenderer.invoke('demandas:abertas'),
  createDemanda: (registroId: number, data: {
    titulo: string
    descricao?: string
    prioridade?: string
    responsavel?: string
    prazo?: string
  }) => ipcRenderer.invoke('demandas:create', registroId, data),
  updateDemanda: (id: number, data: {
    titulo?: string
    descricao?: string
    prioridade?: string
    responsavel?: string
    prazo?: string
    statusDemanda?: string
  }) => ipcRenderer.invoke('demandas:update', id, data),
  deleteDemanda: (id: number) => ipcRenderer.invoke('demandas:delete', id),

  // ── IA (Groq) ──────────────────────────────────────────────────────────────
  iaGetConfig: () => ipcRenderer.invoke('ia:getConfig'),
  iaSaveApiKey: (apiKey: string) => ipcRenderer.invoke('ia:saveApiKey', apiKey),
  iaGerarPlano: (unidadeId: number) => ipcRenderer.invoke('ia:gerarPlano', unidadeId),
})
