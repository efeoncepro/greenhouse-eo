import { describe, expect, it } from 'vitest'

import { composePublicSiteGithubControlPlanePacket } from './composer'

import type {
  PublicSiteGithubControlPlaneSnapshot,
  PublicSiteGithubReaderResult
} from './types'

const fixedDate = new Date('2026-06-17T12:00:00.000Z')
const mainSha = '4d050fbf7baf4097684f131d4ac31e1d6148ff02'

const snapshot: PublicSiteGithubControlPlaneSnapshot = {
  repository: {
    owner: 'efeoncepro',
    repo: 'efeonce-web',
    nameWithOwner: 'efeoncepro/efeonce-web',
    url: 'https://github.com/efeoncepro/efeonce-web',
    defaultBranch: 'main',
    isPrivate: true,
    pushedAt: '2026-06-17T00:41:30Z',
    updatedAt: '2026-06-17T00:41:35Z'
  },
  branches: [
    {
      name: 'main',
      protected: false,
      sha: mainSha,
      shortSha: '4d050fb',
      url: `https://api.github.com/repos/efeoncepro/efeonce-web/commits/${mainSha}`
    }
  ],
  workflows: [
    {
      id: 259783595,
      name: 'CI',
      path: '.github/workflows/ci.yml',
      state: 'active',
      url: 'https://api.github.com/repos/efeoncepro/efeonce-web/actions/workflows/259783595',
      htmlUrl: 'https://github.com/efeoncepro/efeonce-web/actions/workflows/ci.yml'
    }
  ],
  runs: [
    {
      id: 27657858751,
      name: 'CI',
      workflowId: 259783595,
      workflowName: 'CI',
      status: 'completed',
      conclusion: 'failure',
      event: 'push',
      branch: 'main',
      headSha: mainSha,
      shortHeadSha: '4d050fb',
      htmlUrl: 'https://github.com/efeoncepro/efeonce-web/actions/runs/27657858751',
      createdAt: '2026-06-17T00:41:33Z',
      updatedAt: '2026-06-17T00:42:00Z',
      runStartedAt: '2026-06-17T00:41:33Z'
    }
  ],
  pullRequests: {
    openCount: 0,
    searchUrl: 'https://github.com/efeoncepro/efeonce-web/pulls'
  },
  issues: {
    openCount: 0,
    searchUrl: 'https://github.com/efeoncepro/efeonce-web/issues'
  },
  releases: {
    latestTag: null,
    latestName: null,
    publishedAt: null,
    htmlUrl: null,
    status: 'no_release'
  },
  commitCorrelation: {
    status: 'matched',
    mainHeadSha: mainSha,
    latestCiHeadSha: mainSha,
    productionDeploySha: mainSha,
    detail: 'Vercel production deployment commit matches GitHub main HEAD.'
  },
  sources: [
    { source: 'github_repository', status: 'ok', checkedAt: fixedDate.toISOString() },
    { source: 'github_workflows', status: 'ok', checkedAt: fixedDate.toISOString() },
    { source: 'github_runs', status: 'ok', checkedAt: fixedDate.toISOString() },
    { source: 'binding_correlation', status: 'ok', checkedAt: fixedDate.toISOString() }
  ],
  warnings: []
}

describe('composePublicSiteGithubControlPlanePacket', () => {
  it('returns a high confidence packet when repository, workflow and run sources are healthy', async () => {
    const result: PublicSiteGithubReaderResult<PublicSiteGithubControlPlaneSnapshot> = {
      status: 'ok',
      data: snapshot,
      sources: snapshot.sources,
      warnings: []
    }

    const packet = await composePublicSiteGithubControlPlanePacket({
      now: () => fixedDate,
      readSnapshot: async () => result
    })

    expect(packet.contractVersion).toBe('public-site-github-control-plane.v1')
    expect(packet.confidence).toBe('high')
    expect(packet.repository?.nameWithOwner).toBe('efeoncepro/efeonce-web')
    expect(packet.runs[0]?.conclusion).toBe('failure')
  })

  it('degrades to none when the reader has no GitHub token', async () => {
    const result: PublicSiteGithubReaderResult<PublicSiteGithubControlPlaneSnapshot> = {
      status: 'unavailable',
      data: {
        ...snapshot,
        repository: null,
        sources: [
          { source: 'github_repository', status: 'unavailable', checkedAt: fixedDate.toISOString() }
        ],
        warnings: ['GitHub token unavailable for Public Site repository reader.']
      },
      sources: [
        { source: 'github_repository', status: 'unavailable', checkedAt: fixedDate.toISOString() }
      ],
      warnings: ['GitHub token unavailable for Public Site repository reader.']
    }

    const packet = await composePublicSiteGithubControlPlanePacket({
      now: () => fixedDate,
      readSnapshot: async () => result
    })

    expect(packet.confidence).toBe('none')
    expect(packet.repository).toBeNull()
  })
})
