// Helpers gcloud para el plano de control. Todo pasa por spawn con argv (sin shell): las expresiones
// CEL de las condiciones IAM llevan comillas y paréntesis que un shell rompería.
import { run } from './lib.mjs'

export const MANAGED_TITLE_PREFIX = 'workbench-'

// Marca de "siempre verdadero" para bindings que no filtran por recurso pero que igual deben quedar
// identificados como gestionados (el título de la condición es lo que permite retirarlos después).
export const ALWAYS = 'request.time < timestamp("2100-01-01T00:00:00Z")'

export function gcloud(args, opts = {}) {
  return run('gcloud', [...args, '--quiet'], { allowFail: true, ...opts })
}

export function gcloudJson(args) {
  const r = gcloud([...args, '--format=json'])

  if (r.status !== 0) return null

  try {
    return JSON.parse(r.stdout || 'null')
  } catch {
    return null
  }
}

export const principal = id => (id.includes(':') ? id : `user:${id}`)

/** Bindings gestionados (título `workbench-*`) de una policy, aplanados a tuplas comparables. */
export function managedBindings(policy, resource) {
  const out = []

  for (const b of policy?.bindings ?? []) {
    if (!b.condition?.title?.startsWith(MANAGED_TITLE_PREFIX)) continue

    for (const member of b.members ?? []) {
      out.push({ resource, role: b.role, member, title: b.condition.title, expression: b.condition.expression })
    }
  }

  return out
}

export const bindingKey = b => [b.resource.kind, b.resource.name, b.role, b.member, b.title, b.expression].join('|')

const conditionArg = b => `--condition=expression=${b.expression},title=${b.title}`

/** argv de gcloud para agregar o retirar un binding en su recurso. */
export function bindingCommand(verb, b, project) {
  const base = [`--member=${b.member}`, `--role=${b.role}`, conditionArg(b)]

  switch (b.resource.kind) {
    case 'bucket':
      return [
        'storage',
        'buckets',
        `${verb}-iam-policy-binding`,
        `gs://${b.resource.name}`,
        ...base,
        `--project=${project}`
      ]
    case 'secret':
      return ['secrets', `${verb}-iam-policy-binding`, b.resource.name, ...base, `--project=${project}`]
    case 'project':
      return ['projects', `${verb}-iam-policy-binding`, b.resource.name, ...base]
    default:
      throw new Error(`Recurso desconocido: ${b.resource.kind}`)
  }
}

export function readPolicy(resource, project) {
  switch (resource.kind) {
    case 'bucket':
      return gcloudJson(['storage', 'buckets', 'get-iam-policy', `gs://${resource.name}`, `--project=${project}`])
    case 'secret':
      return gcloudJson(['secrets', 'get-iam-policy', resource.name, `--project=${project}`])
    case 'project':
      return gcloudJson(['projects', 'get-iam-policy', resource.name])
    default:
      return null
  }
}
