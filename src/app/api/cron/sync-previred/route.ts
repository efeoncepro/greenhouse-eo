import { NextResponse } from 'next/server'

import { syncChilePrevisionalPeriod, syncChilePrevisionalRange } from '@/lib/payroll/previred-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const hasInternalSyncAccess = (request: Request) => {
  const configuredSecret = (process.env.CRON_SECRET || '').trim()
  const authHeader = (request.headers.get('authorization') || '').trim()
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const vercelCronHeader = (request.headers.get('x-vercel-cron') || '').trim()
  const userAgent = (request.headers.get('user-agent') || '').trim()

  if (configuredSecret && bearerToken && bearerToken === configuredSecret) return true

  return vercelCronHeader === '1' || userAgent.startsWith('vercel-cron/')
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

const parsePeriodParam = (value: string | null) => {
  if (!value) return null

  const match = value.trim().match(/^(\d{4})-(\d{2})$/)

  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }

  return { year, month }
}

export async function GET(request: Request) {
  if (!hasInternalSyncAccess(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const start = parsePeriodParam(url.searchParams.get('start'))
  const end = parsePeriodParam(url.searchParams.get('end'))

  try {
    if (start && end) {
      const results = await syncChilePrevisionalRange({
        startYear: start.year,
        startMonth: start.month,
        endYear: end.year,
        endMonth: end.month
      })

      return NextResponse.json({
        mode: 'range',
        start,
        end,
        results
      })
    }

    const current = getCurrentMonthInSantiago()
    const previousMonth = current.month === 1 ? 12 : current.month - 1
    const previousYear = current.month === 1 ? current.year - 1 : current.year

    const results = await Promise.all([
      syncChilePrevisionalPeriod({ periodYear: previousYear, periodMonth: previousMonth }),
      syncChilePrevisionalPeriod({ periodYear: current.year, periodMonth: current.month })
    ])

    return NextResponse.json({
      mode: 'default',
      current,
      previous: { year: previousYear, month: previousMonth },
      results
    })
  } catch (error) {
    console.error('[sync-previred] Cron failed:', error)

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
