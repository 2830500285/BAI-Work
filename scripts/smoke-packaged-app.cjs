#!/usr/bin/env node

const { spawn, spawnSync } = require('node:child_process')
const { existsSync, mkdirSync, mkdtempSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')

const executableArg = process.argv[2]
if (!executableArg) {
  console.error('Usage: node scripts/smoke-packaged-app.cjs <packaged-executable>')
  process.exit(1)
}

const executable = resolve(executableArg)
if (!existsSync(executable)) {
  console.error(`[packaged-smoke] Executable not found: ${executable}`)
  process.exit(1)
}

const timeoutMs = Number.parseInt(process.env.BAI_WORK_SMOKE_TIMEOUT_MS || '240000', 10)
const candidatePorts = Array.from({ length: 12 }, (_, index) => 8899 + index)
const tempRoot = mkdtempSync(join(tmpdir(), 'bai-work-packaged-smoke-'))
const homeDir = join(tempRoot, 'home')
const userDataDir = join(tempRoot, 'user-data')
const appDataDir = join(tempRoot, 'app-data')
const localAppDataDir = join(tempRoot, 'local-app-data')
for (const dir of [homeDir, userDataDir, appDataDir, localAppDataDir]) {
  mkdirSync(dir, { recursive: true })
}

let stdout = ''
let stderr = ''
let exitCode = null
let exitSignal = null
const child = spawn(executable, ['--disable-gpu', `--user-data-dir=${userDataDir}`], {
  env: {
    ...process.env,
    HOME: homeDir,
    USERPROFILE: homeDir,
    APPDATA: appDataDir,
    LOCALAPPDATA: localAppDataDir,
    BAI_API_KEY: process.env.BAI_API_KEY || 'ci-smoke-placeholder-not-a-credential',
    BAI_WORK_ALLOW_UNSIGNED_UPDATES: '0'
  },
  stdio: ['ignore', 'pipe', 'pipe']
})

child.stdout?.on('data', (chunk) => {
  stdout = `${stdout}${chunk.toString('utf8')}`.slice(-8000)
})
child.stderr?.on('data', (chunk) => {
  stderr = `${stderr}${chunk.toString('utf8')}`.slice(-8000)
})
child.once('exit', (code, signal) => {
  exitCode = code
  exitSignal = signal
})

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms))
}

async function findHealthyRuntime() {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (exitCode !== null || exitSignal !== null) {
      throw new Error(`Packaged app exited before health check (code=${exitCode}, signal=${exitSignal}).`)
    }
    for (const port of candidatePorts) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, {
          signal: AbortSignal.timeout(1200)
        })
        if (!response.ok) continue
        const body = await response.json()
        if (
          body?.status === 'ok' &&
          body?.service === 'bai-work' &&
          body?.runtime === 'bai-code' &&
          body?.cli?.installed === true
        ) {
          return { port, body }
        }
      } catch {
        // The app or its first-run BAI Code environment is still starting.
      }
    }
    await delay(1000)
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for a healthy packaged BAI Code runtime.`)
}

async function stopChild() {
  if (exitCode !== null || exitSignal !== null) return
  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
    return
  }
  child.kill('SIGTERM')
  for (let index = 0; index < 20; index += 1) {
    if (exitCode !== null || exitSignal !== null) return
    await delay(250)
  }
  child.kill('SIGKILL')
}

async function main() {
  try {
    const result = await findHealthyRuntime()
    console.log(`[packaged-smoke] healthy runtime on 127.0.0.1:${result.port}`)
    console.log(`[packaged-smoke] BAI Code CLI: ${result.body.cli.version || result.body.cli.command}`)
  } catch (error) {
    console.error(`[packaged-smoke] ${error instanceof Error ? error.message : String(error)}`)
    if (stdout.trim()) console.error(`[packaged-smoke] stdout tail:\n${stdout.trim()}`)
    if (stderr.trim()) console.error(`[packaged-smoke] stderr tail:\n${stderr.trim()}`)
    process.exitCode = 1
  } finally {
    await stopChild()
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

void main()
