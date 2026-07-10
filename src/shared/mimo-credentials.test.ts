import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MIMO_RECHARGE_BASE_URL,
  DEFAULT_MIMO_TOKENPLAN_REGION,
  DEFAULT_MIMO_MODEL,
  MIMO_TOKENPLAN_REGION_BASE_URLS,
  defaultMimoCredentialSettings,
  isMimoTokenplanApiKey,
  mimoCredentialAuthContent,
  mimoCredentialProviderConfigPatch,
  normalizeMimoCredentialSettings
} from './mimo-credentials'

describe('BAI credential settings', () => {
  it('defaults to the BAI OpenAI-compatible API without a stored key', () => {
    expect(defaultMimoCredentialSettings()).toMatchObject({
      mode: 'recharge',
      apiKey: '',
      region: DEFAULT_MIMO_TOKENPLAN_REGION,
      baseUrl: DEFAULT_MIMO_RECHARGE_BASE_URL,
      model: DEFAULT_MIMO_MODEL,
      metadata: {
        mode: 'recharge',
        region: 'cn',
        base_url: DEFAULT_MIMO_RECHARGE_BASE_URL
      }
    })
  })

  it('normalizes recharge mode to the recharge endpoint', () => {
    expect(normalizeMimoCredentialSettings({ mode: 'recharge', baseUrl: '' })).toMatchObject({
      mode: 'recharge',
      region: 'cn',
      baseUrl: DEFAULT_MIMO_RECHARGE_BASE_URL,
      metadata: {
        mode: 'recharge',
        base_url: DEFAULT_MIMO_RECHARGE_BASE_URL
      }
    })
  })

  it('maps legacy region modes to the BAI API endpoint when no custom base URL is set', () => {
    expect(normalizeMimoCredentialSettings({ mode: 'tokenplan', region: 'ams' }).baseUrl).toBe(
      MIMO_TOKENPLAN_REGION_BASE_URLS.ams
    )
  })

  it('detects BAI API key shape without exposing a real key', () => {
    expect(isMimoTokenplanApiKey('sk-123456789012345678901234')).toBe(true)
    expect(isMimoTokenplanApiKey('tp-123456789012345678901234')).toBe(false)
  })

  it('builds BAI auth content and provider config from normalized settings', () => {
    const credential = {
      mode: 'recharge' as const,
      apiKey: 'sk-test-key-for-unit-tests',
      region: 'sgp' as const,
      model: 'claude-sonnet-4-6'
    }
    expect(mimoCredentialAuthContent(credential)).toEqual({
      bai: {
        type: 'api',
        key: credential.apiKey,
        metadata: {
          mode: 'recharge',
          region: 'sgp',
          base_url: DEFAULT_MIMO_RECHARGE_BASE_URL
        }
      }
    })
    expect(mimoCredentialProviderConfigPatch(credential)).toMatchObject({
      provider: {
        bai: {
          name: 'BAI',
          api: DEFAULT_MIMO_RECHARGE_BASE_URL,
          options: {
            baseURL: DEFAULT_MIMO_RECHARGE_BASE_URL,
            setCacheKey: true
          }
        }
      },
      model: 'bai/claude-sonnet-4-6'
    })
  })
})
