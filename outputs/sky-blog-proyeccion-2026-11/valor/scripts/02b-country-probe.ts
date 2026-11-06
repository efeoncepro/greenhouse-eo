/** Read-only probe: how GSC country totals reconcile against the page-aggregated control (Oct 2026, blog). */
import { init, query, pageFilter, BLOG } from './gsc-lib'
import { closeGreenhousePostgres } from '../../../../src/lib/postgres/client'

async function main() {
  await init()
  const r = { startDate: '2026-10-01', endDate: '2026-10-31', type: 'web', dataState: 'final' }
  const sum = (rows: any[]) => rows.reduce((a, x) => a + x.clicks, 0)
  const pf = { dimensionFilterGroups: pageFilter(BLOG.pageRegex) }

  console.log('byPage total', sum(await query(BLOG.siteUrl, { ...r, ...pf, aggregationType: 'byPage', dimensions: [] }, 1)))
  console.log('byPage country', sum(await query(BLOG.siteUrl, { ...r, ...pf, aggregationType: 'byPage', dimensions: ['country'] })))
  console.log('byPage page,country', sum(await query(BLOG.siteUrl, { ...r, ...pf, aggregationType: 'byPage', dimensions: ['page', 'country'] })))
  console.log('auto country (no page filter)', sum(await query(BLOG.siteUrl, { ...r, dimensions: ['country'] })))
  console.log('auto total (no page filter)', sum(await query(BLOG.siteUrl, { ...r, dimensions: [] }, 1)))
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 }).finally(closeGreenhousePostgres)
