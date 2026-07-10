import { describe, expect, it } from 'vitest'
import {
  getActiveAgentApiKey,
  getKunRuntimeSettings,
  getModelProviderSettings,
  normalizeAppSettings,
  type AppSettingsV1
} from '@shared/app-settings'
import {
  buildInitialSetupSettings,
  INITIAL_SETUP_PROVIDER_PRESETS,
  initialSetupAutoWirePlan,
  initialSetupDrafts,
  initialSetupProfileId,
  initialSetupSelection
} from './initial-setup-save'

function settings(patch: Record<string, unknown> = {}): AppSettingsV1 {
  return normalizeAppSettings(patch as AppSettingsV1)
}

function settingsWithActiveBaiWithoutKey(): AppSettingsV1 {
  return settings({
    provider: {
      apiKey: 'sk-bai-key',
      baseUrl: 'https://api.b.ai/v1',
      providers: [
        { id: 'bai', name: 'BAI', baseUrl: 'https://api.b.ai/v1', models: ['claude-sonnet-4-6'] }
      ]
    },
    agents: { kun: { providerId: 'bai' } }
  })
}

describe('initialSetupSelection', () => {
  it('preselects the active BAI provider card', () => {
    expect(initialSetupSelection(settingsWithActiveBaiWithoutKey()))
      .toEqual({ presetId: 'bai', mode: 'api' })
  })

  it('falls back to BAI API mode for unknown or empty active providers', () => {
    expect(initialSetupSelection(settings())).toEqual({ presetId: 'bai', mode: 'api' })
    expect(initialSetupSelection(settings({ agents: { kun: { providerId: 'custom-provider-2' } } })))
      .toEqual({ presetId: 'bai', mode: 'api' })
    expect(initialSetupSelection(settings({ agents: { kun: { providerId: 'litellm' } } })))
      .toEqual({ presetId: 'bai', mode: 'api' })
  })
})

describe('initialSetupDrafts', () => {
  it('seeds drafts from saved BAI settings and preset defaults', () => {
    const drafts = initialSetupDrafts(settingsWithActiveBaiWithoutKey())
    expect(drafts.bai).toEqual({ apiKey: 'sk-bai-key', baseUrl: 'https://api.b.ai/v1' })
  })

  it('keeps non-BAI providers out of onboarding', () => {
    const excludedIds = [
      'litellm',
      'zhipu-coding-plan',
      'zai-coding-plan',
      'kimi-code',
      'moonshot-cn',
      'moonshot-global'
    ]
    const drafts = initialSetupDrafts(settings())

    expect(INITIAL_SETUP_PROVIDER_PRESETS.map((preset) => preset.id)).toEqual(['bai'])
    for (const id of excludedIds) {
      expect(drafts[id]).toBeUndefined()
      expect(initialSetupSelection(settings({ agents: { kun: { providerId: id } } })))
        .toEqual({ presetId: 'bai', mode: 'api' })
    }
  })
})

describe('buildInitialSetupSettings', () => {
  it('activates BAI so the boot gate sees the key the user typed', () => {
    const current = settings()
    const drafts = initialSetupDrafts(current)
    drafts.bai = { ...drafts.bai, apiKey: 'sk-bai-key' }
    const next = buildInitialSetupSettings(current, drafts, { presetId: 'bai', mode: 'api' })

    expect(getKunRuntimeSettings(next).providerId).toBe('bai')
    expect(getActiveAgentApiKey(next)).toBe('sk-bai-key')
  })

  it('syncs the BAI draft into the provider profile used by settings', () => {
    const current = settings({
      provider: {
        apiKey: 'sk-old',
        baseUrl: 'https://old.example/v1'
      },
      agents: { kun: { providerId: 'bai' } }
    })
    const drafts = initialSetupDrafts(current)
    drafts.bai = {
      apiKey: 'sk-new',
      baseUrl: 'https://new.example/v1'
    }

    const next = buildInitialSetupSettings(current, drafts, { presetId: 'bai', mode: 'api' })
    const provider = getModelProviderSettings(next)
    const bai = provider.providers.find((profile) => profile.id === 'bai')

    expect(provider.apiKey).toBe('sk-new')
    expect(provider.baseUrl).toBe('https://new.example/v1')
    expect(bai?.apiKey).toBe('sk-new')
    expect(bai?.baseUrl).toBe('https://new.example/v1')
  })

  it('does not auto-wire media providers when the BAI preset has no media capability', () => {
    const drafts = initialSetupDrafts(settings())
    drafts.bai = { ...drafts.bai, apiKey: 'sk-bai-key' }
    expect(initialSetupAutoWirePlan(settings(), drafts))
      .toEqual({ speechProviderId: '', imageProviderId: '' })
  })

  it('never overrides existing speech or image generation config while auto-wiring', () => {
    const configured = settings({ agents: { kun: { speechToText: { providerId: 'custom' } } } })
    const drafts = initialSetupDrafts(configured)
    drafts.bai = { ...drafts.bai, apiKey: 'sk-bai-key' }
    const next = buildInitialSetupSettings(configured, drafts, { presetId: 'bai', mode: 'api' })
    expect(getKunRuntimeSettings(next).speechToText.providerId).toBe('custom')

    const imageConfigured = settings({ agents: { kun: { imageGeneration: { providerId: 'custom-image' } } } })
    const imageDrafts = initialSetupDrafts(imageConfigured)
    imageDrafts.bai = { ...imageDrafts.bai, apiKey: 'sk-bai-key' }
    const nextImage = buildInitialSetupSettings(imageConfigured, imageDrafts, { presetId: 'bai', mode: 'api' })
    expect(getKunRuntimeSettings(nextImage).imageGeneration.providerId).toBe('custom-image')
  })

  it('selects the first BAI model when switching from a custom provider', () => {
    const current = settings({
      provider: { apiKey: 'sk-bai-key' },
      agents: { kun: { providerId: 'custom-provider-2', model: 'custom-model' } }
    })
    const next = buildInitialSetupSettings(current, initialSetupDrafts(current), {
      presetId: 'bai',
      mode: 'api'
    })
    expect(getKunRuntimeSettings(next).model).toBe('claude-sonnet-4-6')
  })

  it('preserves unrelated custom providers', () => {
    const current = settings({
      provider: {
        apiKey: 'sk-bai-key',
        providers: [
          { id: 'custom-provider-2', name: 'zenmux', apiKey: 'z-key', baseUrl: 'https://zenmux.ai/api' }
        ]
      }
    })
    const next = buildInitialSetupSettings(current, initialSetupDrafts(current), {
      presetId: 'bai',
      mode: 'api'
    })
    const zenmux = getModelProviderSettings(next).providers.find((p) => p.id === 'custom-provider-2')
    expect(zenmux?.apiKey).toBe('z-key')
  })
})

describe('initialSetupProfileId', () => {
  it('maps selection to profile ids', () => {
    expect(initialSetupProfileId({ presetId: 'bai', mode: 'api' })).toBe('bai')
    expect(initialSetupProfileId({ presetId: 'bai', mode: 'token-plan' })).toBe('bai')
  })
})
