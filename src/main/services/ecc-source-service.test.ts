import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ensureEccSourceCache } from './ecc-source-service'

const roots: string[] = []

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'bai-work-ebai-source-'))
  roots.push(root)
  return root
}

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) await rm(root, { recursive: true, force: true })
  }
})

describe('EBAI source cache', () => {
  it('downloads only selected safe source files and reuses the verified cache', async () => {
    const root = await temporaryRoot()
    const cacheDir = join(root, 'cache')
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input)
      if (url.includes('/git/trees/')) {
        return new Response(JSON.stringify({
          sha: 'commit-123',
          truncated: false,
          tree: [
            { path: 'commands/plan.md', type: 'blob', size: 12 },
            { path: 'skills/review/SKILL.md', type: 'blob', size: 20 },
            { path: 'docs/private.md', type: 'blob', size: 20 },
            { path: '../escape.md', type: 'blob', size: 5 }
          ]
        }), { status: 200 })
      }
      if (url.endsWith('/commands/plan.md')) return new Response('# Plan', { status: 200 })
      if (url.endsWith('/skills/review/SKILL.md')) return new Response('# Review', { status: 200 })
      return new Response('not found', { status: 404 })
    }) as typeof fetch

    await expect(ensureEccSourceCache({ cacheDir, fetchImpl: fetchMock })).resolves.toBe(cacheDir)
    await expect(readFile(join(cacheDir, 'commands', 'plan.md'), 'utf8')).resolves.toBe('# Plan')
    await expect(readFile(join(cacheDir, 'skills', 'review', 'SKILL.md'), 'utf8')).resolves.toBe('# Review')
    await expect(access(join(cacheDir, 'docs', 'private.md'))).rejects.toThrow()
    await expect(readFile(join(cacheDir, '.ebai-source.json'), 'utf8')).resolves.toContain('commit-123')

    const callsAfterDownload = (fetchMock as ReturnType<typeof vi.fn>).mock.calls.length
    await expect(ensureEccSourceCache({ cacheDir, fetchImpl: fetchMock })).resolves.toBe(cacheDir)
    expect((fetchMock as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(callsAfterDownload)
  })

  it('rejects a truncated GitHub source index', async () => {
    const root = await temporaryRoot()
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      sha: 'commit-123',
      truncated: true,
      tree: []
    }), { status: 200 })) as typeof fetch

    await expect(ensureEccSourceCache({
      cacheDir: join(root, 'cache'),
      fetchImpl: fetchMock
    })).rejects.toThrow('truncated')
  })
})
