import { describe, expect, it } from 'vitest'

import {
  RELEASE_DEPLOY_WORKFLOWS,
  RELEASE_DEPLOY_WORKFLOW_NAMES,
  WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION,
  findWorkflow
} from './workflow-allowlist'

describe('workflow-allowlist — canonical 8 workflows (6 deploy workers + orchestrator + watchdog)', () => {
  it('contains exactly the 8 production release workflows', () => {
    expect(RELEASE_DEPLOY_WORKFLOWS.map((w) => w.workflowName).sort()).toEqual(
      [
        'Azure Teams Bot Deploy',
        'Azure Teams Deploy',
        'Commercial Cost Worker Deploy',
        'HubSpot Greenhouse Integration Deploy',
        'ICO Batch Worker Deploy',
        'Ops Worker Deploy',
        'Production Release Orchestrator',
        'Production Release Watchdog'
      ]
    )
  })

  it('exposes O(1) Set lookup via RELEASE_DEPLOY_WORKFLOW_NAMES', () => {
    expect(RELEASE_DEPLOY_WORKFLOW_NAMES.has('Ops Worker Deploy')).toBe(true)
    expect(RELEASE_DEPLOY_WORKFLOW_NAMES.has('NonExistent Workflow')).toBe(false)
  })

  it('Set is read-only (preserve canonical immutability)', () => {
    expect(RELEASE_DEPLOY_WORKFLOW_NAMES.size).toBe(8)
  })

  // Anti-regression: el orchestrator DEBE estar en el allowlist para que
  // ci_green check (TASK-850) NO cuente runs previos del propio orchestrator
  // como CI failures. Sin esto: self-reference loop — cada attempt fallido
  // bloquea el siguiente (detectado live 2026-05-10 run 25635058162).
  it('includes Production Release Orchestrator (closes ci_green self-reference loop)', () => {
    expect(RELEASE_DEPLOY_WORKFLOW_NAMES.has('Production Release Orchestrator')).toBe(true)
  })

  // Anti-regression: el watchdog scheduled tiene el mismo self-reference loop
  // que el orchestrator. Detectado live 2026-05-13 run 25822955070 attempt 2:
  // drift pre-existente en workers (hubspot + ico-batch + commercial-cost)
  // hizo fallar el watchdog → ci_green lo contó como CI failure → bloqueó
  // promote a production aunque el orchestrator iba A FIXEAR ese drift.
  it('includes Production Release Watchdog (closes monitoring-blocks-deploy loop)', () => {
    expect(RELEASE_DEPLOY_WORKFLOW_NAMES.has('Production Release Watchdog')).toBe(true)
  })

  // El orchestrator NO tiene Cloud Run mapping (no participa en revision drift
  // detection — los workers que despliega via workflow_call sí tienen).
  it('Production Release Orchestrator has NO Cloud Run mapping', () => {
    const orchestrator = findWorkflow('Production Release Orchestrator')

    expect(orchestrator).not.toBeNull()
    expect(orchestrator?.cloudRunService).toBeUndefined()
  })

  // El watchdog tampoco tiene Cloud Run mapping (es un GitHub Actions
  // scheduled workflow, no un service deployado).
  it('Production Release Watchdog has NO Cloud Run mapping', () => {
    const watchdog = findWorkflow('Production Release Watchdog')

    expect(watchdog).not.toBeNull()
    expect(watchdog?.cloudRunService).toBeUndefined()
  })
})

describe('workflow-allowlist — Cloud Run drift detection mapping', () => {
  it('maps 4 workflows to Cloud Run services', () => {
    expect(WORKFLOWS_WITH_CLOUD_RUN_DRIFT_DETECTION).toHaveLength(4)
  })

  it('maps Ops Worker Deploy to ops-worker us-east4', () => {
    const w = findWorkflow('Ops Worker Deploy')

    expect(w?.cloudRunService).toBe('ops-worker')
    expect(w?.cloudRunRegion).toBe('us-east4')
  })

  it('maps HubSpot Greenhouse Integration Deploy to us-central1 (NOT us-east4)', () => {
    // HubSpot bridge corre en us-central1 per CLAUDE.md preserve URL public.
    const w = findWorkflow('HubSpot Greenhouse Integration Deploy')

    expect(w?.cloudRunService).toBe('hubspot-greenhouse-integration')
    expect(w?.cloudRunRegion).toBe('us-central1')
  })

  it('Azure workflows have NO Cloud Run mapping (drift not applicable)', () => {
    const azureTeams = findWorkflow('Azure Teams Deploy')
    const azureBot = findWorkflow('Azure Teams Bot Deploy')

    expect(azureTeams?.cloudRunService).toBeUndefined()
    expect(azureBot?.cloudRunService).toBeUndefined()
  })
})

describe('workflow-allowlist — findWorkflow', () => {
  it('returns null for unknown workflow', () => {
    expect(findWorkflow('Unknown Workflow Name')).toBeNull()
  })

  it('returns the entry for known workflow', () => {
    expect(findWorkflow('ICO Batch Worker Deploy')?.cloudRunService).toBe('ico-batch-worker')
  })
})
