// pnpm creative:provision plan|apply
//
// Infraestructura GCP del workbench, en un proyecto PROPIO (nunca en efeonce-group, donde vive la
// data de producción de Greenhouse). Idempotente: cada paso mira el estado real antes de actuar.
//
//   1. proyecto + billing;
//   2. APIs (Storage, Secret Manager, Vertex AI, IAM);
//   3. buckets `canon` (referencias aprobadas, sólo lectura para el equipo) y `work` (entregables por
//      cliente): acceso uniforme, sin acceso público, versionado y soft delete;
//   4. secretos de IA VACÍOS. Las llaves las cargas tú a mano, dedicadas al workbench y con tope de
//      gasto en cada proveedor. Este script nunca ve ni maneja una llave.
//
// El acceso de las personas no vive acá: es `pnpm creative:access`.
import { gcloud, gcloudJson } from './gcp.mjs'
import { loadControl } from './lib.mjs'

const mode = process.argv[2] ?? 'plan'

if (!['plan', 'apply'].includes(mode)) {
  console.error('Uso: pnpm creative:provision plan|apply')
  process.exit(1)
}

const { gcp } = loadControl()
const P = gcp.project
let failed = 0

function step(label, isDone, cmd) {
  if (isDone) {
    console.log(`  ✓ ${label}`)

    return true
  }

  if (mode === 'plan') {
    console.log(`  · ${label}  →  gcloud ${cmd.join(' ')}`)

    return false
  }

  const r = gcloud(cmd)

  if (r.status === 0) {
    console.log(`  ✓ ${label} (aplicado)`)

    return true
  }

  failed++
  console.log(`  ✗ ${label}\n    ${(r.stderr || r.stdout).trim().split('\n').slice(-3).join('\n    ')}`)

  return false
}

console.log(`${mode === 'plan' ? 'Plan' : 'Aplicando'} — proyecto ${P}\n`)

const projectOk = gcloud(['projects', 'describe', P, '--format=value(projectId)']).status === 0

const projectReady = step(`proyecto ${P}`, projectOk, [
  'projects',
  'create',
  P,
  `--${gcp.parent.type}=${gcp.parent.id}`,
  '--name=Efeonce Creative Workbench'
])

const billing = projectReady ? gcloudJson(['billing', 'projects', 'describe', P]) : null

step(`billing ${gcp.billingAccount}`, billing?.billingEnabled === true, [
  'billing',
  'projects',
  'link',
  P,
  `--billing-account=${gcp.billingAccount}`
])

const enabled = projectReady
  ? (gcloudJson(['services', 'list', '--enabled', `--project=${P}`]) ?? []).map(s => s.config?.name)
  : []

const missing = gcp.services.filter(s => !enabled.includes(s))

step(`APIs (${gcp.services.length})`, missing.length === 0, ['services', 'enable', ...missing, `--project=${P}`])

for (const bucket of [gcp.canonBucket, gcp.workBucket]) {
  const desc = projectReady ? gcloudJson(['storage', 'buckets', 'describe', `gs://${bucket}`, `--project=${P}`]) : null

  step(`bucket gs://${bucket}`, Boolean(desc), [
    'storage',
    'buckets',
    'create',
    `gs://${bucket}`,
    `--project=${P}`,
    `--location=${gcp.location}`,
    '--uniform-bucket-level-access',
    '--public-access-prevention',
    `--soft-delete-duration=${gcp.softDeleteDays}d`
  ])

  step(`versionado en gs://${bucket}`, desc?.versioning_enabled === true, [
    'storage',
    'buckets',
    'update',
    `gs://${bucket}`,
    '--versioning',
    `--project=${P}`
  ])
}

const pendingKeys = []

for (const [envName, secret] of Object.entries(gcp.aiSecrets)) {
  const exists = projectReady && gcloud(['secrets', 'describe', secret, `--project=${P}`]).status === 0

  step(`secreto ${secret} (${envName})`, exists, [
    'secrets',
    'create',
    secret,
    '--replication-policy=automatic',
    `--project=${P}`
  ])

  const versions = exists
    ? (gcloudJson(['secrets', 'versions', 'list', secret, '--filter=state=enabled', `--project=${P}`]) ?? [])
    : []

  if (!versions.length) pendingKeys.push(secret)
}

if (pendingKeys.length) {
  console.log('\n  Llaves pendientes (dedicadas al workbench, con tope de gasto en el proveedor). Cárgalas tú:')
  for (const s of pendingKeys)
    console.log(`    printf %s "$LLAVE" | gcloud secrets versions add ${s} --data-file=- --project=${P}`)
}

if (mode === 'plan') console.log('\nPara ejecutarlo: pnpm creative:provision apply')
if (failed) process.exit(1)
