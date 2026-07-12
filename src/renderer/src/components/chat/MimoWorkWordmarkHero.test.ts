import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MimoWorkMiniMark, MimoWorkSvgWordmark } from './MimoWorkWordmarkHero'

describe('BAI Work wordmark', () => {
  it('renders the supplied complete wordmark and matching compact mark as images', () => {
    const wordmark = renderToStaticMarkup(createElement(MimoWorkSvgWordmark))
    const compact = renderToStaticMarkup(createElement(MimoWorkMiniMark))

    expect(wordmark).toContain('aria-label="BAI Work"')
    expect(wordmark).toContain('ds-bai-work-wordmark')
    expect(compact).toContain('ds-bai-work-mini-image')
    expect(wordmark).not.toContain('ds-bai-brand-dot')
    expect(compact).not.toContain('ds-bai-brand-dot')
  })
})
