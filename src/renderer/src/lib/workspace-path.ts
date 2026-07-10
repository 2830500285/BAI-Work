function normalizePathForMatch(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase()
}

function isBaiDefaultWorkspacePath(normalized: string): boolean {
  return (
    normalized === '~/.bai-work/default_workspace'
    || normalized.endsWith('/.bai-work/default_workspace')
    || normalized === '~/bai work/default_workspace'
    || normalized.endsWith('/bai work/default_workspace')
  )
}

function isLegacyMimoDefaultWorkspacePath(normalized: string): boolean {
  return (
    normalized === '~/.mimo-work/default_workspace'
    || normalized.endsWith('/.mimo-work/default_workspace')
    || normalized === '~/mimo work/default_workspace'
    || normalized.endsWith('/mimo work/default_workspace')
  )
}

function isDefaultWorkspacePath(normalized: string): boolean {
  return isBaiDefaultWorkspacePath(normalized) || isLegacyMimoDefaultWorkspacePath(normalized)
}

function isWriteWorkspacePath(normalized: string): boolean {
  return (
    normalized === '~/.bai-work/write_workspace'
    || normalized.endsWith('/.bai-work/write_workspace')
    || normalized === '~/bai work/write_workspace'
    || normalized.endsWith('/bai work/write_workspace')
    || normalized === '~/.mimo-work/write_workspace'
    || normalized.endsWith('/.mimo-work/write_workspace')
    || normalized === '~/mimo work/write_workspace'
    || normalized.endsWith('/mimo work/write_workspace')
  )
}

export function workspaceRootIdentityKey(path?: string): string {
  const trimmed = path?.trim() ?? ''
  if (!trimmed) return ''
  const normalized = normalizePathForMatch(trimmed)
  if (isDefaultWorkspacePath(normalized)) {
    return '~/bai work/default_workspace'
  }
  return normalized
}

export function isInternalTemporaryWorkspace(path?: string): boolean {
  const trimmed = path?.trim() ?? ''
  if (!trimmed) return false
  const normalized = normalizePathForMatch(trimmed)
  return (
    /\/bai-work-updates\/tmp(?:\/|$)/.test(normalized)
    || normalized === '/tmp'
    || normalized.startsWith('/tmp/')
    || normalized === '/private/tmp'
    || normalized.startsWith('/private/tmp/')
    || /^\/var\/folders\/[^/]+\/[^/]+\/t(?:\/|$)/.test(normalized)
    || /^\/private\/var\/folders\/[^/]+\/[^/]+\/t(?:\/|$)/.test(normalized)
    || /\/appdata\/local\/temp(?:\/|$)/.test(normalized)
  )
}

export function isClawWorkspacePath(path?: string): boolean {
  const trimmed = path?.trim() ?? ''
  if (!trimmed) return false
  const normalized = normalizePathForMatch(trimmed)
  return normalized.includes('/bai work/claw/') ||
    normalized.includes('/.bai-work/claw/') ||
    normalized.includes('/mimo work/claw/') ||
    normalized.includes('/.mimo-work/claw/')
}

export function isInternalMimoWorkWorkspace(path?: string): boolean {
  const trimmed = path?.trim() ?? ''
  if (!trimmed) return false
  const normalized = normalizePathForMatch(trimmed)
  return isDefaultWorkspacePath(normalized) || isWriteWorkspacePath(normalized)
}

export function isDefaultBaiWorkWorkspace(path?: string): boolean {
  const trimmed = path?.trim() ?? ''
  if (!trimmed) return false
  return isBaiDefaultWorkspacePath(normalizePathForMatch(trimmed))
}

export function normalizeWorkspaceRoot(path?: string): string {
  const trimmed = path?.trim() ?? ''
  if (!trimmed) return ''
  if (isInternalTemporaryWorkspace(trimmed)) return ''
  return trimmed
}
