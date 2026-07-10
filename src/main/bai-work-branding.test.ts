import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

const releaseTextRoots = [
  'package.json',
  'electron-builder.config.cjs',
  'README.md',
  'README.en.md',
  'docs',
  'examples',
  'src/main',
  'src/renderer',
  'src/shared',
  'resources/skills',
  'scripts'
]

const textExtensions = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.plist',
  '.ps1',
  '.sh',
  '.ts',
  '.tsx',
  '.yml',
  '.yaml'
])

const blockedUserFacingPhrases = [
  ['MI', 'MO Work'].join(''),
  ['Mi', 'Mo-Code'].join(''),
  ['Mi', 'Mo Code'].join(''),
  ['Xiao', 'mi Mi', 'Mo'].join(''),
  ['token-plan-cn.', 'xiao', 'mi', 'mi', 'mo.com'].join('')
]

function collectReleaseTextFiles(relativePath: string): string[] {
  const absolutePath = join(projectRoot, relativePath)
  if (!existsSync(absolutePath)) return []
  if (statSync(absolutePath).isFile()) return shouldScanFile(relativePath) ? [relativePath] : []

  return readdirSync(absolutePath).flatMap((entry) => {
    const child = join(relativePath, entry)
    const absoluteChild = join(projectRoot, child)
    if (statSync(absoluteChild).isDirectory()) return collectReleaseTextFiles(child)
    return shouldScanFile(child) ? [child] : []
  })
}

function shouldScanFile(relativePath: string): boolean {
  if (relativePath.startsWith('docs/bai-work/')) return false
  if (relativePath.includes('.test.')) return false
  const extension = relativePath.match(/\.[^.]+$/)?.[0] ?? ''
  return textExtensions.has(extension)
}

describe('BAI Work branding', () => {
  it('uses BAI Work package, app, artifact, and HTML title metadata', () => {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
    const builderConfig = require(join(projectRoot, 'electron-builder.config.cjs'))
    const html = readFileSync(join(projectRoot, 'src/renderer/index.html'), 'utf8')

    expect(packageJson.name).toBe('bai-work')
    expect(packageJson.productName).toBe('BAI Work')
    expect(builderConfig.productName).toBe('BAI Work')
    expect(builderConfig.appId).toBe('ai.b.work.desktop')
    expect(builderConfig.artifactName).toContain('BAI-Work-')
    expect(html).toContain('<title>BAI Work</title>')
  })

  it('keeps generated BAI icon assets in place for app, mac, tray, and Windows packaging', () => {
    for (const relativePath of [
      'src/asset/img/bai-work-source.png',
      'src/asset/img/bai-work.png',
      'src/asset/img/bai-work-mac.png',
      'src/asset/img/bai-work-tray.png',
      'build/icon.ico'
    ]) {
      expect(existsSync(join(projectRoot, relativePath)), relativePath).toBe(true)
    }
  })

  it('does not ship old runtime or provider user-facing phrases in release text files', () => {
    const violations = releaseTextRoots
      .flatMap(collectReleaseTextFiles)
      .flatMap((relativePath) => {
        const text = readFileSync(join(projectRoot, relativePath), 'utf8')
        return blockedUserFacingPhrases
          .filter((phrase) => text.includes(phrase))
          .map((phrase) => `${relativePath}: ${phrase}`)
      })

    expect(violations).toEqual([])
  })
})
