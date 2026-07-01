#!/usr/bin/env tsx

import { randomUUID } from 'node:crypto'

type RenderContract = {
  form?: {
    formId?: string
    formKey?: string
    slug?: string
    formVersionId?: string
    version?: number
    locale?: string
  }
  styleVariant?: string
  fields?: Array<{
    key?: string
    label?: string
    type?: string
    required?: boolean
    placeholder?: string
    options?: Array<{ value?: string; label?: string }>
  }>
  copy?: {
    submit?: string
  }
  security?: {
    captcha?: {
      provider?: string
      required?: boolean
      mode?: string
      siteKey?: string
      execution?: string
    }
  }
}

const apiBase = 'https://greenhouse.efeoncepro.com'
const origin = 'https://efeoncepro.com'
const slug = 'efeonce-aeo-diagnostic'
const formKey = 'b120566a-dd1a-43c8-956a-4e0121e805b8'
const surfaceId = 'fhsf-efeonce-aeo-diagnostic'
const expectedTurnstileSiteKey = '0x4AAAAAADqwX2R7v-k9pItv'

const fetchJson = async <T>(url: string, init: RequestInit): Promise<{ status: number; headers: Headers; json: T; raw: string }> => {
  const response = await fetch(url, init)
  const raw = await response.text()
  let json: T

  try {
    json = JSON.parse(raw) as T
  } catch {
    throw new Error(`${url} returned non-JSON body (${response.status}): ${raw.slice(0, 500)}`)
  }

  return { status: response.status, headers: response.headers, json, raw }
}

const renderUrl = (formRef: string) => {
  const url = new URL(`/api/public/growth/forms/${encodeURIComponent(formRef)}`, apiBase)

  url.searchParams.set('surfaceId', surfaceId)

  return url.toString()
}

const assertHeader = (label: string, headers: Headers) => {
  const acao = headers.get('access-control-allow-origin')

  if (acao !== origin) {
    throw new Error(`${label} ACAO is ${acao}; expected ${origin}`)
  }
}

const getField = (contract: RenderContract, key: string) => contract.fields?.find(field => field.key === key)

const assertRenderContract = (label: string, contract: RenderContract, raw: string) => {
  if (contract.form?.slug !== slug) {
    throw new Error(`${label} slug is ${contract.form?.slug}; expected ${slug}`)
  }

  if (contract.form?.formKey !== formKey) {
    throw new Error(`${label} formKey is ${contract.form?.formKey}; expected ${formKey}`)
  }

  if (!contract.form?.formVersionId?.startsWith('fver-')) {
    throw new Error(`${label} formVersionId is ${contract.form?.formVersionId}; expected a published form version id`)
  }

  if ((contract.form?.version ?? 0) < 6) {
    throw new Error(`${label} version is ${contract.form?.version}; expected premium v6+`)
  }

  if (contract.styleVariant !== 'diagnostic_premium') {
    throw new Error(`${label} styleVariant is ${contract.styleVariant}; expected diagnostic_premium`)
  }

  if (contract.copy?.submit !== 'Solicitar diagnóstico gratis →') {
    throw new Error(`${label} submit copy is ${contract.copy?.submit}; expected approved CTA`)
  }

  const captcha = contract.security?.captcha

  if (
    captcha?.provider !== 'turnstile' ||
    captcha.required !== true ||
    captcha.mode !== 'invisible' ||
    captcha.siteKey !== expectedTurnstileSiteKey ||
    captcha.execution !== 'submit'
  ) {
    throw new Error(`${label} captcha contract is ${JSON.stringify(captcha)}; expected invisible Turnstile submit contract`)
  }

  const country = getField(contract, 'country')
  const companySize = getField(contract, 'companySize')

  if (country?.placeholder !== 'Selecciona país' && country?.options?.[0]?.label !== 'Selecciona país') {
    throw new Error(
      `${label} country placeholder/options are ${country?.placeholder}/${country?.options?.[0]?.label}; expected Selecciona país`
    )
  }

  if (companySize?.placeholder !== 'Selecciona tamaño' && companySize?.options?.[0]?.label !== 'Selecciona tamaño') {
    throw new Error(
      `${label} companySize placeholder/options are ${companySize?.placeholder}/${companySize?.options?.[0]?.label}; expected Selecciona tamaño`
    )
  }

  for (const forbidden of ['8649e76c-8b01-41f3-9b0c-5713d7b4dba6', '48713323', 'pais_gh', 'tamano_de_la_empresa', 'marca_de_competencia']) {
    if (raw.includes(forbidden)) {
      throw new Error(`${label} leaked destination/internal mapping token: ${forbidden}`)
    }
  }
}

const assertSameContract = (slugContract: RenderContract, keyContract: RenderContract) => {
  const slugIdentity = JSON.stringify(slugContract.form)
  const keyIdentity = JSON.stringify(keyContract.form)

  if (slugIdentity !== keyIdentity) {
    throw new Error(`slug/formKey contract identities differ: ${slugIdentity} !== ${keyIdentity}`)
  }
}

const main = async () => {
  const getInit: RequestInit = {
    method: 'GET',
    headers: {
      Origin: origin,
    },
  }

  const bySlug = await fetchJson<RenderContract>(renderUrl(slug), getInit)
  const byFormKey = await fetchJson<RenderContract>(renderUrl(formKey), getInit)

  if (bySlug.status !== 200) {
    throw new Error(`GET by slug returned ${bySlug.status}`)
  }

  if (byFormKey.status !== 200) {
    throw new Error(`GET by formKey returned ${byFormKey.status}`)
  }

  assertHeader('GET by slug', bySlug.headers)
  assertHeader('GET by formKey', byFormKey.headers)
  assertRenderContract('GET by slug', bySlug.json, bySlug.raw)
  assertRenderContract('GET by formKey', byFormKey.json, byFormKey.raw)
  assertSameContract(bySlug.json, byFormKey.json)

  const submitUrl = new URL(`/api/public/growth/forms/${encodeURIComponent(formKey)}/submit`, apiBase)

  const submitBody = {
    surfaceId,
    formVersionId: byFormKey.json.form?.formVersionId,
    fields: {
      firstName: 'AEO Preflight',
      email: 'aeo.preflight@efeonce.org',
      brandWebsite: 'efeoncepro.com',
      country: 'CL',
      companySize: '11-50',
      mainCompetitor: 'competidor de prueba',
    },
    consent: true,
    pageUri: 'https://efeoncepro.com/aeo-2/',
    pageName: 'AEO',
    honeypot: '',
    idempotencyKey: `aeo-preflight-${randomUUID()}`,
  }

  const submit = await fetchJson<{ outcome?: string; message?: string; submissionId?: string | null }>(
    submitUrl.toString(),
    {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submitBody),
    }
  )

  assertHeader('POST without captcha', submit.headers)

  if (submit.status !== 403 || submit.json.outcome !== 'captcha_failed' || submit.json.message !== 'missing_token') {
    throw new Error(
      `POST without captcha returned ${submit.status} ${JSON.stringify(submit.json)}; expected 403 captcha_failed/missing_token`
    )
  }

  if (submit.json.submissionId) {
    throw new Error(`POST without captcha returned submissionId=${submit.json.submissionId}; expected no persisted lead`)
  }

  console.log(JSON.stringify({
    ok: true,
    contract: 'AEO Growth Forms public API resolves by slug/formKey and fails closed without captcha',
    apiBase,
    origin,
    slug,
    formKey,
    surfaceId,
    formVersionId: byFormKey.json.form?.formVersionId,
    version: byFormKey.json.form?.version,
    submitWithoutCaptcha: {
      status: submit.status,
      outcome: submit.json.outcome,
      message: submit.json.message,
    },
  }, null, 2))
}

main().catch(error => {
  console.error(`public-website:verify-aeo-public-api-contract failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
