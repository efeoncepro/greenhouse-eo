/**
 * Canary autenticado de la autenticación de personas (TASK-1830, EPIC-044).
 *
 * Los canaries públicos de la activación (2026-09-05) fueron todos NEGATIVOS o anónimos: metadata,
 * 401s, DCR, code inválido. Este cubre el carril que faltaba —el que sólo se puede ejercitar con una
 * persona autenticada— contra el HOST REAL, no contra el store:
 *
 *   emisión y consumo del magic link · correo realmente despachado · sesión y su contexto ·
 *   registro y login por passkey · TOTP y step-up · muerte de la sesión al revocar el acceso
 *
 * Es distinto de `pnpm auth-server:person-auth:smoke`, y los dos hacen falta: el smoke ejercita el
 * SQL del store contra PG; este ejercita el CONTRATO HTTP contra el servicio desplegado. Un store
 * correcto detrás de una ruta mal cableada pasa el smoke y falla acá.
 *
 * Uso:
 *   pnpm auth-server:person-auth:canary                      # fixture propio, se limpia solo
 *   pnpm auth-server:person-auth:canary -- --email tu@correo  # además manda un correo REAL
 *   pnpm auth-server:person-auth:canary -- --subject <sub>    # contra una persona ya ligada
 *   pnpm auth-server:person-auth:canary -- --host https://... # otro host (default: el issuer)
 *
 * Qué NO hace, a propósito: no emite tokens ni crea bindings de organización. `authorize` exige una
 * membership `bound`, y fabricar una clasificación comercial para pasar un canary sería falsificar
 * el dato que el gate existe para proteger. Ese carril es de TASK-1829/1836 y de la decisión del
 * operador sobre qué organización es elegible.
 *
 * Nunca imprime cookies, tokens, verificadores, secretos TOTP ni códigos de respaldo.
 */
import { randomBytes, randomUUID } from 'node:crypto'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

// ─── Argumentos ──────────────────────────────────────────────────────────────

const argOf = (name: string): string | null => {
  const flag = `--${name}`
  const index = process.argv.indexOf(flag)

  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1]

  const inline = process.argv.find(value => value.startsWith(`${flag}=`))

  return inline ? inline.slice(flag.length + 1) : null
}

const HOST = (argOf('host') ?? process.env.AUTH_SERVER_ISSUER ?? 'https://auth.efeonce.org').replace(/\/$/, '')
const ENVIRONMENT_ID = process.env.AUTH_SERVER_ENVIRONMENT_ID?.trim() || 'efeonce-auth'
const REAL_EMAIL = argOf('email')
const EXISTING_SUBJECT = argOf('subject')

// ─── Reporte ─────────────────────────────────────────────────────────────────

/**
 * `warn` existe para no colapsar dos cosas distintas: una señal en `warning` describe el ESTADO de
 * la plataforma en 24 h (que el canary mismo ensucia al correr), no el contrato que vino a probar.
 * Reprobar por eso confundiría «la superficie funciona» con «no pasó nada últimamente».
 */
type Outcome = 'ok' | 'fail' | 'skip' | 'warn'

const results: Array<{ step: string; outcome: Outcome; detail: string }> = []

const record = (step: string, outcome: Outcome, detail: string) => {
  results.push({ step, outcome, detail })
  const glyph = { ok: '✓', fail: '✗', skip: '·', warn: '!' }[outcome]

  console.log(`${glyph} ${step} — ${detail}`)
}

const check = (step: string, condition: unknown, detail: string) => {
  record(step, condition ? 'ok' : 'fail', detail)
}

// ─── HTTP ────────────────────────────────────────────────────────────────────

type CanaryResponse = { status: number; body: string; headers: Headers; elapsedMs: number }

const request = async (
  path: string,
  init: { method?: string; json?: unknown; cookie?: string; origin?: string | null } = {}
): Promise<CanaryResponse> => {
  const startedAt = Date.now()

  // `origin: null` omite el encabezado; un string lo falsea. Por defecto el canary se comporta
  // como un navegador del propio origen, que es como se usa la superficie de verdad.
  const originHeader = init.origin === undefined ? new URL(HOST).origin : init.origin

  const response = await fetch(`${HOST}${path}`, {
    method: init.method ?? 'GET',
    redirect: 'manual',
    headers: {
      ...(originHeader === null ? {} : { origin: originHeader }),
      ...(init.json === undefined ? {} : { 'content-type': 'application/json' }),
      ...(init.cookie ? { cookie: init.cookie } : {})
    },
    body: init.json === undefined ? undefined : JSON.stringify(init.json)
  })

  return {
    status: response.status,
    body: await response.text(),
    headers: response.headers,
    elapsedMs: Date.now() - startedAt
  }
}

/** Extrae el par `nombre=valor` de la cookie de sesión, sin imprimirla nunca. */
const sessionCookieFrom = (response: CanaryResponse): string | null => {
  const raw = response.headers.get('set-cookie')

  if (!raw || !raw.includes('__Host-efeonce_auth=')) return null

  const pair = raw.split(';')[0]?.trim()

  return pair && !pair.endsWith('=') ? pair : null
}

const run = async () => {
  const { query } = await import('@/lib/db')
  const { PostgresPersonAuthStore } = await import('@/lib/auth-server/persons/store/postgres-store')
  const { sha256Hex } = await import('@/lib/auth-server/oauth/primitives')
  const { SoftwareAuthenticator } = await import('@/lib/auth-server/persons/test-support/software-authenticator')
  const { getAuthPersonSignals } = await import('@/lib/reliability/queries/auth-server-signals')

  const store = new PostgresPersonAuthStore()
  const suffix = randomUUID().slice(0, 8)
  const sourceSystem = `external_idp:${ENVIRONMENT_ID}`
  const usesFixture = !EXISTING_SUBJECT
  const subject = EXISTING_SUBJECT ?? `canary-subject-${suffix}`
  const profileId = `canary-profile-${suffix}`
  const linkId = `canary-link-${suffix}`
  const email = REAL_EMAIL ?? `canary-${suffix}@example.invalid`

  let createdFixture = false
  let rateLimited = false

  try {
    // ── 1. Preflight ────────────────────────────────────────────────────────
    const health = await request('/healthz')
    const flags = JSON.parse(health.body || '{}') as { enabled?: boolean; oauth?: boolean; gitSha?: string }

    check('preflight/healthz', health.status === 200 && flags.enabled === true, `200 enabled=${flags.enabled} oauth=${flags.oauth} gitSha=${String(flags.gitSha).slice(0, 9)}`)
    check('preflight/readyz', (await request('/readyz')).status === 200, '200')

    const login = await request('/login')

    // 404 acá significa `AUTH_SERVER_PERSON_AUTH_ENABLED=false`: el resto del canary no aplica.
    if (login.status !== 200) {
      record('preflight/login', 'fail', `${login.status} — la superficie de personas está apagada; nada más que verificar`)
      throw new Error('person auth surface disabled')
    }

    check('preflight/login', login.body.includes('name="email"') && !login.body.includes('type="password"'), '200, pide correo y ninguna contraseña')

    // ── 2. Señales en reposo, ANTES de que el canary genere tráfico ─────────
    // Se leen acá y no al final: el propio canary pide magic links, y leerlas después haría que
    // reportara como incidente su propio ruido.
    for (const signal of await getAuthPersonSignals()) {
      // `error` reprueba (algo está roto); `warning` se reporta (algo pasó, alguien debería mirar).
      const outcome: Outcome = signal.severity === 'ok' ? 'ok' : signal.severity === 'error' ? 'fail' : 'warn'

      record(`señal/${signal.signalId}`, outcome, `${signal.severity} — ${signal.summary}`)
    }

    // ── 3. Anti-enumeración contra el host real ─────────────────────────────
    // UN solo sondeo desconocido: la comparación que prueba la propiedad es desconocido vs CONOCIDO
    // (más abajo), no dos desconocidos entre sí. Y cada request gasta cuota del límite por IP.
    const unknown = await request('/auth/magic-link/request', { method: 'POST', json: { email: `nadie-${suffix}@example.invalid` } })

    // El límite por IP es del propio canary: correrlo seguido agota su cuota. Reportarlo como fallo
    // sería mentir —el control está funcionando—, y reportarlo como ok sería peor.
    if (unknown.status === 429) {
      rateLimited = true
      record('anti-enumeración', 'skip', `429: el canary agotó su propia cuota (5/h por IP). Reintenta en ~1 h o desde otra IP`)
    } else {
      check('anti-enumeración/forma', unknown.status === 202, `un correo sin acceso responde ${unknown.status}`)
      check('anti-enumeración/piso de latencia', unknown.elapsedMs >= 400, `${unknown.elapsedMs} ms (piso 400 ms)`)
    }

    // ── 3. Persona ──────────────────────────────────────────────────────────
    if (usesFixture) {
      await query(
        `INSERT INTO greenhouse_core.identity_profiles (
           profile_id, public_id, profile_type, canonical_email, full_name, status, active,
           primary_source_system, primary_source_object_type, primary_source_object_id
         ) VALUES ($1, $2, 'external_contact', $3, $4, 'active', TRUE, $5, 'subject', $6)`,
        [profileId, `canary-public-${suffix}`, email, `Canary ${suffix}`, sourceSystem, subject]
      )
      await query(
        `INSERT INTO greenhouse_core.identity_profile_source_links (
           link_id, profile_id, source_system, source_object_type, source_object_id,
           source_user_id, source_email, source_display_name, is_login_identity, active
         ) VALUES ($1, $2, $3, 'subject', $4, $4, $5, $6, TRUE, TRUE)`,
        [linkId, profileId, sourceSystem, subject, email, `Canary ${suffix}`]
      )
      createdFixture = true
      record('fixture', 'ok', `persona temporal creada (${REAL_EMAIL ? 'correo REAL' : 'correo .invalid'})`)
    } else {
      record('fixture', 'skip', `usando la persona ya ligada ${subject.slice(0, 8)}…`)
    }

    // ── 5. Emisión del magic link ───────────────────────────────────────────
    const before = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM greenhouse_auth.magic_link_tokens WHERE subject = $1`,
      [subject]
    )

    const issued = await request('/auth/magic-link/request', { method: 'POST', json: { email } })

    const after = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM greenhouse_auth.magic_link_tokens WHERE subject = $1`,
      [subject]
    )

    if (issued.status === 429) {
      rateLimited = true
      record('magic link/emisión', 'skip', 'cuota del canary agotada (5/h por IP); el resto del carril sigue')
      record('correo/despacho', 'skip', 'no se pidió enlace, no hay correo que verificar')
    } else {
      check(
        'magic link/emisión',
        issued.status === 202 && Number(after[0].count) === Number(before[0].count) + 1,
        `202 y una fila nueva para el sujeto (${before[0].count} → ${after[0].count})`
      )
      check(
        'magic link/indistinguible del desconocido',
        !rateLimited && issued.status === unknown.status && issued.body === unknown.body,
        'mismo código y mismo cuerpo que un correo sin acceso'
      )
    }

    // ── 5. ¿El correo salió de verdad? ──────────────────────────────────────
    // Es lo único que la respuesta HTTP no puede decir: es idéntica por diseño, así que un correo
    // muerto NO se reporta solo. La fila de `email_deliveries` es la única evidencia observable.
    let deliveries: Array<{ status: string; provider_status: string | null; error_message: string | null }> = []

    for (let attempt = 0; attempt < 10 && deliveries.length === 0 && issued.status === 202; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      deliveries = await query(
        `SELECT status, provider_status, error_message
           FROM greenhouse_notifications.email_deliveries
          WHERE email_type = 'auth_server_magic_link' AND recipient_email = $1
          ORDER BY created_at DESC LIMIT 1`,
        [email]
      )
    }

    if (issued.status === 429) {
      // ya reportado como skip arriba
    } else if (deliveries.length === 0) {
      record('correo/despacho', 'fail', 'no hay fila en email_deliveries tras 10 s — el enlace nunca salió y la respuesta HTTP no lo delata')
    } else {
      const delivery = deliveries[0]
      const accepted = delivery.status === 'sent' || delivery.status === 'delivered'

      record(
        'correo/despacho',
        accepted ? 'ok' : 'fail',
        `status=${delivery.status}${delivery.provider_status ? ` provider=${delivery.provider_status}` : ''}${delivery.error_message ? ` error=${delivery.error_message.slice(0, 80)}` : ''}`
      )
    }

    // ── 6. Consumo del magic link, por HTTP ─────────────────────────────────
    // El verificador NUNCA se persiste (sólo su sha256), así que el canary no puede leer el enlace
    // que se envió: emite el suyo por el mismo camino y consume ESE contra la ruta real.
    const tokenId = randomUUID()
    const verifier = randomBytes(32).toString('base64url')
    const now = new Date()

    await store.insertMagicLink({
      tokenId,
      tokenHash: sha256Hex(verifier),
      environmentId: ENVIRONMENT_ID,
      subject,
      emailHash: sha256Hex(email.toLowerCase()),
      returnTo: null,
      requestedAt: now,
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      consumedAt: null,
      requestedIpHash: null,
      consumedIpHash: null,
      userAgentHash: null,
      correlationId: `canary-${suffix}`
    })

    const landing = await request(`/m/${tokenId}.${verifier}`)

    const consumedAtAfterGet = await query<{ consumed_at: Date | null }>(
      `SELECT consumed_at FROM greenhouse_auth.magic_link_tokens WHERE token_id = $1`,
      [tokenId]
    )

    check(
      'magic link/el GET no consume',
      landing.status === 200 && landing.body.includes('method="post"') && consumedAtAfterGet[0]?.consumed_at === null,
      'la página intermedia pinta un formulario y deja el enlace intacto'
    )

    const consumed = await request('/auth/magic-link/consume', { method: 'POST', json: { token: `${tokenId}.${verifier}` } })
    const cookie = sessionCookieFrom(consumed)

    check('magic link/consumo', consumed.status === 200 && Boolean(cookie), `${consumed.status} con cookie __Host- puesta`)

    const replayed = await request('/auth/magic-link/consume', { method: 'POST', json: { token: `${tokenId}.${verifier}` } })

    check('magic link/un solo uso', replayed.status === 400, `el segundo consumo responde ${replayed.status}`)

    if (!cookie) throw new Error('sin sesión no se puede seguir')

    // ── 7. Contexto de la sesión ────────────────────────────────────────────
    const session = await request('/auth/session', { cookie })
    const sessionBody = JSON.parse(session.body || '{}') as { status?: string; authLevel?: string; amr?: string[] }

    check(
      'sesión/contexto',
      session.status === 200 && sessionBody.status === 'authenticated' && sessionBody.authLevel === 'primary',
      `authLevel=${sessionBody.authLevel} amr=${JSON.stringify(sessionBody.amr)}`
    )
    check('sesión/no filtra el sujeto', !session.body.includes(subject), 'el `sub` crudo no sale en la respuesta')

    // ── 8. Passkey: alta y login ────────────────────────────────────────────
    const authenticator = new SoftwareAuthenticator({ rpId: new URL(HOST).hostname, origin: HOST, userVerified: true })
    const registerStart = await request('/auth/passkeys/register/start', { method: 'POST', json: {}, cookie })
    const registerOptions = JSON.parse(registerStart.body || '{}') as { options?: { challenge?: string } }
    const registerChallenge = registerOptions.options?.challenge

    check('passkey/registro inicia', registerStart.status === 200 && Boolean(registerChallenge), `${registerStart.status} con reto`)

    if (registerChallenge) {
      const registerFinish = await request('/auth/passkeys/register/finish', {
        method: 'POST',
        cookie,
        json: { challenge: registerChallenge, response: authenticator.register(registerChallenge), device_name: 'Canary' }
      })

      check('passkey/registro completa', registerFinish.status === 201, `${registerFinish.status}`)

      // La exigencia de mismo origen es una defensa CSRF que alguien puede quitar sin que nada
      // falle: acá se ejercita su RECHAZO, no sólo el camino feliz. Un guard que nunca se ve
      // rechazar es una afirmación (misma disciplina que la señal de sesión huérfana).
      const noOrigin = await request('/auth/passkeys/authenticate/start', { method: 'POST', json: {}, origin: null })

      const foreignOrigin = await request('/auth/passkeys/authenticate/start', {
        method: 'POST',
        json: {},
        origin: 'https://evil.example'
      })

      check(
        'passkey/exige mismo origen',
        noOrigin.status === 403 && foreignOrigin.status === 403,
        `sin Origin ${noOrigin.status} · origen ajeno ${foreignOrigin.status} (ambos deben ser 403)`
      )

      const authStart = await request('/auth/passkeys/authenticate/start', { method: 'POST', json: {} })
      const authOptions = JSON.parse(authStart.body || '{}') as { options?: { challenge?: string; allowCredentials?: unknown[] } }
      const authChallenge = authOptions.options?.challenge

      check(
        'passkey/login sin oráculo',
        authStart.status === 200 && (authOptions.options?.allowCredentials ?? []).length === 0,
        'el reto no revela credenciales de nadie'
      )

      if (authChallenge) {
        const authFinish = await request('/auth/passkeys/authenticate/finish', {
          method: 'POST',
          json: { challenge: authChallenge, response: authenticator.authenticate(authChallenge) }
        })

        const passkeyCookie = sessionCookieFrom(authFinish)
        const authBody = JSON.parse(authFinish.body || '{}') as { amr?: string[] }

        check(
          'passkey/login abre sesión con uv',
          authFinish.status === 200 && Boolean(passkeyCookie) && (authBody.amr ?? []).includes('uv'),
          `${authFinish.status} amr=${JSON.stringify(authBody.amr)}`
        )

        // El passkey con user verification YA es segundo factor: la sesión nace en step_up.
        if (passkeyCookie) {
          const stepUpSession = JSON.parse((await request('/auth/session', { cookie: passkeyCookie })).body || '{}') as { authLevel?: string }

          check('passkey/uv abre en step_up', stepUpSession.authLevel === 'step_up', `authLevel=${stepUpSession.authLevel}`)
        }
      }
    }

    // ── 9. TOTP y step-up ───────────────────────────────────────────────────
    const enrollStart = await request('/auth/totp/enroll/start', { method: 'POST', json: {}, cookie })
    const enrollBody = JSON.parse(enrollStart.body || '{}') as { secret?: string; backupCodes?: string[] }

    check(
      'totp/enrolamiento inicia',
      enrollStart.status === 200 && Boolean(enrollBody.secret) && (enrollBody.backupCodes ?? []).length === 10,
      `${enrollStart.status} con secreto cifrado por KMS y 10 códigos de respaldo`
    )

    if (enrollBody.secret) {
      const { NobleCryptoPlugin, ScureBase32Plugin, TOTP } = await import('otplib')
      const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin(), digits: 6, period: 30 })
      const code = await totp.generate({ secret: enrollBody.secret })
      const enrollFinish = await request('/auth/totp/enroll/finish', { method: 'POST', json: { code }, cookie })

      check('totp/confirmación activa el factor', enrollFinish.status === 200, `${enrollFinish.status}`)

      const stepUp = JSON.parse((await request('/auth/session', { cookie })).body || '{}') as { authLevel?: string; amr?: string[] }

      check(
        'totp/step-up escrito en la sesión',
        stepUp.authLevel === 'step_up' && (stepUp.amr ?? []).includes('totp'),
        `authLevel=${stepUp.authLevel} amr=${JSON.stringify(stepUp.amr)}`
      )

      const replayedCode = await request('/auth/totp/verify', { method: 'POST', json: { code }, cookie })

      check('totp/anti-replay', replayedCode.status === 400, `el mismo código otra vez responde ${replayedCode.status}`)
    }

    // ── 11. Revocar el acceso mata la sesión — y enciende su detector ────────
    if (usesFixture) {
      await query(`UPDATE greenhouse_core.identity_profile_source_links SET active = FALSE WHERE link_id = $1`, [linkId])

      const afterRevoke = await request('/auth/session', { cookie })

      const revokedRow = await query<{ revoke_reason: string | null }>(
        `SELECT revoke_reason FROM greenhouse_auth.sessions WHERE subject = $1 AND revoke_reason IS NOT NULL LIMIT 1`,
        [subject]
      )

      check(
        'revocación/la sesión muere en el siguiente request',
        afterRevoke.status === 401 && revokedRow[0]?.revoke_reason === 'source_link_revoked',
        `401 y la fila queda revocada (${revokedRow[0]?.revoke_reason ?? 'sin revocar'})`
      )

      // La sesión del passkey quedó viva sobre un link muerto porque nadie la volvió a usar: es
      // exactamente lo que la señal existe para ver. Comprobar que SE ENCIENDE vale más que
      // comprobar que está en `ok` — un detector que nunca se ejercita es una afirmación.
      const fired = (await getAuthPersonSignals()).find(signal => signal.signalId === 'auth.person.session_without_link')

      check(
        'señal/el detector de sesión huérfana SE ENCIENDE',
        fired?.severity === 'error',
        `tras revocar el link la señal pasa a ${fired?.severity} (estaba en ok)`
      )
    } else {
      record('revocación', 'skip', 'no se revoca el acceso de una persona real')
      record('señal/el detector de sesión huérfana SE ENCIENDE', 'skip', 'exige el fixture: no se rompe el acceso de nadie real')
    }
  } finally {
    if (createdFixture) {
      await query(`DELETE FROM greenhouse_auth.totp_enrollments WHERE subject = $1`, [subject]).catch(() => undefined)
      await query(`DELETE FROM greenhouse_auth.sessions WHERE subject = $1`, [subject]).catch(() => undefined)
      await query(`DELETE FROM greenhouse_auth.magic_link_tokens WHERE subject = $1`, [subject]).catch(() => undefined)
      await query(`DELETE FROM greenhouse_auth.passkey_credentials WHERE subject = $1`, [subject]).catch(() => undefined)
      await query(`DELETE FROM greenhouse_auth.person_auth_attempts WHERE correlation_id = $1`, [`canary-${suffix}`]).catch(() => undefined)
      await query(`DELETE FROM greenhouse_core.identity_profile_source_links WHERE link_id = $1`, [linkId]).catch(() => undefined)
      await query(`DELETE FROM greenhouse_core.identity_profiles WHERE profile_id = $1`, [profileId]).catch(() => undefined)
      console.log('\n· fixture limpiado')
    }
  }

  const failed = results.filter(result => result.outcome === 'fail')
  const skipped = results.filter(result => result.outcome === 'skip')
  const warned = results.filter(result => result.outcome === 'warn')

  // Tres estados, no dos: un canary con pasos omitidos NO es verde. Colapsarlos convierte
  // «no lo probé» en «funciona», que es la forma más barata de mentirle a quien lo lee.
  const verdict = failed.length > 0 ? 'ROJO' : skipped.length > 0 ? 'INCOMPLETO' : 'VERDE'

  console.log(
    `\n${verdict === 'VERDE' ? '✓' : verdict === 'INCOMPLETO' ? '·' : '✗'} canary ${verdict} — ` +
      `${results.filter(r => r.outcome === 'ok').length} ok, ${failed.length} fallidos, ` +
      `${warned.length} con aviso, ${skipped.length} omitidos · host ${HOST}`
  )

  if (warned.length > 0) {
    console.log(`  avisos (no reprueban, alguien debería mirarlos): ${warned.map(r => r.step).join(', ')}`)
  }

  if (skipped.length > 0) {
    console.log(`  omitidos (NO cuentan como verde): ${skipped.map(r => r.step).join(', ')}`)
  }

  console.log(
    '  NO cubierto acá (exige una organización elegible, decisión del operador): emisión de tokens,\n' +
      '  refresh/revocación y CIMD positivo — carril de TASK-1829/1836.'
  )

  // 0 = verde · 1 = rojo · 2 = incompleto (algo no se pudo probar)
  process.exit(failed.length > 0 ? 1 : skipped.length > 0 ? 2 : 0)
}

void run().catch(error => {
  console.error('\n✗ canary abortado:', error instanceof Error ? error.message : error)
  process.exit(1)
})
