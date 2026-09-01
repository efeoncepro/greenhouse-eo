// @vitest-environment jsdom

import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'
import type { SeoSiteAuditFindingSeverity, SeoSiteAuditFindingView } from '@/lib/growth/seo/contracts'

import SiteAuditSiteFindings from '../SiteAuditSiteFindings'
import { groupAuditIssues } from '../group-audit-issues'

/**
 * TASK-1671 — Las tres reglas que esta región existe para sostener.
 *
 * No son tests de render genéricos: cada uno fija una stop condition del wireframe. Si alguno
 * cae, la pantalla falla su propósito aunque el resto de los gates pase.
 */

const siteFinding = (
  issueType: string,
  severity: SeoSiteAuditFindingSeverity,
  detail: Record<string, unknown> = {}
): SeoSiteAuditFindingView => ({
  issueType,
  severity,
  url: 'https://berel.com',
  detail,
  findingScope: 'site'
})

const groupsOf = (findings: SeoSiteAuditFindingView[]) =>
  groupAuditIssues({
    critical: findings.filter(item => item.severity === 'critical'),
    warning: findings.filter(item => item.severity === 'warning'),
    notice: findings.filter(item => item.severity === 'notice')
  })

afterEach(cleanup)

describe('SiteAuditSiteFindings', () => {
  it('🔴 el bloqueo de ENTRENAMIENTO no se rotula como un defecto', () => {
    // La stop condition más cara: un `critical` percibido sobre una decisión de derechos
    // legítima destruye la credibilidad del resto del informe.
    renderWithTheme(
      <SiteAuditSiteFindings
        groups={groupsOf([
          siteFinding('ai_training_crawlers_blocked', 'notice', {
            blocked: ['GPTBot', 'Google-Extended', 'CCBot'],
            source: 'robots_txt'
          })
        ])}
      />
    )

    expect(screen.getByText('Decisión declarada')).toBeInTheDocument()
    // "Info" es la etiqueta genérica de `notice`; acá describiría prioridad, no naturaleza.
    expect(screen.queryByText('Info')).not.toBeInTheDocument()
  })

  it('🔴 el hint de la postura queda VISIBLE, no colapsado', () => {
    renderWithTheme(
      <SiteAuditSiteFindings
        groups={groupsOf([siteFinding('ai_training_crawlers_blocked', 'notice', { source: 'robots_txt' })])}
      />
    )

    // El texto que impide leerlo como falla tiene que estar en el documento, no tras un hover.
    expect(screen.getByText(/decisión sobre el uso del contenido/i)).toBeInTheDocument()
  })

  it('🔴 ninguna fila de dominio dice "páginas afectadas"', () => {
    const { container } = renderWithTheme(
      <SiteAuditSiteFindings
        groups={groupsOf([
          siteFinding('ai_retrieval_crawlers_blocked', 'critical', {
            blocked: ['OAI-SearchBot', 'PerplexityBot', 'ClaudeBot'],
            source: 'robots_txt'
          })
        ])}
      />
    )

    expect(container.textContent).not.toMatch(/página[s]? afectada/i)
    expect(screen.getByText('Todo el sitio')).toBeInTheDocument()
  })

  it('🔴 siempre dice DÓNDE se detectó', () => {
    renderWithTheme(
      <SiteAuditSiteFindings
        groups={groupsOf([
          siteFinding('ai_retrieval_crawlers_blocked', 'critical', {
            blocked: ['OAI-SearchBot', 'PerplexityBot', 'ClaudeBot'],
            source: 'robots_txt'
          })
        ])}
      />
    )

    // Sin esto el cliente abre su robots.txt limpio y concluye que el informe miente.
    expect(screen.getByText(/En robots\.txt/)).toBeInTheDocument()
    expect(screen.getByText(/OAI-SearchBot y 2 más/)).toBeInTheDocument()
  })

  it('el hallazgo de borde nombra que el robots está limpio', () => {
    renderWithTheme(
      <SiteAuditSiteFindings
        groups={groupsOf([
          siteFinding('ai_crawler_edge_access_denied', 'critical', {
            source: 'edge',
            robotsAllowsCrawlers: true
          })
        ])}
      />
    )

    // Es la mitad que lo distingue del hallazgo de robots: sin ella el cliente busca el
    // problema en el archivo equivocado.
    expect(screen.getByText(/En el borde \(CDN o firewall\)/)).toBeInTheDocument()
    expect(screen.getByText(/el robots\.txt está limpio/)).toBeInTheDocument()
  })

  it('omite el lugar en vez de inventarlo cuando el dato no lo trae', () => {
    const { container } = renderWithTheme(
      <SiteAuditSiteFindings groups={groupsOf([siteFinding('structured_data_missing', 'warning', {})])} />
    )

    expect(container.textContent).not.toMatch(/En robots\.txt|En el borde|En la portada/)
  })

  it('con los 4 chequeos sanos declara "Verificado" y QUÉ se revisó', () => {
    renderWithTheme(<SiteAuditSiteFindings groups={[]} />)

    expect(screen.getByText('Verificado')).toBeInTheDocument()
    // "Verificado" sin objeto no es información.
    expect(screen.getByText(/acceso de los motores de IA, los datos estructurados/i)).toBeInTheDocument()
  })

  it('"no verificado" se muestra con su razón y SIN chip de severidad', () => {
    renderWithTheme(
      <SiteAuditSiteFindings
        groups={groupsOf([
          siteFinding('site_check_unverified', 'notice', {
            check: 'sitemap',
            reason: 'El robots.txt del sitio nos prohíbe leer el mapa del sitio que él mismo declara.'
          })
        ])}
      />
    )

    expect(screen.getByText('No pudimos verificar')).toBeInTheDocument()
    expect(screen.getByText(/Mapa del sitio — El robots\.txt del sitio nos prohíbe/)).toBeInTheDocument()
    // Un chip lo igualaría a un hallazgo, y esto no es ni sano ni roto.
    expect(screen.queryByText('Info')).not.toBeInTheDocument()
  })

  it('un hueco de medición NO se lee como sitio sano', () => {
    // Con sólo un `site_check_unverified`, la región no puede declarar "Verificado".
    renderWithTheme(
      <SiteAuditSiteFindings
        groups={groupsOf([
          siteFinding('site_check_unverified', 'notice', { check: 'ai_crawler_access', reason: 'Sin respuesta.' })
        ])}
      />
    )

    expect(screen.queryByText('Verificado')).not.toBeInTheDocument()
  })
})
