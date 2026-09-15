/** Add the approved Contacto reasons to the existing HubSpot contact form, preserving legacy options. */
import { execFileSync } from 'node:child_process'
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import { loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()

const APPLY = process.argv.includes('--apply')
const FORM_ID = '8bee8dca-27f2-4ca5-ac09-7606351c7e72'
const PROPERTY = 'motivo_del_contacto'
const API = 'https://api.hubapi.com'
const BACKUP = path.resolve('.auth/task1801-hubspot-contact-reasons-before.json')

const approved = [
  'Quiero una solución para mi empresa',
  'Quiero ser parte del equipo',
  'Tengo una consulta técnica',
  'Quiero una alianza o colaboración',
  'Medios de comunicación',
  'Otro motivo',
]

type Option = { label: string; value: string; description?: string; displayOrder?: number; hidden?: boolean }
type Property = { name: string; options?: Option[] }
type FormField = { objectTypeId?: string; name?: string; options?: Option[]; [key: string]: unknown }
type Form = { id: string; name?: string; fieldGroups?: Array<{ fields?: FormField[]; [key: string]: unknown }> }

async function token() {
  try {
    return await getHubSpotAccessToken()
  } catch {
    return execFileSync(
      'gcloud',
      ['secrets', 'versions', 'access', 'latest', '--secret=hubspot-access-token', '--project=efeonce-group'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim()
  }
}

async function request<T>(accessToken: string, pathname: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })

  if (!response.ok) throw new Error(`HubSpot ${init?.method ?? 'GET'} ${pathname} failed: ${response.status}`)
  
return (await response.json()) as T
}

function merged(options: Option[] = []) {
  const seen = new Set(options.map(option => option.value))
  const next = options.map((option, index) => ({ ...option, displayOrder: option.displayOrder ?? index }))

  for (const value of approved) {
    if (!seen.has(value)) next.push({ label: value, value, description: '', displayOrder: next.length, hidden: false })
  }

  
return next
}

async function main() {
  const accessToken = await token()
  const property = await request<Property>(accessToken, `/crm/v3/properties/contacts/${PROPERTY}`)
  const form = await request<Form>(accessToken, `/marketing/forms/2026-09-beta/${FORM_ID}`)

  if (form.name !== 'Contact Form - EO') throw new Error(`Unexpected HubSpot form identity: ${form.name ?? 'unknown'}`)
  const field = form.fieldGroups?.flatMap(group => group.fields ?? []).find(item => item.name === PROPERTY)

  if (!field) throw new Error(`HubSpot form field missing: ${PROPERTY}`)

  const propertyOptions = merged(property.options)
  const fieldOptions = merged(field.options)
  const addedToProperty = propertyOptions.length - (property.options?.length ?? 0)
  const addedToForm = fieldOptions.length - (field.options?.length ?? 0)

  if (!APPLY) {
    console.log(JSON.stringify({ status: 'dry_run', form: form.name, property: PROPERTY, addedToProperty, addedToForm, approved }, null, 2))
    
return
  }

  await mkdir(path.dirname(BACKUP), { recursive: true, mode: 0o700 })
  await writeFile(BACKUP, `${JSON.stringify({ property, form })}\n`, { mode: 0o600 })
  await chmod(BACKUP, 0o600)

  if (addedToProperty > 0) {
    await request<Property>(accessToken, `/crm/v3/properties/contacts/${PROPERTY}`, {
      method: 'PATCH',
      body: JSON.stringify({ options: propertyOptions }),
    })
  }

  if (addedToForm > 0 && form.fieldGroups) {
    field.options = fieldOptions
    await request<Form>(accessToken, `/marketing/forms/2026-09-beta/${FORM_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ fieldGroups: form.fieldGroups }),
    })
  }

  const propertyReadback = await request<Property>(accessToken, `/crm/v3/properties/contacts/${PROPERTY}`)
  const formReadback = await request<Form>(accessToken, `/marketing/forms/2026-09-beta/${FORM_ID}`)
  const formFieldReadback = formReadback.fieldGroups?.flatMap(group => group.fields ?? []).find(item => item.name === PROPERTY)
  const propertyValues = new Set(propertyReadback.options?.map(option => option.value))
  const formValues = new Set(formFieldReadback?.options?.map(option => option.value))

  if (!approved.every(value => propertyValues.has(value) && formValues.has(value))) throw new Error('HubSpot reason readback failed')

  console.log(JSON.stringify({ status: 'updated_verified', form: formReadback.name, property: PROPERTY, addedToProperty, addedToForm, backup: BACKUP }, null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'HubSpot contact reason update failed')
  process.exitCode = 1
})
