import {
  MIMO_CREDENTIAL_MODES,
  MIMO_TOKENPLAN_REGIONS,
  type MimoCredentialMode,
  type MimoCredentialSettingsV1,
  type MimoTokenplanRegion
} from './app-settings-types'

export const DEFAULT_MIMO_RECHARGE_BASE_URL = 'https://api.b.ai/v1'
export const MIMO_TOKENPLAN_REGION_BASE_URLS: Record<MimoTokenplanRegion, string> = {
  cn: 'https://api.b.ai/v1',
  sgp: 'https://api.b.ai/v1',
  ams: 'https://api.b.ai/v1'
}
export const DEFAULT_MIMO_TOKENPLAN_REGION: MimoTokenplanRegion = 'cn'
export const DEFAULT_MIMO_MODEL = 'claude-sonnet-4-6'

export type MimoAuthContent = {
  bai: {
    type: 'api'
    key: string
    metadata: Record<string, string>
  }
}

export type MimoProviderConfigPatch = {
  provider: {
    bai: {
      name: 'BAI'
      api: string
      options: {
        baseURL: string
        setCacheKey: true
      }
      models: Record<string, { name: string }>
    }
  }
  model: string
}

export function defaultMimoCredentialSettings(): MimoCredentialSettingsV1 {
  return normalizeMimoCredentialSettings()
}

export function normalizeMimoCredentialSettings(
  input?: Partial<MimoCredentialSettingsV1>
): MimoCredentialSettingsV1 {
  const mode = normalizeMimoCredentialMode(input?.mode)
  const region = normalizeMimoTokenplanRegion(input?.region)
  const fallbackBaseUrl = mode === 'tokenplan'
    ? MIMO_TOKENPLAN_REGION_BASE_URLS[region]
    : DEFAULT_MIMO_RECHARGE_BASE_URL
  const baseUrl = typeof input?.baseUrl === 'string' && input.baseUrl.trim()
    ? input.baseUrl.trim().replace(/\/+$/, '')
    : fallbackBaseUrl
  const model = typeof input?.model === 'string' && input.model.trim()
    ? input.model.trim()
    : DEFAULT_MIMO_MODEL
  const metadata = normalizeMimoCredentialMetadata(input?.metadata)
  return {
    mode,
    apiKey: typeof input?.apiKey === 'string' ? input.apiKey.trim() : '',
    baseUrl,
    region,
    model,
    metadata: {
      ...metadata,
      mode,
      region,
      base_url: baseUrl
    }
  }
}

export function isMimoTokenplanApiKey(value: string): boolean {
  return /^sk-[A-Za-z0-9_-]{8,}$/.test(value.trim())
}

export function mimoCredentialAuthContent(
  input?: Partial<MimoCredentialSettingsV1>
): MimoAuthContent {
  const credential = normalizeMimoCredentialSettings(input)
  return {
    bai: {
      type: 'api',
      key: credential.apiKey,
      metadata: credential.metadata
    }
  }
}

export function mimoCredentialProviderConfigPatch(
  input?: Partial<MimoCredentialSettingsV1>
): MimoProviderConfigPatch {
  const credential = normalizeMimoCredentialSettings(input)
  return {
    provider: {
      bai: {
        name: 'BAI',
        api: credential.baseUrl,
        options: {
          baseURL: credential.baseUrl,
          setCacheKey: true
        },
        models: {
          [credential.model]: { name: credential.model }
        }
      }
    },
    model: `bai/${credential.model}`
  }
}

function normalizeMimoCredentialMode(value: unknown): MimoCredentialMode {
  return MIMO_CREDENTIAL_MODES.includes(value as MimoCredentialMode)
    ? value as MimoCredentialMode
    : 'recharge'
}

function normalizeMimoTokenplanRegion(value: unknown): MimoTokenplanRegion {
  return MIMO_TOKENPLAN_REGIONS.includes(value as MimoTokenplanRegion)
    ? value as MimoTokenplanRegion
    : DEFAULT_MIMO_TOKENPLAN_REGION
}

function normalizeMimoCredentialMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const metadata: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value)) {
    const normalizedKey = key.trim()
    if (!normalizedKey || typeof raw !== 'string') continue
    metadata[normalizedKey] = raw.trim()
  }
  return metadata
}
