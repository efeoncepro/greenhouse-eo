/**
 * TASK-1776 — Smoke live de los subject_kind no cubiertos por el batch (subfolder/url/
 * subdomain) sobre Berel MX. GASTA (~USD 0.05). Corrida única de rollout — evidencia en el
 * task file / Handoff.
 */
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

process.env.GROWTH_SEO_ENABLED = 'true'
process.env.GROWTH_SEO_URL_VISIBILITY_ENABLED = 'true'

import '../../src/lib/growth/seo/register-provider-spend'

import { closeGreenhousePostgres } from '../../src/lib/postgres/client'
import { captureUrlVisibility } from '../../src/lib/growth/seo/url-visibility/capture'

const main = async () => {
  const result = await captureUrlVisibility({
    organizationId: 'org-32333527-02a8-487b-819e-6f76a761777d',
    subjects: [
      { subject: 'berel.com/productos', kind: 'subfolder' },
      { subject: 'https://berel.com/ubica-tienda', kind: 'url' },
      { subject: 'www.berel.com', kind: 'subdomain' }
    ],
    locationCode: '2484',
    languageCode: 'es',
    seoTargetId: 'seot-berel-mx'
  })

  console.log(JSON.stringify(result, null, 1))
}

main()
  .catch(error => {
    console.error('[smoke] FALLÓ:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
