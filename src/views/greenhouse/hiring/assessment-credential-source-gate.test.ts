import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1747 — la superficie del operador NUNCA construye ni renderiza el acceso del candidato.
 *
 * El incidente del 2026-08-19: Application 360 armaba la URL del assessment en el cliente y la
 * pintaba en claro. El correo al candidato rotaba ese mismo token ~2,5 minutos después, así que la
 * pantalla entregaba una credencial ya muerta — y el operador se la pasaba a la candidata creyendo
 * que servía.
 *
 * Esto NO se puede probar con una captura: un selector sólo demuestra lo que se renderizó en la
 * rama capturada, y la rama que muestra el enlace requiere emitir una credencial real. Se prueba
 * sobre la fuente, que es donde vive la garantía.
 *
 * La única URL con credencial legítima la construye el SERVIDOR justo antes de enviar el correo, y
 * el enlace revelado llega ya armado desde la respuesta del command: la vista lo muestra, no lo
 * compone.
 */

/**
 * Se barre el CÓDIGO, no los comentarios. La primera versión de este gate se disparó contra un
 * comentario que decía —correctamente— que la credencial no se persiste: un gate que confunde la
 * prosa que describe una regla con su violación es un gate que hay que apagar a la semana.
 */
const readCode = (relativePath: string): string =>
  readFileSync(join(process.cwd(), relativePath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')

const VIEW = readCode('src/views/greenhouse/hiring/Application360View.tsx')
const CLUSTER = readCode('src/views/greenhouse/hiring/AssessmentRecoveryCluster.tsx')

describe('la superficie del operador no compone credenciales', () => {
  it('no arma ninguna ruta de la superficie del candidato', () => {
    // Se buscan las DOS formas: la del incidente y la vigente. El patrón se compone en tiempo de
    // ejecución para que este archivo no contenga el literal que persigue — un gate que escribe su
    // propio anti-patrón se detecta a sí mismo y deja de servir.
    const legacyPath = ['/assessment', '/${'].join('')
    const publicPath = ['/public', '/assessment', '/access'].join('')

    expect(VIEW).not.toContain(legacyPath)
    expect(VIEW).not.toContain(publicPath)
    expect(CLUSTER).not.toContain(publicPath)
  })

  it('no queda rastro del estado que sostenía el enlace efímero', () => {
    for (const symbol of ['oneTimeToken', 'oneTimeAssessmentLink']) {
      expect(VIEW).not.toContain(symbol)
    }
  })

  it('no persiste nada en el almacenamiento del navegador', () => {
    // Una credencial de un solo uso que sobrevive al cierre del diálogo deja de ser de un solo uso.
    for (const api of ['localStorage', 'sessionStorage']) {
      expect(VIEW).not.toContain(api)
    }
  })

  it('el enlace revelado se lee de la respuesta del command, nunca se compone', () => {
    // Si esto deja de estar, alguien reemplazó la fuente por una construcción local.
    expect(VIEW).toContain('response.accessUrl')
  })

  it('no llama al endpoint legacy de asignación, que devolvía el token crudo', () => {
    const legacyEndpoint = ['/api/hiring', '/assessments'].join('')

    expect(VIEW).not.toContain(`'${legacyEndpoint}'`)
    expect(VIEW).not.toContain(`"${legacyEndpoint}"`)
  })
})
