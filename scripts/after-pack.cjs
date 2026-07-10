const { execFileSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const { join } = require('node:path')

function normalizePlatform(platform) {
  return platform === 'win' ? 'win32' : platform
}

function envFlag(name, fallback) {
  const value = process.env[name]
  if (value === undefined || value === '') return fallback
  return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase())
}

function appBundlePath(context) {
  return join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
}

function packedResourcesDir(context) {
  if (normalizePlatform(context.electronPlatformName) === 'darwin') {
    return join(appBundlePath(context), 'Contents', 'Resources')
  }
  return join(context.appOutDir, 'resources')
}

function unpackedAppRoot(context) {
  return join(packedResourcesDir(context), 'app.asar.unpacked')
}

function assertExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`[after-pack] Missing ${label}: ${path}`)
  }
}

const BAI_CODE_RUNTIME_REQUIRED_PATHS = [
  'BAI-Code-Runtime/bin/baicode',
  'BAI-Code-Runtime/bin/baicode-entry.py',
  'BAI-Code-Runtime/python/bin/python3.11',
  'BAI-Code-Runtime/site-packages/baicode',
  'BAI-Code-Runtime/site-packages/baicode-0.9.1.dist-info'
]

function npmCommand(args, platform = process.platform) {
  if (platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm', ...args]
    }
  }
  return { command: 'npm', args }
}

function shouldValidateBaiCodeRuntime(context) {
  const platform = normalizePlatform(context.electronPlatformName)
  const appOutDir = String(context.appOutDir || '')
  return envFlag(
    'BAI_WORK_BUNDLE_BAI_CODE_RUNTIME',
    platform === 'darwin' && !/arm64/i.test(appOutDir)
  )
}

function validatePackagedApp(context) {
  const root = unpackedAppRoot(context)
  assertExists(
    join(root, 'node_modules', 'better-sqlite3', 'package.json'),
    'root better-sqlite3 dependency'
  )
  if (!shouldValidateBaiCodeRuntime(context)) return
  const resourcesRoot = packedResourcesDir(context)
  for (const relativePath of BAI_CODE_RUNTIME_REQUIRED_PATHS) {
    assertExists(join(resourcesRoot, relativePath), `bundled BAI Code runtime path ${relativePath}`)
  }
}

function maybeAdhocSignMacApp(context) {
  if (normalizePlatform(context.electronPlatformName) !== 'darwin') {
    return
  }

  if (
    process.env.CSC_LINK ||
    process.env.CSC_NAME ||
    process.env.CSC_KEY_PASSWORD ||
    process.env.MAC_SIGN === '1'
  ) {
    console.log('[after-pack] Developer ID signing is enabled, skipping ad-hoc signing.')
    return
  }

  const appBundle = appBundlePath(context)
  if (!existsSync(appBundle)) {
    throw new Error(`[after-pack] App bundle not found for ad-hoc signing: ${appBundle}`)
  }

  execFileSync(
    'codesign',
    ['--force', '--deep', '--sign', '-', '--timestamp=none', appBundle],
    { stdio: 'inherit' }
  )
}

async function afterPack(context) {
  validatePackagedApp(context)
  maybeAdhocSignMacApp(context)
}

module.exports = afterPack
module.exports.default = afterPack
module.exports._internals = {
  BAI_CODE_RUNTIME_REQUIRED_PATHS,
  appBundlePath,
  packedResourcesDir,
  unpackedAppRoot,
  npmCommand,
  shouldValidateBaiCodeRuntime,
  validatePackagedApp
}
