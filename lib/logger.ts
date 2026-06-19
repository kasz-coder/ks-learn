type LogLevel = 'info' | 'warn' | 'error' | 'debug'

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...data,
  }
  if (level === 'error') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export function logLlmCall(params: {
  userId?: string
  workspaceId?: string
  model: string
  messageCount?: number
  tokenBudget?: number
  type: 'chat' | 'summary'
}) {
  log('info', 'llm_call_start', {
    userId: params.userId,
    workspaceId: params.workspaceId,
    model: params.model,
    messageCount: params.messageCount,
    tokenBudget: params.tokenBudget,
    type: params.type,
  })
}

export function logLlmResponse(params: {
  userId?: string
  workspaceId?: string
  model: string
  type: 'chat' | 'summary'
  durationMs: number
  contentLength?: number
  error?: string
  safetyFiltered?: boolean
}) {
  const level = params.error ? 'error' : params.safetyFiltered ? 'warn' : 'info'
  log(level, 'llm_call_end', {
    userId: params.userId,
    workspaceId: params.workspaceId,
    model: params.model,
    type: params.type,
    durationMs: params.durationMs,
    contentLength: params.contentLength,
    error: params.error,
    safetyFiltered: params.safetyFiltered,
  })
}

export function logLlmStreamChunk(params: {
  userId?: string
  workspaceId?: string
  chunkIndex: number
  deltaLength: number
}) {
  log('debug', 'llm_stream_chunk', {
    userId: params.userId,
    workspaceId: params.workspaceId,
    chunkIndex: params.chunkIndex,
    deltaLength: params.deltaLength,
  })
}

export function logBlockSave(params: {
  userId?: string
  workspaceId?: string
  blockType: string
  title: string
  success: boolean
  error?: string
}) {
  const level = params.success ? 'info' : 'error'
  log(level, 'block_save', {
    userId: params.userId,
    workspaceId: params.workspaceId,
    blockType: params.blockType,
    title: params.title,
    success: params.success,
    error: params.error,
  })
}
