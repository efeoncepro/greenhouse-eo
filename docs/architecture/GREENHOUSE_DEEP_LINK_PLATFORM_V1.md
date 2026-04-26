# Greenhouse Deep Link Platform V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-26
> **Ultima actualizacion:** 2026-04-26
> **Scope:** Deep links, route references, action URLs, share links, unfurls y navegacion cross-surface de Greenhouse
> **Docs relacionados:** `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_IDENTITY_ACCESS_V2.md`, `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`, `GREENHOUSE_PORTAL_VIEWS_V1.md`, `GREENHOUSE_NOTIFICATION_HUB_V1.md`, `GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md`, `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

---

## 1. Objetivo

Formalizar una capability de plataforma para que Greenhouse deje de construir links como strings repartidos entre menus, notificaciones, emails, Teams cards, search, API Platform y futuras apps first-party.

La tesis es simple:

> Un deep link de Greenhouse no debe ser solo una URL. Debe ser una referencia semantica a una entidad, vista o accion, resuelta por una capa canonica que conoce permisos, audiencia, ambiente, fallback y metadata de preview.

Esta arquitectura no implementa la capa todavia. Define el contrato objetivo para futuras tasks.

---

## 2. Diagnostico del estado actual

Greenhouse ya tiene piezas utiles, pero no una capa orquestadora de deep links.

### 2.1 Lo que si existe

- Catalogo de vistas gobernables con `viewCode`, `routePath` y `routeGroup` en `src/lib/admin/view-access-catalog.ts`.
- `portalHomePath` como contrato canonico de landing y fallback inicial en `src/lib/tenant/resolve-portal-home-path.ts`.
- Sidebar principal que filtra por `authorizedViews`, pero arma `href` inline en `src/components/layout/vertical/VerticalMenu.tsx`.
- Notificaciones con `actionUrl` persistido como string en `greenhouse_notifications.notifications`.
- Webhook notification mappings que generan `actionUrl` inline en `src/lib/webhooks/consumers/notification-mapping.ts`.
- Search global con URLs estaticas en `src/data/searchData.ts`.
- Quote share con URL builders y short links propios en `src/lib/finance/quote-share/*`.
- Teams cards que aceptan `Action.OpenUrl`, pero reciben URLs ya armadas por cada caller.
- API Platform first-party app que expone `portalHomePath` y `actionUrl`, pero no resuelve referencias semanticas.

### 2.2 Lo que falta

- Un registry canonico de destinos linkeables por entidad, vista y accion.
- Un resolver unico que transforme una referencia semantica en `href`, `absoluteUrl`, `label`, `viewCode`, `capabilities` y `fallback`.
- Validacion de acceso antes de generar o seguir un link sensible.
- Contrato comun para audiencias distintas:
  - web portal
  - email
  - Teams
  - mobile / first-party app
  - public share
  - API ecosystem
  - MCP / agent surfaces
- Unfurl metadata segura para previews.
- Redireccion segura para links legacy, aliases, short links y objetos movidos.
- Observabilidad de links rotos, inaccesibles o degradados.

Consecuencia:

> Hoy los links de Greenhouse funcionan por isla. Cada dominio decide su ruta, su fallback y su metadata. Esto aumenta drift, rompe previews y hace dificil garantizar permisos o migrar rutas.

---

## 3. Referencias de mercado

Esta arquitectura se inspira en patrones observados en plataformas prominentes.

### 3.1 Slack

Slack separa URLs web de redireccion (`https://slack.com/app_redirect?...`) y esquema nativo (`slack://...`). Usa IDs estables de workspace, channel, user y file. El runtime resuelve permisos: si el usuario no tiene acceso a un canal privado, el link no se abre como si fuera valido.

Fuente: <https://docs.slack.dev/interactivity/deep-linking/>

### 3.2 Microsoft Teams

Teams modela deep links con `appId`, `entityId`, `subEntityId` / `subPageId`, labels, `webUrl` de fallback y contexto (`channelId`, `chatId`, `contextType`). La recomendacion clave es no meter payload grande en la URL: usar un identificador y rehidratar desde backend.

Fuente: <https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/build-and-test/deep-link-application>

### 3.3 Salesforce

Salesforce evita que los componentes dependan de formatos de URL crudos. Usa `PageReference` y `NavigationMixin.GenerateUrl` / `Navigate`, porque los formatos reales de URL pueden cambiar entre contenedores.

Fuente: <https://developer.salesforce.com/docs/platform/lightning-component-reference/guide/lightning-navigation.html>

### 3.4 Atlassian

Atlassian Smart Links transforman URLs en previews, embeds o tarjetas segun tipo, app, ambiente y autenticacion del usuario. No todas las URLs son resolubles por seguridad o por falta de soporte del resolver.

Fuente: <https://support.atlassian.com/platform-experiences/docs/smart-links-from-jira-and-other-products/>

### 3.5 Notion

Notion Link Previews permite que un dominio externo unfurlee contenido autenticado dentro de Notion. Exige dominio verificado y OAuth, separando claramente URL publica, autorizacion y metadata segura.

Fuente: <https://developers.notion.com/page/link-previews-api>

### 3.6 GitHub

GitHub autolinkea referencias semanticas (`#26`, SHAs, `org/repo#123`, custom autolinks) y aplica acceso para contenido privado. El usuario escribe una referencia estable; la plataforma la resuelve.

Fuente: <https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/autolinked-references-and-urls>

### 3.7 Figma / FigJam

Figma resuelve previews desde URLs usando oEmbed u Open Graph / Twitter metadata y distingue embed interactivo de preview simple.

Fuente: <https://developers.figma.com/docs/plugins/api/properties/figma-createlinkpreviewasync/>

---

## 4. Principios canonicos

### 4.1 Referencia semantica antes que URL

Los callers no deben construir strings de ruta como contrato de producto.

Preferir:

```ts
{
  kind: 'person',
  id: 'julio-reyes',
  action: 'view'
}
```

por sobre:

```ts
'/people/julio-reyes'
```

### 4.2 IDs estables, labels derivados

El link debe guardar IDs canonicos y derivar labels al render/unfurl. Los nombres humanos cambian.

### 4.3 URLs chicas, backend rehidrata

El link puede contener un ID o token corto, pero no payload operacional grande. El backend debe rehidratar estado actual, acceso, labels y fallback.

### 4.4 Access-aware por ambos planos

Todo destino gobernable debe declarar:

- `viewCode` / `authorizedViews` cuando requiere surface visible, menu, tab, page guard o entrypoint.
- `capabilities` / `entitlements` cuando requiere autorizacion fina por modulo, accion y scope.

La ausencia de esta distincion debe tratarse como diseno incompleto.

### 4.5 Audience-aware

El mismo destino puede resolverse distinto segun audiencia:

- web interna: `href` relativo
- email: `absoluteUrl` production/staging-aware
- Teams: URL compatible con `Action.OpenUrl`, futura Teams entity link si aplica
- mobile: app route semantica o universal link
- public share: URL/token publico con permisos propios
- API/MCP: referencia serializable, no necesariamente URL navegable

### 4.6 Fallback explicito

Todo resolver debe declarar que pasa si:

- el usuario no tiene acceso
- la entidad no existe
- la entidad fue archivada o mergeada
- el ambiente no permite abrir la surface
- el cliente no soporta deep link nativo

### 4.7 Observabilidad

Los deep links deben poder auditar:

- resoluciones fallidas
- links legacy usados
- fallos de permiso
- objetos no encontrados
- unfurls degradados
- volumen por kind/action/audience

---

## 5. Modelo conceptual

### 5.1 DeepLinkReference

Referencia semantica portable.

```ts
type GreenhouseDeepLinkReference = {
  kind: string
  id?: string
  action?: string
  scope?: {
    tenantId?: string
    organizationId?: string
    spaceId?: string
    memberId?: string
  }
  params?: Record<string, string | number | boolean | null>
}
```

Ejemplos:

```ts
{ kind: 'person', id: 'julio-reyes', action: 'view' }
{ kind: 'quote', id: 'quote_123', action: 'edit' }
{ kind: 'leave_request', id: 'leave_123', action: 'review' }
{ kind: 'ops_health', action: 'view' }
{ kind: 'public_quote_share', id: 'AbC123x', action: 'open' }
```

### 5.2 DeepLinkResolvedTarget

Resultado normalizado para consumers.

```ts
type GreenhouseResolvedDeepLink = {
  reference: GreenhouseDeepLinkReference
  status: 'resolved' | 'forbidden' | 'not_found' | 'archived' | 'unsupported' | 'degraded'
  href: string | null
  absoluteUrl: string | null
  label: string
  description?: string
  icon?: string
  viewCode?: string
  routeGroup?: string
  requiredCapabilities?: string[]
  fallbackHref: string
  preview?: {
    title: string
    subtitle?: string
    statusLabel?: string
    imageUrl?: string
  }
  diagnostics?: {
    reason?: string
    source?: string
    confidence?: 'high' | 'medium' | 'low'
  }
}
```

### 5.3 DeepLinkDefinition

Registro canonico por kind/action.

```ts
type GreenhouseDeepLinkDefinition = {
  kind: string
  actions: string[]
  build: (input: BuildInput) => Promise<GreenhouseResolvedDeepLink>
  viewCode?: string | ((input: BuildInput) => string | null)
  requiredCapabilities?: string[] | ((input: BuildInput) => string[])
  aliases?: string[]
}
```

---

## 6. Runtime objetivo

### 6.1 Ubicacion propuesta

```txt
src/lib/navigation/deep-links/
  index.ts
  types.ts
  registry.ts
  resolver.ts
  base-url.ts
  access.ts
  definitions/
    portal.ts
    people.ts
    finance.ts
    hr.ts
    admin.ts
    public-share.ts
  __tests__/
```

### 6.2 API interna

```ts
resolveGreenhouseDeepLink(reference, {
  audience: 'web' | 'email' | 'teams' | 'mobile' | 'api' | 'mcp',
  tenant,
  requestUrl,
  environment
})
```

### 6.3 Helpers derivados

```ts
buildGreenhouseHref(reference, context)
buildGreenhouseAbsoluteUrl(reference, context)
buildGreenhouseActionUrl(reference, context)
buildGreenhouseUnfurl(reference, context)
canResolveGreenhouseDeepLink(reference, context)
```

### 6.4 Base URL canonica

La resolucion absoluta debe centralizar el orden de precedencia hoy repetido:

1. URL del request cuando aplica y es confiable.
2. `NEXTAUTH_URL`.
3. `NEXT_PUBLIC_APP_URL`.
4. `VERCEL_URL` con `https://`.
5. Production fallback `https://greenhouse.efeoncepro.com`.

El resolver debe normalizar trailing slash y nunca imprimir secretos ni cookies.

---

## 7. Contrato con access model

Todo deep link interno debe declarar su surface.

Ejemplo:

```ts
{
  kind: 'quote',
  action: 'edit',
  viewCode: 'finanzas.cotizaciones',
  requiredCapabilities: ['finance.quotes.update']
}
```

Reglas:

- Si el destino aparece en menu, tabs, command palette, page guard o search, debe tener `viewCode`.
- Si el destino ejecuta o habilita accion fina, debe tener `requiredCapabilities`.
- Si un destino tiene solo `routeGroup`, queda en modo legacy/fallback y debe marcar `diagnostics.confidence='low'` o `degraded`.
- Si el usuario no tiene `viewCode` pero si tiene capability fina, el resolver no debe inventar una surface visible; debe caer a fallback o devolver `forbidden` segun audiencia.
- Si la audiencia es email/Teams y el acceso no puede validarse al momento de generar, el link debe resolver nuevamente en el open handler antes de mostrar datos sensibles.

---

## 8. Surfaces consumidoras

### 8.1 Sidebar y navegacion

El menu debe converger gradualmente desde `href` inline a referencias canonicas o a `VIEW_REGISTRY` enriquecido con definitions de deep link.

### 8.2 Command palette / search

Search no debe depender de `src/data/searchData.ts` como lista estatica. Debe derivar destinos de:

- `VIEW_REGISTRY`
- `DeepLinkRegistry`
- permisos efectivos del usuario
- entidades recientes o buscadas si aplica

### 8.3 Notificaciones

`NotificationService.dispatch({ actionUrl })` debe aceptar en el futuro:

```ts
actionLink: GreenhouseDeepLinkReference
```

El storage puede persistir ambos durante migracion:

- `action_url` legacy
- `action_link_json` canonico

### 8.4 Emails

Emails deben construir CTAs via resolver absoluto, no concatenando `NEXT_PUBLIC_APP_URL`.

### 8.5 Teams Bot y Adaptive Cards

Teams cards deben recibir `GreenhouseResolvedDeepLink` o resolver internamente por referencia. El `Action.OpenUrl` debe usar `absoluteUrl` y el label debe venir del resolver.

### 8.6 API Platform first-party app

`api/platform/app/*` debe exponer referencias semanticas y URLs resueltas segun audience `mobile`. No debe depender de rutas web internas como contrato movil permanente.

### 8.7 Public share

Short links publicos como `/q/[shortCode]` siguen siendo validos, pero deben registrarse como `kind='public_quote_share'` para que puedan ser auditados, unfurled y migrados.

---

## 9. URL shapes recomendadas

### 9.1 Canonical web routes

Mantener rutas humanas y navegables:

```txt
/people/:memberId
/finance/quotes/:quotationId
/finance/income/:incomeId
/hr/leave?requestId=:requestId
/admin/ops-health
```

### 9.2 Short aliases

Usar aliases cortos para links publicos o cross-channel:

```txt
/q/:shortCode
/l/:linkId
```

`/l/:linkId` debe ser considerado solo si hace falta un redirector general persistente. No debe reemplazar rutas canonicas del portal.

### 9.3 Query params

Usar query params para estado de UI liviano:

```txt
/hr/leave?requestId=leave_123
/agency?tab=operations
```

No guardar payload grande ni datos sensibles en query params.

---

## 10. Unfurl y previews

Greenhouse debe distinguir:

- **Open link:** lleva al usuario al destino.
- **Preview/unfurl:** muestra metadata segura antes de abrir.

Campos minimos:

```ts
{
  title: string
  subtitle?: string
  statusLabel?: string
  icon?: string
  imageUrl?: string
  freshness?: string
}
```

Reglas:

- No exponer datos sensibles si el resolver no puede comprobar acceso.
- Para ambientes no productivos, previews externas deben poder apagarse o marcarse como staging.
- Previews deben tener degraded mode, no romper el mensaje/card/documento si la entidad no puede hidratarse.

---

## 11. Migracion propuesta

### Slice 1 — Foundation sin persistencia

- Crear `src/lib/navigation/deep-links/*`.
- Implementar definitions para:
  - `home`
  - `ops_health`
  - `person`
  - `quote`
  - `income`
  - `expense`
  - `leave_request`
  - `payroll_period`
  - `public_quote_share`
- Tests unitarios de base URL, href, absolute URL, fallback y access metadata.

### Slice 2 — Consumers de bajo riesgo

- Migrar Teams test card.
- Migrar notification mappings nuevos.
- Migrar email CTA helpers repetidos.
- Mantener `actionUrl` legacy como output derivado.

### Slice 3 — Search y menu

- Generar command palette desde registry + permissions.
- Reconciliar `VIEW_REGISTRY.routePath` con `DeepLinkRegistry`.
- Marcar rutas legacy sin definition.

### Slice 4 — Storage y observabilidad

- Agregar `action_link_json` a notificaciones si se justifica.
- Agregar auditoria `deep_link_resolution_log` si el volumen/riesgo lo amerita.
- Dashboard de broken links o signal en Reliability Control Plane.

### Slice 5 — Mobile/API Platform

- Exponer references + resolved URLs en `api/platform/app/home` y `notifications`.
- Preparar universal links si la app first-party avanza.

---

## 12. Anti-metas

- No crear un router paralelo a Next.js.
- No mover todas las rutas del portal en el primer slice.
- No reemplazar `VIEW_REGISTRY`; debe complementarlo.
- No meter permisos solo en el cliente.
- No hacer que `views` sean la unica capa de acceso.
- No usar short links para esconder falta de rutas canonicas.
- No crear previews que filtren informacion sensible a usuarios sin acceso.

---

## 13. Decision canonica

Greenhouse debe incorporar una `Deep Link Platform` como capability shared.

El contrato canonico sera:

1. callers expresan referencias semanticas
2. el registry conoce kind/action/surface/capabilities
3. el resolver produce href/absoluteUrl/preview/fallback por audiencia
4. access se evalua en ambos planos: `views` y `entitlements`
5. storage legacy de URLs puede convivir, pero debe tratarse como salida derivada

Hasta que esta capability exista, cualquier nuevo modulo que agregue links en notificaciones, Teams, email, search o API debe documentar explicitamente:

- URL generada
- entidad canonica usada
- viewCode requerido
- capability requerida, si aplica
- fallback cuando no hay acceso
- si el link es relativo, absoluto, publico o short link

