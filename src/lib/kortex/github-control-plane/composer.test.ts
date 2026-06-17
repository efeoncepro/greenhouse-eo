import { describe, expect, it } from 'vitest'

import { composeKortexGithubControlPlanePacket } from './composer'

import type {
  KortexGithubControlPlaneSnapshot,
  KortexGithubReaderResult
} from './types'

const fixedDate = new Date('2026-06-17T12:00:00.000Z')

const snapshot: KortexGithubControlPlaneSnapshot = {
  repository: {
    owner: 'efeoncepro',
    repo: 'kortex',
    nameWithOwner: 'efeoncepro/kortex',
    url: 'https://github.com/efeoncepro/kortex',
    defaultBranch: 'main',
    isPrivate: true,
    pushedAt: '2026-06-17T10:10:24Z',
    updatedAt: '2026-06-17T10:10:24Z'
  },
  branches: [
    {
      name: 'main',
      protected: true,
      sha: '7266902e9936d4ad2d56f10cbdcdd0467fc93f2a',
      shortSha: '7266902',
      url: 'https://api.github.com/repos/efeoncepro/kortex/commits/7266902'
    }
  ],
  workflows: [
    {
      id: 245705338,
      name: 'CI',
      path: '.github/workflows/ci.yml',
      state: 'active',
      url: 'https://api.github.com/repos/efeoncepro/kortex/actions/workflows/245705338',
      htmlUrl: 'https://github.com/efeoncepro/kortex/actions/workflows/ci.yml'
    }
  ],
  runs: [
    {
      id: 27681588991,
      name: 'CI',
      workflowId: 245705338,
      workflowName: 'CI',
      status: 'completed',
      conclusion: 'success',
      event: 'push',
      branch: 'main',
      headSha: '7266902e9936d4ad2d56f10cbdcdd0467fc93f2a',
      shortHeadSha: '7266902',
      htmlUrl: 'https://github.com/efeoncepro/kortex/actions/runs/27681588991',
      createdAt: '2026-06-17T10:10:27Z',
      updatedAt: '2026-06-17T10:10:40Z',
      runStartedAt: '2026-06-17T10:10:27Z'
    }
  ],
  pullRequests: {
    openCount: 0,
    searchUrl: 'https://github.com/efeoncepro/kortex/pulls'
  },
  issues: {
    openCount: 0,
    searchUrl: 'https://github.com/efeoncepro/kortex/issues'
  },
  releases: {
    latestTag: null,
    latestName: null,
    publishedAt: null,
    htmlUrl: null,
    status: 'no_release'
  },
  runtimeCorrelation: {
    status: 'matched',
    mainHeadSha: '7266902e9936d4ad2d56f10cbdcdd0467fc93f2a',
    latestCiHeadSha: '7266902e9936d4ad2d56f10cbdcdd0467fc93f2a',
    runtimeReportedSha: null,
    detail: 'Latest tracked CI run matches main HEAD.'
  },
  sources: [
    { source: 'github_repository', status: 'ok', checkedAt: fixedDate.toISOString() },
    { source: 'github_workflows', status: 'ok', checkedAt: fixedDate.toISOString() },
    { source: 'github_runs', status: 'ok', checkedAt: fixedDate.toISOString() },
    { source: 'runtime_correlation', status: 'ok', checkedAt: fixedDate.toISOString() }
  ],
  warnings: []
}

describe('composeKortexGithubControlPlanePacket', () => {
  it('returns a high confidence packet when repository, workflow and run sources are healthy', async () => {
    const result: KortexGithubReaderResult<KortexGithubControlPlaneSnapshot> = {
      status: 'ok',
      data: snapshot,
      sources: snapshot.sources,
      warnings: []
    }

    const packet = await composeKortexGithubControlPlanePacket({
      now: () => fixedDate,
      readSnapshot: async () => result
    })

    expect(packet.contractVersion).toBe('greenhouse-kortex-github-control-plane.v1')
    expect(packet.confidence).toBe('high')
    expect(packet.repository?.nameWithOwner).toBe('efeoncepro/kortex')
    expect(packet.runs[0]?.conclusion).toBe('success')
  })

  it('degrades to none when the reader has no GitHub token', async () => {
    const result: KortexGithubReaderResult<KortexGithubControlPlaneSnapshot> = {
      status: 'unavailable',
      data: {
        ...snapshot,
        repository: null,
        sources: [
          { source: 'github_repository', status: 'unavailable', checkedAt: fixedDate.toISOString() }
        ],
        warnings: ['GitHub token unavailable for Kortex repository reader.']
      },
      sources: [
        { source: 'github_repository', status: 'unavailable', checkedAt: fixedDate.toISOString() }
      ],
      warnings: ['GitHub token unavailable for Kortex repository reader.']
    }

    const packet = await composeKortexGithubControlPlanePacket({
      now: () => fixedDate,
      readSnapshot: async () => result
    })

    expect(packet.confidence).toBe('none')
    expect(packet.repository).toBeNull()
  })
})
