import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type i18next from 'i18next'
import type { ChatState, ChatStoreGet, ChatStoreSet } from './chat-store-types'
import {
  fallbackComposerModel,
  mergeComposerPickList,
  persistComposerModel,
  readStoredComposerModel
} from './chat-store-helpers'
import { createAppActions } from './chat-store-app-actions'

const COMPOSER_MODEL_STORAGE_KEY = 'baiWork.composerModel'
const COMPOSER_PROVIDER_STORAGE_KEY = 'baiWork.composerProviderId'

function createMemoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => {
      items.delete(key)
    },
    setItem: (key, value) => {
      items.set(key, value)
    }
  }
}

type FetchModelsResult =
  | {
    ok: true
    modelIds: string[]
    defaultModelId?: string
    defaultProviderId?: string
    modelGroups?: ChatState['composerModelGroups']
  }
  | { ok: false; message: string }

function buildHarness(fetchModelsResult: FetchModelsResult): {
  actions: ReturnType<typeof createAppActions>
  state: ChatState
} {
  let state = {
    composerModel: '',
    composerProviderId: '',
    composerPickList: mergeComposerPickList(false, []),
    composerModelGroups: []
  } as unknown as ChatState
  let loadPromise: Promise<void> | null = null
  const set: ChatStoreSet = (partial) => {
    const update = typeof partial === 'function' ? partial(state) : partial
    Object.assign(state, update)
  }
  const get: ChatStoreGet = () => state

  vi.stubGlobal('window', {
    kunGui: {
      fetchUpstreamModels: vi.fn(async () => fetchModelsResult),
      saveSettingsSilent: vi.fn(async () => state)
    }
  })

  return {
    state,
    actions: createAppActions({
      set,
      get,
      i18n: { t: (key: string) => key, changeLanguage: vi.fn(async () => undefined) } as unknown as typeof i18next,
      persistComposerModel,
      readStoredComposerModel,
      mergeComposerPickList,
      fallbackComposerModel,
      getComposerModelLoadPromise: () => loadPromise,
      setComposerModelLoadPromise: (promise) => {
        loadPromise = promise
      },
      applyTheme: () => undefined,
      applyUiFontScale: () => undefined,
      applyDocumentLocale: () => undefined,
      workspaceLabelFromPath: (workspaceRoot) => workspaceRoot,
      normalizeWorkspaceRoot: (workspaceRoot) => workspaceRoot?.trim() ?? ''
    })
  }
}

describe('chat-store app actions composer model loading', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores the previously selected custom model after the full model list loads', async () => {
    localStorage.setItem(COMPOSER_MODEL_STORAGE_KEY, 'bai-coder-custom')
    const { actions, state } = buildHarness({
      ok: true,
      modelIds: ['bai-coder-custom'],
      defaultModelId: 'claude-sonnet-4-6',
      modelGroups: [{
        providerId: 'bai',
        label: 'BAI',
        modelIds: ['bai-coder-custom']
      }]
    })

    await actions.loadComposerModels()

    expect(state.composerModel).toBe('bai-coder-custom')
    expect(state.composerProviderId).toBe('bai')
    expect(localStorage.getItem(COMPOSER_MODEL_STORAGE_KEY)).toBe('bai-coder-custom')
    expect(localStorage.getItem(COMPOSER_PROVIDER_STORAGE_KEY)).toBe('bai')
  })

  it('updates the composer provider when the picker supplies a provider id', () => {
    const { actions, state } = buildHarness({
      ok: true,
      modelIds: ['bai-coder-custom'],
      defaultModelId: 'claude-sonnet-4-6',
      modelGroups: [{
        providerId: 'bai',
        label: 'BAI',
        modelIds: ['bai-coder-custom']
      }]
    })
    state.composerModelGroups = [{
      providerId: 'bai',
      label: 'BAI',
      modelIds: ['bai-coder-custom']
    }]

    actions.setComposerModel('bai-coder-custom', 'bai')

    expect(state.composerModel).toBe('bai-coder-custom')
    expect(state.composerProviderId).toBe('bai')
    expect(localStorage.getItem(COMPOSER_PROVIDER_STORAGE_KEY)).toBe('bai')
    expect(window.kunGui.saveSettingsSilent).toHaveBeenCalledWith({
      agents: { kun: { model: 'bai-coder-custom', providerId: 'bai' } }
    })
  })

  it('follows the runtime default provider from settings instead of an older composer cache', async () => {
    localStorage.setItem(COMPOSER_MODEL_STORAGE_KEY, 'claude-sonnet-4-6')
    localStorage.setItem(COMPOSER_PROVIDER_STORAGE_KEY, 'bai')
    const { actions, state } = buildHarness({
      ok: true,
      modelIds: ['claude-sonnet-4-6', 'due/default'],
      defaultModelId: 'due/default',
      defaultProviderId: 'custom-provider-2',
      modelGroups: [
        {
          providerId: 'bai',
          label: 'BAI',
          modelIds: ['claude-sonnet-4-6']
        },
        {
          providerId: 'custom-provider-2',
          label: '自定义供应商 2',
          modelIds: ['due/default']
        }
      ]
    })
    state.composerModel = 'claude-sonnet-4-6'
    state.composerProviderId = 'bai'

    await actions.loadComposerModels()

    expect(state.composerModel).toBe('due/default')
    expect(state.composerProviderId).toBe('custom-provider-2')
    expect(localStorage.getItem(COMPOSER_MODEL_STORAGE_KEY)).toBe('due/default')
    expect(localStorage.getItem(COMPOSER_PROVIDER_STORAGE_KEY)).toBe('custom-provider-2')
  })

  it('does not overwrite a stored custom model when only fallback models are available', async () => {
    localStorage.setItem(COMPOSER_MODEL_STORAGE_KEY, 'bai-coder-custom')
    const { actions, state } = buildHarness({
      ok: false,
      message: 'upstream unavailable'
    })

    await actions.loadComposerModels()

    expect(state.composerModel).toBe('claude-sonnet-4-6')
    expect(localStorage.getItem(COMPOSER_MODEL_STORAGE_KEY)).toBe('bai-coder-custom')
  })
})
