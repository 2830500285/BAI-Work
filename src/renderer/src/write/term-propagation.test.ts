import { describe, expect, it } from 'vitest'
import {
  buildWriteCanonicalTermPropagationChanges,
  buildWriteTermPropagationChanges
} from './term-propagation'

function applyChanges(
  content: string,
  changes: Array<{ from: number; to: number; insert: string }>
): string {
  let next = content
  for (const change of [...changes].sort((a, b) => b.from - a.from)) {
    next = `${next.slice(0, change.from)}${change.insert}${next.slice(change.to)}`
  }
  return next
}

describe('write term propagation', () => {
  it('propagates a case-only phrase replacement within the same paragraph', () => {
    const content = [
      'i build BAI Work, li is amazing ui production.',
      'mimo gui can write paper, also can code. mimo gui is use',
      'mimo api, but it not only that.',
      '',
      'mimo gui in another paragraph stays untouched.'
    ].join('\n')
    const seedFrom = content.indexOf('BAI Work')

    const changes = buildWriteTermPropagationChanges(content, {
      from: seedFrom,
      to: seedFrom + 'BAI Work'.length,
      deletedText: 'mimo gui',
      insertedText: 'BAI Work'
    })

    expect(changes).toHaveLength(2)
    expect(applyChanges(content, changes)).toBe([
      'i build BAI Work, li is amazing ui production.',
      'BAI Work can write paper, also can code. BAI Work is use',
      'mimo api, but it not only that.',
      '',
      'mimo gui in another paragraph stays untouched.'
    ].join('\n'))
  })

  it('propagates a term rename such as mimo gui to DXGUI', () => {
    const content = 'DXGUI is here. mimo gui is there. mimo gui again.'
    const changes = buildWriteTermPropagationChanges(content, {
      from: 0,
      to: 'DXGUI'.length,
      deletedText: 'mimo gui',
      insertedText: 'DXGUI'
    })

    expect(applyChanges(content, changes)).toBe('DXGUI is here. DXGUI is there. DXGUI again.')
  })

  it('does not replace partial word matches', () => {
    const content = 'BAI Work works. mymimo gui should not. mimo gui should.'
    const seedFrom = content.indexOf('BAI Work')

    const changes = buildWriteTermPropagationChanges(content, {
      from: seedFrom,
      to: seedFrom + 'BAI Work'.length,
      deletedText: 'mimo gui',
      insertedText: 'BAI Work'
    })

    expect(applyChanges(content, changes)).toBe(
      'BAI Work works. mymimo gui should not. BAI Work should.'
    )
  })

  it('propagates canonical casing after an incremental case edit', () => {
    const content = 'BAI Work works. bai work should follow. bai api should not.'
    const seedFrom = content.indexOf('BAI Work')

    const changes = buildWriteCanonicalTermPropagationChanges(content, {
      from: seedFrom + 1,
      to: seedFrom + 2,
      deletedText: 'a',
      insertedText: 'A'
    })

    expect(applyChanges(content, changes)).toBe(
      'BAI Work works. BAI Work should follow. bai api should not.'
    )
  })
})
