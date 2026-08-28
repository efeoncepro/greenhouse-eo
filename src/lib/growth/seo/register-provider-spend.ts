/**
 * TASK-1300 — Registro del contador de gasto DataForSEO en el runtime actual.
 *
 * Importar este módulo (por su efecto) conecta el ledger de `greenhouse_growth` al hook del
 * cliente genérico. Se hace acá y no dentro del cliente para conservar la dirección de la
 * dependencia: growth conoce a `src/lib/ai/`, nunca al revés.
 *
 * ⚠️ TODO runtime que llame familias SEO de DataForSEO debe importarlo en su punto de
 * entrada. Si falta, `postDataForSeoTask` LANZA en la primera llamada de una familia que
 * gasta — a propósito: es preferible romper en desarrollo a gastar sin contabilizar y
 * descubrirlo en la factura (lección de TASK-1302, donde un runtime nuevo sin su config
 * degradó en silencio).
 *
 * Uso:
 *   import '@/lib/growth/seo/register-provider-spend'
 */

import 'server-only'

import { setDataForSeoSpendRecorder } from '@/lib/ai/dataforseo'

import { recordSeoProviderSpend } from './provider-spend'

setDataForSeoSpendRecorder(async ({ organizationId, family, cost, consumer }) => {
  // TASK-1696 — el consumidor viaja desde el CALLER por el transporte, no se decide acá. Este
  // registro es un puente entre dos capas; inventarle un valor sería la forma más silenciosa de
  // atribuirle a un servicio el gasto de otro.
  await recordSeoProviderSpend({ organizationId, family, cost, consumer })
})
