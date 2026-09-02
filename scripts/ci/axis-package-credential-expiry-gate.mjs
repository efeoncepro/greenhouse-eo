#!/usr/bin/env node
/**
 * AXIS package credential expiry gate.
 *
 * Why this exists: the AXIS read credential is consumed by Cloud Build only —
 * the four Greenhouse worker builds and Globe's — through Secret Manager.
 * GitHub Actions uses the runner's own `GITHUB_TOKEN` and never touches it.
 *
 * So the day the credential expires, CI stays green and nothing fails until
 * someone deploys a worker. The failure is silent by construction, which is
 * exactly the shape of failure a scheduled gate exists to catch.
 *
 * It reads the expiry GitHub reports for the token itself, not a date written
 * in a doc. A ledger can drift; the header cannot.
 *
 * El secreto `axis-packages-read-token` guarda un **`.npmrc` completo multilínea**,
 * no el PAT pelado — así lo escribe `scripts/secrets/rotate-axis-packages-token.sh`,
 * porque es lo que Cloud Build monta tal cual. Por eso el gate EXTRAE el token de la
 * línea `//npm.pkg.github.com/:_authToken=` antes de armar el header: pasar el blob
 * entero produce `Headers.append: ... is an invalid header value` y el gate muere
 * antes de poder medir nada. Pasó de verdad — la rotación del 2026-08-29 cambió la
 * forma del secreto y dejó este detector ciego desde el 2026-09-01 (run 33536649346),
 * justo en la ventana en que tenía que avisar del próximo vencimiento.
 *
 * Usage:
 *   AXIS_PACKAGES_READ_TOKEN=<token|.npmrc> node scripts/ci/axis-package-credential-expiry-gate.mjs
 *   node scripts/ci/axis-package-credential-expiry-gate.mjs --strict
 *
 * Exit codes: 0 healthy or skipped · 1 expired/expiring under --strict, or an
 * unusable credential in any mode.
 */

const WARN_DAYS = Number(process.env.AXIS_CREDENTIAL_WARN_DAYS ?? 21)
const FAIL_DAYS = Number(process.env.AXIS_CREDENTIAL_FAIL_DAYS ?? 7)
const EXPIRY_HEADER = 'github-authentication-token-expiration'

const strict = process.argv.includes('--strict')

const say = message => process.stdout.write(`${message}\n`)

/**
 * El valor del secreto puede venir en dos formas y hay que aceptar las dos:
 * un `.npmrc` completo (la forma vigente en Secret Manager) o un PAT pelado.
 * Devuelve `null` cuando el valor no es usable como header, en vez de dejar
 * que `fetch` reviente con el contenido del secreto dentro del mensaje.
 */
export const extractToken = raw => {
  const value = (raw ?? '').trim()

  if (!value) return null

  const fromNpmrc = value.match(/^\s*\/\/npm\.pkg\.github\.com\/:_authToken=(.+)$/m)

  if (fromNpmrc) {
    const candidate = fromNpmrc[1].trim()

    return candidate && !/\s/.test(candidate) ? candidate : null
  }

  // Un PAT es una sola línea sin espacios. Cualquier otra cosa multilínea es un
  // `.npmrc` con otra forma (o basura): no la mandamos a un header.
  return /\s/.test(value) ? null : value
}

/**
 * Nunca dejar que el valor del credencial salga por stdout. El modo de falla del
 * 2026-09-01 fue exactamente eso: `Headers.append` embebe el valor inválido en su
 * mensaje, y el mensaje se imprimió tal cual.
 */
const redact = (message, secret) => {
  const text = String(message ?? '')

  return secret ? text.split(secret).join('[REDACTADO]') : text
}

const token = extractToken(process.env.AXIS_PACKAGES_READ_TOKEN)

/** GitHub reports the expiry as `2026-08-27 03:00:00 UTC`, which `Date` will not parse as-is. */
const parseExpiry = raw => {
  const normalized = raw.trim().replace(' UTC', 'Z').replace(' ', 'T')
  const parsed = new Date(normalized)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const main = async () => {
  if (!process.env.AXIS_PACKAGES_READ_TOKEN?.trim()) {
    say('• AXIS_PACKAGES_READ_TOKEN ausente — gate omitido.')
    say('  Este gate mide la expiración REAL del credencial; sin el token no hay nada que medir.')
    say('  En CI, inyectarlo desde Secret Manager (proyecto efeonce-group).')

    return 0
  }

  if (!token) {
    say('✖ El valor de AXIS_PACKAGES_READ_TOKEN existe pero no contiene un token usable.')
    say('  Se esperaba un PAT de una línea, o un `.npmrc` con la línea')
    say('  `//npm.pkg.github.com/:_authToken=<token>`. Revisar la versión vigente del')
    say('  secreto axis-packages-read-token en el proyecto efeonce-group (sin imprimirla).')
    say('  Runbook: docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md')

    return 1
  }

  let response

  try {
    response = await fetch('https://api.github.com/', {
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'user-agent': 'greenhouse-axis-credential-gate'
      }
    })
  } catch (error) {
    say(`✖ No se pudo consultar la API de GitHub: ${redact(error.message, token)}`)

    return 1
  }

  if (response.status === 401) {
    say('✖ El credencial AXIS fue rechazado (401). Ya expiró o fue revocado.')
    say('  Los builds de Cloud Build de los 4 workers y de Globe están rotos AHORA.')
    say('  Runbook: docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md')

    return 1
  }

  if (!response.ok) {
    say(`✖ Respuesta inesperada de la API de GitHub: ${response.status}.`)

    return 1
  }

  const rawExpiry = response.headers.get(EXPIRY_HEADER)

  if (!rawExpiry) {
    say('⚠ GitHub no reportó expiración para este credencial.')
    say('  Un token sin vencimiento no rota nunca y no se puede auditar: contradice el runbook,')
    say('  que exige `short expiration and documented rotation owner`.')

    return strict ? 1 : 0
  }

  const expiresAt = parseExpiry(rawExpiry)

  if (!expiresAt) {
    say(`✖ No se pudo interpretar la expiración reportada: "${rawExpiry}".`)

    return 1
  }

  const daysLeft = Math.floor((expiresAt.getTime() - Date.now()) / 86_400_000)
  const stamp = expiresAt.toISOString().slice(0, 10)

  if (daysLeft <= FAIL_DAYS) {
    say(`✖ El credencial AXIS expira el ${stamp} — quedan ${daysLeft} días.`)
    say('  Rotar YA: al expirar, GitHub Actions sigue verde y solo fallan los builds de worker.')

    return 1
  }

  if (daysLeft <= WARN_DAYS) {
    say(`⚠ El credencial AXIS expira el ${stamp} — quedan ${daysLeft} días.`)
    say('  Agendar la rotación antes de que entre en la ventana de falla.')

    return strict ? 1 : 0
  }

  say(`✔ Credencial AXIS vigente hasta ${stamp} (${daysLeft} días).`)

  return 0
}

// CLI entry point. Skip when imported (allows test reuse of helpers).
const isMainModule =
  import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1] ?? '\u0000')

if (isMainModule) {
  process.exit(await main())
}
