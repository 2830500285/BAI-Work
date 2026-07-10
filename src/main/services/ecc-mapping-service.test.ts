import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  installEccMappings,
  resolveEccInstallTargets
} from './ecc-mapping-service'

const tempRoots: string[] = []

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'bai-work-ecc-'))
  tempRoots.push(root)
  return root
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, content, 'utf8')
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function createEccSource(root: string): Promise<string> {
  const source = join(root, 'ecc')
  await writeText(join(source, 'commands', 'plan.md'), '# Plan\n\nPrimary plan command.')
  await writeText(join(source, '.claude', 'commands', 'plan.md'), '# Plan duplicate\n')
  await writeText(join(source, 'commands', 'security-scan.md'), '# Security scan\n')
  await writeText(join(source, 'agents', 'code-reviewer.md'), [
    '---',
    'name: code-reviewer',
    'description: Review code.',
    '---',
    '',
    'Review the supplied diff.'
  ].join('\n'))
  await writeText(join(source, 'rules', 'common', 'security.md'), '# Security\n')
  await writeText(join(source, 'rules', 'typescript', 'strict.md'), '# TypeScript\n')
  await writeText(join(source, 'skills', 'security-review', 'SKILL.md'), [
    '---',
    'name: security-review',
    'description: Review code for security risks.',
    '---',
    '',
    '# Security Review'
  ].join('\n'))
  await writeText(join(source, 'hooks', 'hooks.json'), JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: 'Bash',
          id: 'pre:bash',
          hooks: [{ command: 'echo pre', timeout: 7 }]
        }
      ],
      PostToolUse: [
        {
          matcher: 'Edit|Write|MultiEdit',
          id: 'post:write',
          hooks: [{ command: 'echo post', async: true }]
        }
      ],
      PreCompact: [
        {
          matcher: '*',
          id: 'unsupported',
          hooks: [{ command: 'echo unsupported' }]
        }
      ]
    }
  }, null, 2))
  return source
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop()
    if (root) await rm(root, { recursive: true, force: true })
  }
})

describe('EBAI mapping service', () => {
  it('resolves BAI Code user targets under ~/.bai-compatible directories', async () => {
    const root = await tempRoot()
    const targets = resolveEccInstallTargets({ baiHome: join(root, '.bai') })

    expect(targets.commandsDir).toBe(join(root, '.bai', 'commands'))
    expect(targets.skillsDir).toBe(join(root, '.bai', 'skills'))
    expect(targets.rulesSkillDir).toBe(join(root, '.bai', 'skills', 'ebai-rules'))
    expect(targets.hooksManifestPath).toBe(join(root, '.bai', 'ebai', 'hooks', 'hooks.toml'))
  })

  it('installs commands, agent commands, portable skills, common rules, and a disabled hooks manifest', async () => {
    const root = await tempRoot()
    const source = await createEccSource(root)
    const baiHome = join(root, '.bai')

    const result = await installEccMappings({ source, baiHome, force: true })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.commands.available).toBe(2)
    expect(result.agents.available).toBe(1)
    expect(result.skills.available).toBe(1)
    expect(result.rules.available).toBe(1)
    expect(result.hooks).toMatchObject({ available: 3, selected: 2, unsupported: 1 })

    await expect(readFile(join(baiHome, 'commands', 'plan.md'), 'utf8'))
      .resolves.toContain('Primary plan command')
    await expect(readFile(join(baiHome, 'commands', 'ebai-agent-code-reviewer.md'), 'utf8'))
      .resolves.toContain('Installed B.AI command: /ebai-agent-code-reviewer')
    await expect(readFile(join(baiHome, 'skills', 'security-review', 'SKILL.md'), 'utf8'))
      .resolves.toContain('Review code for security risks')
    await expect(readFile(join(baiHome, 'skills', 'ebai-rules', 'SKILL.md'), 'utf8'))
      .resolves.toContain('EBAI common rules')
    await expect(exists(join(baiHome, 'skills', 'ebai-rules', 'rules', 'security.md')))
      .resolves.toBe(true)
    await expect(exists(join(baiHome, 'skills', 'ebai-rules', 'rules', 'typescript', 'strict.md')))
      .resolves.toBe(false)

    const hooksToml = await readFile(join(baiHome, 'ebai', 'hooks', 'hooks.toml'), 'utf8')
    expect(hooksToml).toContain('enabled = false')
    expect(hooksToml).toContain('[[hooks]]')
    expect(hooksToml).not.toMatch(/^\[hooks]$/m)
    expect(hooksToml).not.toContain('[[hooks.hooks]]')
    expect(hooksToml).toContain('event = "tool_call_before"')
    expect(hooksToml).toContain('type = "tool_name"')
    expect(hooksToml).toContain('name = "exec_shell"')
    expect(hooksToml).toContain('type = "tool_category"')
    expect(hooksToml).toContain('category = "file_write"')
    const tomlEscapedSource = source.replaceAll('\\', '\\\\')
    expect(hooksToml).toContain(
      `CLAUDE_PLUGIN_ROOT='${tomlEscapedSource}' ECC_PLUGIN_ROOT='${tomlEscapedSource}' echo pre`
    )
  })

  it('installs all rule directories only when includeAllRules is set', async () => {
    const root = await tempRoot()
    const source = await createEccSource(root)
    const baiHome = join(root, '.bai')

    const result = await installEccMappings({
      source,
      baiHome,
      includeAllRules: true,
      force: true
    })

    expect(result.ok).toBe(true)
    await expect(exists(join(baiHome, 'skills', 'ebai-rules', 'rules', 'common', 'security.md')))
      .resolves.toBe(true)
    await expect(exists(join(baiHome, 'skills', 'ebai-rules', 'rules', 'typescript', 'strict.md')))
      .resolves.toBe(true)
  })

  it('requires a trusted workspace before enabling EBAI hooks', async () => {
    const root = await tempRoot()
    const source = await createEccSource(root)

    await expect(installEccMappings({
      source,
      baiHome: join(root, '.bai'),
      enableHooks: true
    })).resolves.toEqual({
      ok: false,
      message: 'EBAI hooks require a trusted workspace. Enable hooks with a workspace path.'
    })

    await expect(installEccMappings({
      source,
      baiHome: join(root, '.bai'),
      workspace: join(root, 'workspace')
    })).resolves.toEqual({
      ok: false,
      message: 'Workspace is only valid when EBAI hooks are explicitly enabled.'
    })
  })

  it('writes enabled hooks only to the selected workspace when explicitly enabled', async () => {
    const root = await tempRoot()
    const source = await createEccSource(root)
    const baiHome = join(root, '.bai')
    const workspace = join(root, 'workspace')

    const result = await installEccMappings({
      source,
      baiHome,
      workspace,
      enableHooks: true,
      force: true
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.workspaceHooksPath).toBe(join(workspace, '.bai', 'hooks.toml'))
    await expect(readFile(join(baiHome, 'ebai', 'hooks', 'hooks.toml'), 'utf8'))
      .resolves.toContain('enabled = false')
    await expect(readFile(join(workspace, '.bai', 'hooks.toml'), 'utf8'))
      .resolves.toContain('enabled = true')
  })
})
