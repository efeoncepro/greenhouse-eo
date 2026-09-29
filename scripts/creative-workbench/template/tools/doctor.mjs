// pnpm doctor — revisa que este equipo pueda trabajar en el workbench y dice cómo arreglar lo que falta.
// Nunca muestra una llave: cuando prueba el acceso a un secreto, descarta el valor.
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { config, ROOT, run } from './lib.mjs'

const checks = []
const add = (estado, nombre, detalle, arreglo) => checks.push({ estado, nombre, detalle, arreglo })

const out = (cmd, args) => {
  const r = run(cmd, args)

  return r.status === 0 ? r.stdout.trim() : null
}

// 1. Node y pnpm
const nodeMajor = Number(process.versions.node.split('.')[0])

add(
  nodeMajor >= 22 ? 'ok' : 'error',
  'Node',
  `v${process.versions.node}`,
  'Instala Node 24 (https://nodejs.org o `brew install node@24`).'
)

const pnpmVersion = out('pnpm', ['--version'])

add(
  pnpmVersion ? 'ok' : 'error',
  'pnpm',
  pnpmVersion ?? 'no instalado',
  'Corre `corepack enable` y vuelve a abrir la terminal.'
)

// 2. GitHub (para instalar los paquetes privados de AXIS)
const ghStatus = run('gh', ['auth', 'status'])
const ghText = `${ghStatus.stdout}${ghStatus.stderr}`

if (ghStatus.status !== 0)
  add('error', 'GitHub CLI', 'sin sesión', 'Corre `gh auth login` con tu cuenta de GitHub de Efeonce.')
else if (!/(read|write):packages/.test(ghText))
  add('error', 'GitHub CLI', 'sin permiso de paquetes', 'Corre `gh auth refresh -s read:packages`.')
else add('ok', 'GitHub CLI', 'sesión con acceso a paquetes')

add(
  existsSync(path.join(ROOT, 'node_modules')) ? 'ok' : 'error',
  'Dependencias',
  existsSync(path.join(ROOT, 'node_modules')) ? 'instaladas' : 'sin instalar',
  'Corre `pnpm instalar`.'
)

// 3. Google Cloud (tu identidad es la que abre buckets, llaves y Vertex)
const { gcpProject, canonBucket } = config()
const account = out('gcloud', ['config', 'get-value', 'account'])

if (!account)
  add(
    'error',
    'gcloud',
    'no instalado o sin cuenta',
    'Instala Google Cloud CLI y corre `gcloud auth login` con tu cuenta @efeonce.org.'
  )
else {
  add('ok', 'gcloud', account)
  const adc = run('gcloud', ['auth', 'application-default', 'print-access-token'])

  add(
    adc.status === 0 ? 'ok' : 'error',
    'Credenciales de aplicación',
    adc.status === 0 ? 'vigentes' : 'vencidas o ausentes',
    'Corre `gcloud auth application-default login` con tu cuenta @efeonce.org.'
  )
}

// 4. .env.local (sólo nombres de secretos)
const envLocal = path.join(ROOT, '.env.local')
const envExample = path.join(ROOT, '.env.example')

if (!existsSync(envLocal) && existsSync(envExample)) {
  copyFileSync(envExample, envLocal)
  add('ok', '.env.local', 'creado desde .env.example')
} else {
  const want = readFileSync(envExample, 'utf8')
    .split('\n')
    .filter(l => /^[A-Z_]+=/.test(l))
    .map(l => l.split('=')[0])

  const have = existsSync(envLocal) ? readFileSync(envLocal, 'utf8') : ''
  const missing = want.filter(k => !new RegExp(`^${k}=`, 'm').test(have))

  add(
    missing.length ? 'error' : 'ok',
    '.env.local',
    missing.length ? `faltan ${missing.join(', ')}` : 'completo',
    'Borra .env.local y vuelve a correr pnpm doctor.'
  )
}

// 5. Acceso a IA: prueba cada secreto sin mostrar su valor
if (account) {
  const env = existsSync(envLocal) ? readFileSync(envLocal, 'utf8') : ''

  for (const [, name, ref] of env.matchAll(/^([A-Z_]+)_SECRET_REF=(.+)$/gm)) {
    const m = ref.trim().match(/^projects\/([^/]+)\/secrets\/([^/]+)\/versions\/(.+)$/)

    if (!m) {
      add('error', `IA ${name}`, 'referencia con formato inválido', 'Borra .env.local y vuelve a correr pnpm doctor.')
      continue
    }

    const r = run('gcloud', ['secrets', 'versions', 'access', m[3], `--secret=${m[2]}`, `--project=${m[1]}`, '--quiet'])

    add(
      r.status === 0 ? 'ok' : 'aviso',
      `IA ${name}`,
      r.status === 0 ? 'con acceso' : 'sin acceso',
      'Si necesitas generar con este proveedor, pide acceso a Julio.'
    )
  }
}

// 6. Referencias aprobadas del catálogo de foto
const lockFile = path.join(ROOT, 'scripts/foto/assets.lock.json')

if (existsSync(lockFile)) {
  const assets = Object.keys(JSON.parse(readFileSync(lockFile, 'utf8')).assets)
  const present = assets.filter(r => existsSync(path.join(ROOT, r))).length

  add(
    present === assets.length ? 'ok' : 'aviso',
    'Referencias de foto',
    `${present}/${assets.length} en disco`,
    `Corre \`pnpm assets:pull\` (bucket gs://${canonBucket}).`
  )
}

// 7. Fuente Guttery (la usan los compositores para el gesto manuscrito)
const guttery = path.join(os.homedir(), 'Library/Fonts/Guttery.otf')

add(
  existsSync(guttery) ? 'ok' : 'aviso',
  'Fuente Guttery',
  existsSync(guttery) ? 'instalada' : 'no instalada',
  'Pide el archivo Guttery.otf e instálalo en tu carpeta de fuentes.'
)

// Salida
const icon = { ok: '✓', aviso: '!', error: '✗' }

console.log(`Workbench · proyecto ${gcpProject}\n`)

for (const c of checks) {
  console.log(`${icon[c.estado]} ${c.nombre}: ${c.detalle}`)
  if (c.estado !== 'ok' && c.arreglo) console.log(`    → ${c.arreglo}`)
}

const errores = checks.filter(c => c.estado === 'error').length

console.log(errores ? `\n${errores} problema(s) por resolver.` : '\nListo para trabajar.')
process.exit(errores ? 1 : 0)
