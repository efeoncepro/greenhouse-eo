/** Governed maintenance CLI. Dry-run by default; --apply is explicit and bounded. */
import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from './lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

async function main() {
  const args = process.argv.slice(2)

  if (args.some(arg => arg !== '--apply' && arg !== '--dry-run')) throw new Error('invalid_arguments')
  if (args.includes('--apply') && args.includes('--dry-run')) throw new Error('invalid_arguments')
  const { runAuthGarbageCollection } = await import('../src/lib/auth-server/maintenance/gc')
  const result = await runAuthGarbageCollection({ dryRun: !args.includes('--apply') })

  console.log(JSON.stringify(result))
  process.exit(result.locked ? 0 : 2)
}

main().catch(() => {
  console.error('auth_gc_failed')
  process.exit(1)
})
