import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1378 — Guardrails del deploy del scanner.
 *
 * El servicio recibe el CV de una persona real y su veredicto gatea el upload
 * público. Dos errores de una línea en `deploy.sh` tienen consecuencias
 * desproporcionadas: abrirlo al mundo, o dejarlo inalcanzable desde Vercel y
 * bloquear todas las postulaciones (fail-closed). Este test los fija.
 */
const deployScript = () => readFileSync(resolve(process.cwd(), 'services/clamav/deploy.sh'), 'utf8')

describe('clamav deploy — postura de red', () => {
  it('NUNCA se despliega público: el scanner recibiría bytes de cualquiera', () => {
    const script = deployScript()

    expect(script).toContain('--no-allow-unauthenticated')
    expect(script).not.toMatch(/^\s*--allow-unauthenticated/m)
  })

  it('usa ingress=all + IAM, no ingress=internal', () => {
    const script = deployScript()

    // Vercel sale por internet pública: restringir el ingress a la VPC dejaría
    // el servicio inalcanzable desde el route handler que sube el CV, y con el
    // flag ON eso es fail-closed sobre todas las postulaciones.
    //
    // El assert va sobre la posición de flag (línea que empieza con --ingress),
    // no sobre la mención: un comentario que nombre el valor prohibido no debe
    // hacer fallar el gate.
    expect(script).toMatch(/^\s*--ingress=all\s*\\?$/m)
    expect(script).not.toMatch(/^\s*--ingress=internal/m)
  })

  it('otorga run.invoker sólo a la service account del portal', () => {
    const script = deployScript()

    expect(script).toContain('SERVICE_ACCOUNT="greenhouse-portal@${PROJECT_ID}.iam.gserviceaccount.com"')
    expect(script).toContain('--role="roles/run.invoker"')
    expect(script).toContain('--member="serviceAccount:${SERVICE_ACCOUNT}"')
  })

  it('aborta si el servicio quedó con allUsers en su IAM policy', () => {
    const script = deployScript()

    expect(script).toContain('allUsers')
    expect(script).toContain('El scanner NUNCA debe ser público')
  })
})

describe('clamav deploy — capacidad', () => {
  it('mantiene min-instances=1: clamd tarda 20-40 s en cargar las firmas', () => {
    const script = deployScript()

    // Escalar a cero haría que el primer CV pague el cold start y el submit
    // público expire. Es el costo deliberado que el operador aprobó.
    expect(script).toContain('MIN_INSTANCES="1"')
  })

  it('reserva memoria para la base de firmas residente', () => {
    const script = deployScript()

    expect(script).toContain('MEMORY="2Gi"')
  })

  it('despliega en us-east4, junto al resto de los workers', () => {
    const script = deployScript()

    expect(script).toContain('REGION="us-east4"')
  })
})

describe('clamav deploy — no cablea el flag por su cuenta', () => {
  it('deja el flip de ASSET_MALWARE_SCAN_ENABLED al operador', () => {
    const script = deployScript()

    // Que el servicio exista no autoriza a prender el flag: primero hay que
    // ejercitar EICAR. El script imprime los pasos, no los ejecuta.
    expect(script).not.toMatch(/vercel env add ASSET_MALWARE_SCAN_ENABLED[^"']*\n/)
    expect(script).toContain('=== Próximo paso (NO automático) ===')
  })
})
