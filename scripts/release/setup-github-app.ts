#!/usr/bin/env tsx
/**
 * TASK-849 V1.1 — GitHub App setup orchestrator end-to-end.
 *
 * Crea el GitHub App `Greenhouse Release Watchdog`, lo instala en el repo,
 * sube el private key a GCP Secret Manager y configura los 3 Vercel env vars
 * en production. Reduce el setup UI manual de ~25 min a 2 clicks browser +
 * orchestration automatica.
 *
 * **Flow canonico**:
 *   1. Levanta HTTP server local en `localhost:9999`
 *   2. Abre browser a GitHub Manifest creation URL con manifest pre-configurado
 *   3. Usuario aprueba en browser (1 click) → GitHub redirect a localhost callback
 *   4. POST /app-manifests/<code>/conversions → app_id + PEM + client_secret
 *   5. Abre browser a install URL → usuario aprueba install on `greenhouse-eo` (1 click)
 *   6. Resuelve installation_id via GitHub API
 *   7. Confirma con usuario ANTES de side effects destructivos:
 *      - gcloud: subir private key a Secret Manager
 *      - vercel: agregar 3 env vars production
 *      - vercel: trigger redeploy
 *
 * **Safety**:
 *   - Private key vive solo en memoria — NUNCA en disco
 *   - Confirmaciones interactivas antes de gcloud + vercel writes
 *   - Cancel anytime (Ctrl+C cleanup el server local)
 *   - Idempotente: si secret ya existe, agrega nueva version
 *
 * Uso: `pnpm release:setup-github-app`
 *
 * Spec: docs/operations/runbooks/production-release-watchdog.md §8.1.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { exec } from 'node:child_process'
import { execFileSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, exit } from 'node:process'

const ORG_NAME = 'efeoncepro'
const REPO_NAME = 'greenhouse-eo'
const APP_NAME = 'Greenhouse Release Watchdog'
const CALLBACK_PORT = 9999
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`
const GCP_PROJECT_ID = 'efeonce-group'
const GCP_SECRET_NAME = 'greenhouse-github-app-private-key'
const VERCEL_ENV_TARGET = 'production'

const APP_MANIFEST = {
  name: APP_NAME,
  url: 'https://greenhouse.efeoncepro.com',
  hook_attributes: {
    active: false
  },
  redirect_url: CALLBACK_URL,
  callback_urls: [CALLBACK_URL],
  public: false,
  default_permissions: {
    actions: 'read',
    deployments: 'read',
    metadata: 'read'
  },
  default_events: []
}

interface AppManifestConversionResponse {
  id: number
  slug: string
  name: string
  pem: string
  client_id: string
  client_secret: string
  webhook_secret: string | null
  html_url: string
}

interface InstallationListResponse {
  id: number
  app_id: number
  account: { login: string }
  repository_selection: 'all' | 'selected'
}

const openBrowser = async (url: string): Promise<void> => {
  console.log(`\n[browser] Opening: ${url}`)
  await new Promise<void>((resolve) => {
    exec(`open "${url}"`, () => resolve())
  })
}

const captureCallback = (): Promise<string> =>
  new Promise((resolve, reject) => {
    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? '', `http://localhost:${CALLBACK_PORT}`)

        if (url.pathname !== '/callback') {
          res.writeHead(404).end('Not Found')

          return
        }

        const code = url.searchParams.get('code')

        if (!code) {
          res.writeHead(400).end('Missing ?code parameter')

          return
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(`
          <!DOCTYPE html>
          <html><body style="font-family: system-ui; padding: 40px; max-width: 600px">
            <h1>✅ GitHub App created</h1>
            <p>Code received. Returning to CLI...</p>
            <p style="color: #666">You can close this tab.</p>
          </body></html>
        `)

        server.close(() => resolve(code))
      } catch (error) {
        reject(error)
      }
    })

    server.listen(CALLBACK_PORT, () => {
      console.log(`[callback-server] Listening on http://localhost:${CALLBACK_PORT}/callback`)
    })

    server.on('error', reject)
    setTimeout(() => {
      server.close()
      reject(new Error('Callback timeout (10 min) — user did not approve manifest'))
    }, 10 * 60 * 1000)
  })

const ghAuthToken = (): string => {
  try {
    return execFileSync('gh', ['auth', 'token']).toString().trim()
  } catch {
    console.error('Error: gh CLI not authenticated. Run `gh auth login` first.')
    exit(1)
  }
}

const fetchGithub = async <T>(
  endpoint: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`
  const token = options.token ?? ghAuthToken()

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'greenhouse-release-app-setup',
      ...(options.headers ?? {})
    }
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')

    throw new Error(`GitHub API ${endpoint} returned ${response.status}: ${body.slice(0, 300)}`)
  }

  return (await response.json()) as T
}

const promptYesNo = async (question: string): Promise<boolean> => {
  const rl = createInterface({ input: stdin, output: stdout })
  const answer = await rl.question(`${question} [y/N] `)

  rl.close()

  return answer.trim().toLowerCase().startsWith('y')
}

const runShell = (command: string, input?: string): string => {
  console.log(`\n$ ${command}`)

  try {
    return execFileSync('bash', ['-c', command], {
      input,
      encoding: 'utf8',
      stdio: input ? ['pipe', 'pipe', 'inherit'] : ['inherit', 'pipe', 'inherit']
    }).toString()
  } catch (error) {
    console.error(`Command failed: ${(error as Error).message}`)
    throw error
  }
}

const main = async (): Promise<void> => {
  console.log('=== Greenhouse Release Watchdog — GitHub App Setup ===')
  console.log('')
  console.log(`Org      : ${ORG_NAME}`)
  console.log(`Repo     : ${REPO_NAME}`)
  console.log(`App name : ${APP_NAME}`)
  console.log(`Callback : ${CALLBACK_URL}`)
  console.log('')
  console.log('This will:')
  console.log('  1. Open browser to GitHub Manifest creation page')
  console.log('  2. Wait for you to click "Create GitHub App for efeoncepro"')
  console.log('  3. Receive app credentials (App ID + private key PEM)')
  console.log('  4. Open browser for installation on greenhouse-eo')
  console.log('  5. Wait for you to click "Install"')
  console.log('  6. Confirm with you BEFORE: gcloud secret upload + Vercel env vars')
  console.log('')

  const proceed = await promptYesNo('Proceed?')

  if (!proceed) {
    console.log('Cancelled.')
    exit(0)
  }

  // ─── Step 1: Manifest creation flow ────────────────────────────────────────
  console.log('\n=== Step 1: Create GitHub App via manifest ===')

  const manifestForm = `
    <!DOCTYPE html>
    <html>
      <body onload="document.forms[0].submit()">
        <form method="post" action="https://github.com/organizations/${ORG_NAME}/settings/apps/new?state=greenhouse-watchdog-setup">
          <input type="hidden" name="manifest" value='${JSON.stringify(APP_MANIFEST).replace(/'/g, '&apos;')}' />
          <p>Submitting manifest... if not redirected, click here:</p>
          <input type="submit" value="Continue to GitHub" />
        </form>
      </body>
    </html>
  `

  // Spin up local HTTP server to serve the manifest form (GitHub requires POST)
  const manifestServer = createServer((req, res) => {
    if (req.url === '/start') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(manifestForm)

      return
    }

    res.writeHead(404).end()
  })

  await new Promise<void>((resolve) => manifestServer.listen(CALLBACK_PORT, resolve))

  // Open the manifest form in browser
  await openBrowser(`http://localhost:${CALLBACK_PORT}/start`)

  console.log('\n⏳ Waiting for you to approve manifest in browser (timeout 10min)...')
  console.log('   Click "Create GitHub App for efeoncepro" in the browser tab.')

  // Wait a moment then close manifest server, switch to callback server.
  // Actually we can reuse — let's restart with callback handler.
  await new Promise<void>((resolve) => manifestServer.close(() => resolve()))

  const code = await captureCallback()

  console.log(`\n[callback] Got code: ${code.slice(0, 12)}...`)

  // ─── Step 2: Convert manifest code → app credentials ──────────────────────
  console.log('\n=== Step 2: Exchange code for app credentials ===')

  const conversion = await fetchGithub<AppManifestConversionResponse>(
    `/app-manifests/${code}/conversions`,
    { method: 'POST' }
  )

  console.log(`✅ App created:`)
  console.log(`   App ID  : ${conversion.id}`)
  console.log(`   Slug    : ${conversion.slug}`)
  console.log(`   URL     : ${conversion.html_url}`)
  console.log(`   PEM     : (${conversion.pem.length} chars, in memory only)`)

  // ─── Step 3: Install app on repo ──────────────────────────────────────────
  console.log('\n=== Step 3: Install GitHub App on greenhouse-eo ===')

  const installUrl = `https://github.com/apps/${conversion.slug}/installations/new`

  await openBrowser(installUrl)

  console.log('\n⏳ Waiting 30s for you to click "Install" on greenhouse-eo repo...')
  console.log('   (Tras instalar, podes cerrar la tab — el script chequea el state via API)')
  await new Promise<void>((resolve) => setTimeout(resolve, 30_000))

  // Resolve installation_id via API (use JWT signed with our new private key)
  console.log('\n=== Step 4: Resolve installation_id ===')
  console.log('Listing installations of the new app...')

  // Mint JWT to query as the app
  const { SignJWT, importPKCS8 } = await import('jose')
  const privateKey = await importPKCS8(conversion.pem, 'RS256')
  const nowSec = Math.floor(Date.now() / 1000)

  const appJwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(nowSec - 60)
    .setExpirationTime(nowSec + 9 * 60)
    .setIssuer(String(conversion.id))
    .sign(privateKey)

  const installations = await fetchGithub<InstallationListResponse[]>(
    '/app/installations',
    { token: appJwt }
  )

  const repoInstallation = installations.find((i) => i.account.login === ORG_NAME)

  if (!repoInstallation) {
    console.error(`❌ No installation found for org '${ORG_NAME}'.`)
    console.error('   Did you click "Install" on the browser tab?')
    console.error(`   Re-try: visit ${installUrl}, install, then re-run this script.`)
    exit(1)
  }

  console.log(`✅ Installation found:`)
  console.log(`   Installation ID    : ${repoInstallation.id}`)
  console.log(`   Account            : ${repoInstallation.account.login}`)
  console.log(`   Repository scope   : ${repoInstallation.repository_selection}`)

  // ─── Step 5: Upload private key to GCP Secret Manager ─────────────────────
  console.log('\n=== Step 5: Upload private key to GCP Secret Manager ===')
  console.log(`   Project: ${GCP_PROJECT_ID}`)
  console.log(`   Secret : ${GCP_SECRET_NAME}`)

  const uploadOk = await promptYesNo('Upload private key now?')

  if (uploadOk) {
    // Create secret if it doesn't exist (idempotent)
    try {
      runShell(
        `gcloud secrets describe ${GCP_SECRET_NAME} --project=${GCP_PROJECT_ID} >/dev/null 2>&1 || gcloud secrets create ${GCP_SECRET_NAME} --replication-policy=automatic --project=${GCP_PROJECT_ID}`
      )
      runShell(
        `gcloud secrets versions add ${GCP_SECRET_NAME} --project=${GCP_PROJECT_ID} --data-file=-`,
        conversion.pem
      )
      console.log('✅ Private key uploaded to Secret Manager')
    } catch (error) {
      console.error('❌ gcloud upload failed. You can upload manually later with:')
      console.error(`   echo "<PEM>" | gcloud secrets versions add ${GCP_SECRET_NAME} --project=${GCP_PROJECT_ID} --data-file=-`)
      throw error
    }
  } else {
    console.log('⏭  Skipped. Upload manually later with:')
    console.log(`    cat /path/to/key.pem | gcloud secrets versions add ${GCP_SECRET_NAME} --project=${GCP_PROJECT_ID} --data-file=-`)
  }

  // ─── Step 6: Configure Vercel env vars ────────────────────────────────────
  console.log('\n=== Step 6: Configure Vercel env vars production ===')
  console.log(`   GITHUB_APP_ID                                  = ${conversion.id}`)
  console.log(`   GITHUB_APP_INSTALLATION_ID                     = ${repoInstallation.id}`)
  console.log(`   GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF   = ${GCP_SECRET_NAME}`)

  const vercelOk = await promptYesNo('Configure Vercel env vars production?')

  if (vercelOk) {
    try {
      runShell(`echo "${conversion.id}" | vercel env add GITHUB_APP_ID ${VERCEL_ENV_TARGET}`)
      runShell(`echo "${repoInstallation.id}" | vercel env add GITHUB_APP_INSTALLATION_ID ${VERCEL_ENV_TARGET}`)
      runShell(`echo "${GCP_SECRET_NAME}" | vercel env add GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF ${VERCEL_ENV_TARGET}`)
      console.log('✅ Vercel env vars configured')
    } catch {
      console.error('⚠ One or more vercel env add failed (likely already exists). Continuing.')
    }
  } else {
    console.log('⏭  Skipped. Configure manually later via vercel CLI.')
  }

  // ─── Step 7: Trigger Vercel redeploy ──────────────────────────────────────
  console.log('\n=== Step 7: Trigger Vercel redeploy ===')
  const redeployOk = await promptYesNo('Trigger Vercel production redeploy now (apply env vars)?')

  if (redeployOk) {
    runShell('vercel deploy --prod')
    console.log('✅ Redeploy triggered. Wait ~3-5 min for it to complete.')
  } else {
    console.log('⏭  Skipped. Trigger manually with: vercel deploy --prod')
  }

  // ─── Final summary ────────────────────────────────────────────────────────
  console.log('\n=== ✅ Setup Complete ===')
  console.log('')
  console.log('Save these values for your records (private key NOT shown — only in Secret Manager):')
  console.log(`  GitHub App URL          : ${conversion.html_url}`)
  console.log(`  App ID                  : ${conversion.id}`)
  console.log(`  Installation ID         : ${repoInstallation.id}`)
  console.log(`  GCP secret name         : ${GCP_SECRET_NAME}`)
  console.log(`  Vercel env target       : ${VERCEL_ENV_TARGET}`)
  console.log('')
  console.log('Verify end-to-end:')
  console.log('  1. Wait for Vercel redeploy to complete (~3-5 min)')
  console.log('  2. Visit https://greenhouse.efeoncepro.com/admin/operations')
  console.log('  3. Subsystem "Platform Release" debe mostrar 3 signals con severity != "unknown"')
  console.log('')
  console.log('If something goes wrong, see runbook §8.1:')
  console.log('  docs/operations/runbooks/production-release-watchdog.md')
}

main().catch((error) => {
  console.error('\n❌ Setup CRASHED:', error)
  exit(1)
})
