import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { closeGreenhousePostgres } from '@/lib/db'
import {
  buildWorkforceFoundationMapForMember,
  buildWorkforceFoundationMapForProfile,
  listWorkforceFoundationSubjects
} from '@/lib/workforce/foundation/object-map'
import type { WorkforceFoundationGapSeverity } from '@/lib/workforce/foundation/gap-codes'
import type {
  WorkforceFoundationMap,
  WorkforceFoundationSubjectFilters
} from '@/lib/workforce/foundation/object-map-types'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('runtime')

type CliOptions = WorkforceFoundationSubjectFilters & {
  jsonOut?: string
  failOnErrorGap: boolean
}

type GapExample = {
  code: string
  severity: WorkforceFoundationGapSeverity
  memberId: string | null
  profileId: string | null
  displayNameMasked: string
  message: string
}

type AuditSummary = {
  generatedAt: string
  filters: CliOptions
  totals: {
    profilesScanned: number
    membersScanned: number
    activeMembersScanned: number
    mapsBuilt: number
  }
  coverage: {
    relationship: { count: number; denominator: number; rate: number }
    classificationParity: { count: number; denominator: number; rate: number }
    currentCompensation: { count: number; denominator: number; rate: number }
    paymentRailEvidence: { count: number; denominator: number; rate: number }
  }
  gaps: {
    byCode: Record<string, number>
    bySeverity: Record<WorkforceFoundationGapSeverity, number>
    examples: Record<string, GapExample[]>
  }
}

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    activeOnly: false,
    includeDemo: false,
    failOnErrorGap: false
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if (arg === '--active-only') {
      options.activeOnly = true
    } else if (arg === '--include-demo') {
      options.includeDemo = true
    } else if (arg === '--profile-id' && next) {
      options.profileId = next
      index += 1
    } else if (arg === '--member-id' && next) {
      options.memberId = next
      index += 1
    } else if (arg === '--json-out' && next) {
      options.jsonOut = next
      index += 1
    } else if (arg === '--fail-on-error-gap') {
      options.failOnErrorGap = true
    } else if (arg === '--limit' && next) {
      options.limit = Number(next)
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`)
    }
  }

  return options
}

const printHelp = () => {
  console.log(`
Usage:
  pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/workforce/audit-workforce-foundation-map.ts [options]

Options:
  --active-only              Scan active subjects only.
  --include-demo             Include demo/fixture members.
  --profile-id <id>          Scan one identity profile.
  --member-id <id>           Scan one member.
  --json-out <path>          Write masked JSON summary to a file.
  --fail-on-error-gap        Exit non-zero when any error-severity data gap is found.
  --limit <number>           Cap subject scan size. Default: mapper default.
`)
}

const rate = (count: number, denominator: number) => denominator === 0 ? 1 : Number((count / denominator).toFixed(4))

const maskName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) return 'Sin nombre'

  return parts.map(part => `${part[0]?.toUpperCase() ?? '*'}.`).join(' ')
}

const hasPaymentRailEvidence = (map: WorkforceFoundationMap) => {
  if (!map.person.memberId) return false
  if (!map.paymentRail.payrollVia) return false

  if (map.paymentRail.payrollVia === 'deel') {
    return Boolean(map.paymentRail.deelContractId || map.paymentRail.providerContractId)
  }

  return map.paymentRail.paymentProfileSummary.activeProfiles > 0 ||
    map.paymentRail.obligationSummary.totalObligations > 0
}

const summarize = (maps: WorkforceFoundationMap[], filters: CliOptions): AuditSummary => {
  const profileIds = new Set(maps.map(map => map.person.profileId).filter(Boolean))
  const memberIds = new Set(maps.map(map => map.person.memberId).filter(Boolean))
  const activeMemberMaps = maps.filter(map => map.person.memberId && map.person.active)
  const relationshipDenominator = activeMemberMaps.length
  const relationshipCount = activeMemberMaps.filter(map => Boolean(map.relationship.current)).length
  const classificationMaps = maps.filter(map => Boolean(map.person.profileId))
  const classificationParityCount = classificationMaps.filter(map => map.classification.parity).length
  const compensationDenominator = activeMemberMaps.length
  const currentCompensationCount = activeMemberMaps.filter(map => Boolean(map.compensation.versionId)).length
  const paymentRailDenominator = activeMemberMaps.length
  const paymentRailEvidenceCount = activeMemberMaps.filter(hasPaymentRailEvidence).length
  const byCode: Record<string, number> = {}

  const bySeverity: Record<WorkforceFoundationGapSeverity, number> = {
    info: 0,
    warning: 0,
    error: 0
  }

  const examples: Record<string, GapExample[]> = {}

  maps.forEach(map => {
    map.gaps.forEach(gap => {
      byCode[gap.code] = (byCode[gap.code] ?? 0) + 1
      bySeverity[gap.severity] += 1
      examples[gap.code] ??= []

      if (examples[gap.code].length < 5) {
        examples[gap.code].push({
          code: gap.code,
          severity: gap.severity,
          memberId: map.person.memberId,
          profileId: map.person.profileId,
          displayNameMasked: maskName(map.person.displayName),
          message: gap.message
        })
      }
    })
  })

  return {
    generatedAt: new Date().toISOString(),
    filters,
    totals: {
      profilesScanned: profileIds.size,
      membersScanned: memberIds.size,
      activeMembersScanned: activeMemberMaps.length,
      mapsBuilt: maps.length
    },
    coverage: {
      relationship: {
        count: relationshipCount,
        denominator: relationshipDenominator,
        rate: rate(relationshipCount, relationshipDenominator)
      },
      classificationParity: {
        count: classificationParityCount,
        denominator: classificationMaps.length,
        rate: rate(classificationParityCount, classificationMaps.length)
      },
      currentCompensation: {
        count: currentCompensationCount,
        denominator: compensationDenominator,
        rate: rate(currentCompensationCount, compensationDenominator)
      },
      paymentRailEvidence: {
        count: paymentRailEvidenceCount,
        denominator: paymentRailDenominator,
        rate: rate(paymentRailEvidenceCount, paymentRailDenominator)
      }
    },
    gaps: {
      byCode,
      bySeverity,
      examples
    }
  }
}

const printSummary = (summary: AuditSummary) => {
  console.log('Workforce Foundation read-only audit')
  console.log(`Generated at: ${summary.generatedAt}`)
  console.log('')
  console.table(summary.totals)
  console.log('Coverage')
  console.table(summary.coverage)
  console.log('Gap counts by severity')
  console.table(summary.gaps.bySeverity)
  console.log('Gap counts by code')
  console.table(summary.gaps.byCode)
  console.log('Masked examples')
  Object.entries(summary.gaps.examples).forEach(([code, examples]) => {
    console.log(`- ${code}`)
    examples.forEach(example => {
      console.log(`  ${example.severity} ${example.displayNameMasked} member=${example.memberId ?? 'n/a'} profile=${example.profileId ?? 'n/a'}: ${example.message}`)
    })
  })
}

const run = async () => {
  const options = parseArgs(process.argv.slice(2))
  const subjects = await listWorkforceFoundationSubjects(options)
  const maps: WorkforceFoundationMap[] = []

  for (const subject of subjects) {
    if (subject.memberId) {
      maps.push(await buildWorkforceFoundationMapForMember(subject.memberId))
    } else if (subject.profileId) {
      maps.push(await buildWorkforceFoundationMapForProfile(subject.profileId))
    }
  }

  const summary = summarize(maps, options)

  printSummary(summary)

  if (options.jsonOut) {
    const absolutePath = path.resolve(options.jsonOut)

    await mkdir(path.dirname(absolutePath), { recursive: true })
    await writeFile(absolutePath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
    console.log(`JSON summary written to ${absolutePath}`)
  }

  if (options.failOnErrorGap && summary.gaps.bySeverity.error > 0) {
    process.exitCode = 2
  }
}

run()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres().catch(() => undefined)
  })
