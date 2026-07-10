export type RecommendedGithubDirectory = {
  owner: string
  repo: string
  ref: string
  path: string
}

export type RecommendedSkillPackage = {
  id: string
  titleKey: string
  descriptionKey: string
  sourceLabelKey: string
  sourceUrl: string
  destinationName: string
  github: RecommendedGithubDirectory
}

export const RECOMMENDED_SKILL_PACKAGES: readonly RecommendedSkillPackage[] = [
  {
    id: 'agent-reach',
    titleKey: 'pluginSkillAgentReachTitle',
    descriptionKey: 'pluginSkillAgentReachDesc',
    sourceLabelKey: 'pluginSourceAgentReachOfficial',
    sourceUrl: 'https://github.com/Panniantong/Agent-Reach/tree/main/agent_reach/skill',
    destinationName: 'agent-reach',
    github: {
      owner: 'Panniantong',
      repo: 'Agent-Reach',
      ref: 'main',
      path: 'agent_reach/skill'
    }
  },
  {
    id: 'caveman',
    titleKey: 'pluginSkillCavemanTitle',
    descriptionKey: 'pluginSkillCavemanDesc',
    sourceLabelKey: 'pluginSourceCavemanOfficial',
    sourceUrl: 'https://github.com/JuliusBrussee/caveman/tree/main/skills',
    destinationName: 'caveman',
    github: {
      owner: 'JuliusBrussee',
      repo: 'caveman',
      ref: 'main',
      path: 'skills'
    }
  },
  {
    id: 'hermes-software-development',
    titleKey: 'pluginSkillHermesSoftwareTitle',
    descriptionKey: 'pluginSkillHermesSoftwareDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/skills/software-development',
    destinationName: 'hermes-agent/software-development',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'skills/software-development'
    }
  },
  {
    id: 'hermes-research',
    titleKey: 'pluginSkillHermesResearchTitle',
    descriptionKey: 'pluginSkillHermesResearchDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/skills/research',
    destinationName: 'hermes-agent/research',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'skills/research'
    }
  },
  {
    id: 'hermes-productivity',
    titleKey: 'pluginSkillHermesProductivityTitle',
    descriptionKey: 'pluginSkillHermesProductivityDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/skills/productivity',
    destinationName: 'hermes-agent/productivity',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'skills/productivity'
    }
  },
  {
    id: 'hermes-creative',
    titleKey: 'pluginSkillHermesCreativeTitle',
    descriptionKey: 'pluginSkillHermesCreativeDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/skills/creative',
    destinationName: 'hermes-agent/creative',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'skills/creative'
    }
  },
  {
    id: 'hermes-github',
    titleKey: 'pluginSkillHermesGithubTitle',
    descriptionKey: 'pluginSkillHermesGithubDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/skills/github',
    destinationName: 'hermes-agent/github',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'skills/github'
    }
  },
  {
    id: 'hermes-data-science',
    titleKey: 'pluginSkillHermesDataScienceTitle',
    descriptionKey: 'pluginSkillHermesDataScienceDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/skills/data-science',
    destinationName: 'hermes-agent/data-science',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'skills/data-science'
    }
  },
  {
    id: 'hermes-mlops',
    titleKey: 'pluginSkillHermesMlopsTitle',
    descriptionKey: 'pluginSkillHermesMlopsDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/skills/mlops',
    destinationName: 'hermes-agent/mlops',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'skills/mlops'
    }
  },
  {
    id: 'hermes-computer-use',
    titleKey: 'pluginSkillHermesComputerUseTitle',
    descriptionKey: 'pluginSkillHermesComputerUseDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/skills/computer-use',
    destinationName: 'hermes-agent/computer-use',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'skills/computer-use'
    }
  },
  {
    id: 'hermes-software-extras',
    titleKey: 'pluginSkillHermesSoftwareExtrasTitle',
    descriptionKey: 'pluginSkillHermesSoftwareExtrasDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/optional-skills/software-development',
    destinationName: 'hermes-agent/optional-software-development',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'optional-skills/software-development'
    }
  },
  {
    id: 'hermes-security',
    titleKey: 'pluginSkillHermesSecurityTitle',
    descriptionKey: 'pluginSkillHermesSecurityDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/optional-skills/security',
    destinationName: 'hermes-agent/optional-security',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'optional-skills/security'
    }
  },
  {
    id: 'hermes-devops',
    titleKey: 'pluginSkillHermesDevopsTitle',
    descriptionKey: 'pluginSkillHermesDevopsDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/optional-skills/devops',
    destinationName: 'hermes-agent/optional-devops',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'optional-skills/devops'
    }
  },
  {
    id: 'hermes-web-development',
    titleKey: 'pluginSkillHermesWebDevelopmentTitle',
    descriptionKey: 'pluginSkillHermesWebDevelopmentDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/optional-skills/web-development',
    destinationName: 'hermes-agent/optional-web-development',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'optional-skills/web-development'
    }
  },
  {
    id: 'hermes-finance',
    titleKey: 'pluginSkillHermesFinanceTitle',
    descriptionKey: 'pluginSkillHermesFinanceDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/optional-skills/finance',
    destinationName: 'hermes-agent/optional-finance',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'optional-skills/finance'
    }
  },
  {
    id: 'hermes-research-extras',
    titleKey: 'pluginSkillHermesResearchExtrasTitle',
    descriptionKey: 'pluginSkillHermesResearchExtrasDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/optional-skills/research',
    destinationName: 'hermes-agent/optional-research',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'optional-skills/research'
    }
  },
  {
    id: 'hermes-optional-mcp',
    titleKey: 'pluginSkillHermesMcpTitle',
    descriptionKey: 'pluginSkillHermesMcpDesc',
    sourceLabelKey: 'pluginSourceHermesOfficial',
    sourceUrl: 'https://github.com/NousResearch/hermes-agent/tree/main/optional-skills/mcp',
    destinationName: 'hermes-agent/optional-mcp',
    github: {
      owner: 'NousResearch',
      repo: 'hermes-agent',
      ref: 'main',
      path: 'optional-skills/mcp'
    }
  }
]

export function findRecommendedSkillPackage(id: string): RecommendedSkillPackage | undefined {
  const normalized = id.trim()
  return RECOMMENDED_SKILL_PACKAGES.find((item) => item.id === normalized)
}
