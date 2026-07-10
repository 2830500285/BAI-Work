import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const builderConfig = require('../../electron-builder.config.cjs')
const afterPack = require('../../scripts/after-pack.cjs')
const macNotarize = require('../../scripts/mac-notarize.cjs')

const tempRoots: string[] = []

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'bai-work-packaging-'))
  tempRoots.push(root)
  return root
}

function touch(path: string): void {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, '{}\n', 'utf8')
}

function loadBuilderConfigWithEnv(
  env: Record<string, string | undefined>,
  argv = process.argv
): typeof builderConfig {
  const configPath = require.resolve('../../electron-builder.config.cjs')
  const previous = new Map<string, string | undefined>()
  const previousArgv = process.argv
  for (const [key, value] of Object.entries(env)) {
    previous.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  delete require.cache[configPath]
  try {
    process.argv = argv
    return require(configPath)
  } finally {
    process.argv = previousArgv
    delete require.cache[configPath]
    for (const [key, value] of previous) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
    require(configPath)
  }
}

function createMacPackContext(root: string, arch: 'x64' | 'arm64' = 'x64'): {
  appOutDir: string
  electronPlatformName: string
  packager: { appInfo: { productFilename: string } }
} {
  return {
    appOutDir: join(root, arch === 'arm64' ? 'mac-arm64' : 'mac'),
    electronPlatformName: 'darwin',
    packager: {
      appInfo: {
        productFilename: 'BAI Work'
      }
    }
  }
}

afterEach(() => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('electron-builder BAI Work packaging', () => {
  it('uses BAI Work metadata and Mac Intel artifacts', () => {
    expect(builderConfig.appId).toBe('ai.b.work.desktop')
    expect(builderConfig.productName).toBe('BAI Work')
    expect(builderConfig.artifactName).toBe('BAI-Work-${version}-${os}-${arch}.${ext}')
    expect(builderConfig.mac.icon).toBe('./src/asset/img/bai-work-mac.png')
    expect(builderConfig.mac.target).toEqual([
      { target: 'dmg', arch: ['x64'] },
      { target: 'zip', arch: ['x64'] }
    ])
    expect(builderConfig.asarUnpack).toEqual(expect.arrayContaining([
      '**/node_modules/better-sqlite3/**/*'
    ]))
  })

  it('bundles only project-owned public skills, not local user skill directories', () => {
    const serializedResources = JSON.stringify(builderConfig.extraResources)
    const skillResource = builderConfig.extraResources.find((resource: { to?: string }) =>
      resource.to === 'BAI-Work-Skills'
    )
    const runtimeResource = builderConfig.extraResources.find((resource: { to?: string }) =>
      resource.to === 'BAI-Code-Runtime'
    )

    expect(skillResource).toEqual(expect.objectContaining({
      from: expect.stringMatching(/resources[\\/]skills$/),
      to: 'BAI-Work-Skills'
    }))
    expect(runtimeResource).toEqual(expect.objectContaining({
      from: expect.stringMatching(/resources[\\/]bai-code-runtime$/),
      to: 'BAI-Code-Runtime'
    }))
    expect(serializedResources).not.toContain('MIMO-Work-Core')
    expect(serializedResources).not.toContain('.agents/skills')
    expect(serializedResources).not.toContain('.codex/skills')
    expect(serializedResources).not.toContain('.claude/skills')
    expect(serializedResources).not.toContain('.hermes/skills')
    expect(serializedResources).not.toContain('.mimo-work/skills')
  })

  it('can omit the bundled Mac Intel BAI Code runtime for non-Intel artifacts', () => {
    const config = loadBuilderConfigWithEnv(
      { BAI_WORK_BUNDLE_BAI_CODE_RUNTIME: '0' },
      ['node', 'electron-builder', '--mac', '--arm64']
    )
    const serializedResources = JSON.stringify(config.extraResources)

    expect(serializedResources).toContain('BAI-Work-Skills')
    expect(serializedResources).not.toContain('BAI-Code-Runtime')
  })

  it('bundles official BAI Code wheelhouse for arm64 and Windows artifacts', () => {
    const macArmConfig = loadBuilderConfigWithEnv(
      {},
      ['node', 'electron-builder', '--mac', '--arm64']
    )
    const winConfig = loadBuilderConfigWithEnv(
      {},
      ['node', 'electron-builder', '--win', '--x64']
    )

    expect(JSON.stringify(macArmConfig.extraResources)).toContain('BAI-Code-Official')
    expect(JSON.stringify(winConfig.extraResources)).toContain('BAI-Code-Official')
    expect(JSON.stringify(macArmConfig.extraResources)).not.toContain('BAI-Code-Runtime')
    expect(JSON.stringify(winConfig.extraResources)).not.toContain('BAI-Code-Runtime')
  })

  it('validates the packaged app dependencies before release artifacts are created', () => {
    const root = tempRoot()
    const context = createMacPackContext(root)
    const resourcesRoot = afterPack._internals.packedResourcesDir(context)

    touch(join(afterPack._internals.unpackedAppRoot(context), 'node_modules/better-sqlite3/package.json'))
    for (const relativePath of afterPack._internals.BAI_CODE_RUNTIME_REQUIRED_PATHS) {
      touch(join(resourcesRoot, relativePath))
    }

    expect(() => afterPack._internals.validatePackagedApp(context)).not.toThrow()

    rmSync(join(afterPack._internals.unpackedAppRoot(context), 'node_modules/better-sqlite3'), {
      recursive: true,
      force: true
    })

    expect(() => afterPack._internals.validatePackagedApp(context)).toThrow(
      /better-sqlite3/
    )
  })

  it('does not require the Mac Intel BAI Code runtime for arm64 app bundles', () => {
    const root = tempRoot()
    const context = createMacPackContext(root, 'arm64')

    touch(join(afterPack._internals.unpackedAppRoot(context), 'node_modules/better-sqlite3/package.json'))

    expect(afterPack._internals.shouldValidateBaiCodeRuntime(context)).toBe(false)
    expect(() => afterPack._internals.validatePackagedApp(context)).not.toThrow()
  })

  it('runs npm through cmd.exe during Windows afterPack hooks', () => {
    expect(afterPack._internals.npmCommand(['prune'], 'win32')).toEqual({
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm', 'prune']
    })
    expect(afterPack._internals.npmCommand(['prune'], 'darwin')).toEqual({
      command: 'npm',
      args: ['prune']
    })
  })

  it('uses the generated Windows icon for installers and shortcuts', () => {
    expect(builderConfig.win.icon).toBe('./build/icon.ico')
  })

  it('requires Apple secure timestamps when Developer ID signing is enabled', () => {
    const signedConfig = loadBuilderConfigWithEnv({
      MAC_SIGN: '1'
    })

    expect(signedConfig.mac.identity).toBeUndefined()
    expect(signedConfig.mac.hardenedRuntime).toBe(true)
    expect(signedConfig.mac.forceCodeSigning).toBe(true)
    expect(signedConfig.mac.timestamp).toBe('http://timestamp.apple.com/ts01')
  })

  it('checks timestamp candidates across nested macOS signed code', () => {
    const root = tempRoot()
    const appBundle = join(root, 'BAI Work.app')
    const mainExecutable = join(appBundle, 'Contents/MacOS/BAI Work')
    const framework = join(appBundle, 'Contents/Frameworks/Electron Framework.framework')
    const nativeAddon = join(
      appBundle,
      'Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3/build/Release/better_sqlite3.node'
    )
    const resourceScript = join(appBundle, 'Contents/Resources/postinstall.sh')

    touch(mainExecutable)
    touch(join(framework, 'Versions/A/Electron Framework'))
    touch(nativeAddon)
    touch(resourceScript)
    chmodSync(mainExecutable, 0o755)
    chmodSync(resourceScript, 0o755)

    expect(macNotarize._internals.collectSignedCodeCandidates(appBundle)).toEqual([
      appBundle,
      framework,
      mainExecutable,
      nativeAddon
    ])
  })
})
