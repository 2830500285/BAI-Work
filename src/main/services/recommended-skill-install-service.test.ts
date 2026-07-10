import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  collectGithubDirectoryFiles,
  installRecommendedSkillPackage,
  recommendedSkillPackageForTest
} from './recommended-skill-install-service'

const tempRoots: string[] = []

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'mimo-recommended-skill-'))
  tempRoots.push(root)
  return root
}

afterEach(async () => {
  while (tempRoots.length > 0) {
    const root = tempRoots.pop()
    if (root) await rm(root, { recursive: true, force: true })
  }
})

describe('recommended skill install service', () => {
  it('downloads a whitelisted GitHub skill directory into the BAI Work skill root', async () => {
    const targetRoot = await tempRoot()
    const fetchImpl = fakeGithubFetch({
      'https://api.github.com/repos/NousResearch/hermes-agent/contents/skills/software-development?ref=main': [
        {
          type: 'dir',
          path: 'skills/software-development/test-driven-development'
        }
      ],
      'https://api.github.com/repos/NousResearch/hermes-agent/contents/skills/software-development/test-driven-development?ref=main': [
        {
          type: 'file',
          path: 'skills/software-development/test-driven-development/SKILL.md',
          size: 70,
          download_url: 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/skills/software-development/test-driven-development/SKILL.md'
        }
      ],
      'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/skills/software-development/test-driven-development/SKILL.md': [
        '---',
        'name: test-driven-development',
        'description: Write tests first.',
        '---',
        '',
        'Use TDD.'
      ].join('\n')
    })

    const result = await installRecommendedSkillPackage('hermes-software-development', {
      fetchImpl,
      targetRoot
    })

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      fileCount: 1,
      sourceUrl: expect.stringContaining('NousResearch/hermes-agent')
    }))
    if (!result.ok) return
    await expect(readFile(
      join(result.path, 'test-driven-development', 'SKILL.md'),
      'utf8'
    )).resolves.toContain('name: test-driven-development')
  })

  it('downloads Agent-Reach from its official skill directory', async () => {
    const targetRoot = await tempRoot()
    const fetchImpl = fakeGithubFetch({
      'https://api.github.com/repos/Panniantong/Agent-Reach/contents/agent_reach/skill?ref=main': [
        {
          type: 'file',
          path: 'agent_reach/skill/SKILL.md',
          size: 92,
          download_url: 'https://raw.githubusercontent.com/Panniantong/Agent-Reach/main/agent_reach/skill/SKILL.md'
        },
        {
          type: 'dir',
          path: 'agent_reach/skill/references'
        }
      ],
      'https://api.github.com/repos/Panniantong/Agent-Reach/contents/agent_reach/skill/references?ref=main': [
        {
          type: 'file',
          path: 'agent_reach/skill/references/web.md',
          size: 44,
          download_url: 'https://raw.githubusercontent.com/Panniantong/Agent-Reach/main/agent_reach/skill/references/web.md'
        }
      ],
      'https://raw.githubusercontent.com/Panniantong/Agent-Reach/main/agent_reach/skill/SKILL.md': [
        '---',
        'name: agent-reach',
        'description: Give your agent internet reach.',
        '---',
        '',
        'Use Agent-Reach.'
      ].join('\n'),
      'https://raw.githubusercontent.com/Panniantong/Agent-Reach/main/agent_reach/skill/references/web.md': 'Web reference.'
    })

    const result = await installRecommendedSkillPackage('agent-reach', {
      fetchImpl,
      targetRoot
    })

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      fileCount: 2,
      path: join(targetRoot, 'agent-reach'),
      sourceUrl: 'https://github.com/Panniantong/Agent-Reach/tree/main/agent_reach/skill'
    }))
    if (!result.ok) return
    await expect(readFile(join(result.path, 'SKILL.md'), 'utf8')).resolves.toContain('name: agent-reach')
    await expect(readFile(join(result.path, 'references', 'web.md'), 'utf8')).resolves.toContain('Web reference.')
  })

  it('keeps the Agent-Reach recommendation pinned to the official repository path', () => {
    const item = recommendedSkillPackageForTest('agent-reach')

    expect(item).toEqual(expect.objectContaining({
      destinationName: 'agent-reach',
      sourceUrl: 'https://github.com/Panniantong/Agent-Reach/tree/main/agent_reach/skill',
      github: {
        owner: 'Panniantong',
        repo: 'Agent-Reach',
        ref: 'main',
        path: 'agent_reach/skill'
      }
    }))
  })

  it('downloads Caveman skills from the official skill suite directory', async () => {
    const targetRoot = await tempRoot()
    const fetchImpl = fakeGithubFetch({
      'https://api.github.com/repos/JuliusBrussee/caveman/contents/skills?ref=main': [
        {
          type: 'dir',
          path: 'skills/caveman'
        },
        {
          type: 'dir',
          path: 'skills/caveman-compress'
        }
      ],
      'https://api.github.com/repos/JuliusBrussee/caveman/contents/skills/caveman?ref=main': [
        {
          type: 'file',
          path: 'skills/caveman/SKILL.md',
          size: 120,
          download_url: 'https://raw.githubusercontent.com/JuliusBrussee/caveman/main/skills/caveman/SKILL.md'
        }
      ],
      'https://api.github.com/repos/JuliusBrussee/caveman/contents/skills/caveman-compress?ref=main': [
        {
          type: 'file',
          path: 'skills/caveman-compress/SKILL.md',
          size: 90,
          download_url: 'https://raw.githubusercontent.com/JuliusBrussee/caveman/main/skills/caveman-compress/SKILL.md'
        }
      ],
      'https://raw.githubusercontent.com/JuliusBrussee/caveman/main/skills/caveman/SKILL.md': [
        '---',
        'name: caveman',
        'description: Ultra-compressed communication mode.',
        '---',
        '',
        'Respond terse.'
      ].join('\n'),
      'https://raw.githubusercontent.com/JuliusBrussee/caveman/main/skills/caveman-compress/SKILL.md': [
        '---',
        'name: caveman-compress',
        'description: Compress memory files.',
        '---',
        '',
        'Compress files.'
      ].join('\n')
    })

    const result = await installRecommendedSkillPackage('caveman', {
      fetchImpl,
      targetRoot
    })

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      fileCount: 2,
      path: join(targetRoot, 'caveman'),
      sourceUrl: 'https://github.com/JuliusBrussee/caveman/tree/main/skills'
    }))
    if (!result.ok) return
    await expect(readFile(join(result.path, 'caveman', 'SKILL.md'), 'utf8')).resolves.toContain('name: caveman')
    await expect(readFile(join(result.path, 'caveman-compress', 'SKILL.md'), 'utf8')).resolves.toContain('name: caveman-compress')
  })

  it('keeps the Caveman recommendation pinned to the official skill suite path', () => {
    const item = recommendedSkillPackageForTest('caveman')

    expect(item).toEqual(expect.objectContaining({
      destinationName: 'caveman',
      sourceUrl: 'https://github.com/JuliusBrussee/caveman/tree/main/skills',
      github: {
        owner: 'JuliusBrussee',
        repo: 'caveman',
        ref: 'main',
        path: 'skills'
      }
    }))
  })

  it('keeps curated Hermes recommendations pinned to official source paths', () => {
    const expected = new Map([
      ['hermes-software-development', ['skills/software-development', 'hermes-agent/software-development']],
      ['hermes-research', ['skills/research', 'hermes-agent/research']],
      ['hermes-productivity', ['skills/productivity', 'hermes-agent/productivity']],
      ['hermes-creative', ['skills/creative', 'hermes-agent/creative']],
      ['hermes-github', ['skills/github', 'hermes-agent/github']],
      ['hermes-data-science', ['skills/data-science', 'hermes-agent/data-science']],
      ['hermes-mlops', ['skills/mlops', 'hermes-agent/mlops']],
      ['hermes-computer-use', ['skills/computer-use', 'hermes-agent/computer-use']],
      ['hermes-software-extras', ['optional-skills/software-development', 'hermes-agent/optional-software-development']],
      ['hermes-security', ['optional-skills/security', 'hermes-agent/optional-security']],
      ['hermes-devops', ['optional-skills/devops', 'hermes-agent/optional-devops']],
      ['hermes-web-development', ['optional-skills/web-development', 'hermes-agent/optional-web-development']],
      ['hermes-finance', ['optional-skills/finance', 'hermes-agent/optional-finance']],
      ['hermes-research-extras', ['optional-skills/research', 'hermes-agent/optional-research']],
      ['hermes-optional-mcp', ['optional-skills/mcp', 'hermes-agent/optional-mcp']]
    ])

    for (const [id, [path, destinationName]] of expected) {
      const item = recommendedSkillPackageForTest(id)
      expect(item).toEqual(expect.objectContaining({
        destinationName,
        sourceUrl: `https://github.com/NousResearch/hermes-agent/tree/main/${path}`,
        github: {
          owner: 'NousResearch',
          repo: 'hermes-agent',
          ref: 'main',
          path
        }
      }))
    }
  })

  it('downloads optional Hermes skill groups from the official optional-skills tree', async () => {
    const targetRoot = await tempRoot()
    const fetchImpl = fakeGithubFetch({
      'https://api.github.com/repos/NousResearch/hermes-agent/contents/optional-skills/security?ref=main': [
        {
          type: 'dir',
          path: 'optional-skills/security/oss-forensics'
        }
      ],
      'https://api.github.com/repos/NousResearch/hermes-agent/contents/optional-skills/security/oss-forensics?ref=main': [
        {
          type: 'file',
          path: 'optional-skills/security/oss-forensics/SKILL.md',
          size: 97,
          download_url: 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/optional-skills/security/oss-forensics/SKILL.md'
        }
      ],
      'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/optional-skills/security/oss-forensics/SKILL.md': [
        '---',
        'name: oss-forensics',
        'description: Investigate open-source project provenance.',
        '---',
        '',
        'Inspect package provenance.'
      ].join('\n')
    })

    const result = await installRecommendedSkillPackage('hermes-security', {
      fetchImpl,
      targetRoot
    })

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      fileCount: 1,
      path: join(targetRoot, 'hermes-agent', 'optional-security'),
      sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/optional-skills/security'
    }))
    if (!result.ok) return
    await expect(readFile(
      join(result.path, 'oss-forensics', 'SKILL.md'),
      'utf8'
    )).resolves.toContain('name: oss-forensics')
  })

  it('rejects unknown recommendation ids instead of accepting arbitrary repos', async () => {
    const result = await installRecommendedSkillPackage('private-local-skill', {
      fetchImpl: fakeGithubFetch({})
    })

    expect(result).toEqual({
      ok: false,
      message: 'Unknown recommended Skill package.'
    })
  })

  it('collects nested GitHub skill files and trims the source directory prefix', async () => {
    const item = recommendedSkillPackageForTest('hermes-software-development')
    expect(item).toBeTruthy()
    if (!item) return
    const files = await collectGithubDirectoryFiles(item.github, fakeGithubFetch({
      'https://api.github.com/repos/NousResearch/hermes-agent/contents/skills/software-development?ref=main': [
        {
          type: 'file',
          path: 'skills/software-development/plan/SKILL.md',
          size: 32,
          download_url: 'https://raw.githubusercontent.com/plan/SKILL.md'
        }
      ],
      'https://raw.githubusercontent.com/plan/SKILL.md': '---\nname: plan\n---\n'
    }))

    expect(files).toEqual([
      {
        relativePath: 'plan/SKILL.md',
        content: Buffer.from('---\nname: plan\n---\n')
      }
    ])
  })
})

function fakeGithubFetch(fixtures: Record<string, unknown>): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const fixture = fixtures[url]
    if (fixture === undefined) {
      return new Response('not found', { status: 404 })
    }
    if (typeof fixture === 'string') {
      return new Response(fixture, { status: 200 })
    }
    return new Response(JSON.stringify(fixture), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  }) as typeof fetch
}
