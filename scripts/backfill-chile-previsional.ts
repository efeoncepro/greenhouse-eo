import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from './lib/load-greenhouse-tool-env'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { syncChilePrevisionalRange } from '@/lib/payroll/previred-sync'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('migrator')

const parsePeriodArg = (value: string | undefined, fallback: { year: number; month: number }) => {
  if (!value) {
    return fallback
  }

  const match = value.trim().match(/^(\d{4})-(\d{2})$/)

  if (!match) {
    return fallback
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return fallback
  }

  return { year, month }
}

const getCurrentMonthInSantiago = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())
  const match = today.match(/^(\d{4})-(\d{2})-\d{2}$/)

  if (match) {
    return { year: Number(match[1]), month: Number(match[2]) }
  }

  const now = new Date()

  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

const main = async () => {
  const current = getCurrentMonthInSantiago()
  const start = parsePeriodArg(process.argv[2], { year: 2026, month: 1 })
  const end = parsePeriodArg(process.argv[3], current)

  console.log(
    `[backfill-chile-previsional] syncing range ${start.year}-${String(start.month).padStart(2, '0')} -> ${end.year}-${String(end.month).padStart(2, '0')}`
  )

  const results = await syncChilePrevisionalRange({
    startYear: start.year,
    startMonth: start.month,
    endYear: end.year,
    endMonth: end.month
  })

  for (const result of results) {
    console.log(
      `[backfill-chile-previsional] ${result.periodYear}-${String(result.periodMonth).padStart(2, '0')} previred=${result.previred.status} impunico=${result.impunico.status} durationMs=${result.durationMs}`
    )
  }
}

main()
  .catch(error => {
    console.error('[backfill-chile-previsional] failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
