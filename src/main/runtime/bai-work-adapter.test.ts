import { describe, expect, it, vi } from 'vitest'
import { createServer } from 'node:http'
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { delimiter, join } from 'node:path'
import { defaultKunRuntimeSettings, type AppSettingsV1 } from '../../shared/app-settings'
import {
  DEFAULT_BAI_BASE_URL,
  DEFAULT_BAI_CODE_COMMAND,
  DEFAULT_BAI_MODEL,
  baiWorkRuntimeAdapter,
  baiWorkAdapterTestInternals
} from './bai-work-adapter'

vi.mock('../services/skill-service', () => ({
  listGuiSkills: vi.fn(async () => ({ ok: true, skills: [] }))
}))

const itWithPosixFakeCli = process.platform === 'win32' ? it.skip : it

function settingsWithRuntimePatch(
  patch: Partial<ReturnType<typeof defaultKunRuntimeSettings>> = {}
): AppSettingsV1 {
  return {
    agents: {
      kun: {
        ...defaultKunRuntimeSettings(45991),
        ...patch
      }
    },
    provider: {
      apiKey: 'sk-provider-test-key',
      baseUrl: DEFAULT_BAI_BASE_URL,
      providers: []
    }
  } as unknown as AppSettingsV1
}

async function getFreePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return typeof address === 'object' && address ? address.port : 0
}

type TurnDetailForTest = {
  id: string
  status: string
  error?: string
  items: Array<{
    role: string
    text?: string
    output?: unknown
    summary?: string
    toolName?: string
    message?: string
    code?: string
  }>
}

type UsageResponseForTest = {
  buckets?: Array<Record<string, unknown>>
  totals?: Record<string, unknown>
}

async function waitForCompletedTurn(
  port: number,
  threadId: string,
  turnId: string
): Promise<TurnDetailForTest | undefined> {
  let detail = {} as { turns?: TurnDetailForTest[] }
  for (let index = 0; index < 20; index += 1) {
    const detailResponse = await fetch(`http://127.0.0.1:${port}/v1/threads/${threadId}`)
    detail = await detailResponse.json() as typeof detail
    const turn = detail.turns?.find((item) => item.id === turnId)
    if (turn?.status === 'completed') return turn
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  return detail.turns?.find((item) => item.id === turnId)
}

async function waitForFailedTurn(
  port: number,
  threadId: string,
  turnId: string
): Promise<TurnDetailForTest | undefined> {
  let detail = {} as { turns?: TurnDetailForTest[] }
  for (let index = 0; index < 20; index += 1) {
    const detailResponse = await fetch(`http://127.0.0.1:${port}/v1/threads/${threadId}`)
    detail = await detailResponse.json() as typeof detail
    const turn = detail.turns?.find((item) => item.id === turnId)
    if (turn?.status === 'failed') return turn
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  return detail.turns?.find((item) => item.id === turnId)
}

describe('BAI Work runtime adapter', () => {
  it('resolves BAI Code command, paths, and official BAI API defaults', () => {
    const config = baiWorkAdapterTestInternals.effectiveBaiRuntimeConfig(settingsWithRuntimePatch())

    expect(config.command).toMatch(/baicode$/)
    expect(config.port).toBe(45991)
    expect(config.dataDir).toContain('.bai-work')
    expect(config.baseUrl).toBe(DEFAULT_BAI_BASE_URL)
    expect(config.model).toBe(DEFAULT_BAI_MODEL)
    expect(config.apiKeyConfigured).toBe(true)
  })

  it('prefers the bundled BAI Code runtime when present', () => {
    const bundled = baiWorkAdapterTestInternals.bundledBaiCodeCommand()

    if (process.platform === 'darwin' && process.arch === 'x64') {
      expect(bundled).toContain('resources/bai-code-runtime/bin/baicode')
    } else {
      expect(bundled).toBeNull()
    }
  })

  it('maps official BAI Code wheels and venv executables for Apple Silicon and Windows', () => {
    const officialRoot = join(process.cwd(), 'resources', 'bai-code-official')

    expect(baiWorkAdapterTestInternals.officialWheelPlatformTag('darwin', 'arm64'))
      .toBe('macosx_11_0_arm64')
    expect(baiWorkAdapterTestInternals.officialWheelPlatformTag('win32', 'x64'))
      .toBe('win_amd64')
    expect(baiWorkAdapterTestInternals.officialWheelPlatformTag('darwin', 'x64')).toBeNull()
    expect(baiWorkAdapterTestInternals.findOfficialWheelhouse(
      officialRoot,
      'macosx_11_0_arm64',
      'cp311'
    )).toContain('macosx_11_0_arm64-cp311')
    expect(baiWorkAdapterTestInternals.findOfficialWheelhouse(
      officialRoot,
      'win_amd64',
      'cp311'
    )).toContain('win_amd64-cp311')
    expect(baiWorkAdapterTestInternals.officialRuntimeVenvCommand(
      'C:\\Users\\tester\\.bai-work\\runtime',
      'win32'
    )).toBe('C:\\Users\\tester\\.bai-work\\runtime\\Scripts\\baicode.exe')
  })

  it('probes version-specific Windows Python launchers when the default is unsupported', () => {
    const candidates = baiWorkAdapterTestInternals.officialRuntimePythonCandidates('win32')

    expect(candidates).toContainEqual({ command: 'py', argsPrefix: ['-3.13'] })
    expect(candidates).toContainEqual({ command: 'py', argsPrefix: ['-3.10'] })
    expect(candidates).toContainEqual({ command: 'python3.11', argsPrefix: [] })
  })

  it('adds user bin directories to the runtime PATH for local tools such as RTK', () => {
    const path = baiWorkAdapterTestInternals.runtimeSearchPath(['/usr/bin', '/bin'].join(delimiter))

    expect(path.split(delimiter)).toEqual(expect.arrayContaining([
      '/usr/bin',
      '/bin',
      join(homedir(), '.local', 'bin')
    ]))
  })

  it('honors an explicit BAI Code executable path override', () => {
    const config = baiWorkAdapterTestInternals.effectiveBaiRuntimeConfig(settingsWithRuntimePatch({
      binaryPath: '/Applications/BAI Code.app/Contents/MacOS/baicode'
    }))

    expect(config.command).toBe('/Applications/BAI Code.app/Contents/MacOS/baicode')
  })

  it('moves to an available port instead of attaching to an occupied legacy runtime port', async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200)
      res.end('legacy')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    const occupiedPort = typeof address === 'object' && address ? address.port : 0

    try {
      const resolved = await baiWorkAdapterTestInternals.resolveAvailablePort(occupiedPort)
      expect(resolved.changed).toBe(true)
      expect(resolved.port).not.toBe(occupiedPort)
      expect(resolved.message).toContain(String(occupiedPort))
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

  it('reports the documented CLI gap instead of pretending an old runtime is BAI Code', () => {
    const config = baiWorkAdapterTestInternals.effectiveBaiRuntimeConfig(settingsWithRuntimePatch())
    const payload = baiWorkAdapterTestInternals.baiCodeUnavailablePayload(config, {
      installed: false,
      command: DEFAULT_BAI_CODE_COMMAND,
      version: '',
      message: 'command not found'
    })
    const serialized = JSON.stringify(payload)

    expect(payload).toMatchObject({
      code: 'bai_code_not_installed',
      details: {
        command: config.command,
        baseUrl: DEFAULT_BAI_BASE_URL,
        model: DEFAULT_BAI_MODEL,
        officialCli: 'baicode'
      }
    })
    expect(serialized).toContain('baicode_install.sh')
    expect(serialized).toContain('session, event, permission, and question APIs')
    expect(serialized).not.toContain(['Mi', 'Mo-Code'].join(''))
    expect(serialized).not.toContain(['Xiao', 'mi Mi', 'Mo'].join(''))
  })

  it('exposes BAI provider runtime info with CLI serve marked unavailable', () => {
    const config = baiWorkAdapterTestInternals.effectiveBaiRuntimeConfig(settingsWithRuntimePatch())
    const info = baiWorkAdapterTestInternals.runtimeInfo(config, {
      installed: true,
      command: DEFAULT_BAI_CODE_COMMAND,
      version: 'baicode 1.0.0',
      message: ''
    })

    expect(info).toMatchObject({
      provider: {
        id: 'bai',
        name: 'BAI',
        baseUrl: DEFAULT_BAI_BASE_URL,
        apiKeyConfigured: true
      },
      capabilities: {
        cli: {
          run: { available: true },
          chat: { available: true },
          serve: { available: false }
        }
      }
    })
  })

  itWithPosixFakeCli('serves thread APIs through the BAI Code CLI bridge when the CLI is available', async () => {
    const tempRoot = join(process.cwd(), 'work', 'bai-adapter-test')
    const binPath = join(tempRoot, 'baicode')
    mkdirSync(tempRoot, { recursive: true })
    writeFileSync(binPath, '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "baicode fake 0.0.0"; exit 0; fi\necho "fake BAI Code response"\n')
    chmodSync(binPath, 0o755)
    const port = await getFreePort()
    const settings = settingsWithRuntimePatch({ binaryPath: binPath, port })

    try {
      await baiWorkRuntimeAdapter.ensureRunning(settings)
      const response = await fetch(`http://127.0.0.1:${port}/v1/threads?limit=1`)
      const body = await response.json() as { threads?: unknown[]; code?: string }

      expect(response.status).toBe(200)
      expect(body).toEqual({ threads: [] })
    } finally {
      await baiWorkRuntimeAdapter.stopAndWait()
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  itWithPosixFakeCli('runs turns through the BAI Code CLI bridge and carries conversation context forward', async () => {
    const tempRoot = join(process.cwd(), 'work', 'bai-adapter-chat-test')
    const binPath = join(tempRoot, 'baicode')
    const argsLog = join(tempRoot, 'args.log')
    const envLog = join(tempRoot, 'env.log')
    const cwdLog = join(tempRoot, 'cwd.log')
    const counterPath = join(tempRoot, 'counter')
    mkdirSync(tempRoot, { recursive: true })
    writeFileSync(binPath, `#!/bin/sh
if [ "$1" = "--version" ]; then echo "baicode fake 0.0.0"; exit 0; fi
printf '%s\\n' "$@" >> '${argsLog}'
printf '%s\\n' "$PWD" >> '${cwdLog}'
printf '%s|%s|%s\\n' "$BAI_API_KEY" "$BAI_BASE_URL" "$BAI_MODEL" >> '${envLog}'
if [ -f '${counterPath}' ]; then
  echo "bash(command='ls -R math_model_test')"
  echo "second answer from CLI"
	else
	  touch '${counterPath}'
	  echo "好的，开始准备。 * bash(command='mkdir -p math_model_test') 我已经完成目录准备。"
	  echo "write_file(content='...', file_path='math_model_test/generated.py')"
	  echo "你好！我是 BAI code，你的 AI 编程助手。"
	  echo "first answer from CLI"
	fi
	`)
    chmodSync(binPath, 0o755)
    const apiBaseUrl = 'http://127.0.0.1:49999/v1'
    const runtimeDefaults = defaultKunRuntimeSettings()
    const port = await getFreePort()
    const settings = settingsWithRuntimePatch({
      binaryPath: binPath,
      port,
      model: 'test-model',
      mimo: {
        ...runtimeDefaults.mimo,
        apiKey: 'sk-test',
        baseUrl: apiBaseUrl,
        model: 'test-model',
        metadata: {
          ...runtimeDefaults.mimo.metadata,
          base_url: apiBaseUrl
        }
      }
    })

    try {
      await baiWorkRuntimeAdapter.ensureRunning(settings)
      const threadResponse = await fetch(`http://127.0.0.1:${port}/v1/threads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace: process.cwd(), title: 'chat bridge smoke' })
      })
      const thread = await threadResponse.json() as { id: string }
      const turnResponse = await fetch(`http://127.0.0.1:${port}/v1/threads/${thread.id}/turns`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: 'Reply exactly OK.' })
      })
      const turn = await turnResponse.json() as { turnId: string }

	      const completedTurn = await waitForCompletedTurn(port, thread.id, turn.turnId)
	      const assistantText = completedTurn?.items.find((item) => item.role === 'assistant')?.text
	      const toolItem = completedTurn?.items.find((item) => item.toolName === 'bai_work')
	      const toolSummaries = completedTurn?.items
	        .filter((item) => item.role === 'tool' && item.toolName === 'bai_work')
	        .map((item) => item.summary)
	      const toolOutput = JSON.stringify(toolItem?.output)
	      expect(completedTurn?.status).toBe('completed')
	      expect(toolItem?.toolName).toBe('bai_work')
	      expect(toolItem?.summary).toBe('已完成处理')
	      expect(toolSummaries).toEqual(expect.arrayContaining([
	        '准备工作目录',
	        '写入 generated.py'
	      ]))
	      expect(toolOutput).toContain('"runtime":"BAI Work"')
	      expect(toolOutput).not.toContain('BAI Code')
	      expect(assistantText).toContain('我是 BAI Work')
	      expect(assistantText).not.toContain('我是 BAI code')
	      expect(assistantText).toContain('我已经完成目录准备')
	      expect(assistantText).toContain('first answer from CLI')
	      expect(assistantText).not.toContain('bash(command=')
	      expect(assistantText).not.toContain('write_file(')
      expect(toolOutput).toContain('已完成处理')
      expect(toolOutput).toContain('准备工作目录')
      expect(toolOutput).toContain('写入 generated.py')
      expect(toolOutput).not.toContain('bash(command=')
      expect(toolOutput).not.toContain('write_file(')

      const usageResponse = await fetch(`http://127.0.0.1:${port}/v1/usage?group_by=thread&thread_id=${thread.id}`)
      const usage = await usageResponse.json() as UsageResponseForTest
      expect(usage.buckets?.[0]).toMatchObject({
        thread_id: thread.id,
        turns: 1,
        cost_usd: 0,
        usage_estimated: true,
        cache_telemetry_available: false
      })
      expect(Number(usage.buckets?.[0]?.total_tokens)).toBeGreaterThan(0)

      const continueResponse = await fetch(`http://127.0.0.1:${port}/v1/threads/${thread.id}/turns`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: '继续' })
      })
      const continueTurn = await continueResponse.json() as { turnId: string }
      const completedContinueTurn = await waitForCompletedTurn(port, thread.id, continueTurn.turnId)

      expect(completedContinueTurn?.status).toBe('completed')
      const continueAssistantText = completedContinueTurn?.items.find((item) => item.role === 'assistant')?.text
      const continueToolOutput = JSON.stringify(completedContinueTurn?.items.find((item) => item.role === 'tool')?.output)
      expect(continueAssistantText).toContain('second answer from CLI')
      expect(continueAssistantText).not.toContain('bash(command=')
      expect(continueToolOutput).not.toContain('bash(command=')

	      const args = readFileSync(argsLog, 'utf8')
	      const env = readFileSync(envLog, 'utf8')
	      const cwd = readFileSync(cwdLog, 'utf8')
	      expect(args).toContain('-p')
	      expect(args).toContain('You are BAI Work, the desktop AI workbench assistant.')
	      expect(args).toContain('Do not call yourself BAI Code')
	      expect(args).toContain('Reply exactly OK.')
	      expect(args).toContain('first answer from CLI')
      expect(args).toContain('继续')
      expect(env).toContain(`sk-test|${apiBaseUrl}|test-model`)
      expect(cwd.trim().split('\n')).toEqual([process.cwd(), process.cwd()])
    } finally {
      await baiWorkRuntimeAdapter.stopAndWait()
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  itWithPosixFakeCli('publishes live CLI steps and estimated usage before a long turn completes', async () => {
    const tempRoot = join(process.cwd(), 'work', 'bai-adapter-live-progress-test')
    const workspace = join(tempRoot, 'new-workspace')
    const binPath = join(tempRoot, 'baicode')
    mkdirSync(tempRoot, { recursive: true })
    writeFileSync(binPath, `#!/bin/sh
if [ "$1" = "--version" ]; then echo "baicode fake 0.0.0"; exit 0; fi
echo "bash(command='mkdir -p report')"
sleep 0.25
echo "write_file(content='done', file_path='report/result.md')"
echo "* read_file(file_path='/Users/mac/Documents/MIMO Work)"
sleep 0.10
echo "BAI Work 已完成报告。"
`)
    chmodSync(binPath, 0o755)
    const port = await getFreePort()
    const settings = settingsWithRuntimePatch({ binaryPath: binPath, port })

    try {
      await baiWorkRuntimeAdapter.ensureRunning(settings)
      const threadResponse = await fetch(`http://127.0.0.1:${port}/v1/threads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace, title: 'live progress smoke' })
      })
      const thread = await threadResponse.json() as { id: string }
      const turnResponse = await fetch(`http://127.0.0.1:${port}/v1/threads/${thread.id}/turns`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: '生成报告' })
      })
      const turn = await turnResponse.json() as { turnId: string }

      await new Promise((resolve) => setTimeout(resolve, 80))
      const runningResponse = await fetch(`http://127.0.0.1:${port}/v1/threads/${thread.id}`)
      const runningDetail = await runningResponse.json() as { turns?: Array<TurnDetailForTest & { usage?: { totalTokens?: number } }> }
      const runningTurn = runningDetail.turns?.find((item) => item.id === turn.turnId)
      expect(runningTurn?.status).toBe('running')
      expect(runningTurn?.items.map((item) => item.summary)).toContain('准备工作目录')
      expect(runningTurn?.usage?.totalTokens).toBeGreaterThan(0)
      expect(existsSync(workspace)).toBe(true)

      const completedTurn = await waitForCompletedTurn(port, thread.id, turn.turnId)
      const assistantIndex = completedTurn?.items.findIndex((item) => item.role === 'assistant') ?? -1
      const stepIndexes = completedTurn?.items
        .map((item, index) => item.role === 'tool' && item.summary !== '已完成处理' ? index : -1)
        .filter((index) => index >= 0) ?? []
      expect(completedTurn?.items.map((item) => item.summary)).toEqual(expect.arrayContaining([
        '准备工作目录',
        '写入 result.md',
        '读取文件'
      ]))
      expect(completedTurn?.items.find((item) => item.role === 'assistant')?.text).not.toContain('read_file(')
      expect(stepIndexes.every((index) => index < assistantIndex)).toBe(true)
    } finally {
      await baiWorkRuntimeAdapter.stopAndWait()
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })

  itWithPosixFakeCli('compresses BAI Code streaming tracebacks into a user-safe connection error', async () => {
    const tempRoot = join(process.cwd(), 'work', 'bai-adapter-failure-test')
    const binPath = join(tempRoot, 'baicode')
    mkdirSync(tempRoot, { recursive: true })
    writeFileSync(binPath, `#!/bin/sh
if [ "$1" = "--version" ]; then echo "baicode fake 0.0.0"; exit 0; fi
cat >&2 <<'TRACE'
Traceback (most recent call last):
  File "/Users/mac/Documents/MIMO Work/BAI-Work-macOS-Intel/dist/mac/BAI Work.app/Contents/Resources/BAI-Code-Runtime/site-packages/httpcore/_sync/http11.py", line 203, in _receive_response_body
    event = self._receive_event(timeout=timeout)
            ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
httpcore.RemoteProtocolError: peer closed connection without sending complete message body (incomplete chunked read)
TRACE
exit 1
`)
    chmodSync(binPath, 0o755)
    const port = await getFreePort()
    const settings = settingsWithRuntimePatch({ binaryPath: binPath, port })

    try {
      await baiWorkRuntimeAdapter.ensureRunning(settings)
      const threadResponse = await fetch(`http://127.0.0.1:${port}/v1/threads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ workspace: process.cwd(), title: 'failure smoke' })
      })
      const thread = await threadResponse.json() as { id: string }
      const turnResponse = await fetch(`http://127.0.0.1:${port}/v1/threads/${thread.id}/turns`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: '你好' })
      })
      const turn = await turnResponse.json() as { turnId: string }
      const failedTurn = await waitForFailedTurn(port, thread.id, turn.turnId)
      const systemError = failedTurn?.items.find((item) => item.role === 'system')
      const toolItem = failedTurn?.items.find((item) => item.toolName === 'bai_work')
      const serialized = JSON.stringify(failedTurn)

      expect(failedTurn?.status).toBe('failed')
      expect(systemError?.message).toContain('BAI Work 与 BAI 服务的流式连接中断')
      expect(toolItem?.summary).toBe('连接中断')
      expect(JSON.stringify(toolItem?.output)).toContain('请重试')
      expect(serialized).not.toContain('Traceback')
      expect(serialized).not.toContain('site-packages')
      expect(serialized).not.toContain('RemoteProtocolError')
      expect(serialized).not.toContain('incomplete chunked read')
    } finally {
      await baiWorkRuntimeAdapter.stopAndWait()
      rmSync(tempRoot, { recursive: true, force: true })
    }
  })
})
