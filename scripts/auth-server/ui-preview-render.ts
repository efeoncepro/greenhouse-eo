import { AUTH_SERVER_PREVIEW_COPY as copy } from '../../src/lib/copy/auth-server-preview'

export type AuthPreviewState = 'login' | 'consent'
export interface AuthPreviewAssets {
  /** CSS del generador local de preview; nunca datos de una petición. */
  styles: string
  /** SVG institucional generado y confiable; nunca metadatos de un cliente. */
  isotipo: string
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]!
  )

// Fixtures deliberadas. Este módulo no consulta identidad, grants ni aplicaciones reales.
const fixture = {
  application: copy.fixtureApplication,
  organization: copy.fixtureOrganization,
  scopes: [
    { id: 'efeonce.mcp.read', kind: 'read', title: copy.fixtureReadTitle, description: copy.fixtureReadDescription },
    {
      id: 'efeonce.mcp.seo.write',
      kind: 'write',
      title: copy.fixtureWriteTitle,
      description: copy.fixtureWriteDescription
    }
  ]
} as const

const login = (): string => `
  <h1 class="id-title" id="page-title" tabindex="-1">${escapeHtml(copy.loginTitle)}</h1>
  <p class="id-intro id-muted">${escapeHtml(copy.loginIntro)}</p>
  <section class="id-section" aria-labelledby="team-title">
    <h2 id="team-title">${escapeHtml(copy.teamTitle)}</h2>
    <p class="id-muted">${escapeHtml(copy.teamDescription)}</p>
    <a class="id-primary" href="/consent" data-capture="id-corporate-action">${escapeHtml(copy.microsoftAction)}</a>
  </section>
  <section class="id-section" aria-labelledby="invitation-title">
    <h2 id="invitation-title">${escapeHtml(copy.invitationTitle)}</h2>
    <p class="id-muted">${escapeHtml(copy.invitationDescription)}</p>
    <a class="id-secondary" href="/consent" data-capture="id-passkey-action">${escapeHtml(copy.passkeyAction)}</a>
    <p class="id-divider id-muted">${escapeHtml(copy.emailAlternative)}</p>
    <form action="/consent" method="get" data-capture="id-form">
      <div class="id-field">
        <label for="preview-email">${escapeHtml(copy.emailLabel)}</label>
        <input id="preview-email" type="email" autocomplete="email" inputmode="email" placeholder="${escapeHtml(copy.emailPlaceholder)}" aria-describedby="email-hint" required>
        <p id="email-hint" class="id-muted">${escapeHtml(copy.emailHint)}</p>
      </div>
      <div class="id-actions"><button class="id-secondary" type="submit">${escapeHtml(copy.emailAction)}</button></div>
    </form>
  </section>`

const consent = (): string => `
  <h1 class="id-title" id="page-title" tabindex="-1">${escapeHtml(copy.consentTitle)}</h1>
  <p class="id-intro id-muted">${escapeHtml(copy.consentIntro(fixture.application))}</p>
  <section class="id-section id-org" aria-labelledby="organization-title" data-capture="id-organization">
    <h2 id="organization-title">${escapeHtml(copy.organizationLabel)}</h2>
    <p>${escapeHtml(fixture.organization)}</p>
  </section>
  <section class="id-section" aria-labelledby="permissions-title">
    <h2 id="permissions-title">${escapeHtml(copy.permissionsTitle)}</h2>
    <ul class="id-permissions" data-capture="id-scopes">${fixture.scopes
      .map(
        scope => `
      <li class="id-scope">
        <div class="id-scope-heading"><h3>${escapeHtml(scope.title)}</h3><span class="id-scope-kind" data-kind="${scope.kind}">${escapeHtml(scope.kind === 'write' ? copy.writeLabel : copy.readLabel)}</span></div>
        <p class="id-muted">${escapeHtml(scope.description)}</p>
      </li>`
      )
      .join('')}
    </ul>
    <p class="id-muted">${escapeHtml(copy.consentBoundary)}</p>
    <details class="id-scope-details"><summary>${escapeHtml(copy.scopeDetails)}</summary><p>${escapeHtml(copy.applicationIdLabel)}: ${escapeHtml(copy.fixtureClientId)}</p><ul>${fixture.scopes.map(scope => `<li>${escapeHtml(scope.id)}</li>`).join('')}</ul></details>
  </section>
  <div class="id-actions" data-capture="id-actions">
    <a class="id-secondary" href="/login">${escapeHtml(copy.denyAction)}</a>
    <a class="id-primary" href="/consent">${escapeHtml(copy.allowAction)}</a>
  </div>`

/** Prototipo visual aislado. Ningún enlace o formulario invoca el emisor real. */
export function renderAuthPreview(state: AuthPreviewState, assets: AuthPreviewAssets): string {
  const title = state === 'login' ? copy.loginTitle : copy.consentTitle

  // Los assets son código local del harness; rechazar cierre de style evita escapar del elemento.
  if (/<\/style\b/i.test(assets.styles)) throw new Error('Invalid preview stylesheet')

  return `<!doctype html>
<html lang="${escapeHtml(copy.lang)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)} · ${escapeHtml(copy.brand)}</title><style>${assets.styles}</style></head>
<body>
  <main class="id-page" data-surface-recipe="settingsFlow" data-state="${state}" data-capture="id-shell" aria-labelledby="page-title">
    <header class="id-brand"><span class="id-brand-mark" aria-hidden="true">${assets.isotipo}</span><span>${escapeHtml(copy.brand)}</span></header>
    <p class="id-preview-note">${escapeHtml(copy.previewNotice)}</p>
    <div class="id-context" data-capture="id-client"><span class="id-muted">${escapeHtml(copy.contextLabel)}</span><strong>${escapeHtml(fixture.application)}</strong></div>
    <div class="id-surface">${state === 'login' ? login() : consent()}</div>
    <p class="id-footer id-muted">${escapeHtml(state === 'login' ? copy.loginFooter : copy.consentFooter)}</p>
  </main>
</body></html>`
}
