import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const EBAI_SOURCE_OWNER = 'affaan-m'
const EBAI_SOURCE_REPO = 'ECC'
const EBAI_SOURCE_REF = 'main'
const MAX_SOURCE_FILES = 3_000
const MAX_SOURCE_FILE_BYTES = 2 * 1024 * 1024
const MAX_SOURCE_TOTAL_BYTES = 96 * 1024 * 1024
const DOWNLOAD_CONCURRENCY = 8

type GithubTreeEntry = {
  path?: unknown
  type?: unknown
  size?: unknown
}

type GithubTreeResponse = {
  sha?: unknown
  truncated?: unknown
  tree?: unknown
}

export type EnsureEccSourceOptions = {
  cacheDir?: string
  fetchImpl?: typeof fetch
  force?: boolean
}

export function defaultEccCacheDir(): string {
  return join(homedir(), '.bai', 'cache', 'ebai', 'ecc')
}

export async function ensureEccSourceCache(
  options: EnsureEccSourceOptions = {}
): Promise<string> {
  const cacheDir = resolve(options.cacheDir ?? defaultEccCacheDir())
  const markerPath = join(cacheDir, '.ebai-source.json')
  if (!options.force && existsSync(markerPath)) {
    const marker = await readFile(markerPath, 'utf8').catch(() => '')
    if (marker.includes(`"repository": "${EBAI_SOURCE_OWNER}/${EBAI_SOURCE_REPO}"`)) {
      return cacheDir
    }
  }

  const fetchImpl = options.fetchImpl ?? fetch
  const treeUrl = `https://api.github.com/repos/${EBAI_SOURCE_OWNER}/${EBAI_SOURCE_REPO}/git/trees/${EBAI_SOURCE_REF}?recursive=1`
  const response = await fetchImpl(treeUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'BAI-Work-EBAI-Installer'
    }
  })
  if (!response.ok) {
    throw new Error(`Could not download the EBAI source index (HTTP ${response.status}).`)
  }
  const body = await response.json() as GithubTreeResponse
  if (body.truncated === true) {
    throw new Error('The EBAI source index was truncated by GitHub; installation was stopped.')
  }
  const entries = Array.isArray(body.tree) ? body.tree.filter(isSelectedSourceBlob) : []
  if (entries.length === 0) throw new Error('The EBAI source index did not contain installable files.')
  if (entries.length > MAX_SOURCE_FILES) {
    throw new Error(`The EBAI source contains too many files (${entries.length}).`)
  }
  const declaredTotal = entries.reduce((total, entry) => total + sourceEntrySize(entry), 0)
  if (declaredTotal > MAX_SOURCE_TOTAL_BYTES) {
    throw new Error('The EBAI source is larger than the BAI Work safety limit.')
  }

  const staging = join(dirname(cacheDir), `.ecc-download-${randomUUID()}`)
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })
  try {
    let downloadedBytes = 0
    await mapWithConcurrency(entries, DOWNLOAD_CONCURRENCY, async (entry) => {
      const path = sourceEntryPath(entry)
      const rawUrl = `https://raw.githubusercontent.com/${EBAI_SOURCE_OWNER}/${EBAI_SOURCE_REPO}/${EBAI_SOURCE_REF}/${path
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`
      const fileResponse = await fetchImpl(rawUrl, {
        headers: { 'User-Agent': 'BAI-Work-EBAI-Installer' }
      })
      if (!fileResponse.ok) {
        throw new Error(`Could not download EBAI file ${path} (HTTP ${fileResponse.status}).`)
      }
      const content = Buffer.from(await fileResponse.arrayBuffer())
      if (content.byteLength > MAX_SOURCE_FILE_BYTES) {
        throw new Error(`EBAI file exceeds the per-file safety limit: ${path}`)
      }
      downloadedBytes += content.byteLength
      if (downloadedBytes > MAX_SOURCE_TOTAL_BYTES) {
        throw new Error('The downloaded EBAI source exceeded the BAI Work safety limit.')
      }
      const destination = join(staging, ...safeRelativeSegments(path))
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, content)
    })
    await writeFile(
      join(staging, '.ebai-source.json'),
      JSON.stringify({
        repository: `${EBAI_SOURCE_OWNER}/${EBAI_SOURCE_REPO}`,
        ref: EBAI_SOURCE_REF,
        commit: typeof body.sha === 'string' ? body.sha : '',
        files: entries.length,
        downloadedAt: new Date().toISOString()
      }, null, 2),
      'utf8'
    )
    await mkdir(dirname(cacheDir), { recursive: true })
    await rm(cacheDir, { recursive: true, force: true })
    await rename(staging, cacheDir)
    return cacheDir
  } catch (error) {
    await rm(staging, { recursive: true, force: true })
    throw error
  }
}

function isSelectedSourceBlob(value: unknown): value is GithubTreeEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as GithubTreeEntry
  if (entry.type !== 'blob' || typeof entry.path !== 'string') return false
  if (!isSafeRelativePath(entry.path)) return false
  if (sourceEntrySize(entry) > MAX_SOURCE_FILE_BYTES) return false
  return isSelectedSourcePath(entry.path)
}

function isSelectedSourcePath(path: string): boolean {
  if (path === 'LICENSE' || path === 'LICENSE.md') return true
  return [
    'commands/',
    'agents/',
    'rules/',
    'hooks/',
    'scripts/',
    'skills/',
    '.agents/skills/',
    '.claude/agents/',
    '.claude/commands/',
    '.claude/skills/',
    '.codex/skills/',
    '.hermes/skills/',
    '.kiro/agents/',
    '.opencode/commands/',
    '.opencode/skills/'
  ].some((prefix) => path.startsWith(prefix))
}

function sourceEntryPath(entry: GithubTreeEntry): string {
  if (typeof entry.path !== 'string' || !isSafeRelativePath(entry.path)) {
    throw new Error('EBAI returned an unsafe file path.')
  }
  return entry.path
}

function sourceEntrySize(entry: GithubTreeEntry): number {
  return typeof entry.size === 'number' && Number.isFinite(entry.size) && entry.size > 0
    ? entry.size
    : 0
}

function isSafeRelativePath(path: string): boolean {
  if (!path || path.startsWith('/') || path.includes('\\')) return false
  return path.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
}

function safeRelativeSegments(path: string): string[] {
  if (!isSafeRelativePath(path)) throw new Error(`Unsafe EBAI source path: ${path}`)
  return path.split('/')
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let next = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next
      next += 1
      await worker(items[index])
    }
  })
  await Promise.all(runners)
}

export const eccSourceServiceTestInternals = {
  isSafeRelativePath,
  isSelectedSourcePath,
  safeRelativeSegments
}
