// pnpm creative:access plan|apply
//
// Reconcilia el acceso REAL del equipo creativo con lo declarado en `control.json`:
//   · GitHub: equipo `creative-workbench`, su permiso sobre el repo y sus miembros;
//   · GCP: lectura del bucket canon, escritura por cliente en el bucket de trabajo (sólo crear, nunca
//     borrar ni sobrescribir), acceso a las llaves de IA y a Vertex para quien tenga `ia: true`.
//
// Todo binding que este script crea lleva una condición IAM con título `workbench-*`: así sabe cuáles
// son suyos y puede retirarlos cuando alguien sale de `control.json`. Nunca toca bindings ajenos.
//
// `plan` (por defecto) sólo muestra la diferencia. `apply` la ejecuta.
import { ALWAYS, bindingCommand, bindingKey, gcloud, managedBindings, principal, readPolicy } from './gcp.mjs'
import { loadControl, run } from './lib.mjs'

const mode = process.argv[2] ?? 'plan'

if (!['plan', 'apply'].includes(mode)) {
  console.error('Uso: pnpm creative:access plan|apply')
  process.exit(1)
}

const control = loadControl()
const { github: g, gcp } = control
const active = control.members.filter(m => m.activo !== false)
const errors = []

for (const m of control.members) {
  if (!/^[A-Za-z0-9-]+$/.test(m.github ?? '')) errors.push(`miembro sin usuario GitHub válido: ${JSON.stringify(m)}`)
  if (!m.gcp) errors.push(`${m.github}: falta su identidad Google (gcp), p. ej. nombre@efeonce.org`)

  for (const c of m.clientes ?? [])
    if (!control.clientes.includes(c)) errors.push(`${m.github}: cliente ${c} no está en control.clientes`)
}

if (errors.length) {
  console.error(`✗ control.json inválido:\n  ${errors.join('\n  ')}`)
  process.exit(1)
}

const actions = []
const gh = (...a) => run('gh', a, { allowFail: true })

// ── GitHub ──────────────────────────────────────────────────────────────────────────────────────
const teamRes = gh('api', `orgs/${g.org}/teams/${g.team}`)
const teamExists = teamRes.status === 0

if (!teamExists) {
  actions.push({
    label: `GitHub: crear equipo ${g.org}/${g.team}`,
    cmd: [
      'gh',
      'api',
      '-X',
      'POST',
      `orgs/${g.org}/teams`,
      '-f',
      `name=${g.team}`,
      '-f',
      'privacy=closed',
      '-f',
      'description=Equipo creativo — acceso gobernado desde greenhouse-eo'
    ]
  })
}

const permRes = teamExists
  ? gh(
      'api',
      `orgs/${g.org}/teams/${g.team}/repos/${g.org}/${g.repo}`,
      '-H',
      'Accept: application/vnd.github.v3.repository+json',
      '--jq',
      '.role_name'
    )
  : null

if (!teamExists || permRes.status !== 0 || !['write', 'push'].includes(permRes.stdout.trim())) {
  actions.push({
    label: `GitHub: equipo ${g.team} con permiso ${g.teamPermission} sobre ${g.repo}`,
    cmd: [
      'gh',
      'api',
      '-X',
      'PUT',
      `orgs/${g.org}/teams/${g.team}/repos/${g.org}/${g.repo}`,
      '-f',
      `permission=${g.teamPermission}`
    ]
  })
}

const currentMembers = teamExists
  ? gh('api', `orgs/${g.org}/teams/${g.team}/members`, '--jq', '.[].login').stdout.trim().split('\n').filter(Boolean)
  : []

const desiredMembers = active.map(m => m.github)

for (const user of desiredMembers.filter(u => !currentMembers.includes(u))) {
  actions.push({
    label: `GitHub: sumar ${user} al equipo (si no es miembro de la org, recibe invitación)`,
    cmd: ['gh', 'api', '-X', 'PUT', `orgs/${g.org}/teams/${g.team}/memberships/${user}`, '-f', 'role=member']
  })
}

for (const user of currentMembers.filter(u => !desiredMembers.includes(u) && u !== g.owner)) {
  actions.push({
    label: `GitHub: retirar ${user} del equipo`,
    cmd: ['gh', 'api', '-X', 'DELETE', `orgs/${g.org}/teams/${g.team}/memberships/${user}`]
  })
}

// ── GCP ─────────────────────────────────────────────────────────────────────────────────────────
const projectOk = gcloud(['projects', 'describe', gcp.project, '--format=value(projectId)']).status === 0

if (!projectOk) {
  console.log(
    `⚠ GCP: el proyecto ${gcp.project} no existe o no es accesible. Corre primero: pnpm creative:provision plan`
  )
} else {
  const canon = { kind: 'bucket', name: gcp.canonBucket }
  const work = { kind: 'bucket', name: gcp.workBucket }
  const project = { kind: 'project', name: gcp.project }
  const secrets = Object.values(gcp.aiSecrets).map(name => ({ kind: 'secret', name }))
  const desired = []

  for (const m of active) {
    const member = principal(m.gcp)

    desired.push({
      resource: canon,
      role: 'roles/storage.objectViewer',
      member,
      title: 'workbench-canon',
      expression: `resource.name.startsWith("projects/_/buckets/${gcp.canonBucket}/objects/")`
    })

    for (const c of m.clientes ?? []) {
      const expression = `resource.name.startsWith("projects/_/buckets/${gcp.workBucket}/objects/${c}/")`

      desired.push({
        resource: work,
        role: 'roles/storage.objectCreator',
        member,
        title: `workbench-cliente-${c}`,
        expression
      })
      desired.push({
        resource: work,
        role: 'roles/storage.objectViewer',
        member,
        title: `workbench-cliente-${c}`,
        expression
      })
    }

    if (m.ia) {
      for (const s of secrets)
        desired.push({
          resource: s,
          role: 'roles/secretmanager.secretAccessor',
          member,
          title: 'workbench-ia',
          expression: ALWAYS
        })
      desired.push({
        resource: project,
        role: 'roles/aiplatform.user',
        member,
        title: 'workbench-ia',
        expression: ALWAYS
      })
      // Vertex con credenciales de usuario cobra cuota al proyecto: sin este rol, ai:omni falla con serviceusage.services.use.
      desired.push({
        resource: project,
        role: 'roles/serviceusage.serviceUsageConsumer',
        member,
        title: 'workbench-ia',
        expression: ALWAYS
      })
    }
  }

  const current = []

  for (const resource of [canon, work, project, ...secrets]) {
    const policy = readPolicy(resource, gcp.project)

    if (!policy) {
      console.log(`⚠ GCP: no pude leer la policy de ${resource.kind} ${resource.name} (¿falta provision?)`)
      continue
    }

    current.push(...managedBindings(policy, resource))
  }

  const currentKeys = new Set(current.map(bindingKey))
  const desiredKeys = new Set(desired.map(bindingKey))

  for (const b of desired.filter(b => !currentKeys.has(bindingKey(b)))) {
    actions.push({
      label: `GCP: + ${b.member} ${b.role} en ${b.resource.kind} ${b.resource.name} (${b.title})`,
      cmd: ['gcloud', ...bindingCommand('add', b, gcp.project), '--quiet']
    })
  }

  for (const b of current.filter(b => !desiredKeys.has(bindingKey(b)))) {
    actions.push({
      label: `GCP: − ${b.member} ${b.role} en ${b.resource.kind} ${b.resource.name} (${b.title})`,
      cmd: ['gcloud', ...bindingCommand('remove', b, gcp.project), '--quiet']
    })
  }
}

// ── Salida ──────────────────────────────────────────────────────────────────────────────────────
if (!actions.length) {
  console.log('✓ Acceso real = acceso declarado. Nada que hacer.')
  process.exit(0)
}

console.log(`${mode === 'plan' ? 'Plan' : 'Aplicando'}: ${actions.length} cambios`)

let failed = 0

for (const a of actions) {
  if (mode === 'plan') {
    console.log(`  · ${a.label}`)
    continue
  }

  const r = run(a.cmd[0], a.cmd.slice(1), { allowFail: true })

  if (r.status === 0) console.log(`  ✓ ${a.label}`)
  else {
    failed++
    console.log(`  ✗ ${a.label}\n    ${(r.stderr || r.stdout).trim().split('\n').slice(-2).join('\n    ')}`)
  }
}

if (mode === 'plan') console.log('\nPara ejecutarlo: pnpm creative:access apply')
if (failed) process.exit(1)
