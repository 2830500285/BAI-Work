import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { homedir } from 'node:os'
import { basename, delimiter, join, win32 as win32Path } from 'node:path'
import { StringDecoder } from 'node:string_decoder'
import { URL } from 'node:url'
import {
  DEFAULT_KUN_DATA_DIR,
  getKunRuntimeSettings,
  getModelProviderProfile,
  normalizeMimoCredentialSettings,
  type AppSettingsV1
} from '../../shared/app-settings'
import { getKunBaseUrl } from '../kun-base-url'
import { listGuiSkills } from '../services/skill-service'
import {
  resolveBaiRuntimeInstructions,
  type BaiRuntimeInstructionBundle
} from '../services/bai-runtime-instruction-service'
import type { ManagedRuntimeAdapter } from './kun-adapter'

export const BAI_WORK_RUNTIME_ID = 'bai-work' as const
export const DEFAULT_BAI_CODE_COMMAND = 'baicode'
export const DEFAULT_BAI_BASE_URL = 'https://api.b.ai/v1'
export const DEFAULT_BAI_MODEL = 'claude-sonnet-4-6'
export const BUNDLED_BAI_CODE_RESOURCE_DIR = 'BAI-Code-Runtime'
export const BUNDLED_BAI_CODE_OFFICIAL_RESOURCE_DIR = 'BAI-Code-Official'

const BAI_CODE_SESSION_API_UNAVAILABLE =
  'BAI Code is configured, but the official BAI Code documentation currently only documents the `baicode` CLI and does not document a local HTTP service with session, event, permission, and question APIs required by BAI Work. Configure BAI_API_KEY/BAI_MODEL/BAI_BASE_URL for CLI use, and update this adapter when BAI publishes the desktop service contract.'
const REQUEST_BODY_LIMIT_BYTES = 2 * 1024 * 1024
const BAI_CHAT_TIMEOUT_MS = 120_000
const BAI_CHAT_HISTORY_MAX_MESSAGES = 24
const BAI_CHAT_HISTORY_MAX_CHARS = 32_000
const BAI_CLI_PROGRESS_HEARTBEAT_MS = 4_000
const BAI_CLI_TRACE_TOOL_NAMES = [
  'apply_patch',
  'write_file',
  'read_file',
  'edit_file',
  'run_command',
  'bash',
  'glob',
  'grep',
  'find',
  'python',
  'ls'
] as const

let adapterServer: Server | null = null
let adapterPort = 0
let lastProbe: BaiCodeProbe | null = null
let preparedBaiCodeCommand: string | null = null
let bridgeStore = createBaiCodeBridgeStore()

export type BaiWorkUnexpectedExitInfo = {
  code: number | null
  signal: NodeJS.Signals | null
  stderrTail: string
}

let onUnexpectedBaiWorkExit: ((info: BaiWorkUnexpectedExitInfo) => void) | null = null

export function setBaiWorkUnexpectedExitHandler(
  handler: ((info: BaiWorkUnexpectedExitInfo) => void) | null
): void {
  onUnexpectedBaiWorkExit = handler
}

export type BaiRuntimeConfig = {
  command: string
  port: number
  dataDir: string
  apiKey: string
  apiKeyConfigured: boolean
  baseUrl: string
  model: string
}

type BaiCodeProbe = {
  installed: boolean
  command: string
  version: string
  message: string
}

type BaiBridgeItem = {
  id: string
  turnId: string
  threadId: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  status: string
  createdAt: string
  finishedAt?: string
  kind: string
  text?: string
  displayText?: string
  message?: string
  code?: string
  severity?: 'info' | 'warning' | 'error'
  toolName?: string
  callId?: string
  toolKind?: 'tool_call' | 'command_execution' | 'file_change'
  arguments?: Record<string, unknown>
  output?: unknown
  isError?: boolean
  summary?: string
}

type BaiBridgeUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimated: boolean
  createdAt: string
}

type BaiBridgeTurn = {
  id: string
  threadId: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'aborted'
  prompt: string
  displayPrompt: string
  model: string
  createdAt: string
  startedAt?: string
  finishedAt?: string
  items: BaiBridgeItem[]
  usage?: BaiBridgeUsage
  error?: string
}

type BaiBridgeThread = {
  id: string
  title: string
  workspace: string
  model: string
  mode: string
  status: 'idle' | 'running' | 'archived' | 'deleted'
  approvalPolicy?: string
  sandboxMode?: string
  createdAt: string
  updatedAt: string
  turns: BaiBridgeTurn[]
  latestSeq: number
  events: Array<Record<string, unknown>>
  subscribers: Set<ServerResponse>
}

type BaiCodeBridgeStore = {
  threads: Map<string, BaiBridgeThread>
}

type BaiChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type BaiRuntimePython = {
  command: string
  argsPrefix: string[]
  version: string
  tag: string
}

function expandHome(value: string): string {
  return value.replace(/^~(?=$|[\\/])/, homedir())
}

function defaultBaiDataDir(): string {
  return DEFAULT_KUN_DATA_DIR.replace(/^~(?=$|[\\/])/, homedir())
}

function runtimeSearchPath(basePath = process.env.PATH ?? ''): string {
  const home = homedir()
  const segments = [
    ...basePath.split(delimiter),
    join(home, '.local', 'bin'),
    join(home, '.bai', 'bin'),
    join(home, '.mimocode', 'bin'),
    join(home, '.homebrew', 'bin'),
    join(home, '.bun', 'bin'),
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin'
  ].map((value) => value.trim()).filter(Boolean)
  const seen = new Set<string>()
  const unique: string[] = []
  for (const segment of segments) {
    const key = process.platform === 'win32' ? segment.toLowerCase() : segment
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(segment)
  }
  return unique.join(delimiter)
}

function runtimeProcessEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: runtimeSearchPath(),
    HOME: process.env.HOME || homedir(),
    LANG: process.env.LANG || 'C.UTF-8',
    ...extra
  }
}

function bundledBaiCodeCommand(): string | null {
  if (process.platform !== 'darwin' || process.arch !== 'x64') return null
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
  const candidates = [
    resourcesPath ? join(resourcesPath, BUNDLED_BAI_CODE_RESOURCE_DIR, 'bin', 'baicode') : '',
    join(process.cwd(), 'resources', 'bai-code-runtime', 'bin', 'baicode')
  ].filter(Boolean)
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function bundledBaiCodeOfficialDir(): string | null {
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath
  const candidates = [
    resourcesPath ? join(resourcesPath, BUNDLED_BAI_CODE_OFFICIAL_RESOURCE_DIR) : '',
    join(process.cwd(), 'resources', 'bai-code-official')
  ].filter(Boolean)
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function resolveBaiCodeCommand(settings: AppSettingsV1): string {
  const runtime = getKunRuntimeSettings(settings)
  return runtime.binaryPath.trim() ||
    process.env.BAICODE_BIN_PATH?.trim() ||
    process.env.BAI_CODE_BIN_PATH?.trim() ||
    bundledBaiCodeCommand() ||
    preparedBaiCodeCommand ||
    DEFAULT_BAI_CODE_COMMAND
}

function effectiveBaiRuntimeConfig(settings: AppSettingsV1): BaiRuntimeConfig {
  const runtime = getKunRuntimeSettings(settings)
  const provider = getModelProviderProfile(settings, runtime.providerId)
  const bai = normalizeMimoCredentialSettings(runtime.mimo)
  const apiKey = bai.apiKey.trim() ||
    runtime.apiKey.trim() ||
    provider.apiKey.trim() ||
    process.env.BAI_API_KEY?.trim() ||
    ''
  const baseUrl = bai.baseUrl.trim() ||
    runtime.baseUrl.trim() ||
    provider.baseUrl.trim() ||
    process.env.BAI_BASE_URL?.trim() ||
    DEFAULT_BAI_BASE_URL
  const model = bai.model.trim() ||
    runtime.model.trim() ||
    provider.models[0]?.trim() ||
    process.env.BAI_MODEL?.trim() ||
    DEFAULT_BAI_MODEL

  return {
    command: resolveBaiCodeCommand(settings),
    port: runtime.port,
    dataDir: expandHome(runtime.dataDir.trim() || defaultBaiDataDir()),
    apiKey,
    apiKeyConfigured: Boolean(apiKey),
    baseUrl: baseUrl.replace(/\/+$/, ''),
    model
  }
}

function probeBaiCodeCli(command: string): Promise<BaiCodeProbe> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (probe: BaiCodeProbe): void => {
      if (settled) return
      settled = true
      resolve(probe)
    }

    if (command.includes('/') && !existsSync(command)) {
      finish({
        installed: false,
        command,
        version: '',
        message: `BAI Code executable was not found at ${command}.`
      })
      return
    }

    const child = spawn(command, ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: runtimeProcessEnv()
    })
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      finish({
        installed: true,
        command,
        version: '',
        message: 'BAI Code CLI probe timed out while running `baicode --version`, but the executable was found and started.'
      })
    }, 10_000)
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.once('error', (error) => {
      clearTimeout(timeout)
      finish({
        installed: false,
        command,
        version: '',
        message: error.message
      })
    })
    child.once('exit', (code, signal) => {
      clearTimeout(timeout)
      if (code === 0) {
        const version = `${stdout}\n${stderr}`.trim().split(/\r?\n/)[0]?.trim() || 'available'
        finish({ installed: true, command, version, message: '' })
        return
      }
      finish({
        installed: false,
        command,
        version: '',
        message: `BAI Code CLI probe failed (code=${code ?? 'null'}, signal=${signal ?? 'null'}).`
      })
    })
  })
}

function officialWheelPlatformTag(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): string | null {
  if (platform === 'darwin' && arch === 'arm64') return 'macosx_11_0_arm64'
  if (platform === 'win32' && arch === 'x64') return 'win_amd64'
  return null
}

function officialRuntimeVenvCommand(
  venvDir: string,
  platform: NodeJS.Platform = process.platform
): string {
  return platform === 'win32'
    ? win32Path.join(venvDir, 'Scripts', 'baicode.exe')
    : join(venvDir, 'bin', 'baicode')
}

function officialRuntimeVenvPython(
  venvDir: string,
  platform: NodeJS.Platform = process.platform
): string {
  return platform === 'win32'
    ? win32Path.join(venvDir, 'Scripts', 'python.exe')
    : join(venvDir, 'bin', 'python')
}

function officialRuntimePythonCandidates(
  platform: NodeJS.Platform = process.platform
): Array<{ command: string; argsPrefix: string[] }> {
  const supportedVersions = ['3.13', '3.12', '3.11', '3.10']
  if (platform === 'win32') {
    return [
      { command: 'python', argsPrefix: [] },
      { command: 'py', argsPrefix: [] },
      ...supportedVersions.map((version) => ({ command: 'py', argsPrefix: [`-${version}`] })),
      ...supportedVersions.map((version) => ({ command: `python${version}`, argsPrefix: [] })),
      { command: 'python3', argsPrefix: [] }
    ]
  }
  return [
    { command: 'python3', argsPrefix: [] },
    { command: 'python', argsPrefix: [] },
    ...supportedVersions.map((version) => ({ command: `python${version}`, argsPrefix: [] }))
  ]
}

function runProcessCapture(
  command: string,
  args: string[],
  timeoutMs = 60_000
): Promise<{ ok: boolean; stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    let settled = false
    let timeout: NodeJS.Timeout
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: runtimeProcessEnv()
    })
    const finish = (ok: boolean, code: number | null): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve({ ok, stdout, stderr, code })
    }
    timeout = setTimeout(() => {
      child.kill('SIGTERM')
      finish(false, null)
    }, timeoutMs)
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.once('error', (error) => {
      stderr += `${stderr ? '\n' : ''}${error.message}`
      finish(false, null)
    })
    child.once('exit', (code) => {
      finish(code === 0, code)
    })
  })
}

async function detectOfficialRuntimePython(): Promise<BaiRuntimePython | null> {
  for (const candidate of officialRuntimePythonCandidates()) {
    const result = await runProcessCapture(candidate.command, [
      ...candidate.argsPrefix,
      '-c',
      'import json,sys; v=sys.version_info; print(json.dumps({"major":v.major,"minor":v.minor,"executable":sys.executable}))'
    ], 10_000)
    if (!result.ok) continue
    try {
      const parsed = JSON.parse(result.stdout.trim()) as { major?: number; minor?: number }
      const major = Number(parsed.major)
      const minor = Number(parsed.minor)
      if (major !== 3 || minor < 10 || minor > 13) continue
      return {
        command: candidate.command,
        argsPrefix: candidate.argsPrefix,
        version: `${major}.${minor}`,
        tag: `cp${major}${minor}`
      }
    } catch {
      continue
    }
  }
  return null
}

function findOfficialWheelhouse(root: string, platformTag: string, pythonTag: string): string | null {
  const wheelhouse = join(root, 'wheelhouse', `${platformTag}-${pythonTag}`)
  if (!existsSync(wheelhouse)) return null
  const wheelName = readdirSync(wheelhouse).find((entry) =>
    entry.startsWith(`baicode-0.9.1-${pythonTag}-${pythonTag}-`) &&
    entry.includes(platformTag) &&
    entry.endsWith('.whl')
  )
  return wheelName ? wheelhouse : null
}

async function prepareBundledOfficialBaiCodeRuntime(config: BaiRuntimeConfig): Promise<string | null> {
  const platformTag = officialWheelPlatformTag()
  if (!platformTag) return null
  const officialDir = bundledBaiCodeOfficialDir()
  if (!officialDir) return null
  const python = await detectOfficialRuntimePython()
  if (!python) return null

  const wheelhouse = findOfficialWheelhouse(officialDir, platformTag, python.tag)
  if (!wheelhouse) return null
  const venvDir = join(config.dataDir, 'bai-code-official-runtime', `${platformTag}-${python.tag}`)
  const command = officialRuntimeVenvCommand(venvDir)
  if (existsSync(command)) return command

  mkdirSync(venvDir, { recursive: true })
  const createVenv = await runProcessCapture(
    python.command,
    [...python.argsPrefix, '-m', 'venv', venvDir],
    120_000
  )
  if (!createVenv.ok) return null

  const venvPython = officialRuntimeVenvPython(venvDir)
  if (!existsSync(venvPython)) return null
  await runProcessCapture(venvPython, ['-m', 'ensurepip', '--upgrade'], 120_000)
  const install = await runProcessCapture(
    venvPython,
    ['-m', 'pip', 'install', '--no-index', '--find-links', wheelhouse, 'baicode==0.9.1'],
    120_000
  )
  if (!install.ok || !existsSync(command)) return null
  return command
}

export const baiWorkRuntimeAdapter: ManagedRuntimeAdapter = {
  id: BAI_WORK_RUNTIME_ID,

  async resolveExecutable(settings: AppSettingsV1): Promise<string> {
    const config = effectiveBaiRuntimeConfig(settings)
    return config.command
  },

  async ensureRunning(settings: AppSettingsV1): Promise<void> {
    let config = effectiveBaiRuntimeConfig(settings)
    if (adapterServer && adapterPort === config.port) return
    if (adapterServer) await this.stopAndWait()
    lastProbe = await probeBaiCodeCli(config.command)
    if (!lastProbe.installed) {
      const preparedCommand = await prepareBundledOfficialBaiCodeRuntime(config)
      if (preparedCommand) {
        preparedBaiCodeCommand = preparedCommand
        config = effectiveBaiRuntimeConfig(settings)
        lastProbe = await probeBaiCodeCli(config.command)
      } else if (bundledBaiCodeOfficialDir() && officialWheelPlatformTag()) {
        lastProbe = {
          ...lastProbe,
          message: `${lastProbe.message} BAI Work includes official BAI Code wheels for this platform, but could not create the local runtime. Install Python 3.10-3.13 from https://www.python.org/downloads/ or configure an existing baicode executable in Settings.`
        }
      }
    }
    await startCompatibilityServer(settings)
  },

  async stopAndWait(): Promise<void> {
  const server = adapterServer
  adapterServer = null
  adapterPort = 0
  bridgeStore = createBaiCodeBridgeStore()
  if (!server) return
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  },

  isChildRunning(): boolean {
    return adapterServer !== null
  },

  getBaseUrl(settings: AppSettingsV1): string {
    return getKunBaseUrl(getKunRuntimeSettings(settings).port)
  },

  async reclaimPort(_port: number): Promise<{ ok: true } | { ok: false; message: string }> {
    return { ok: true }
  },

  async resolveAvailablePort(port: number): Promise<{ port: number; changed: boolean; message?: string }> {
    if (adapterServer && adapterPort === port) return { port, changed: false }
    if (await canBindPort(port)) return { port, changed: false }

    const nextPort = await findAvailablePort(port + 1)
    return {
      port: nextPort,
      changed: true,
      message: `Port ${port} is already in use, so BAI Work will use ${nextPort}.`
    }
  }
}

async function canBindPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    let settled = false
    const finish = (ok: boolean): void => {
      if (settled) return
      settled = true
      server.removeAllListeners()
      if (server.listening) {
        server.close(() => resolve(ok))
      } else {
        resolve(ok)
      }
    }
    server.once('error', () => finish(false))
    server.listen(port, '127.0.0.1', () => finish(true))
  })
}

async function findAvailablePort(startPort: number): Promise<number> {
  const first = Math.max(1, Math.min(65_535, startPort))
  for (let port = first; port <= Math.min(65_535, first + 100); port += 1) {
    if (await canBindPort(port)) return port
  }
  throw new Error(`Could not find an available BAI Work runtime port after ${first - 1}.`)
}

async function startCompatibilityServer(settings: AppSettingsV1): Promise<void> {
  const config = effectiveBaiRuntimeConfig(settings)
  adapterServer = createServer((req, res) => {
    void handleCompatibilityRequest(req, res, settings).catch((error) => {
      writeJson(res, 500, {
        code: 'bai_work_adapter_failed',
        message: error instanceof Error ? error.message : String(error)
      })
    })
  })
  await new Promise<void>((resolve, reject) => {
    adapterServer?.once('error', reject)
    adapterServer?.listen(config.port, '127.0.0.1', () => resolve())
  })
  adapterPort = config.port
}

async function handleCompatibilityRequest(
  req: IncomingMessage,
  res: ServerResponse,
  settings: AppSettingsV1
): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')
  const config = effectiveBaiRuntimeConfig(settings)
  const probe = lastProbe ?? {
    installed: false,
    command: config.command,
    version: '',
    message: 'BAI Code CLI has not been probed yet.'
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    writeJson(res, 200, {
      status: 'ok',
      service: 'bai-work',
      mode: 'adapter',
      runtime: 'bai-code',
      cli: probe
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/v1/runtime/info') {
    const skills = await listGuiSkills(settings)
    writeJson(res, 200, runtimeInfo(config, probe, skills.ok ? skills.skills : []))
    return
  }

  if (req.method === 'GET' && url.pathname === '/v1/runtime/tools') {
    writeJson(res, 200, {
      providers: [{ id: 'bai', name: 'BAI' }],
      mcpServers: [],
      mcpSearch: { enabled: false, active: false }
    })
    return
  }

  if (req.method === 'GET' && url.pathname === '/v1/skills') {
    const skills = await listGuiSkills(settings)
    writeJson(res, 200, skills.ok ? { skills: skills.skills } : { skills: [] })
    return
  }

  if (req.method === 'GET' && url.pathname === '/v1/usage') {
    writeJson(res, 200, usageResponse(url))
    return
  }

  if (url.pathname.startsWith('/v1/threads')) {
    await handleThreadRequest(req, res, url, settings, config, probe)
    return
  }

  if (url.pathname.startsWith('/v1/sessions')) {
    writeJson(res, 404, {
      code: 'bai_code_sessions_unsupported',
      message: 'BAI Work is running through the BAI Code CLI bridge; resume-session APIs are not available.'
    })
    return
  }

  if (
    url.pathname.startsWith('/v1/approvals') ||
    url.pathname.startsWith('/v1/user-inputs')
  ) {
    writeJson(res, 503, baiCodeUnavailablePayload(config, probe))
    return
  }

  writeJson(res, 404, {
    code: 'not_found',
    message: `BAI Work adapter has no route for ${req.method} ${url.pathname}`
  })
}

function runtimeInfo(
  config: BaiRuntimeConfig,
  probe: BaiCodeProbe,
  skills: Array<{ root: string }> = []
): Record<string, unknown> {
  const available = { status: 'available', enabled: true, available: true }
  const unavailable = { status: 'unavailable', enabled: false, available: false }
  const disabled = { status: 'disabled', enabled: false, available: false }
  return {
    host: '127.0.0.1',
    port: config.port,
    dataDir: config.dataDir,
    model: config.model,
    endpointFormat: 'chat_completions',
    approvalPolicy: 'on-request',
    sandboxMode: 'workspace-write',
    tokenEconomyMode: false,
    insecure: false,
    startedAt: new Date().toISOString(),
    pid: process.pid,
    cli: probe,
    provider: {
      id: 'bai',
      name: 'BAI',
      baseUrl: config.baseUrl,
      apiKeyConfigured: config.apiKeyConfigured
    },
    capabilities: {
      contractVersion: 1,
      model: {
        id: config.model,
        inputModalities: ['text'],
        outputModalities: ['text'],
        supportsToolCalling: false,
        messageParts: ['text'],
        reasoning: {
          supportedEfforts: ['off'],
          defaultEffort: 'off',
          requestProtocol: 'none'
        }
      },
      cli: {
        serve: unavailable,
        run: probe.installed ? available : unavailable,
        chat: probe.installed ? { ...available, mode: 'baicode-cli-prompt' } : unavailable,
        exec: probe.installed ? { ...available, mode: 'baicode-cli-prompt' } : unavailable
      },
      mcp: {
        ...disabled,
        configuredServers: 0,
        connectedServers: 0,
        toolCount: 0,
        search: { enabled: false, mode: 'auto', active: false, indexedToolCount: 0, advertisedToolCount: 0 }
      },
      web: { ...disabled, fetch: disabled, search: disabled },
      skills: {
        ...(skills.length > 0 ? available : disabled),
        configuredRoots: new Set(skills.map((skill) => skill.root)).size,
        discoveredSkills: skills.length
      },
      subagents: { ...disabled, maxParallel: 0, maxChildRuns: 0, defaultToolPolicy: 'inherit', profiles: [] },
      attachments: unavailable,
      memory: unavailable,
      imageGen: disabled,
      speechGen: disabled,
      musicGen: disabled,
      videoGen: disabled
    }
  }
}

function createBaiCodeBridgeStore(): BaiCodeBridgeStore {
  return { threads: new Map() }
}

function nowIso(): string {
  return new Date().toISOString()
}

function bridgeId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 18)}`
}

function summarizeTitle(prompt: string, fallback: string): string {
  const normalized = prompt.replace(/\s+/g, ' ').trim()
  if (!normalized) return fallback
  return normalized.length > 42 ? `${normalized.slice(0, 42)}...` : normalized
}

function threadSummary(thread: BaiBridgeThread): Record<string, unknown> {
  return {
    id: thread.id,
    title: thread.title,
    workspace: thread.workspace,
    model: thread.model,
    mode: thread.mode,
    status: thread.status,
    approvalPolicy: thread.approvalPolicy,
    sandboxMode: thread.sandboxMode,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt
  }
}

function threadDetail(thread: BaiBridgeThread): Record<string, unknown> {
  return {
    ...threadSummary(thread),
    latestSeq: thread.latestSeq,
    turns: thread.turns
  }
}

function appendThreadEvent(thread: BaiBridgeThread, event: Record<string, unknown>): void {
  thread.latestSeq += 1
  const payload = {
    ...event,
    seq: thread.latestSeq,
    timestamp: typeof event.timestamp === 'string' ? event.timestamp : nowIso(),
    threadId: typeof event.threadId === 'string' ? event.threadId : thread.id
  }
  thread.events.push(payload)
  for (const subscriber of thread.subscribers) {
    writeSseEvent(subscriber, payload)
  }
}

function writeSseEvent(res: ServerResponse, event: Record<string, unknown>): void {
  const seq = typeof event.seq === 'number' ? event.seq : undefined
  if (seq !== undefined) res.write(`id: ${seq}\n`)
  if (typeof event.kind === 'string') res.write(`event: ${event.kind}\n`)
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

async function handleThreadRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  settings: AppSettingsV1,
  config: BaiRuntimeConfig,
  probe: BaiCodeProbe
): Promise<void> {
  if (req.method === 'GET' && url.pathname === '/v1/threads') {
    const includeArchived = url.searchParams.get('include_archived') === 'true'
    const archivedOnly = url.searchParams.get('archived_only') === 'true'
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 50)))
    const search = (url.searchParams.get('search') || '').trim().toLowerCase()
    let threads = [...bridgeStore.threads.values()]
      .filter((thread) => thread.status !== 'deleted')
      .filter((thread) => includeArchived ? true : thread.status !== 'archived')
      .filter((thread) => archivedOnly ? thread.status === 'archived' : true)
    if (search) {
      threads = threads.filter((thread) =>
        [thread.title, thread.workspace].join('\n').toLowerCase().includes(search)
      )
    }
    threads.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    writeJson(res, 200, { threads: threads.slice(0, limit).map(threadSummary) })
    return
  }

  if (req.method === 'POST' && url.pathname === '/v1/threads') {
    const body = await readJsonBody(req)
    const createdAt = nowIso()
    const workspace = stringFrom(body.workspace) || expandHome('~/BAI Work/default_workspace')
    const model = stringFrom(body.model) || config.model
    const id = bridgeId('bai_thread')
    const thread: BaiBridgeThread = {
      id,
      title: stringFrom(body.title) || 'New chat',
      workspace,
      model,
      mode: stringFrom(body.mode) || 'agent',
      status: 'idle',
      approvalPolicy: stringFrom(body.approvalPolicy) || getKunRuntimeSettings(settings).approvalPolicy,
      sandboxMode: stringFrom(body.sandboxMode) || getKunRuntimeSettings(settings).sandboxMode,
      createdAt,
      updatedAt: createdAt,
      turns: [],
      latestSeq: 0,
      events: [],
      subscribers: new Set()
    }
    bridgeStore.threads.set(id, thread)
    writeJson(res, 200, threadDetail(thread))
    return
  }

  const match = /^\/v1\/threads\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec(url.pathname)
  const threadId = match ? decodeURIComponent(match[1]) : ''
  const action = match?.[2] ? decodeURIComponent(match[2]) : ''
  const thread = bridgeStore.threads.get(threadId)
  if (!thread || thread.status === 'deleted') {
    writeJson(res, 404, { code: 'thread_not_found', message: 'Thread not found.' })
    return
  }

  if (req.method === 'GET' && !action) {
    writeJson(res, 200, threadDetail(thread))
    return
  }

  if (req.method === 'PATCH' && !action) {
    const body = await readJsonBody(req)
    const title = stringFrom(body.title)
    const workspace = stringFrom(body.workspace)
    const status = stringFrom(body.status)
    if (title) thread.title = title
    if (workspace) thread.workspace = workspace
    if (status === 'archived' || status === 'idle') thread.status = status
    thread.updatedAt = nowIso()
    writeJson(res, 200, threadDetail(thread))
    return
  }

  if (req.method === 'DELETE' && !action) {
    thread.status = 'deleted'
    thread.updatedAt = nowIso()
    writeJson(res, 200, { ok: true })
    return
  }

  if (req.method === 'GET' && action === 'events') {
    subscribeThreadEvents(req, res, thread, Number(url.searchParams.get('since_seq') || 0))
    return
  }

  if (req.method === 'POST' && action === 'turns') {
    const body = await readJsonBody(req)
    const prompt = stringFrom(body.prompt)
    if (!prompt) {
      writeJson(res, 400, { code: 'empty_prompt', message: 'Prompt is required.' })
      return
    }
    const model = stringFrom(body.model) || config.model
    const displayText = stringFrom(body.displayText)
    const turn = createBridgeTurn(thread, {
      prompt,
      displayText,
      model
    })
    runBaiCodeTurn({ thread, turn, config, probe, settings })
    writeJson(res, 200, {
      threadId: thread.id,
      turnId: turn.id,
      userMessageItemId: turn.items[0]?.id
    })
    return
  }

  if (req.method === 'POST' && action === 'compact') {
    writeJson(res, 200, { ok: true })
    return
  }

  if (action === 'goal') {
    writeJson(res, req.method === 'DELETE' ? 200 : 200, req.method === 'DELETE' ? { cleared: true } : { goal: null })
    return
  }

  if (action === 'todos') {
    writeJson(res, req.method === 'DELETE' ? 200 : 200, req.method === 'DELETE' ? { cleared: true } : { todos: null })
    return
  }

  writeJson(res, 404, {
    code: 'bai_code_bridge_route_unavailable',
    message: `BAI Code CLI bridge has no route for ${req.method} ${url.pathname}.`
  })
}

function subscribeThreadEvents(
  req: IncomingMessage,
  res: ServerResponse,
  thread: BaiBridgeThread,
  sinceSeq: number
): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  })
  res.write(': connected\n\n')
  for (const event of thread.events) {
    const seq = typeof event.seq === 'number' ? event.seq : 0
    if (seq > sinceSeq) writeSseEvent(res, event)
  }
  thread.subscribers.add(res)
  req.on('close', () => {
    thread.subscribers.delete(res)
  })
}

function createBridgeTurn(
  thread: BaiBridgeThread,
  input: { prompt: string; displayText?: string; model: string }
): BaiBridgeTurn {
  const createdAt = nowIso()
  const turnId = bridgeId('bai_turn')
  const userItem: BaiBridgeItem = {
    id: bridgeId('bai_user'),
    turnId,
    threadId: thread.id,
    role: 'user',
    status: 'completed',
    createdAt,
    finishedAt: createdAt,
    kind: 'user_message',
    text: input.displayText || input.prompt,
    ...(input.displayText && input.displayText !== input.prompt ? { displayText: input.displayText } : {})
  }
  const turn: BaiBridgeTurn = {
    id: turnId,
    threadId: thread.id,
    status: 'running',
    prompt: input.prompt,
    displayPrompt: input.displayText || input.prompt,
    model: input.model,
    createdAt,
    startedAt: createdAt,
    items: [userItem]
  }
  thread.turns.push(turn)
  thread.status = 'running'
  thread.model = input.model
  thread.updatedAt = createdAt
  if (thread.title === 'New chat') {
    thread.title = summarizeTitle(input.displayText || input.prompt, thread.title)
  }
  appendThreadEvent(thread, {
    kind: 'item_completed',
    turnId,
    itemId: userItem.id,
    item: userItem
  })
  return turn
}

function buildBaiChatMessages(thread: BaiBridgeThread, currentTurn: BaiBridgeTurn): BaiChatMessage[] {
  const messages: BaiChatMessage[] = []
  for (const candidate of thread.turns) {
    const userContent = candidate.id === currentTurn.id
      ? currentTurn.prompt
      : candidate.displayPrompt
    if (userContent.trim()) {
      messages.push({ role: 'user', content: userContent.trim() })
    }

    for (const item of candidate.items) {
      if (item.role !== 'assistant' || item.kind !== 'assistant_text') continue
      if (candidate.id === currentTurn.id && item.status !== 'completed') continue
      const assistantContent = item.text?.trim() || ''
      if (assistantContent) {
        messages.push({ role: 'assistant', content: assistantContent })
      }
    }

    if (candidate.id === currentTurn.id) break
  }
  return trimBaiChatMessages(messages)
}

function trimBaiChatMessages(messages: BaiChatMessage[]): BaiChatMessage[] {
  const trimmed = [...messages]
  while (trimmed.length > BAI_CHAT_HISTORY_MAX_MESSAGES) trimmed.shift()

  let totalChars = trimmed.reduce((total, message) => total + message.content.length, 0)
  while (trimmed.length > 1 && totalChars > BAI_CHAT_HISTORY_MAX_CHARS) {
    const removed = trimmed.shift()
    totalChars -= removed?.content.length ?? 0
  }
  while (trimmed.length > 1 && trimmed[0]?.role === 'assistant') {
    trimmed.shift()
  }
  return trimmed
}

function buildBaiCodeCliPrompt(
  thread: BaiBridgeThread,
  currentTurn: BaiBridgeTurn,
  extensions: BaiRuntimeInstructionBundle
): string {
  const messages = buildBaiChatMessages(thread, currentTurn)
  const identity = [
    'You are BAI Work, the desktop AI workbench assistant.',
    'In user-facing replies, identify yourself as BAI Work.',
    'Do not call yourself BAI Code, BAI code, or Baicode. BAI Code is only the internal runtime used by BAI Work.',
    'Use native tool calls whenever tools are required. Never imitate a tool call, narrate an upcoming tool call as if it ran, or repeat execution preambles in assistant text.',
    preferredResponseLanguageInstruction(currentTurn.prompt),
    `Workspace: ${thread.workspace}`
  ]
  if (messages.length <= 1) {
    return [
      ...identity,
      ...(extensions.instructions ? ['Managed extensions:', extensions.instructions] : []),
      'Current user request:',
      currentTurn.prompt
    ].join('\n\n')
  }

  const history = messages.slice(0, -1)
    .map((message) => `${message.role === 'user' ? 'User' : 'Assistant'}:\n${message.content}`)
    .join('\n\n')
  return [
    ...identity,
    'Continue the same conversation. Use the conversation history for context, then execute the current user request in the workspace when it requires files, commands, or multi-step work.',
    'Conversation history:',
    history,
    ...(extensions.instructions ? ['Managed extensions:', extensions.instructions] : []),
    'Current user request:',
    currentTurn.prompt
  ].join('\n\n')
}

function preferredResponseLanguageInstruction(prompt: string): string {
  const looksChinese = /[\u3400-\u9fff\uf900-\ufaff]/.test(prompt) &&
    !/[\u3040-\u30ff\uac00-\ud7af]/.test(prompt)
  return looksChinese
    ? 'Reply in Simplified Chinese unless the current user request explicitly asks for another language.'
    : 'Reply in the same language as the current user request unless it explicitly asks for another language.'
}

function redactRuntimeText(text: string, config: BaiRuntimeConfig): string {
  const apiKey = config.apiKey.trim()
  return apiKey ? text.split(apiKey).join('[REDACTED_API_KEY]') : text
}

function stripAnsi(text: string): string {
  const escape = String.fromCharCode(27)
  return text.replace(new RegExp(`${escape}(?:[@-Z\\\\-_]|\\[[0-?]*[ -/]*[@-~])`, 'g'), '')
}

function cleanCliOutput(text: string, config: BaiRuntimeConfig): string {
  return stripAnsi(redactRuntimeText(text, config))
    .replace(/\r\n/g, '\n')
    .replace(/\uFFFD+/g, '')
}

function normalizeBaiWorkAssistantBranding(text: string): string {
  return text
    .replace(/我是\s*BAI\s*code/gi, '我是 BAI Work')
    .replace(/我是\s*BAI\s*Code/g, '我是 BAI Work')
    .replace(/我是\s*Baicode/gi, '我是 BAI Work')
    .replace(/\bI am\s+BAI\s*code\b/gi, 'I am BAI Work')
    .replace(/\bI'm\s+BAI\s*code\b/gi, "I'm BAI Work")
}

type BaiCliProgress = { summary: string; detail?: string }
type BaiCliOutputProblem = BaiCliProgress & { code: string }
type BaiCliTraceSpan = { start: number; end: number; toolName: string; raw: string }

function isTraceBoundary(text: string, index: number): boolean {
  if (index <= 0) return true
  return /[\s*•,;:，。；：-]/.test(text[index - 1] ?? '')
}

function findBaiCodeTraceSpans(text: string): BaiCliTraceSpan[] {
  const spans: BaiCliTraceSpan[] = []
  const lower = text.toLowerCase()
  for (let index = 0; index < text.length; index += 1) {
    if (!isTraceBoundary(text, index)) continue
    let matched = false
    for (const toolName of BAI_CLI_TRACE_TOOL_NAMES) {
      if (!lower.startsWith(toolName, index)) continue
      let openIndex = index + toolName.length
      while (text[openIndex] === ' ' || text[openIndex] === '\t') openIndex += 1
      if (text[openIndex] !== '(') continue

      let depth = 0
      let quote: '"' | "'" | null = null
      let escaped = false
      for (let cursor = openIndex; cursor < text.length; cursor += 1) {
        const char = text[cursor]
        if (quote) {
          if (escaped) {
            escaped = false
            continue
          }
          if (char === '\\') {
            escaped = true
            continue
          }
          if (char === quote) quote = null
          continue
        }
        if (char === '"' || char === "'") {
          quote = char
          continue
        }
        if (char === '(') depth += 1
        if (char === ')') {
          depth -= 1
          if (depth === 0) {
            const end = cursor + 1
            spans.push({ start: index, end, toolName, raw: text.slice(index, end) })
            index = end - 1
            matched = true
            break
          }
        }
      }
      if (!matched) {
        const lineStart = text.lastIndexOf('\n', index - 1) + 1
        const lineEnd = text.indexOf('\n', openIndex)
        const prefix = text.slice(lineStart, index).trim()
        if (lineEnd >= 0 && (prefix === '' || /^[-*•]$/.test(prefix))) {
          spans.push({
            start: index,
            end: lineEnd,
            toolName,
            raw: text.slice(index, lineEnd)
          })
          index = lineEnd - 1
          matched = true
        }
      }
      if (matched) break
    }
  }
  return spans
}

function stripBaiCodeTraceCalls(text: string): { text: string; removedTrace: boolean } {
  const spans = findBaiCodeTraceSpans(text)
  if (spans.length === 0) return { text, removedTrace: false }

  let output = ''
  let last = 0
  for (const span of spans) {
    let start = span.start
    while (start > last && /[ \t]/.test(text[start - 1] ?? '')) start -= 1
    const bulletIndex = start - 1
    if (
      bulletIndex >= last &&
      /[-*•]/.test(text[bulletIndex] ?? '') &&
      (bulletIndex === last || /\s/.test(text[bulletIndex - 1] ?? ''))
    ) {
      start = bulletIndex
    }
    output += text.slice(last, start)
    last = span.end
  }
  output += text.slice(last)
  return { text: output, removedTrace: true }
}

function compactRuntimeText(text: string, maxLength = 96): string {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= maxLength) return compact
  return `${compact.slice(0, Math.max(0, maxLength - 3))}...`
}

function extractTraceField(raw: string, field: string): string {
  const prefix = new RegExp(`${field}\\s*=\\s*`, 'i').exec(raw)
  if (!prefix || prefix.index === undefined) return ''
  const start = prefix.index + prefix[0].length
  const quote = raw[start]
  if (quote === "'" || quote === '"') {
    let escaped = false
    for (let index = start + 1; index < raw.length; index += 1) {
      const char = raw[index]
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === quote) return raw.slice(start + 1, index).trim()
    }
    return ''
  }
  const value = raw.slice(start).split(/[,)]/, 1)[0] ?? ''
  return value.trim()
}

function shortTracePath(value: string): string {
  const normalized = value.trim()
  if (!normalized) return ''
  return basename(normalized) || normalized
}

function summarizeBashTrace(command: string): string {
  const compact = compactRuntimeText(command, 80)
  const lower = compact.toLowerCase()
  if (!compact) return '执行本地步骤'
  if (/^(pwd|ls|find|grep|rg|cat)\b/.test(lower) || /\b(ls|find|grep|rg)\b/.test(lower)) {
    return '检查工作区'
  }
  if (/^(mkdir|touch|cp|mv)\b/.test(lower)) return '准备工作目录'
  if (/\b(pip|pip3|npm|pnpm|yarn|bun|brew)\s+(install|add)\b/.test(lower)) return '安装依赖'
  if (/\b(python|python3|node|tsx|ts-node)\b/.test(lower)) return '运行生成脚本'
  if (/\b(timeout|bash|sh)\b/.test(lower)) return '执行本地步骤'
  return `执行 ${compact}`
}

function summarizeTraceSpan(span: BaiCliTraceSpan): string {
  const toolName = span.toolName.toLowerCase()
  if (toolName === 'bash' || toolName === 'run_command') {
    return summarizeBashTrace(extractTraceField(span.raw, 'command'))
  }
  if (toolName === 'write_file') {
    const filePath = shortTracePath(extractTraceField(span.raw, 'file_path') || extractTraceField(span.raw, 'path'))
    return filePath ? `写入 ${filePath}` : '写入文件'
  }
  if (toolName === 'read_file') {
    const filePath = shortTracePath(extractTraceField(span.raw, 'file_path') || extractTraceField(span.raw, 'path'))
    return filePath ? `读取 ${filePath}` : '读取文件'
  }
  if (toolName === 'edit_file' || toolName === 'apply_patch') {
    const filePath = shortTracePath(extractTraceField(span.raw, 'file_path') || extractTraceField(span.raw, 'path'))
    return filePath ? `更新 ${filePath}` : '更新文件'
  }
  if (toolName === 'glob' || toolName === 'grep' || toolName === 'find' || toolName === 'ls') return '检查工作区'
  if (toolName === 'python') return '运行生成脚本'
  return '执行本地步骤'
}

function baiCliTraceActions(text: string): string[] {
  const actions: string[] = []
  for (const span of findBaiCodeTraceSpans(text)) {
    const action = summarizeTraceSpan(span)
    if (action && actions[actions.length - 1] !== action) actions.push(action)
  }
  return actions
}

function cliToolOutput(input: {
  config: BaiRuntimeConfig
  thread: BaiBridgeThread
  stdout: string
  stderr: string
  status: 'running' | 'completed' | 'failed'
  progress?: BaiCliProgress
  exitCode?: number | null
  signal?: NodeJS.Signals | null
  durationMs?: number
}): Record<string, unknown> {
  const visibleProgress = input.progress ?? summarizeBaiCodeToolProgress(input)
  return {
    runtime: 'BAI Work',
    workspace: input.thread.workspace,
    status: input.status,
    summary: visibleProgress.summary,
    ...(visibleProgress.detail ? { detail: visibleProgress.detail } : {}),
    ...(typeof input.exitCode === 'number' ? { exit_code: input.exitCode } : {}),
    ...(input.signal ? { signal: input.signal } : {}),
    ...(typeof input.durationMs === 'number' ? { duration_ms: input.durationMs } : {})
  }
}

function looksLikeBaiCodeTraceLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return false
  const withoutBullet = trimmed.replace(/^[-*•]\s+/, '')
  const stripped = stripBaiCodeTraceCalls(withoutBullet)
  return stripped.removedTrace && !stripped.text.trim()
}

function normalizeBaiCodeAssistantText(raw: string, config: BaiRuntimeConfig): string {
  const cleaned = cleanCliOutput(raw, config)
  const stripped = stripBaiCodeTraceCalls(cleaned)
  const lines = stripped.text.split('\n')
  const visible: string[] = []
  let removedTrace = stripped.removedTrace

  for (const line of lines) {
    if (looksLikeBaiCodeTraceLine(line)) {
      removedTrace = true
      continue
    }
    visible.push(line)
  }

  const compact = visible
    .join('\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .join('\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (compact) return normalizeBaiWorkAssistantBranding(compact)
  return removedTrace
    ? 'BAI Work 已完成处理，结果已整理完成。'
    : 'BAI Work 已完成处理。'
}

function baiCliFailureLooksLikeConnectionIssue(text: string): boolean {
  return /RemoteProtocolError|incomplete chunked read|peer closed connection|connection reset|socket hang up|ECONNRESET|ETIMEDOUT|timed out/i.test(text)
}

function isTracebackNoiseLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  return (
    /^Traceback \(most recent call last\):/i.test(trimmed) ||
    /^File "[^"]+", line \d+/i.test(trimmed) ||
    /^\^+$/.test(trimmed) ||
    /^raise\b/.test(trimmed) ||
    /\/site-packages\//.test(trimmed) ||
    /\/python\d+\.\d+\//.test(trimmed) ||
    /^During handling of the above exception/i.test(trimmed) ||
    /^The above exception was the direct cause/i.test(trimmed)
  )
}

function summarizeBaiCodeCliFailure(raw: string, config: BaiRuntimeConfig): BaiCliProgress {
  const cleaned = cleanCliOutput(raw, config)
  if (baiCliFailureLooksLikeConnectionIssue(cleaned)) {
    return {
      summary: '连接中断',
      detail: 'BAI Work 与 BAI 服务的流式连接中断，当前回复没有完整返回。请重试；如果连续出现，换一个模型或稍后再试。'
    }
  }

  const withoutTraceCalls = stripBaiCodeTraceCalls(cleaned).text
  const lines = withoutTraceCalls
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => !isTracebackNoiseLine(line))
  const message = compactRuntimeText(lines.slice(-3).join(' '), 260)
  return {
    summary: '处理失败',
    detail: normalizeBaiWorkAssistantBranding(message || 'BAI Work 运行失败，请稍后重试。')
  }
}

function summarizeBaiCodeToolProgress(input: {
  config: BaiRuntimeConfig
  stdout: string
  stderr: string
  status: 'running' | 'completed' | 'failed'
}): BaiCliProgress {
  if (input.status === 'failed') {
    return summarizeBaiCodeCliFailure(input.stderr || input.stdout || 'BAI Work 处理失败。', input.config)
  }

  const cleaned = cleanCliOutput([input.stdout, input.stderr].filter(Boolean).join('\n'), input.config)
  const actions = baiCliTraceActions(cleaned).slice(-8)

  if (input.status === 'running') {
    const current = actions[actions.length - 1]
    return {
      summary: current ? `正在${current}` : '正在启动任务',
      detail: actions.length > 0
        ? `过程：${actions.join(' -> ')}`
        : '正在等待本地运行时返回进度。'
    }
  }

  return {
    summary: '已完成处理',
    detail: actions.length > 0 ? `过程：${actions.join(' -> ')}` : '处理完成。'
  }
}

function baiCliHeartbeatProgress(startedAt: number): BaiCliProgress {
  const elapsedMs = Math.max(0, Date.now() - startedAt)
  if (elapsedMs < 5_000) return { summary: '正在启动任务', detail: 'BAI Work 已接收请求，正在启动本地运行。' }
  if (elapsedMs < 20_000) return { summary: '正在分析工作区', detail: '本地运行时仍在处理，尚未返回细分步骤。' }
  if (elapsedMs < 60_000) return { summary: '正在执行本地步骤', detail: '任务仍在运行，等待 BAI Work 返回下一步进度。' }
  if (elapsedMs < 180_000) return { summary: '正在等待运行结果', detail: '长任务仍在执行，完成后会继续整理结果。' }
  return { summary: '仍在处理长任务', detail: '本地运行时尚未结束；如果任务需要生成文件或安装依赖，可能需要更长时间。' }
}

function repeatedAgentPrelude(text: string): boolean {
  const counts = new Map<string, number>()
  let total = 0
  for (const sentence of text.split(/[.!?。！？]+/)) {
    const normalized = sentence.replace(/\s+/g, ' ').trim().toLowerCase()
    if (!normalized || !/^(?:let(?:'|’)s\b|让我们|现在让我们|首先让我们)/i.test(normalized)) continue
    total += 1
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
  }
  return total >= 10 && [...counts.values()].some((count) => count >= 5)
}

function endsWithToolPrelude(text: string): boolean {
  const tail = text.replace(/\*+\s*$/, '').trim().slice(-320)
  return (
    /(?:首先|接下来|现在|下面|让我|让我们)[^。！？]{0,180}(?:使用|调用|运行|执行)[^。！？]{0,60}(?:glob|bash|工具)[^。！？]*[。！？]?$/i.test(tail) ||
    /(?:let(?:'|’)s)[^.!?]{0,180}(?:search|run|use|call|find|execute)[^.!?]*[.!?]?$/i.test(tail)
  )
}

function baiCliOutputProblem(
  raw: string,
  config: BaiRuntimeConfig,
  model: string,
  completed: boolean
): BaiCliOutputProblem | null {
  const cleaned = cleanCliOutput(raw, config)
  const stripped = stripBaiCodeTraceCalls(cleaned)
  const visible = stripped.text.replace(/\s+/g, ' ').trim()
  const modelLabel = model.trim() || '当前模型'

  if (repeatedAgentPrelude(visible)) {
    return {
      code: 'bai_code_repetitive_output',
      summary: '已停止重复输出',
      detail: `${modelLabel} 本次没有形成有效的工具调用，并持续返回重复执行旁白。BAI Work 已停止本轮任务，避免继续消耗 Token；请改用支持 OpenAI 兼容工具调用的模型后重试。`
    }
  }
  if (!completed) return null
  if (!visible || (stripped.removedTrace && endsWithToolPrelude(visible))) {
    return {
      code: 'bai_code_missing_final_result',
      summary: '任务未完成',
      detail: 'BAI Code 进程已经结束，但没有返回可验证的最终结果。BAI Work 不会把本次运行标记为完成，也不会声称 PDF 或其他产物已经生成；请检查工作区产物，或改用支持工具调用的模型后重试。'
    }
  }
  return null
}

function estimateTokenCount(text: string): number {
  const normalized = text.trim()
  if (!normalized) return 0
  let cjk = 0
  let other = 0
  for (const char of normalized) {
    if (/\s/.test(char)) continue
    if (/[\u3400-\u9fff\uf900-\ufaff]/.test(char)) cjk += 1
    else other += 1
  }
  return Math.max(1, Math.ceil(cjk * 1.1 + other / 4))
}

function estimateBaiBridgeUsage(prompt: string, completion: string, createdAt: string): BaiBridgeUsage {
  const promptTokens = estimateTokenCount(prompt)
  const completionTokens = estimateTokenCount(completion)
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimated: true,
    createdAt
  }
}

function updateEstimatedTurnUsage(
  thread: BaiBridgeThread,
  turn: BaiBridgeTurn,
  prompt: string,
  completion: string
): void {
  const next = estimateBaiBridgeUsage(prompt, completion, turn.createdAt)
  const previousTotal = turn.usage?.totalTokens
  turn.usage = next
  if (previousTotal === next.totalTokens) return
  appendThreadEvent(thread, { kind: 'usage', turnId: turn.id, usage: threadUsageSnapshot(thread) })
}

function threadUsageSnapshot(thread: BaiBridgeThread): Record<string, unknown> {
  const usageTurns = thread.turns.filter((turn) => turn.usage)
  const promptTokens = usageTurns.reduce((total, turn) => total + (turn.usage?.promptTokens ?? 0), 0)
  const completionTokens = usageTurns.reduce((total, turn) => total + (turn.usage?.completionTokens ?? 0), 0)
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    costUsd: 0,
    costCny: null,
    tokenEconomySavingsTokens: 0,
    turns: usageTurns.length
  }
}

function startManagedExtensionStep(
  thread: BaiBridgeThread,
  turn: BaiBridgeTurn
): BaiBridgeItem {
  const timestamp = nowIso()
  const item: BaiBridgeItem = {
    id: bridgeId('bai_extension_step'),
    turnId: turn.id,
    threadId: thread.id,
    role: 'tool',
    status: 'running',
    createdAt: timestamp,
    kind: 'tool_result',
    toolName: 'bai_work_extensions',
    callId: bridgeId('bai_extension_call'),
    toolKind: 'command_execution',
    summary: '正在准备任务',
    output: {
      runtime: 'BAI Work',
      status: 'running',
      detail: '正在检查可用 commands 和 skills。'
    }
  }
  turn.items.push(item)
  appendThreadEvent(thread, {
    kind: 'tool_call_started',
    turnId: turn.id,
    itemId: item.id,
    item
  })
  return item
}

function finishManagedExtensionStep(
  thread: BaiBridgeThread,
  turn: BaiBridgeTurn,
  item: BaiBridgeItem,
  extensions: BaiRuntimeInstructionBundle
): void {
  const labels = [...extensions.appliedCommands, ...extensions.appliedSkills]
  item.status = 'completed'
  item.finishedAt = nowIso()
  item.summary = labels.length > 0 ? `已加载扩展：${labels.join('、')}` : '任务已准备'
  item.output = {
    runtime: 'BAI Work',
    status: 'completed',
    appliedCommands: extensions.appliedCommands,
    appliedSkills: extensions.appliedSkills,
    detail: labels.length > 0 ? `已加载 ${labels.length} 个相关扩展。` : '未发现需要自动加载的扩展。'
  }
  appendThreadEvent(thread, {
    kind: 'tool_call_finished',
    turnId: turn.id,
    itemId: item.id,
    item
  })
}

function runBaiCodeTurn(input: {
  thread: BaiBridgeThread
  turn: BaiBridgeTurn
  config: BaiRuntimeConfig
  probe: BaiCodeProbe
  settings: AppSettingsV1
}): void {
  void runBaiCodeTurnAsync(input)
}

async function runBaiCodeTurnAsync(input: {
  thread: BaiBridgeThread
  turn: BaiBridgeTurn
  config: BaiRuntimeConfig
  probe: BaiCodeProbe
  settings: AppSettingsV1
}): Promise<void> {
  const extensionStep = startManagedExtensionStep(input.thread, input.turn)
  const extensions = await resolveBaiRuntimeInstructions({
    settings: input.settings,
    workspace: input.thread.workspace,
    prompt: input.turn.prompt,
    displayPrompt: input.turn.displayPrompt
  })
  finishManagedExtensionStep(input.thread, input.turn, extensionStep, extensions)
  if (process.env.BAI_WORK_USE_OPENAI_CHAT_BRIDGE === '1') {
    await runBaiOpenAiChatTurnAsync({ ...input, extensions })
    return
  }
  await runBaiCodeCliTurnAsync({ ...input, extensions })
}

async function runBaiCodeCliTurnAsync(input: {
  thread: BaiBridgeThread
  turn: BaiBridgeTurn
  config: BaiRuntimeConfig
  probe: BaiCodeProbe
  settings: AppSettingsV1
  extensions: BaiRuntimeInstructionBundle
}): Promise<void> {
  const { thread, turn, config, probe, extensions } = input
  if (!probe.installed) {
    failBridgeTurn(thread, turn, 'bai_code_not_installed', probe.message || 'BAI Code CLI is not installed.')
    return
  }
  if (!config.apiKeyConfigured) {
    failBridgeTurn(thread, turn, 'missing_api_key', 'BAI_API_KEY is required before BAI Code can run.')
    return
  }

  try {
    mkdirSync(thread.workspace, { recursive: true })
  } catch {
    failBridgeTurn(thread, turn, 'workspace_unavailable', `BAI Work cannot create or open the workspace: ${thread.workspace}`)
    return
  }

  const startedAt = Date.now()
  const createdAt = nowIso()
  const callId = bridgeId('bai_cli_call')
  const initialProgress = baiCliHeartbeatProgress(startedAt)
  const toolItem: BaiBridgeItem = {
    id: bridgeId('bai_cli_tool'),
    turnId: turn.id,
    threadId: thread.id,
    role: 'tool',
    status: 'running',
    createdAt,
    kind: 'tool_result',
    toolName: 'bai_work',
    callId,
    toolKind: 'command_execution',
    summary: initialProgress.summary,
    output: cliToolOutput({ config, thread, stdout: '', stderr: '', status: 'running', progress: initialProgress })
  }
  turn.items.push(toolItem)
  appendThreadEvent(thread, {
    kind: 'tool_call_started',
    turnId: turn.id,
    itemId: toolItem.id,
    item: toolItem
  })

  const assistantItem: BaiBridgeItem = {
    id: bridgeId('bai_assistant'),
    turnId: turn.id,
    threadId: thread.id,
    role: 'assistant',
    status: 'running',
    createdAt,
    kind: 'assistant_text',
    text: ''
  }
  turn.items.push(assistantItem)

  const prompt = buildBaiCodeCliPrompt(thread, turn, extensions)
  const env = runtimeProcessEnv({
    BAI_API_KEY: config.apiKey,
    BAI_BASE_URL: config.baseUrl,
    BAI_MODEL: turn.model || config.model,
    PYTHONUNBUFFERED: '1'
  })

  let stdout = ''
  let stderr = ''
  const stdoutDecoder = new StringDecoder('utf8')
  const stderrDecoder = new StringDecoder('utf8')
  let outputProblem: BaiCliOutputProblem | null = null
  let emittedStepCount = 0
  updateEstimatedTurnUsage(thread, turn, prompt, '')

  await new Promise<void>((resolve) => {
    let settled = false
    const child = spawn(config.command, ['-p', prompt], {
      cwd: thread.workspace,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    const updateTool = (progress?: BaiCliProgress): void => {
      const nextProgress = progress ?? summarizeBaiCodeToolProgress({ config, stdout, stderr, status: 'running' })
      toolItem.summary = nextProgress.summary
      toolItem.output = cliToolOutput({ config, thread, stdout, stderr, status: 'running', progress: nextProgress })
      thread.updatedAt = nowIso()
      appendThreadEvent(thread, {
        kind: 'item_updated',
        turnId: turn.id,
        itemId: toolItem.id,
        item: toolItem
      })
    }
    const appendStepItems = (): void => {
      const actions = baiCliTraceActions(cleanCliOutput([stdout, stderr].filter(Boolean).join('\n'), config))
      const assistantIndex = turn.items.indexOf(assistantItem)
      for (let index = emittedStepCount; index < actions.length; index += 1) {
        const action = actions[index]
        if (!action) continue
        const timestamp = nowIso()
        const stepItem: BaiBridgeItem = {
          id: bridgeId('bai_cli_step'),
          turnId: turn.id,
          threadId: thread.id,
          role: 'tool',
          status: 'completed',
          createdAt: timestamp,
          finishedAt: timestamp,
          kind: 'tool_result',
          toolName: 'bai_work',
          callId: bridgeId('bai_cli_step_call'),
          toolKind: 'command_execution',
          summary: action,
          output: {
            runtime: 'BAI Work',
            status: 'completed',
            detail: `步骤：${action}`
          }
        }
        if (assistantIndex >= 0) turn.items.splice(assistantIndex + index - emittedStepCount, 0, stepItem)
        else turn.items.push(stepItem)
        appendThreadEvent(thread, {
          kind: 'tool_call_finished',
          turnId: turn.id,
          itemId: stepItem.id,
          item: stepItem
        })
      }
      emittedStepCount = Math.max(emittedStepCount, actions.length)
    }
    const heartbeat = setInterval(() => {
      if (settled) return
      const currentProgress = summarizeBaiCodeToolProgress({ config, stdout, stderr, status: 'running' })
      const progress = currentProgress.summary === '正在启动任务'
        ? baiCliHeartbeatProgress(startedAt)
        : currentProgress
      updateTool(progress)
    }, BAI_CLI_PROGRESS_HEARTBEAT_MS)

    child.stdout.on('data', (chunk) => {
      stdout += stdoutDecoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
      appendStepItems()
      updateTool()
      updateEstimatedTurnUsage(
        thread,
        turn,
        prompt,
        stripBaiCodeTraceCalls(cleanCliOutput(stdout, config)).text
      )
      if (!outputProblem) {
        outputProblem = baiCliOutputProblem(stdout, config, turn.model || config.model, false)
        if (outputProblem) {
          updateTool(outputProblem)
          child.kill('SIGTERM')
        }
      }
    })
    child.stderr.on('data', (chunk) => {
      stderr += stderrDecoder.write(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
      appendStepItems()
      updateTool()
    })
    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearInterval(heartbeat)
      stdout += stdoutDecoder.end()
      stderr += stderrDecoder.end()
      const failureText = `${stderr}${stderr ? '\n' : ''}${requestErrorMessage(error)}`
      appendStepItems()
      toolItem.status = 'failed'
      toolItem.isError = true
      toolItem.finishedAt = nowIso()
      const progress = summarizeBaiCodeToolProgress({
        config,
        stdout,
        stderr: failureText,
        status: 'failed'
      })
      toolItem.summary = progress.summary
      toolItem.output = cliToolOutput({
        config,
        thread,
        stdout,
        stderr: failureText,
        status: 'failed',
        progress,
        durationMs: Date.now() - startedAt
      })
      appendThreadEvent(thread, {
        kind: 'tool_call_finished',
        turnId: turn.id,
        itemId: toolItem.id,
        item: toolItem
      })
      failBridgeTurn(thread, turn, 'bai_code_cli_failed', progress.detail ?? 'BAI Work 运行失败，请稍后重试。')
      resolve()
    })
    child.on('close', (code, signal) => {
      if (settled) return
      settled = true
      clearInterval(heartbeat)
      stdout += stdoutDecoder.end()
      stderr += stderrDecoder.end()
      const finishedAt = nowIso()
      if (code === 0) {
        outputProblem ??= baiCliOutputProblem(stdout, config, turn.model || config.model, true)
      }
      const ok = code === 0 && !outputProblem
      appendStepItems()
      const progress = outputProblem ?? summarizeBaiCodeToolProgress({
          config,
          stdout,
          stderr,
          status: ok ? 'completed' : 'failed'
        })
      toolItem.status = ok ? 'completed' : 'failed'
      toolItem.isError = !ok
      toolItem.finishedAt = finishedAt
      toolItem.summary = progress.summary
      toolItem.output = cliToolOutput({
        config,
        thread,
        stdout,
        stderr,
        status: ok ? 'completed' : 'failed',
        progress,
        exitCode: code,
        signal,
        durationMs: Date.now() - startedAt
      })
      appendThreadEvent(thread, {
        kind: 'tool_call_finished',
        turnId: turn.id,
        itemId: toolItem.id,
        item: toolItem
      })

      if (!ok) {
        assistantItem.status = 'failed'
        assistantItem.finishedAt = finishedAt
        failBridgeTurn(
          thread,
          turn,
          outputProblem?.code ?? 'bai_code_cli_failed',
          outputProblem?.detail ?? progress.detail ?? summarizeBaiCodeCliFailure(
            stderr || stdout || `BAI Work exited with code ${code ?? 'null'}.`,
            config
          ).detail ?? 'BAI Work 运行失败，请稍后重试。'
        )
        resolve()
        return
      }

      const text = normalizeBaiCodeAssistantText(stdout || stderr || 'BAI Work completed this task.', config)
      updateEstimatedTurnUsage(thread, turn, prompt, text)
      appendAssistantText(thread, turn, assistantItem, text)
      assistantItem.status = 'completed'
      assistantItem.finishedAt = finishedAt
      turn.status = 'completed'
      turn.finishedAt = finishedAt
      thread.status = 'idle'
      thread.updatedAt = finishedAt
      appendThreadEvent(thread, { kind: 'turn_completed', turnId: turn.id })
      resolve()
    })
  })
}

async function runBaiOpenAiChatTurnAsync(input: {
  thread: BaiBridgeThread
  turn: BaiBridgeTurn
  config: BaiRuntimeConfig
  probe: BaiCodeProbe
  settings: AppSettingsV1
  extensions: BaiRuntimeInstructionBundle
}): Promise<void> {
  const { thread, turn, config, probe, extensions } = input
  if (!probe.installed) {
    failBridgeTurn(thread, turn, 'bai_code_not_installed', probe.message || 'BAI Code CLI is not installed.')
    return
  }
  if (!config.apiKeyConfigured) {
    failBridgeTurn(thread, turn, 'missing_api_key', 'BAI_API_KEY is required before BAI Code can run.')
    return
  }

  const assistantItem: BaiBridgeItem = {
    id: bridgeId('bai_assistant'),
    turnId: turn.id,
    threadId: thread.id,
    role: 'assistant',
    status: 'running',
    createdAt: nowIso(),
    kind: 'assistant_text',
    text: ''
  }
  turn.items.push(assistantItem)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), BAI_CHAT_TIMEOUT_MS)
  try {
    const messages = buildBaiChatMessages(thread, turn)
    const currentUser = [...messages].reverse().find((message) => message.role === 'user')
    if (currentUser && extensions.instructions) {
      currentUser.content = [
        'BAI Work managed extensions:',
        extensions.instructions,
        'Current user request:',
        currentUser.content
      ].join('\n\n')
    }
    const usagePrompt = messages
      .map((message) => `${message.role}:\n${message.content}`)
      .join('\n\n')
    updateEstimatedTurnUsage(thread, turn, usagePrompt, '')
    const response = await runtimeFetch(chatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        'content-type': 'application/json',
        accept: 'text/event-stream, application/json'
      },
      body: JSON.stringify({
        model: turn.model || config.model,
        messages,
        stream: true,
        temperature: 0,
        max_tokens: 1024
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      failBridgeTurn(
        thread,
        turn,
        'bai_api_failed',
        await responseErrorMessage(response)
      )
      return
    }

    await streamChatCompletionResponse(response, thread, turn, assistantItem, usagePrompt)
    const finishedAt = nowIso()
    assistantItem.status = 'completed'
    assistantItem.finishedAt = finishedAt
    turn.status = 'completed'
    turn.finishedAt = finishedAt
    thread.status = 'idle'
    thread.updatedAt = finishedAt
    if (!assistantItem.text?.trim()) {
      assistantItem.text = '(BAI completed without text output.)'
      appendThreadEvent(thread, {
        kind: 'assistant_text_delta',
        turnId: turn.id,
        itemId: assistantItem.id,
        item: { ...assistantItem, text: assistantItem.text }
      })
    }
    updateEstimatedTurnUsage(thread, turn, usagePrompt, assistantItem.text ?? '')
    appendThreadEvent(thread, { kind: 'turn_completed', turnId: turn.id })
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    failBridgeTurn(
      thread,
      turn,
      isAbort ? 'bai_api_timeout' : 'bai_api_request_failed',
      isAbort
        ? `BAI did not return a response within ${Math.round(BAI_CHAT_TIMEOUT_MS / 1000)} seconds. Check BAI_BASE_URL, the selected model, and network access.`
        : requestErrorMessage(error)
    )
  } finally {
    clearTimeout(timeout)
  }
}

function runtimeFetch(input: string, init: RequestInit): Promise<Response> {
  const electronNetFetch = electronNetFetchIfAvailable()
  return electronNetFetch ? electronNetFetch(input, init) : fetch(input, init)
}

function electronNetFetchIfAvailable(): ((input: string, init: RequestInit) => Promise<Response>) | null {
  if (!(process as NodeJS.Process & { versions?: NodeJS.ProcessVersions }).versions?.electron) return null
  try {
    const electron = require('electron') as {
      net?: { fetch?: (input: string, init?: RequestInit) => Promise<Response> }
    }
    return typeof electron.net?.fetch === 'function'
      ? (input, init) => electron.net?.fetch?.(input, init) ?? fetch(input, init)
      : null
  } catch {
    return null
  }
}

function requestErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = (error as Error & { cause?: unknown }).cause
  if (cause instanceof Error && cause.message.trim()) {
    return `${error.message}: ${cause.message}`
  }
  if (typeof cause === 'object' && cause !== null) {
    const code = 'code' in cause ? String((cause as { code?: unknown }).code || '') : ''
    const message = 'message' in cause ? String((cause as { message?: unknown }).message || '') : ''
    const detail = [code, message].filter(Boolean).join(' ')
    if (detail) return `${error.message}: ${detail}`
  }
  return error.message
}

function chatCompletionsUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/chat/completions`
}

async function responseErrorMessage(response: Response): Promise<string> {
  const raw = await response.text().catch(() => '')
  if (!raw.trim()) return `BAI API request failed with HTTP ${response.status}.`
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: unknown }; message?: unknown }
    const message = parsed.error?.message ?? parsed.message
    if (typeof message === 'string' && message.trim()) {
      return `BAI API request failed with HTTP ${response.status}: ${message.trim()}`
    }
  } catch {
    // Fall through to a trimmed plain-text body.
  }
  return `BAI API request failed with HTTP ${response.status}: ${raw.slice(0, 800).trim()}`
}

async function streamChatCompletionResponse(
  response: Response,
  thread: BaiBridgeThread,
  turn: BaiBridgeTurn,
  assistantItem: BaiBridgeItem,
  usagePrompt: string
): Promise<void> {
  const contentType = response.headers.get('content-type') || ''
  if (!response.body || !contentType.includes('text/event-stream')) {
    const body = await response.json().catch(() => null) as {
      choices?: Array<{ message?: { content?: unknown }, delta?: { content?: unknown } }>
    } | null
    const text = body?.choices
      ?.map((choice) => choice.message?.content ?? choice.delta?.content)
      .filter((part): part is string => typeof part === 'string')
      .join('') ?? ''
    appendAssistantText(thread, turn, assistantItem, text, usagePrompt)
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    let separator = buffer.indexOf('\n\n')
    while (separator >= 0) {
      const block = buffer.slice(0, separator)
      buffer = buffer.slice(separator + 2)
      processSseBlock(block, thread, turn, assistantItem, usagePrompt)
      separator = buffer.indexOf('\n\n')
    }
    if (done) {
      if (buffer.trim()) processSseBlock(buffer, thread, turn, assistantItem, usagePrompt)
      return
    }
  }
}

function processSseBlock(
  block: string,
  thread: BaiBridgeThread,
  turn: BaiBridgeTurn,
  assistantItem: BaiBridgeItem,
  usagePrompt: string
): void {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')
    .trim()
  if (!data || data === '[DONE]') return
  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: unknown }, message?: { content?: unknown } }>
    }
    const text = parsed.choices
      ?.map((choice) => choice.delta?.content ?? choice.message?.content)
      .filter((part): part is string => typeof part === 'string')
      .join('') ?? ''
    appendAssistantText(thread, turn, assistantItem, text, usagePrompt)
  } catch {
    // Ignore malformed stream keepalive chunks.
  }
}

function appendAssistantText(
  thread: BaiBridgeThread,
  turn: BaiBridgeTurn,
  assistantItem: BaiBridgeItem,
  text: string,
  usagePrompt?: string
): void {
  if (!text) return
  assistantItem.text = `${assistantItem.text ?? ''}${text}`
  if (usagePrompt) updateEstimatedTurnUsage(thread, turn, usagePrompt, assistantItem.text)
  thread.updatedAt = nowIso()
  appendThreadEvent(thread, {
    kind: 'assistant_text_delta',
    turnId: turn.id,
    itemId: assistantItem.id,
    item: { ...assistantItem, text }
  })
}

function failBridgeTurn(
  thread: BaiBridgeThread,
  turn: BaiBridgeTurn,
  code: string,
  message: string
): void {
  const finishedAt = nowIso()
  const errorItem: BaiBridgeItem = {
    id: bridgeId('bai_error'),
    turnId: turn.id,
    threadId: thread.id,
    role: 'system',
    status: 'failed',
    createdAt: finishedAt,
    finishedAt,
    kind: 'error',
    code,
    message,
    severity: 'error'
  }
  turn.items.push(errorItem)
  turn.status = 'failed'
  turn.finishedAt = finishedAt
  turn.error = message
  thread.status = 'idle'
  thread.updatedAt = finishedAt
  appendThreadEvent(thread, {
    kind: 'turn_failed',
    turnId: turn.id,
    itemId: errorItem.id,
    code,
    message,
    severity: 'error'
  })
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += buffer.length
    if (total > REQUEST_BODY_LIMIT_BYTES) {
      throw new Error('request body is too large')
    }
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  if (!raw) return {}
  const parsed = JSON.parse(raw) as unknown
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {}
}

function stringFrom(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function baiCodeUnavailablePayload(config: BaiRuntimeConfig, probe: BaiCodeProbe): Record<string, unknown> {
  const installHint = probe.installed
    ? `Detected ${probe.command}${probe.version ? ` (${probe.version})` : ''}.`
    : `Install BAI Code first: curl -fsSL https://raw.githubusercontent.com/BAI-labs/BAI-tools/refs/heads/main/scripts/baicode_install.sh -o baicode_install.sh && bash baicode_install.sh`
  return {
    code: probe.installed ? 'bai_code_service_api_unavailable' : 'bai_code_not_installed',
    message: `${installHint} ${BAI_CODE_SESSION_API_UNAVAILABLE}`,
    details: {
      command: config.command,
      baseUrl: config.baseUrl,
      model: config.model,
      apiKeyConfigured: config.apiKeyConfigured,
      officialCli: 'baicode',
      requiredDesktopApis: [
        'serve/health',
        'session create/list/read',
        'event stream',
        'permission reply',
        'question reply'
      ]
    }
  }
}

type UsageAggregate = {
  inputTokens: number
  outputTokens: number
  turns: number
  threadIds: Set<string>
  days: Set<string>
}

type UsageRecord = {
  thread: BaiBridgeThread
  turn: BaiBridgeTurn
  day: string
  model: string
}

function createUsageAggregate(): UsageAggregate {
  return {
    inputTokens: 0,
    outputTokens: 0,
    turns: 0,
    threadIds: new Set(),
    days: new Set()
  }
}

function addUsageRecord(aggregate: UsageAggregate, record: UsageRecord): void {
  const usage = record.turn.usage
  if (!usage) return
  aggregate.inputTokens += usage.promptTokens
  aggregate.outputTokens += usage.completionTokens
  aggregate.turns += 1
  aggregate.threadIds.add(record.thread.id)
  aggregate.days.add(record.day)
}

function usageBucket(aggregate: UsageAggregate, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const totalTokens = aggregate.inputTokens + aggregate.outputTokens
  return {
    ...extra,
    input_tokens: aggregate.inputTokens,
    output_tokens: aggregate.outputTokens,
    reasoning_tokens: 0,
    cached_tokens: 0,
    cache_miss_tokens: 0,
    cache_hit_rate: null,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    total_tokens: totalTokens,
    cost_usd: 0,
    cost_cny: null,
    token_economy_savings_tokens: 0,
    usage_estimated: true,
    cache_telemetry_available: false,
    token_economy_telemetry_available: false,
    turns: aggregate.turns,
    count: aggregate.turns,
    thread_count: aggregate.threadIds.size
  }
}

function dateInTimezone(iso: string | undefined, timezone: string): string {
  const date = iso ? new Date(iso) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10)
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date)
    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value
    if (year && month && day) return `${year}-${month}-${day}`
  } catch {
    // Fall through to UTC if the client sends an unknown timezone.
  }
  return date.toISOString().slice(0, 10)
}

function usageDateRange(from: string, to: string): string[] {
  if (!from || !to || from > to) return []
  const days: string[] = []
  const cursor = new Date(`${from}T00:00:00.000Z`)
  const end = new Date(`${to}T00:00:00.000Z`)
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return []
  for (let index = 0; cursor <= end && index < 370; index += 1) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

function usageRecords(url: URL, timezone: string): UsageRecord[] {
  const from = url.searchParams.get('from') || ''
  const to = url.searchParams.get('to') || ''
  const threadId = url.searchParams.get('thread_id') || ''
  const records: UsageRecord[] = []
  for (const thread of bridgeStore.threads.values()) {
    if (thread.status === 'deleted') continue
    if (threadId && thread.id !== threadId) continue
    for (const turn of thread.turns) {
      if (!turn.usage) continue
      const day = dateInTimezone(turn.usage.createdAt || turn.finishedAt || turn.createdAt, timezone)
      if (from && day < from) continue
      if (to && day > to) continue
      records.push({
        thread,
        turn,
        day,
        model: turn.model || thread.model || 'unknown'
      })
    }
  }
  return records
}

function aggregateUsage(records: UsageRecord[]): UsageAggregate {
  const aggregate = createUsageAggregate()
  for (const record of records) addUsageRecord(aggregate, record)
  return aggregate
}

function usageResponse(url: URL): Record<string, unknown> {
  const groupBy = url.searchParams.get('group_by') || 'thread'
  const from = url.searchParams.get('from') || ''
  const to = url.searchParams.get('to') || ''
  const timezone = url.searchParams.get('timezone') || 'UTC'
  const records = usageRecords(url, timezone)
  const totalsAggregate = aggregateUsage(records)
  const activeDays = totalsAggregate.days.size

  if (groupBy === 'day') {
    const range = usageDateRange(from, to)
    const dayKeys = range.length > 0 ? range : [...totalsAggregate.days].sort()
    const byDay = new Map<string, UsageAggregate>()
    for (const day of dayKeys) byDay.set(day, createUsageAggregate())
    for (const record of records) {
      const aggregate = byDay.get(record.day) ?? createUsageAggregate()
      addUsageRecord(aggregate, record)
      byDay.set(record.day, aggregate)
    }
    const buckets = dayKeys.map((day) => usageBucket(byDay.get(day) ?? createUsageAggregate(), { date: day }))
    return {
      group_by: 'day',
      from,
      to,
      timezone,
      buckets,
      totals: {
        ...usageBucket(totalsAggregate),
        days: dayKeys.length,
        active_days: activeDays
      }
    }
  }

  if (groupBy === 'model') {
    const byModel = new Map<string, UsageAggregate>()
    const byDay = new Map<string, UsageAggregate>()
    for (const record of records) {
      const modelAggregate = byModel.get(record.model) ?? createUsageAggregate()
      addUsageRecord(modelAggregate, record)
      byModel.set(record.model, modelAggregate)
      const dayAggregate = byDay.get(record.day) ?? createUsageAggregate()
      addUsageRecord(dayAggregate, record)
      byDay.set(record.day, dayAggregate)
    }
    const range = usageDateRange(from, to)
    const dayKeys = range.length > 0 ? range : [...byDay.keys()].sort()
    const buckets = [...byModel.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([model, aggregate]) => usageBucket(aggregate, { model }))
    const days = dayKeys.map((day) => usageBucket(byDay.get(day) ?? createUsageAggregate(), { date: day }))
    return {
      group_by: 'model',
      from,
      to,
      timezone,
      buckets,
      days,
      totals: {
        ...usageBucket(totalsAggregate),
        days: dayKeys.length,
        active_days: activeDays
      }
    }
  }

  const byThread = new Map<string, UsageAggregate>()
  for (const record of records) {
    const aggregate = byThread.get(record.thread.id) ?? createUsageAggregate()
    addUsageRecord(aggregate, record)
    byThread.set(record.thread.id, aggregate)
  }
  const buckets = [...byThread.entries()].map(([threadId, aggregate]) => {
    const thread = bridgeStore.threads.get(threadId)
    return usageBucket(aggregate, {
      thread_id: threadId,
      id: threadId,
      key: threadId,
      label: thread?.title ?? threadId
    })
  })
  return {
    group_by: groupBy,
    from,
    to,
    timezone,
    buckets,
    totals: {
      ...usageBucket(totalsAggregate),
      days: totalsAggregate.days.size,
      active_days: activeDays
    }
  }
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  })
  res.end(payload)
}

void onUnexpectedBaiWorkExit

export const baiWorkAdapterTestInternals = {
  effectiveBaiRuntimeConfig,
  probeBaiCodeCli,
  runtimeInfo,
  baiCodeUnavailablePayload,
  buildBaiChatMessages,
  bundledBaiCodeCommand,
  findOfficialWheelhouse,
  officialRuntimePythonCandidates,
  officialRuntimeVenvCommand,
  officialRuntimeVenvPython,
  officialWheelPlatformTag,
  preferredResponseLanguageInstruction,
  runtimeSearchPath,
  resolveAvailablePort: baiWorkRuntimeAdapter.resolveAvailablePort
}
