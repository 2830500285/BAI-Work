const { existsSync, lstatSync, rmSync, symlinkSync } = require('node:fs')
const { spawnSync } = require('node:child_process')
const { join, resolve } = require('node:path')

const projectRoot = resolve(__dirname, '..')
const arch = process.argv[2] || 'x64'
if (arch !== 'x64' && arch !== 'arm64') {
  throw new Error(`Usage: node scripts/build-mac-dmg.cjs <x64|arm64>; got: ${arch}`)
}

const pkg = require(join(projectRoot, 'package.json'))
const version = (process.env.BAI_WORK_APP_VERSION || pkg.version).trim()
const distDir = resolve(process.env.BAI_WORK_DIST_DIR || join(projectRoot, 'dist'))
const sourceDir = join(distDir, arch === 'arm64' ? 'mac-arm64' : 'mac')
const appDir = join(sourceDir, 'BAI Work.app')
const applicationsLink = join(sourceDir, 'Applications')
const output = join(distDir, `BAI-Work-${version}-mac-${arch}.dmg`)

if (!existsSync(appDir)) {
  throw new Error(`Packaged app not found: ${appDir}`)
}

if (existsSync(applicationsLink)) {
  if (!lstatSync(applicationsLink).isSymbolicLink()) {
    throw new Error(`Refusing to replace non-symlink path: ${applicationsLink}`)
  }
  rmSync(applicationsLink)
}

rmSync(output, { force: true })
symlinkSync('/Applications', applicationsLink, 'dir')
try {
  const result = spawnSync('/usr/bin/hdiutil', [
    'create',
    '-volname',
    `BAI Work ${version}`,
    '-srcfolder',
    sourceDir,
    '-format',
    'UDZO',
    '-ov',
    output
  ], { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`hdiutil failed with exit code ${result.status ?? 'unknown'}`)
  }
} finally {
  rmSync(applicationsLink, { force: true })
}

console.log(`[build-mac-dmg] created ${output}`)
