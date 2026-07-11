import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { AppSettingsV1 } from '../../shared/app-settings'
import type { GuiSkillListResult } from './skill-service'
import { resolveBaiRuntimeInstructions } from './bai-runtime-instruction-service'

const roots: string[] = []
const settings = { disabledSkillIds: [] } as unknown as AppSettingsV1

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'bai-runtime-instructions-'))
  roots.push(root)
  return root
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, content, 'utf8')
}

afterEach(async () => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) await rm(root, { recursive: true, force: true })
  }
})

describe('BAI runtime managed instructions', () => {
  it('loads an installed slash command and expands its arguments', async () => {
    const root = await tempRoot()
    const commands = join(root, 'commands')
    await writeText(join(commands, 'plan.md'), 'Plan this task:\n\n$ARGUMENTS')

    const result = await resolveBaiRuntimeInstructions({
      settings,
      workspace: root,
      prompt: '/plan build the release',
      displayPrompt: '/plan build the release'
    }, {
      commandsDir: commands,
      listSkills: async () => ({ ok: true, skills: [], validationErrors: [] })
    })

    expect(result.appliedCommands).toEqual(['/plan'])
    expect(result.instructions).toContain('Plan this task:\n\nbuild the release')
  })

  it('loads an explicitly selected skill', async () => {
    const root = await tempRoot()
    const skillRoot = join(root, 'security-review')
    const entryPath = join(skillRoot, 'SKILL.md')
    await writeText(entryPath, '# Security review\n\nCheck authentication boundaries.')
    const list = async (): Promise<GuiSkillListResult> => ({
      ok: true,
      validationErrors: [],
      skills: [{
        id: 'security-review',
        name: 'Security Review',
        root: skillRoot,
        entryPath,
        scope: 'global',
        legacy: true
      }]
    })

    const result = await resolveBaiRuntimeInstructions({
      settings,
      workspace: root,
      prompt: '/skill security-review inspect login',
      displayPrompt: '/skill security-review inspect login'
    }, { commandsDir: join(root, 'commands'), listSkills: list })

    expect(result.appliedSkills).toEqual(['security-review'])
    expect(result.instructions).toContain('Check authentication boundaries')
  })

  it('automatically selects BAI guardrails and EBAI rules for coding tasks', async () => {
    const root = await tempRoot()
    const skills = await Promise.all(['bai-work-guardrails', 'ebai-rules', 'unrelated'].map(async (id) => {
      const skillRoot = join(root, id)
      const entryPath = join(skillRoot, 'SKILL.md')
      await writeText(entryPath, `# ${id}`)
      return { id, name: id, root: skillRoot, entryPath, scope: 'global' as const, legacy: true }
    }))

    const result = await resolveBaiRuntimeInstructions({
      settings,
      workspace: root,
      prompt: '请修复代码并运行测试',
      displayPrompt: '请修复代码并运行测试'
    }, {
      commandsDir: join(root, 'commands'),
      listSkills: async () => ({ ok: true, skills, validationErrors: [] })
    })

    expect(result.appliedSkills).toEqual(expect.arrayContaining(['bai-work-guardrails', 'ebai-rules']))
    expect(result.appliedSkills).not.toContain('unrelated')
  })

  it('prioritizes skills explicitly named in the user request', async () => {
    const root = await tempRoot()
    const ids = ['academic-loop', 'nature-figure', 'academic-research-suite', 'bai-work-guardrails']
    const skills = await Promise.all(ids.map(async (id) => {
      const skillRoot = join(root, id)
      const entryPath = join(skillRoot, 'SKILL.md')
      await writeText(entryPath, `# ${id}`)
      return { id, name: id, root: skillRoot, entryPath, scope: 'global' as const, legacy: true }
    }))

    const result = await resolveBaiRuntimeInstructions({
      settings,
      workspace: root,
      prompt: '调用 Academic Loop 和 nature-figure，检查代码并完成论文。',
      displayPrompt: '调用 Academic Loop 和 nature-figure，检查代码并完成论文。'
    }, {
      commandsDir: join(root, 'commands'),
      listSkills: async () => ({ ok: true, skills, validationErrors: [] })
    })

    expect(result.appliedSkills.slice(0, 2)).toEqual(['academic-loop', 'nature-figure'])
    expect(result.appliedSkills).toContain('bai-work-guardrails')
    expect(result.appliedSkills).not.toContain('academic-research-suite')
  })

  it('does not auto-load skills from generic BAI Work wording alone', async () => {
    const root = await tempRoot()
    const skills = ['canary-watch', 'hermes-imports', 'bai-work-guardrails'].map((id) => ({
      id,
      name: id,
      description: 'A BAI Work agent skill.',
      root: join(root, id),
      entryPath: join(root, id, 'SKILL.md'),
      scope: 'global' as const,
      legacy: true
    }))

    const result = await resolveBaiRuntimeInstructions({
      settings,
      workspace: root,
      prompt: 'BAI Work release smoke',
      displayPrompt: 'BAI Work release smoke'
    }, {
      commandsDir: join(root, 'commands'),
      listSkills: async () => ({ ok: true, skills, validationErrors: [] })
    })

    expect(result.appliedSkills).toEqual([])
    expect(result.instructions).toBe('')
  })

  it('does not auto-load skills from a single incidental prompt word', async () => {
    const root = await tempRoot()
    const definitions = [
      ['canary-watch', 'Runs release smoke checks.'],
      ['click-path-audit', 'Validates the final click path.'],
      ['academic-pipeline', 'Reports whether a pipeline is OK.']
    ] as const
    const skills = await Promise.all(definitions.map(async ([id, description]) => {
      const skillRoot = join(root, id)
      const entryPath = join(skillRoot, 'SKILL.md')
      await writeText(entryPath, `# ${id}`)
      return { id, name: id, description, root: skillRoot, entryPath, scope: 'global' as const, legacy: true }
    }))

    const result = await resolveBaiRuntimeInstructions({
      settings,
      workspace: root,
      prompt: '仅回复：BAI Work final smoke OK。',
      displayPrompt: '仅回复：BAI Work final smoke OK。'
    }, {
      commandsDir: join(root, 'commands'),
      listSkills: async () => ({ ok: true, skills, validationErrors: [] })
    })

    expect(result.appliedSkills).toEqual([])
    expect(result.instructions).toBe('')
  })

  it('continues without optional skills when discovery exceeds its deadline', async () => {
    const root = await tempRoot()
    const startedAt = Date.now()
    const result = await resolveBaiRuntimeInstructions({
      settings,
      workspace: root,
      prompt: 'continue the task',
      displayPrompt: 'continue the task'
    }, {
      commandsDir: join(root, 'commands'),
      skillDiscoveryTimeoutMs: 10,
      listSkills: async () => new Promise<GuiSkillListResult>(() => undefined)
    })

    expect(Date.now() - startedAt).toBeLessThan(500)
    expect(result).toEqual({ instructions: '', appliedCommands: [], appliedSkills: [] })
  })
})
