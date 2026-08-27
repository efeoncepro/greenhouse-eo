import { describe, expect, it } from 'vitest'

/**
 * TASK-1776 — Resolver de sujeto (Slice 1, va PRIMERO: la clave única de la tabla depende de
 * esta normalización y cambiarla después exigiría reescribir filas append-only).
 *
 * Tests de tabla sobre las reglas declaradas: esquema/www/trailing-slash/query, la clase se
 * declara (no se infiere), y el gotcha del proveedor: una URL como target va CON esquema.
 */

import { resolveVisibilitySubject } from '../resolve-subject'

const okSubject = (input: Parameters<typeof resolveVisibilitySubject>[0]) => {
  const result = resolveVisibilitySubject(input)

  expect(result.ok).toBe(true)

  return result.ok ? result.subject : (undefined as never)
}

describe('resolveVisibilitySubject — normalización por clase', () => {
  it('domain: esquema, www y mayúsculas fuera; target = host pelado', () => {
    const table = ['https://www.Ejemplo.CL', 'ejemplo.cl', 'www.ejemplo.cl', 'http://ejemplo.cl']

    for (const raw of table) {
      const subject = okSubject({ subject: raw, kind: 'domain' })

      expect(subject.normalized).toBe('ejemplo.cl')
      expect(subject.providerTarget).toBe('ejemplo.cl')
      expect(subject.providerFilters).toBeNull()
    }
  })

  it('url: las tres formas de escribir la misma página producen LA MISMA clave', () => {
    const table = ['https://ejemplo.cl/guia', 'ejemplo.cl/guia/', 'www.ejemplo.cl/guia?utm_source=x']

    for (const raw of table) {
      const subject = okSubject({ subject: raw, kind: 'url' })

      expect(subject.normalized).toBe('ejemplo.cl/guia')
    }
  })

  it('url: el providerTarget lleva esquema — sin él el proveedor devuelve el dominio entero', () => {
    const subject = okSubject({ subject: 'ejemplo.cl/guia/', kind: 'url' })

    expect(subject.providerTarget).toBe('https://ejemplo.cl/guia')
  })

  it('url + keepQuery conserva la query en clave y target (el operador declaró que distingue)', () => {
    const subject = okSubject({ subject: 'https://ejemplo.cl/buscar?q=pintura', kind: 'url', keepQuery: true })

    expect(subject.normalized).toBe('ejemplo.cl/buscar?q=pintura')
    expect(subject.providerTarget).toBe('https://ejemplo.cl/buscar?q=pintura')
  })

  it('subdomain: host LITERAL en minúsculas — www. acá es un subdominio válido y se conserva', () => {
    expect(okSubject({ subject: 'Blog.Ejemplo.cl', kind: 'subdomain' }).normalized).toBe('blog.ejemplo.cl')
    expect(okSubject({ subject: 'www.ejemplo.cl', kind: 'subdomain' }).normalized).toBe('www.ejemplo.cl')
  })

  it('subfolder: target = host, filtro server-side por relative_url (gratis)', () => {
    const subject = okSubject({ subject: 'https://www.ejemplo.cl/blog/', kind: 'subfolder' })

    expect(subject.normalized).toBe('ejemplo.cl/blog')
    expect(subject.providerTarget).toBe('ejemplo.cl')
    expect(subject.providerFilters).toEqual([['ranked_serp_element.serp_item.relative_url', 'like', '/blog%']])
  })
})

describe('resolveVisibilitySubject — la clase se declara y se valida, jamás se infiere', () => {
  it('domain con path es un mismatch explícito, no una corrección silenciosa', () => {
    expect(resolveVisibilitySubject({ subject: 'ejemplo.cl/blog', kind: 'domain' })).toEqual({
      ok: false,
      errorCode: 'kind_shape_mismatch'
    })
  })

  it('subfolder sin path no es una subcarpeta', () => {
    expect(resolveVisibilitySubject({ subject: 'ejemplo.cl', kind: 'subfolder' })).toEqual({
      ok: false,
      errorCode: 'kind_shape_mismatch'
    })
  })

  it('url sin path ni query no es una URL exacta', () => {
    expect(resolveVisibilitySubject({ subject: 'ejemplo.cl', kind: 'url' })).toEqual({
      ok: false,
      errorCode: 'kind_shape_mismatch'
    })
  })

  it('kind inventado y sujeto vacío se rechazan con código propio', () => {
    expect(resolveVisibilitySubject({ subject: 'ejemplo.cl', kind: 'page' })).toEqual({
      ok: false,
      errorCode: 'invalid_kind'
    })
    expect(resolveVisibilitySubject({ subject: '   ', kind: 'domain' })).toEqual({
      ok: false,
      errorCode: 'empty_subject'
    })
  })
})
