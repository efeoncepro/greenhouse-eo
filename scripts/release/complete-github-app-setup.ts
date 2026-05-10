#!/usr/bin/env tsx
/**
 * TASK-849 V1.1 — Complete GitHub App setup recovery script.
 *
 * Si `setup-github-app.ts` crasheó después de crear el App pero antes de
 * subir el private key, este script completa el setup reusando el App ya
 * existente. Toma como inputs:
 *   - App ID (obligatorio)
 *   - Installation ID (obligatorio)
 *   - Path al archivo .pem recien descargado de la UI del App
 *
 * Uso:
 *   pnpm release:complete-github-app-setup \
 *     --app-id=3665723 \
 *     --installation-id=131127026 \
 *     --pem-file=/path/to/downloaded-key.pem
 *
 * Steps:
 *   1. Lee y valida el .pem (usa crypto.createPrivateKey, acepta PKCS#1 o #8)
 *   2. Mintea JWT + lookup installation para validar credenciales
 *   3. Confirma con usuario antes de cada side effect
 *   4. Uploads private key a GCP Secret Manager
 *   5. Configura 3 Vercel env vars production
 *   6. Trigger Vercel redeploy
 *   7. Shred el .pem local
 */

import { createPrivateKey } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout, exit, argv } from 'node:process'

import { SignJWT } from 'jose'

const ORG_NAME = 'efeoncepro'
const GCP_PROJECT_ID = 'efeonce-group'
const GCP_SECRET_NAME = 'greenhouse-github-app-private-key'
const VERCEL_ENV_TARGET = 'production'

interface CliArgs {
  appId: string
  installationId: string
  pemFile: string
}

const parseArgs = (): CliArgs => {
  const args = new Map<string, string>()

  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.replace(/^--/, '').split('=')

      if (value) args.set(key, value)
    }
  }

  const appId = args.get('app-id')
  const installationId = args.get('installation-id')
  const pemFile = args.get('pem-file')

  if (!appId || !installationId || !pemFile) {
    console.error('Usage: pnpm release:complete-github-app-setup \\')
    console.error('  --app-id=<NUMBER> \\')
    console.error('  --installation-id=<NUMBER> \\')
    console.error('  --pem-file=/path/to/downloaded-key.pem')
    exit(1)
  }

  return { appId, installationId, pemFile }
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
  const { appId, installationId, pemFile } = parseArgs()

  console.log('=== Greenhouse Release Watchdog — Complete Setup ===')
  console.log('')
  console.log(`App ID          : ${appId}`)
  console.log(`Installation ID : ${installationId}`)
  console.log(`PEM file        : ${pemFile}`)
  console.log(`GCP project     : ${GCP_PROJECT_ID}`)
  console.log(`GCP secret      : ${GCP_SECRET_NAME}`)
  console.log(`Vercel target   : ${VERCEL_ENV_TARGET}`)
  console.log('')

  // ─── Step 1: Read + validate PEM ─────────────────────────────────────────
  console.log('=== Step 1: Read and validate private key ===')

  let pemContent: string

  try {
    pemContent = readFileSync(pemFile, 'utf8')
  } catch (error) {
    console.error(`❌ No se pudo leer ${pemFile}: ${(error as Error).message}`)
    exit(1)
  }

  if (!pemContent.includes('-----BEGIN')) {
    console.error(`❌ ${pemFile} no parece ser un PEM valido (falta BEGIN marker)`)
    exit(1)
  }

  let privateKey

  try {
    privateKey = createPrivateKey(pemContent)
    console.log(`✅ PEM valido (${pemContent.length} chars, formato auto-detectado)`)
  } catch (error) {
    console.error(`❌ PEM invalido: ${(error as Error).message}`)
    exit(1)
  }

  // ─── Step 2: Validate credentials via JWT mint + API call ────────────────
  console.log('\n=== Step 2: Validate credentials via JWT mint ===')

  const nowSec = Math.floor(Date.now() / 1000)

  const appJwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(nowSec - 60)
    .setExpirationTime(nowSec + 9 * 60)
    .setIssuer(appId)
    .sign(privateKey)

  const installResponse = await fetch(
    `https://api.github.com/app/installations/${installationId}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        Authorization: `Bearer ${appJwt}`,
        'User-Agent': 'greenhouse-release-app-setup'
      }
    }
  )

  if (!installResponse.ok) {
    const body = await installResponse.text().catch(() => '')

    console.error(
      `❌ Validation failed: GET /app/installations/${installationId} returned ${installResponse.status}`
    )
    console.error(`   Body: ${body.slice(0, 200)}`)
    exit(1)
  }

  const installInfo = (await installResponse.json()) as { account: { login: string } }

  console.log(`✅ Credenciales validas. Installation activa en: ${installInfo.account.login}`)

  if (installInfo.account.login !== ORG_NAME) {
    console.error(`⚠ Installation account '${installInfo.account.login}' != expected '${ORG_NAME}'`)
    const proceed = await promptYesNo('Proceder de todos modos?')

    if (!proceed) exit(1)
  }

  // ─── Step 3: Upload to GCP Secret Manager ────────────────────────────────
  console.log('\n=== Step 3: Upload private key to GCP Secret Manager ===')

  const uploadOk = await promptYesNo('Subir private key a Secret Manager?')

  if (uploadOk) {
    runShell(
      `gcloud secrets describe ${GCP_SECRET_NAME} --project=${GCP_PROJECT_ID} >/dev/null 2>&1 || gcloud secrets create ${GCP_SECRET_NAME} --replication-policy=automatic --project=${GCP_PROJECT_ID}`
    )
    runShell(
      `gcloud secrets versions add ${GCP_SECRET_NAME} --project=${GCP_PROJECT_ID} --data-file=-`,
      pemContent
    )
    console.log('✅ Private key uploaded to Secret Manager')
  } else {
    console.log('⏭  Skipped GCP upload')
  }

  // ─── Step 4: Configure Vercel env vars ───────────────────────────────────
  console.log('\n=== Step 4: Configure Vercel env vars production ===')

  const vercelOk = await promptYesNo('Configurar 3 Vercel env vars production?')

  if (vercelOk) {
    try {
      runShell(`echo "${appId}" | vercel env add GITHUB_APP_ID ${VERCEL_ENV_TARGET}`)
    } catch {
      console.log('⚠ GITHUB_APP_ID puede que ya exista, continuando...')
    }

    try {
      runShell(`echo "${installationId}" | vercel env add GITHUB_APP_INSTALLATION_ID ${VERCEL_ENV_TARGET}`)
    } catch {
      console.log('⚠ GITHUB_APP_INSTALLATION_ID puede que ya exista, continuando...')
    }

    try {
      runShell(`echo "${GCP_SECRET_NAME}" | vercel env add GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF ${VERCEL_ENV_TARGET}`)
    } catch {
      console.log('⚠ GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF puede que ya exista, continuando...')
    }

    console.log('✅ Vercel env vars configuradas')
  } else {
    console.log('⏭  Skipped Vercel env vars')
  }

  // ─── Step 5: Trigger Vercel redeploy ─────────────────────────────────────
  console.log('\n=== Step 5: Trigger Vercel production redeploy ===')

  const redeployOk = await promptYesNo('Trigger Vercel production redeploy?')

  if (redeployOk) {
    runShell('vercel deploy --prod')
    console.log('✅ Redeploy triggered')
  } else {
    console.log('⏭  Skipped redeploy')
  }

  // ─── Step 6: Shred the local PEM ─────────────────────────────────────────
  console.log('\n=== Step 6: Shred local PEM file ===')

  const shredOk = await promptYesNo(`Borrar ${pemFile} con shred (recomendado)?`)

  if (shredOk) {
    try {
      runShell(`shred -u "${pemFile}"`)
      console.log(`✅ ${pemFile} shredded`)
    } catch {
      // shred no esta en macOS por default, fallback a rm
      try {
        runShell(`rm "${pemFile}"`)
        console.log(`✅ ${pemFile} removed (rm fallback)`)
      } catch {
        console.error(`⚠ No se pudo borrar ${pemFile}. Hacelo manual.`)
      }
    }
  }

  // ─── Final summary ────────────────────────────────────────────────────────
  console.log('\n=== ✅ Setup Complete ===')
  console.log('')
  console.log('Save these values for your records:')
  console.log(`  App ID                : ${appId}`)
  console.log(`  Installation ID       : ${installationId}`)
  console.log(`  GCP secret name       : ${GCP_SECRET_NAME}`)
  console.log(`  Vercel env target     : ${VERCEL_ENV_TARGET}`)
  console.log('')
  console.log('Verify end-to-end:')
  console.log('  1. Wait for Vercel redeploy to complete (~3-5 min)')
  console.log('  2. Visit https://greenhouse.efeoncepro.com/admin/operations')
  console.log('  3. Subsystem "Platform Release" debe mostrar 3 signals con severity != "unknown"')
}

main().catch((error) => {
  console.error('\n❌ Setup CRASHED:', error)
  exit(1)
})
