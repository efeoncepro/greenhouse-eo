import { reconcileResendDeliveries } from '../../src/lib/email/resend-reconciliation'
import { redrivePendingResendWebhookEvents } from '../../src/lib/email/resend-webhook'

const args = new Set(process.argv.slice(2))

const readNumberArg = (name: string, fallback: number) => {
  const prefix = `${name}=`
  const value = process.argv.slice(2).find(arg => arg.startsWith(prefix))?.slice(prefix.length)
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

const readStringArg = (name: string) => {
  const prefix = `${name}=`

  return process.argv.slice(2).find(arg => arg.startsWith(prefix))?.slice(prefix.length)
}

const main = async () => {
  if (args.has('--redrive-pending')) {
    const report = await redrivePendingResendWebhookEvents({ limit: readNumberArg('--limit', 50) })

    process.stdout.write(`${JSON.stringify({ mode: 'redrive-pending', ...report }, null, 2)}\n`)

    return
  }

  const report = await reconcileResendDeliveries({
    apply: args.has('--apply'),
    limit: readNumberArg('--limit', 50),
    lookbackDays: readNumberArg('--lookback-days', 30),
    cursor: readStringArg('--cursor')
  })

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch(error => {
  const errorName = error instanceof Error ? error.name : 'unknown_error'

  process.stderr.write(`Resend reconciliation failed (${errorName}).\n`)
  process.exitCode = 1
})
