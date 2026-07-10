import { describe, expect, it } from 'vitest'
import { writeInlineCompletionModelOptions } from './settings-section-write'

describe('write inline completion model options', () => {
  it('keeps the writing model list scoped to the inherited provider', () => {
    const options = writeInlineCompletionModelOptions([
      'claude-sonnet-4-6',
      'gpt-5.2',
      'claude-sonnet-4-6'
    ])

    expect(options).toEqual(['claude-sonnet-4-6', 'gpt-5.2'])
  })

  it('uses built-in defaults only when the provider has no models', () => {
    expect(writeInlineCompletionModelOptions([])).toEqual([
      'claude-sonnet-4-6',
      'gpt-5.2'
    ])
  })
})
