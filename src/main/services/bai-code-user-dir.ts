import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { expandHomePath } from './workspace-service'

export function resolveBaiCodeUserDir(input?: string): string {
  const value = input?.trim()
  return resolve(value ? expandHomePath(value) : join(homedir(), '.bai'))
}

export function resolveBaiCodeCommandsDir(input?: string): string {
  return join(resolveBaiCodeUserDir(input), 'commands')
}

export function resolveBaiCodeSkillsDir(input?: string): string {
  return join(resolveBaiCodeUserDir(input), 'skills')
}

export function resolveBaiCodeEbaiHooksDir(input?: string): string {
  return join(resolveBaiCodeUserDir(input), 'ebai', 'hooks')
}
