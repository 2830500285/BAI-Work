import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  defaultClawSettings,
  defaultKeyboardShortcuts,
  defaultKunRuntimeSettings,
  defaultModelProviderSettings,
  defaultScheduleSettings,
  defaultWriteSettings,
  type AppSettingsV1
} from '../../shared/app-settings'
import { guiSkillRootsForRuntime, listGuiSkillRoots, listGuiSkills } from './skill-service'

vi.mock('electron', () => ({
  app: {
    getPath: () => tmpdir()
  }
}))

describe('skill-service', () => {
  let tempRoot = ''

  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), 'gui-skills-'))
  })

  afterEach(async () => {
    await rm(tempRoot, { recursive: true, force: true })
  })

  it('discovers project Codex skills from the active workspace', async () => {
    const workspaceRoot = join(tempRoot, 'workspace')
    const skillRoot = join(workspaceRoot, '.codex', 'skills', 'openspec-apply-change')
    await mkdir(skillRoot, { recursive: true })
    await writeFile(join(skillRoot, 'SKILL.md'), [
      '---',
      'name: openspec-apply-change',
      'description: Implement tasks from an OpenSpec change.',
      '---',
      '',
      'Implement tasks from an OpenSpec change.'
    ].join('\n'), 'utf8')

    const result = await listGuiSkills(createSettings(workspaceRoot), workspaceRoot)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skills).toContainEqual(expect.objectContaining({
      id: 'openspec-apply-change',
      name: 'Openspec Apply Change',
      description: 'Implement tasks from an OpenSpec change.',
      scope: 'project'
    }))
  })

  it('keeps legacy SKILL.md entries with Chinese frontmatter names distinct', async () => {
    const workspaceRoot = join(tempRoot, 'workspace-cn')
    const skillRoot = join(workspaceRoot, '.agents', 'skills')
    const tddRoot = join(skillRoot, 'tdd')
    const reviewRoot = join(skillRoot, 'code-review')
    await mkdir(tddRoot, { recursive: true })
    await mkdir(reviewRoot, { recursive: true })
    await writeFile(join(tddRoot, 'SKILL.md'), [
      '---',
      'name: 测试驱动开发(TDD)',
      'description: 用测试先行推进实现。',
      '---',
      '',
      '# TDD',
      '',
      '先写失败测试，再实现。'
    ].join('\n'), 'utf8')
    await writeFile(join(reviewRoot, 'SKILL.md'), [
      '---',
      'name: 代码审查',
      'description: 检查回归风险。',
      '---',
      '',
      '# Review',
      '',
      '关注正确性和测试。'
    ].join('\n'), 'utf8')

    const result = await listGuiSkills(createSettings(workspaceRoot), workspaceRoot)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const projectSkills = result.skills.filter((skill) => skill.root.startsWith(skillRoot))
    expect(projectSkills).toHaveLength(2)
    expect(projectSkills).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'tdd',
        name: '测试驱动开发(TDD)',
        description: '用测试先行推进实现。'
      }),
      expect.objectContaining({
        id: 'code-review',
        name: '代码审查',
        description: '检查回归风险。'
      })
    ]))
    expect(projectSkills.map((skill) => skill.id)).not.toContain('skill')
  })

  it('detects workspace .claude/skills as a common directory and counts its skills', async () => {
    const workspaceRoot = join(tempRoot, 'ws-claude')
    const skillRoot = join(workspaceRoot, '.claude', 'skills', 'demo')
    await mkdir(skillRoot, { recursive: true })
    await writeFile(join(skillRoot, 'SKILL.md'), [
      '---', 'name: demo', 'description: Demo skill.', '---', '', 'Body.'
    ].join('\n'), 'utf8')

    const result = await listGuiSkillRoots(createSettings(workspaceRoot), workspaceRoot)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const claude = result.roots.find((root) => root.labelKey === 'pluginSkillRootWorkspaceClaude')
    expect(claude).toMatchObject({
      scope: 'project',
      source: 'common',
      exists: true,
      enabled: true,
      skillCount: 1
    })
    expect(comparable(claude?.path ?? '')).toBe(comparable(join(workspaceRoot, '.claude', 'skills')))
  })

  it('discovers bundled BAI Work skills from nested built-in roots', async () => {
    const workspaceRoot = join(tempRoot, 'ws-builtin')
    const builtinRoot = join(tempRoot, 'builtin-skills')
    const skillRoot = join(builtinRoot, 'software-development', 'bai-work-verification-loop')
    const previous = process.env.BAI_WORK_BUILTIN_SKILL_DIR
    await mkdir(skillRoot, { recursive: true })
    await mkdir(workspaceRoot, { recursive: true })
    await writeFile(join(skillRoot, 'SKILL.md'), [
      '---',
      'name: bai-work-verification-loop',
      'description: Verify changes before reporting completion.',
      '---',
      '',
      'Run the smallest meaningful verification.'
    ].join('\n'), 'utf8')
    process.env.BAI_WORK_BUILTIN_SKILL_DIR = builtinRoot

    try {
      const result = await listGuiSkills(createSettings(workspaceRoot), workspaceRoot)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.skills).toContainEqual(expect.objectContaining({
        id: 'bai-work-verification-loop',
        name: 'Bai Work Verification Loop',
        description: 'Verify changes before reporting completion.',
        scope: 'global'
      }))
    } finally {
      if (previous === undefined) delete process.env.BAI_WORK_BUILTIN_SKILL_DIR
      else process.env.BAI_WORK_BUILTIN_SKILL_DIR = previous
    }
  })

  it('ships the BAI Work token efficiency skill in the default built-in root', async () => {
    const workspaceRoot = join(tempRoot, 'ws-default-builtin')
    await mkdir(workspaceRoot, { recursive: true })

    const result = await listGuiSkills(createSettings(workspaceRoot), workspaceRoot)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.skills).toContainEqual(expect.objectContaining({
      id: 'bai-work-token-efficiency',
      name: 'Bai Work Token Efficiency',
      description: 'BAI Work token-efficiency defaults for concise replies, compact shell output, and safe optional use of RTK/Caveman-style workflows.',
      scope: 'global'
    }))
  })

  it('omits a directory disabled via disabledDirs from runtime roots but still lists it', async () => {
    const workspaceRoot = join(tempRoot, 'ws-toggle')
    const claudeSkill = join(workspaceRoot, '.claude', 'skills', 'demo')
    const agentsSkill = join(workspaceRoot, '.agents', 'skills', 'demo2')
    await mkdir(claudeSkill, { recursive: true })
    await mkdir(agentsSkill, { recursive: true })
    await writeFile(join(claudeSkill, 'SKILL.md'), ['---', 'name: demo', '---', '', 'Body.'].join('\n'), 'utf8')
    await writeFile(join(agentsSkill, 'SKILL.md'), ['---', 'name: demo2', '---', '', 'Body.'].join('\n'), 'utf8')

    const settings = createSettings(workspaceRoot)
    settings.claw.skills.disabledDirs = ['workspace-claude']

    const runtimeRoots = (await guiSkillRootsForRuntime(settings, workspaceRoot)).map((root) =>
      comparable(root.path)
    )
    expect(runtimeRoots).not.toContain(comparable(join(workspaceRoot, '.claude', 'skills')))
    expect(runtimeRoots).toContain(comparable(join(workspaceRoot, '.agents', 'skills')))

    const list = await listGuiSkillRoots(settings, workspaceRoot)
    expect(list.ok).toBe(true)
    if (!list.ok) return
    const claude = list.roots.find((root) => root.labelKey === 'pluginSkillRootWorkspaceClaude')
    expect(claude?.enabled).toBe(false)
  })

  it('does not crawl Codex plugin caches as implicit BAI Work runtime roots', async () => {
    const workspaceRoot = join(tempRoot, 'ws-no-plugin-cache')
    await mkdir(workspaceRoot, { recursive: true })

    const roots = await guiSkillRootsForRuntime(createSettings(workspaceRoot), workspaceRoot)

    expect(roots.some((root) => comparable(root.path).includes('/.codex/plugins/cache/'))).toBe(false)
  })

  function comparable(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+$/g, '').toLowerCase()
  }

  function createSettings(workspaceRoot: string): AppSettingsV1 {
    return {
      version: 1,
      locale: 'en',
      theme: 'system',
      uiFontScale: 'small',
      provider: defaultModelProviderSettings(),
      agents: { kun: defaultKunRuntimeSettings() },
      workspaceRoot,
      log: { enabled: false, retentionDays: 7 },
      notifications: { turnComplete: true },
      appBehavior: { openAtLogin: false, startMinimized: false, closeToTray: false },
      keyboardShortcuts: defaultKeyboardShortcuts(),
      write: defaultWriteSettings(),
      claw: defaultClawSettings(),
      schedule: defaultScheduleSettings(),
      guiUpdate: { channel: 'stable' },
      codePromptPrefix: '',
      disabledSkillIds: []
    }
  }
})
