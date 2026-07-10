import { existsSync } from 'node:fs'
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  readlink,
  rm,
  writeFile
} from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import type {
  EccComponentInstallSummary,
  EccInstallRequest,
  EccInstallResult
} from '../../shared/kun-gui-api'
import { expandHomePath } from './workspace-service'
import {
  resolveBaiCodeCommandsDir,
  resolveBaiCodeEbaiHooksDir,
  resolveBaiCodeSkillsDir,
  resolveBaiCodeUserDir
} from './bai-code-user-dir'
import { defaultEccCacheDir, ensureEccSourceCache } from './ecc-source-service'

const ECC_REPO_URL = 'https://github.com/affaan-m/ECC'
const EBAI_DISPLAY_NAME = 'EBAI'
const INSTALLED_FROM_MARKER = '.installed-from'

type FileComponent = {
  name: string
  path: string
  component: string
}

type DirectoryComponent = FileComponent & {
  entryPath: string
}

type InstallOptions = {
  force: boolean
  dryRun: boolean
  limit?: number
}

type RulesInstallOptions = {
  force: boolean
  dryRun: boolean
  includeAll: boolean
}

type HooksInstallOptions = {
  force: boolean
  dryRun: boolean
  workspaceHooks?: string
}

type BaiHookDef = {
  event: string
  name: string
  command: string
  condition?: { type: 'tool_name'; name: string } | { type: 'tool_category'; category: string }
  timeoutSecs: number
  background: boolean
}

type EccHooksFile = {
  hooks?: Record<string, unknown>
}

export function defaultEccSourceDir(): string {
  const env = process.env.BAI_WORK_ECC_SOURCE_DIR?.trim()
  if (env) return resolve(expandHomePath(env))
  return defaultEccCacheDir()
}

export function resolveEccInstallTargets(input: Pick<EccInstallRequest, 'baiHome' | 'workspace'>): {
  baiHome: string
  commandsDir: string
  skillsDir: string
  rulesSkillDir: string
  hooksDir: string
  hooksManifestPath: string
  workspaceHooksPath?: string
} {
  const baiHome = resolveBaiCodeUserDir(input.baiHome)
  const commandsDir = resolveBaiCodeCommandsDir(baiHome)
  const skillsDir = resolveBaiCodeSkillsDir(baiHome)
  const rulesSkillDir = join(skillsDir, 'ebai-rules')
  const hooksDir = resolveBaiCodeEbaiHooksDir(baiHome)
  const workspace = input.workspace?.trim()
  return {
    baiHome,
    commandsDir,
    skillsDir,
    rulesSkillDir,
    hooksDir,
    hooksManifestPath: join(hooksDir, 'hooks.toml'),
    ...(workspace ? { workspaceHooksPath: join(resolve(expandHomePath(workspace)), '.bai', 'hooks.toml') } : {})
  }
}

export async function installEccMappings(input: EccInstallRequest = {}): Promise<EccInstallResult> {
  try {
    if (input.enableHooks && !input.workspace?.trim()) {
      throw new Error('EBAI hooks require a trusted workspace. Enable hooks with a workspace path.')
    }
    if (!input.enableHooks && input.workspace?.trim()) {
      throw new Error('Workspace is only valid when EBAI hooks are explicitly enabled.')
    }

    const explicitSource = input.source?.trim()
    const source = explicitSource
      ? resolve(expandHomePath(explicitSource))
      : await ensureEccSourceCache()
    if (!existsSync(source)) throw new Error(`EBAI source directory was not found: ${source}`)

    const targets = resolveEccInstallTargets({
      baiHome: input.baiHome,
      workspace: input.enableHooks ? input.workspace : undefined
    })
    const options: InstallOptions = {
      force: input.force ?? false,
      dryRun: input.dryRun ?? false
    }
    const commands = await installCommandsFromSource(source, targets.commandsDir, options)
    const agents = await installAgentsFromSource(source, targets.commandsDir, options)
    const skills = await installSkillsFromSource(source, targets.skillsDir, options)
    const rules = await installRulesFromSource(source, targets.rulesSkillDir, {
      force: options.force,
      dryRun: options.dryRun,
      includeAll: input.includeAllRules ?? false
    })
    const hooks = await installHooksFromSource(source, targets.hooksDir, {
      force: options.force,
      dryRun: options.dryRun,
      ...(input.enableHooks ? { workspaceHooks: targets.workspaceHooksPath } : {})
    })

    return {
      ok: true,
      source,
      baiHome: targets.baiHome,
      commandsDir: targets.commandsDir,
      skillsDir: targets.skillsDir,
      rulesSkillDir: targets.rulesSkillDir,
      hooksManifestPath: targets.hooksManifestPath,
      ...(targets.workspaceHooksPath ? { workspaceHooksPath: targets.workspaceHooksPath } : {}),
      commands,
      agents,
      skills,
      rules,
      hooks
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

async function installCommandsFromSource(
  source: string,
  target: string,
  options: InstallOptions
): Promise<EccComponentInstallSummary> {
  const components = await discoverMarkdownComponents(source, [
    'commands',
    '.opencode/commands',
    '.claude/commands'
  ])
  const selected = limitComponents(components, options.limit)
  return installMarkdownFiles(selected, target, { ...options, available: components.length })
}

async function installAgentsFromSource(
  source: string,
  target: string,
  options: InstallOptions
): Promise<EccComponentInstallSummary> {
  const components = await discoverMarkdownComponents(source, [
    'agents',
    '.kiro/agents',
    '.claude/agents'
  ])
  const agents = limitComponents(components, options.limit)
  const summary = newSummary(components.length, agents.length, options.dryRun)
  if (!options.dryRun) await mkdir(target, { recursive: true })

  for (const agent of agents) {
    const dest = join(target, `ebai-agent-${agent.name}.md`)
    const shouldWrite = await applyInstallCounts(dest, options, summary)
    if (!shouldWrite) continue
    const raw = await readFile(agent.path, 'utf8')
    await writeFile(dest, renderAgentCommand(agent, raw), 'utf8')
    await writeComponentMarker(target, `ebai-agent-${agent.name}`, agent.component)
  }

  return summary
}

async function installSkillsFromSource(
  source: string,
  target: string,
  options: InstallOptions
): Promise<EccComponentInstallSummary> {
  const components = await discoverSkillComponents(source, [
    'skills',
    '.agents/skills',
    '.claude/skills',
    '.codex/skills',
    '.hermes/skills',
    '.opencode/skills'
  ])
  const selected = limitComponents(components, options.limit)
  const summary = newSummary(components.length, selected.length, options.dryRun)
  if (!options.dryRun) await mkdir(target, { recursive: true })

  for (const component of selected) {
    const dest = join(target, component.name)
    const shouldWrite = await applyInstallCounts(dest, options, summary)
    if (!shouldWrite) continue
    await rm(dest, { recursive: true, force: true })
    await copyDirectoryRecursive(component.path, dest)
    await writeFile(
      join(dest, INSTALLED_FROM_MARKER),
      `source = "${ECC_REPO_URL}"\ncomponent = "${component.component}"\ninstalled_by = "BAI Work ${EBAI_DISPLAY_NAME} installer"\n`,
      'utf8'
    )
  }
  return summary
}

async function installRulesFromSource(
  source: string,
  target: string,
  options: RulesInstallOptions
): Promise<EccComponentInstallSummary> {
  const rulesRoot = join(source, 'rules')
  if (!existsSync(rulesRoot)) return newSummary(0, 0, options.dryRun)
  const copyRoot = options.includeAll ? rulesRoot : join(rulesRoot, 'common')
  const ruleFiles = await collectFilesWithExtensions(copyRoot, ['.md'])
  const summary = newSummary(ruleFiles.length, ruleFiles.length > 0 ? 1 : 0, options.dryRun)
  if (ruleFiles.length === 0) return summary
  const shouldWrite = await applyInstallCounts(target, {
    force: options.force,
    dryRun: options.dryRun
  }, summary)
  if (!shouldWrite) return summary

  await rm(target, { recursive: true, force: true })
  await mkdir(join(target, 'rules'), { recursive: true })
  await copyDirectoryRecursive(copyRoot, join(target, 'rules'))
  await writeFile(join(target, 'SKILL.md'), renderRulesSkill(options.includeAll), 'utf8')
  await writeFile(
    join(target, INSTALLED_FROM_MARKER),
    `source = "${ECC_REPO_URL}"\ncomponent = "rules"\ninstalled_by = "BAI Work ${EBAI_DISPLAY_NAME} installer"\n`,
    'utf8'
  )
  return summary
}

async function installHooksFromSource(
  source: string,
  target: string,
  options: HooksInstallOptions
): Promise<EccComponentInstallSummary> {
  const hooksJson = join(source, 'hooks', 'hooks.json')
  if (!existsSync(hooksJson)) return newSummary(0, 0, options.dryRun)

  const raw = await readFile(hooksJson, 'utf8')
  const value = JSON.parse(raw) as EccHooksFile
  const hooks = convertEccHooksToBai(source, value)
  const available = countEccHookEntries(value)
  const summary = newSummary(available, hooks.length, options.dryRun)
  summary.unsupported = Math.max(0, available - hooks.length)

  const manifestPath = join(target, 'hooks.toml')
  const shouldWriteManifest = await applyInstallCounts(manifestPath, {
    force: options.force,
    dryRun: options.dryRun
  }, summary)

  if (!options.dryRun) {
    await mkdir(target, { recursive: true })
    if (shouldWriteManifest) {
      await writeFile(manifestPath, renderBaiHooksToml(hooks, false), 'utf8')
    }
    await writeFile(join(target, 'hooks.raw.json'), raw, 'utf8')
    await writeFile(
      join(target, 'README.md'),
      [
        '# EBAI Hooks for BAI',
        '',
        '`hooks.toml` is generated from EBAI hooks with `enabled = false` by default.',
        'Enable hooks only for a trusted workspace through BAI Work or with `--enable-hooks --workspace <dir>`.'
      ].join('\n'),
      'utf8'
    )
    await writeComponentMarker(target, 'hooks', 'hooks/hooks.json')
  }

  if (options.workspaceHooks) {
    const shouldWriteWorkspace = !existsSync(options.workspaceHooks) || options.force
    if (existsSync(options.workspaceHooks) && !options.force) summary.skipped += 1
    if (shouldWriteWorkspace && !options.dryRun) {
      await mkdir(dirname(options.workspaceHooks), { recursive: true })
      await writeFile(options.workspaceHooks, renderBaiHooksToml(hooks, true), 'utf8')
    }
  }

  return summary
}

async function installMarkdownFiles(
  components: FileComponent[],
  target: string,
  options: InstallOptions & { available: number }
): Promise<EccComponentInstallSummary> {
  const summary = newSummary(options.available, components.length, options.dryRun)
  if (!options.dryRun) await mkdir(target, { recursive: true })

  for (const component of components) {
    const dest = join(target, `${component.name}.md`)
    const shouldWrite = await applyInstallCounts(dest, options, summary)
    if (!shouldWrite) continue
    await copyFile(component.path, dest)
    await writeComponentMarker(target, component.name, component.component)
  }
  return summary
}

async function applyInstallCounts(
  dest: string,
  options: Pick<InstallOptions, 'force' | 'dryRun'>,
  summary: EccComponentInstallSummary
): Promise<boolean> {
  if (existsSync(dest)) {
    if (!options.force) {
      summary.skipped += 1
      return false
    }
    summary.overwritten += 1
  } else {
    summary.installed += 1
  }
  return !options.dryRun
}

function newSummary(
  available: number,
  selected: number,
  dryRun: boolean
): EccComponentInstallSummary {
  return {
    available,
    selected,
    installed: 0,
    overwritten: 0,
    skipped: 0,
    unsupported: 0,
    dryRun
  }
}

function limitComponents<T>(components: T[], limit: number | undefined): T[] {
  return typeof limit === 'number' ? components.slice(0, limit) : components
}

async function discoverMarkdownComponents(
  source: string,
  candidateRoots: string[]
): Promise<FileComponent[]> {
  const seen = new Set<string>()
  const out: FileComponent[] = []
  for (const root of candidateRoots) {
    const dir = join(source, root)
    const components = await directMarkdownFiles(source, dir)
    for (const component of components) {
      if (seen.has(component.name)) continue
      seen.add(component.name)
      out.push(component)
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

async function directMarkdownFiles(source: string, root: string): Promise<FileComponent[]> {
  if (!existsSync(root)) return []
  const entries = await readdir(root, { withFileTypes: true })
  const out: FileComponent[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const path = join(root, entry.name)
    if (extname(path) !== '.md') continue
    const name = sanitizeName(basename(path, '.md')).toLowerCase()
    if (!name) continue
    out.push({
      name,
      path,
      component: componentPath(source, path)
    })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

async function discoverSkillComponents(
  source: string,
  candidateRoots: string[]
): Promise<DirectoryComponent[]> {
  const seen = new Set<string>()
  const out: DirectoryComponent[] = []
  for (const root of candidateRoots) {
    const dir = join(source, root)
    if (!existsSync(dir)) continue
    const entryPaths = await collectSkillEntryPaths(dir)
    for (const entryPath of entryPaths) {
      const raw = await readFile(entryPath, 'utf8')
      const packageDir = dirname(entryPath)
      const name = sanitizeName(frontmatterField(raw, 'name') || basename(packageDir)).toLowerCase()
      if (!name || seen.has(name)) continue
      seen.add(name)
      out.push({
        name,
        path: packageDir,
        entryPath,
        component: componentPath(source, packageDir)
      })
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

async function collectSkillEntryPaths(root: string, depth = 0): Promise<string[]> {
  if (depth > 5 || !existsSync(root)) return []
  const direct = join(root, 'SKILL.md')
  if (existsSync(direct)) return [direct]
  const entries = await readdir(root, { withFileTypes: true })
  const nested = await Promise.all(entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'node_modules')
    .map((entry) => collectSkillEntryPaths(join(root, entry.name), depth + 1)))
  return nested.flat()
}

function renderAgentCommand(agent: FileComponent, raw: string): string {
  const description = frontmatterField(raw, 'description') ?? `Run the EBAI ${agent.name} agent`
  const body = stripFrontmatter(raw).trim()
  return [
    '---',
    `description: EBAI agent: ${description}`,
    'argument-hint: <task>',
    '---',
    '',
    `# EBAI Agent: ${agent.name}`,
    '',
    `Installed B.AI command: /ebai-agent-${agent.name}`,
    '',
    'Use this EBAI agent specification to handle the user task. Prefer a focused BAI agent or subagent when available; otherwise follow the role instructions directly in this conversation.',
    '',
    '## User Task',
    '',
    '$ARGUMENTS',
    '',
    '## Agent Specification',
    '',
    '```markdown',
    body,
    '```',
    ''
  ].join('\n')
}

function renderRulesSkill(includeAll: boolean): string {
  const scope = includeAll ? 'common and language-specific' : 'common'
  return [
    '---',
    'name: ebai-rules',
    `description: Use this skill for coding, planning, implementation, testing, review, and repository work. Applies EBAI ${scope} rules inside BAI.`,
    'metadata:',
    '  origin: EBAI',
    '---',
    '',
    '# EBAI Rules for BAI',
    '',
    'Use these rules as BAI-native guidance when doing software work. Read only the relevant files under `rules/` before applying them.',
    '',
    '## How to Use',
    '',
    '1. Start with `rules/README.md` if present.',
    '2. Apply common rules for general software tasks.',
    '3. If language-specific directories are installed, read only the directory relevant to the current project.',
    "4. Treat rules as guidance below the user's current request and project instructions.",
    '',
    '## Installed Scope',
    '',
    `EBAI ${scope} rules are bundled next to this \`SKILL.md\` under \`rules/\`.`,
    ''
  ].join('\n')
}

function convertEccHooksToBai(source: string, value: EccHooksFile): BaiHookDef[] {
  const hooksObj = isRecord(value.hooks) ? value.hooks : {}
  const out: BaiHookDef[] = []
  for (const [eventName, entriesValue] of Object.entries(hooksObj)) {
    const event = mapEccHookEvent(eventName)
    if (!event || !Array.isArray(entriesValue)) continue
    for (const entryValue of entriesValue) {
      if (!isRecord(entryValue)) continue
      const matcher = typeof entryValue.matcher === 'string' ? entryValue.matcher : '*'
      const condition = mapEccMatcher(matcher)
      const id = stringValue(entryValue.id) || stringValue(entryValue.description) || eventName
      if (!Array.isArray(entryValue.hooks)) continue
      entryValue.hooks.forEach((hookValue, index) => {
        if (!isRecord(hookValue)) return
        const command = stringValue(hookValue.command)
        if (!command) return
        out.push({
          event,
          name: sanitizeName(`${id}-${index}`),
          command: rewriteEccHookCommand(source, command),
          ...(condition ? { condition } : {}),
          timeoutSecs: numberValue(hookValue.timeout) ?? numberValue(hookValue.timeout_secs) ?? 30,
          background: booleanValue(hookValue.async) ?? booleanValue(hookValue.background) ?? false
        })
      })
    }
  }
  return out
}

function renderBaiHooksToml(hooks: BaiHookDef[], enabled: boolean): string {
  const out: string[] = [
    '# Generated by BAI Work from EBAI.',
    '# Review before enabling. EBAI hooks execute local shell commands.',
    `enabled = ${enabled}`,
    ''
  ]
  for (const hook of hooks) {
    out.push(
      '[[hooks]]',
      `event = "${tomlEscape(hook.event)}"`,
      `name = "${tomlEscape(hook.name)}"`,
      `command = "${tomlEscape(hook.command)}"`,
      `timeout_secs = ${hook.timeoutSecs}`,
      `background = ${hook.background}`,
      'continue_on_error = true'
    )
    if (hook.condition?.type === 'tool_name') {
      out.push('[hooks.condition]', 'type = "tool_name"', `name = "${tomlEscape(hook.condition.name)}"`)
    } else if (hook.condition?.type === 'tool_category') {
      out.push('[hooks.condition]', 'type = "tool_category"', `category = "${tomlEscape(hook.condition.category)}"`)
    }
    out.push('')
  }
  return out.join('\n')
}

function countEccHookEntries(value: EccHooksFile): number {
  const hooksObj = isRecord(value.hooks) ? value.hooks : {}
  let count = 0
  for (const entriesValue of Object.values(hooksObj)) {
    if (!Array.isArray(entriesValue)) continue
    for (const entryValue of entriesValue) {
      if (isRecord(entryValue) && Array.isArray(entryValue.hooks)) {
        count += entryValue.hooks.length
      }
    }
  }
  return count
}

function mapEccHookEvent(event: string): string | null {
  switch (event) {
    case 'PreToolUse':
      return 'tool_call_before'
    case 'PostToolUse':
      return 'tool_call_after'
    case 'SessionStart':
      return 'session_start'
    case 'SessionEnd':
      return 'session_end'
    case 'Stop':
      return 'turn_end'
    case 'UserPromptSubmit':
      return 'message_submit'
    default:
      return null
  }
}

function mapEccMatcher(
  matcher: string
): BaiHookDef['condition'] | undefined {
  const normalized = matcher.trim()
  if (!normalized || normalized === '*') return undefined
  if (normalized === 'Bash') return { type: 'tool_name', name: 'exec_shell' }
  const editParts = normalized.split('|').map((part) => part.trim()).filter(Boolean)
  if (editParts.length > 0 && editParts.every((part) => ['Edit', 'Write', 'MultiEdit'].includes(part))) {
    return { type: 'tool_category', category: 'file_write' }
  }
  return undefined
}

function rewriteEccHookCommand(source: string, command: string): string {
  return `cd ${shellQuotePath(source)} && CLAUDE_PLUGIN_ROOT=${shellQuotePath(source)} ECC_PLUGIN_ROOT=${shellQuotePath(source)} ${command}`
}

function frontmatterField(content: string, field: string): string | undefined {
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('---')) return undefined
  const rest = trimmed.slice(3)
  const end = rest.indexOf('---')
  if (end < 0) return undefined
  const frontmatter = rest.slice(0, end)
  for (const line of frontmatter.split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const key = line.slice(0, separator).trim()
    if (key.toLowerCase() !== field.toLowerCase()) continue
    return stripMatchedQuotes(line.slice(separator + 1).trim())
  }
  return undefined
}

function stripFrontmatter(content: string): string {
  const trimmed = content.trimStart()
  if (!trimmed.startsWith('---')) return content
  const rest = trimmed.slice(3)
  const end = rest.indexOf('---')
  if (end < 0) return content
  return rest.slice(end + 3).replace(/^\r?\n/, '')
}

function stripMatchedQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function sanitizeName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
}

function componentPath(source: string, path: string): string {
  return relative(source, path).split(/[\\/]+/).join('/')
}

async function collectFilesWithExtensions(root: string, extensions: string[]): Promise<string[]> {
  if (!existsSync(root)) return []
  const out: string[] = []
  await collectFilesWithExtensionsRecursive(root, extensions, out)
  return out.sort()
}

async function collectFilesWithExtensionsRecursive(
  root: string,
  extensions: string[],
  out: string[]
): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(root, entry.name)
    if (entry.isDirectory()) {
      await collectFilesWithExtensionsRecursive(path, extensions, out)
    } else if (entry.isFile() && extensions.includes(extname(path))) {
      out.push(path)
    }
  }
}

async function copyDirectoryRecursive(src: string, dest: string): Promise<void> {
  await cp(src, dest, {
    recursive: true,
    errorOnExist: false,
    force: true,
    verbatimSymlinks: false,
    filter: async (source) => {
      if ((await symlinkTarget(source)) !== null) {
        throw new Error(`Symlinks are not allowed in EBAI content: ${source}`)
      }
      return true
    }
  })
}

async function symlinkTarget(path: string): Promise<string | null> {
  const stat = await lstat(path)
  return stat.isSymbolicLink() ? await readlink(path) : null
}

async function writeComponentMarker(target: string, name: string, component: string): Promise<void> {
  const markerDir = join(target, '.ebai-installed')
  await mkdir(markerDir, { recursive: true })
  await writeFile(
    join(markerDir, `${name}.installed-from`),
    `source = "${ECC_REPO_URL}"\ncomponent = "${component}"\ninstalled_by = "BAI Work ${EBAI_DISPLAY_NAME} installer"\n`,
    'utf8'
  )
}

function shellQuotePath(path: string): string {
  return `'${path.replace(/'/g, "'\\''")}'`
}

function tomlEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export const eccMappingServiceTestInternals = {
  convertEccHooksToBai,
  countEccHookEntries,
  defaultEccSourceDir,
  discoverMarkdownComponents,
  discoverSkillComponents,
  mapEccHookEvent,
  mapEccMatcher,
  renderAgentCommand,
  renderBaiHooksToml,
  renderRulesSkill,
  resolveEccInstallTargets,
  rewriteEccHookCommand
}
