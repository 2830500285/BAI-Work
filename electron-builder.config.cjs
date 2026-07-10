const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const afterPack = require('./scripts/after-pack.cjs')

function envValue(name) {
  const value = process.env[name]
  return value !== undefined && value !== '' ? value : undefined
}

function loadLocalReleaseEnv() {
  const candidates = [
    envValue('BAI_WORK_RELEASE_ENV'),
    join(__dirname, 'scripts', 'release.local.env'),
    join(__dirname, 'release.local.env')
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue
    for (const rawLine of readFileSync(candidate, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
      if (!match) continue
      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[match[1]]) process.env[match[1]] = value
    }
    break
  }
}

loadLocalReleaseEnv()

const hasExplicitMacSigningIdentity = Boolean(
  process.env.CSC_LINK ||
    process.env.CSC_NAME ||
    process.env.CSC_KEY_PASSWORD ||
    process.env.MAC_SIGN === '1'
)

const hasNotaryToolCredentials = Boolean(
  process.env.APPLE_API_KEY_ID &&
    process.env.APPLE_API_ISSUER &&
    (process.env.APPLE_API_KEY || process.env.APPLE_API_KEY_BASE64)
)

const updateChannel = normalizeUpdateChannel(
  envValue('BAI_WORK_UPDATE_CHANNEL') || 'stable'
)
const githubOwner = envValue('BAI_WORK_GITHUB_OWNER') || '2830500285'
const githubRepo = envValue('BAI_WORK_GITHUB_REPO') || 'BAI-Work'
const releaseAppVersion = (
  envValue('BAI_WORK_APP_VERSION') || ''
).trim()
const artifactVersion = releaseAppVersion || '${version}'
const baiWorkSkillDir = join(__dirname, 'resources', 'skills')
const baiWorkSkillExtraResources = existsSync(baiWorkSkillDir)
  ? [
      {
        from: baiWorkSkillDir,
        to: 'BAI-Work-Skills'
      }
    ]
  : []
const baiCodeRuntimeDir = join(__dirname, 'resources', 'bai-code-runtime')
const baiCodeRuntimeExtraResources = shouldBundleBaiCodeRuntime() && existsSync(baiCodeRuntimeDir)
  ? [
      {
        from: baiCodeRuntimeDir,
        to: 'BAI-Code-Runtime'
      }
    ]
  : []
const baiCodeOfficialDir = join(__dirname, 'resources', 'bai-code-official')
const baiCodeOfficialExtraResources = shouldBundleBaiCodeOfficialWheels() && existsSync(baiCodeOfficialDir)
  ? [
      {
        from: baiCodeOfficialDir,
        to: 'BAI-Code-Official'
      }
    ]
  : []

function normalizeUpdateChannel(raw) {
  const value = String(raw || '').trim()
  if (value === 'stable' || value === 'frontier') return value
  throw new Error(`BAI_WORK_UPDATE_CHANNEL must be "stable" or "frontier", got: ${raw}`)
}

function envFlag(name, fallback) {
  const value = envValue(name)
  if (value === undefined) return fallback
  return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase())
}

function requestedBuilderPlatform() {
  if (process.argv.includes('--win') || process.argv.includes('-w')) return 'win32'
  if (process.argv.includes('--mac') || process.argv.includes('-m')) return 'darwin'
  if (process.argv.includes('--linux') || process.argv.includes('-l')) return 'linux'
  return process.platform
}

function requestedBuilderArch() {
  if (process.argv.includes('--arm64')) return 'arm64'
  if (process.argv.includes('--x64')) return 'x64'
  return process.arch
}

function shouldBundleBaiCodeRuntime() {
  return envFlag(
    'BAI_WORK_BUNDLE_BAI_CODE_RUNTIME',
    requestedBuilderPlatform() === 'darwin' && requestedBuilderArch() === 'x64'
  )
}

function shouldBundleBaiCodeOfficialWheels() {
  const platform = requestedBuilderPlatform()
  const arch = requestedBuilderArch()
  return envFlag(
    'BAI_WORK_BUNDLE_BAI_CODE_OFFICIAL',
    (platform === 'darwin' && arch === 'arm64') || (platform === 'win32' && arch === 'x64')
  )
}

if (releaseAppVersion && !/^\d+\.\d+\.\d+$/.test(releaseAppVersion)) {
  throw new Error(
    `BAI_WORK_APP_VERSION must be a valid x.y.z semver for electron-updater, got: ${releaseAppVersion}`
  )
}

module.exports = {
  appId: 'ai.b.work.desktop',
  productName: 'BAI Work',
  asar: true,
  asarUnpack: [
    '**/node_modules/better-sqlite3/**/*',
    '**/node_modules/bindings/**/*',
    '**/node_modules/file-uri-to-path/**/*'
  ],
  npmRebuild: true,
  directories: {
    output: envValue('BAI_WORK_DIST_DIR') || 'dist'
  },
  files: [
    'out/**/*',
    'package.json',
    '!**/*.map',
    '!**/*.d.ts',
    '!**/*.ts',
    '!**/tsconfig*.json',
    '!**/README*',
    '!**/CHANGELOG*'
    // node_modules/openclaw (the vendor/openclaw-shim file: dep) must ship:
    // the WeChat bridge imports @tencent-weixin/openclaw-weixin/dist at
    // runtime to send media, and that chain resolves openclaw/plugin-sdk/*.
  ],
  extraResources: [
    ...baiWorkSkillExtraResources,
    ...baiCodeRuntimeExtraResources,
    ...baiCodeOfficialExtraResources
  ],
  artifactName: `BAI-Work-${artifactVersion}-\${os}-\${arch}.\${ext}`,
  publish: [
    {
      provider: 'github',
      owner: githubOwner,
      repo: githubRepo,
      releaseType: updateChannel === 'frontier' ? 'prerelease' : 'release'
    }
  ],
  afterPack,
  afterSign: './scripts/mac-notarize.cjs',
  mac: {
    category: 'public.app-category.developer-tools',
    identity: hasExplicitMacSigningIdentity ? undefined : null,
    // We notarize in scripts/mac-notarize.cjs so APPLE_API_KEY_BASE64 can be supported.
    notarize: false,
    hardenedRuntime: hasExplicitMacSigningIdentity,
    forceCodeSigning: hasExplicitMacSigningIdentity,
    timestamp: hasExplicitMacSigningIdentity ? 'http://timestamp.apple.com/ts01' : null,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.inherit.plist',
    extendInfo: {
      // 语音输入：渲染进程通过 getUserMedia 录音做语音转文字。
      NSMicrophoneUsageDescription: 'BAI Work uses the microphone for voice-to-text input.'
    },
    // macOS 不会自动套圆角遮罩,图标文件本身需要是「圆角方块 + 透明边距」
    icon: './src/asset/img/bai-work-mac.png',
    // Mac Intel / x64 only for the BAI Work Intel release.
    target: [
      { target: 'dmg', arch: ['x64'] },
      { target: 'zip', arch: ['x64'] }
    ]
  },
  dmg: {
    sign: hasExplicitMacSigningIdentity
  },
  win: {
    // Windows does not mask app icons for us; use the rounded asset so
    // desktop/start-menu/taskbar shortcuts do not show a hard square edge.
    // Ship a multi-size .ico (16/24/32/48/64/72/96/128/256) so Explorer and
    // the desktop render crisp icons at small sizes (#222). Regenerate with:
    // npx --yes png2icons src/asset/img/bai-work-mac.png build/icon -icowe -bc
    icon: './build/icon.ico',
    target: [{ target: 'nsis', arch: ['x64'] }]
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    perMachine: false,
    allowElevation: true,
    selectPerMachineByDefault: false,
    // 明确创建快捷方式；always 在覆盖安装时也会重建（即使用户曾删掉桌面图标）
    createDesktopShortcut: 'always',
    createStartMenuShortcut: true,
    shortcutName: 'BAI Work',
    uninstallDisplayName: 'BAI Work',
    deleteAppDataOnUninstall: false
  },
  linux: {
    category: 'Development',
    icon: './src/asset/img/bai-work.png',
    target: [{ target: 'AppImage', arch: ['x64'] }]
  },
  extraMetadata: {
    ...(releaseAppVersion ? { version: releaseAppVersion } : {}),
    updateChannel,
    buildHints: {
      macSigningEnabled: hasExplicitMacSigningIdentity,
      notarizationEnabled: hasNotaryToolCredentials
    }
  }
}
