import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'

import { isFixItArtifactsEnabled } from '../flags'
import { readRunProbes } from '../probes/command'
import { readGraderReport } from '../report/command'
import { readPublicGraderReport } from '../report/snapshot'
import { getGraderProfile, getGraderRun } from '../store'
import { buildFixItArtifacts } from './generators'
import type { GenerateFixItArtifactsResult } from './contracts'

export class FixItArtifactsError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'FixItArtifactsError'
    this.code = code
  }
}

const assertEnabled = (env: NodeJS.ProcessEnv): void => {
  if (!isFixItArtifactsEnabled(env)) {
    throw new FixItArtifactsError('fix_it_disabled', 'La generación de artefactos fix-it está deshabilitada.')
  }
}

export const generateFixItArtifactsForRun = async (input: {
  runId: string
  env?: NodeJS.ProcessEnv
}): Promise<GenerateFixItArtifactsResult> => {
  const env = input.env ?? process.env

  assertEnabled(env)

  try {
    const run = await getGraderRun(input.runId)

    if (!run) throw new FixItArtifactsError('run_not_found', 'El run no existe.')

    const profile = await getGraderProfile(run.profileId)

    if (!profile) throw new FixItArtifactsError('profile_not_found', 'El perfil del run no existe.')

    const { publicReport } = await readGraderReport({ runId: input.runId })
    const probeResults = await readRunProbes(input.runId)

    return {
      runId: input.runId,
      artifacts: buildFixItArtifacts(profile, publicReport, probeResults)
    }
  } catch (error) {
    if (error instanceof FixItArtifactsError) throw error

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_fix_it_command' },
      extra: { runId: input.runId }
    })

    throw new FixItArtifactsError('fix_it_generate_failed', 'No fue posible generar los artefactos fix-it.')
  }
}

export const generateFixItArtifactsForPublicToken = async (input: {
  reportToken: string
  env?: NodeJS.ProcessEnv
}): Promise<GenerateFixItArtifactsResult | null> => {
  const env = input.env ?? process.env

  assertEnabled(env)

  try {
    const snapshot = await readPublicGraderReport(input.reportToken)

    if (!snapshot) return null

    const run = await getGraderRun(snapshot.runId)

    if (!run) throw new FixItArtifactsError('run_not_found', 'El run del snapshot no existe.')

    const profile = await getGraderProfile(run.profileId)

    if (!profile) throw new FixItArtifactsError('profile_not_found', 'El perfil del snapshot no existe.')

    const probeResults = await readRunProbes(snapshot.runId)

    return {
      runId: snapshot.runId,
      artifacts: buildFixItArtifacts(profile, snapshot.publicReport, probeResults)
    }
  } catch (error) {
    if (error instanceof FixItArtifactsError) throw error

    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_ai_visibility_fix_it_public_command' }
    })

    throw new FixItArtifactsError('fix_it_generate_failed', 'No fue posible generar los artefactos fix-it.')
  }
}
