# TASK-1944 — Adoptar los módulos canónicos de correo Efeonce en Greenhouse

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1944-efeonce-email-modules-adoption.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-042`
- Status real: `Diseño aprobado por el operador el 2026-09-29 y canonizado en AXIS v0.3.38 el mismo día (main c92160b: tokens efeonceEmail, contrato efeonce.email-modules 0.1.0 candidate, graphic-line-orbit 0.5.0, PNG para correo en axis-brand-assets 0.4.6). Greenhouse no lo fija ni lo usa: ningún correo tiene estos módulos. Propósito del correo de Insights decidido el 2026-09-29 (relationship_transactional con la excepción efeonce-insights-delivery, ver Delta); AXIS publica en paralelo el contrato efeonce.email-modules 0.2.0 (publicado en `v0.3.39`, commit `1c18a2e`)`
- Rank: `TBD`
- Domain: `content|ui|delivery`
- Blocked by: `TASK-1774 (sólo el envío del Slice 4 y la evidencia del Slice 5: el pie de Insights lleva un enlace de baja que tiene que funcionar). La decisión de propósito y la publicación de AXIS v0.3.39 (2026-09-29) ya no bloquean`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

Lleva a Greenhouse los módulos canónicos de correo de Efeonce que el operador aprobó el 2026-09-29: el pie oscuro, el
CTA principal, la tarjeta de agenda y el bloque de marca con «Empower your {Línea}». Fija el juego de AXIS `v0.3.39`
(en publicación; contrato `efeonce.email-modules` `0.2.0`), pone al día el adapter de la órbita, construye los cuatro
módulos desde el manifiesto de `efeonce.email-modules` y los aplica primero al correo de entrega de Efeonce Insights,
que es un correo de servicio al cliente (`relationship_transactional`) con una excepción explícita que le deja el pie
aprobado completo. Los demás correos los adoptan después, tipo por tipo, según la política de presentación.
«Suscribirme» queda retirado.

## Why This Task Exists

El correo de Insights de TASK-1848 es funcional y sobrio, y el pie de `EmailLayout` es claro, sin razón social, RUT,
dirección, redes ni agenda. El operador aprobó un correo nuevo y pidió canonizar sus módulos, no su cuerpo: cualquier
correo Efeonce debe poder cerrar con el mismo pie y la misma agenda sin copiar HEX ni medidas del canvas. AXIS ya
publicó ese canon, pero Greenhouse fija un juego anterior (`axis-tokens` y `axis-ui-contracts` `0.3.37`,
`axis-graphic-line` `0.11.0`, `axis-brand-assets` `0.4.5`, `axis-ui-registry` `0.3.1`).

Hay además una deuda que el bump destapa. El adapter de la órbita
(`scripts/creative/layout-compiler/graphic-line.mjs`) acepta sólo el contrato `efeonce.graphic-line-orbit` `0.3.1`,
pero el juego fijado hoy ya trae el `0.4.0`. `node --test scripts/creative/layout-compiler/graphic-line.test.mjs` da 0
de 7 en `develop` (verificado el 2026-09-29), con «Unsupported AXIS graphic line contract 0.4.0». Esa suite no corre en
CI (`pnpm creative:layout:test`), por eso nadie lo vio. El contrato `0.3.31` entró con el commit `9289cab0c`.

Y hay una tensión abierta con la política de presentación (TASK-1764, ADR `Proposed`). La política prohíbe la promoción
en correos de servicio y reserva redes y baja a suscripción o marketing. El contrato de AXIS, en cambio, exige la agenda,
las preferencias y la baja en **todo** pie. Aplicarlo a un correo sin decidir su propósito sería tomar esa decisión por
la vía del código. **Resuelta para Insights el 2026-09-29** por decisión del operador (ver Delta 2026-09-29).

## Goal

- Greenhouse fija AXIS `v0.3.39` y el adapter de la órbita vuelve a verde con el contrato `0.5.0`.
- Existen cuatro módulos de correo reutilizables que leen todos sus valores del manifiesto de AXIS y los PNG sellados.
- El correo de entrega de Insights se ve como los tres tableros aprobados, en sus tres modalidades, en los clientes de
  correo reales.
- El correo de Insights sale como `relationship_transactional` con la excepción `efeonce-insights-delivery` declarada en
  el registro de política de Greenhouse, y cada tipo que adopte los módulos después pasa por la política de
  presentación sin excepción implícita.

## Delta 2026-09-29 — propósito del correo de Insights decidido

- **Decisión del operador (2026-09-29).** El correo de entrega de Efeonce Insights va a **clientes**: es un correo de
  servicio al cliente, propósito `relationship_transactional` de la política de presentación
  (`GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md`, `Proposed`).
- **Excepción explícita y documentada.** Conserva el **pie aprobado completo** del canvas v21: la tarjeta de agenda
  «Agendar una reunión», las redes y los enlaces de preferencias y baja («Dejar de recibir estos informes»). El operador
  la eligió frente a «sólo el botón» cuando se le preguntó. Aprobador: el operador; fecha: 2026-09-29; motivo: conservar el
  pie del diseño aprobado (canvas v21).
- **Los demás correos siguen la política:** sin agenda, redes ni baja en transaccionales y de servicio; baja obligatoria
  en suscripción y marketing; redes opcionales en suscripción y obligatorias en marketing.
- **AXIS, en paralelo:** `efeonce.email-modules` `0.2.0`. El intent pide `purpose` (obligatorio) y `application`, que
  referencia un registro de excepciones; la excepción `efeonce-insights-delivery` permite `cta-agenda`, `socials` y
  `unsubscribe`. Se retira `cta-agenda-required`; entran `cta-agenda-not-allowed`, `footer-socials-not-allowed`,
  `footer-unsubscribe-not-allowed`, `application-unknown` y `application-purpose-mismatch`. Publicación objetivo:
  tokens y contratos `0.3.39`, registro `0.3.4`, publicado el 2026-09-29 (tag `v0.3.39`, commit `1c18a2e`).
- **Efecto en esta task:** Slice 1 fija `v0.3.39`; el adapter pasa `purpose` y `application` al contrato; sólo Insights
  lleva agenda, redes y baja; el registro de política de Greenhouse declara la excepción. La decisión de propósito deja
  de bloquear. Sigue bloqueando el envío: TASK-1774 (la baja del pie de Insights tiene que funcionar).
- Registrado también en TASK-1764 (Delta 2026-09-29, resolución) y en la ADR de presentación (Delta 2026-09-29).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1-direction.md` (dirección aprobada; canon contra lo que es sólo
  aplicación)
- `docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md` (`Proposed`; perfiles por `EmailType`) y
  `docs/epics/to-do/EPIC-042-efeonce-governed-email-presentation-program.md`
- `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` §1 (recorrido de la medida), §5 (eslogan), §8.5
  (burbuja URL) y §10.2 y siguientes (correo)
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §9 (correo y recurrencia)
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` (instalación con credencial efímera; regla de todo
  bump de `axis-tokens`)
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md` y `TASK-1591` (AXIS como plataforma compartida)

Reglas obligatorias:

- Ningún HEX, medida, nombre de asset ni línea legal copiado del canvas o de la dirección: todo sale del manifiesto de
  `resolveEmailModulesIntent`, de `efeonceEmail` y de `EMAIL_ASSET_SEALS`. Los datos legales y de contacto salen de
  `src/config/efeonce-brand.ts` (y de `getOperatingEntityIdentity()` en runtime).
- Los módulos son piezas componibles. No cambian el default de `EmailLayout` ni reemplazan `EmailButton` para los demás
  correos.
- Ningún correo pinta «Suscribirme». La agenda lleva a `https://efeoncepro.com/contacto/` con UTM y nunca a un
  `mailto:`.
- El adapter pasa siempre `purpose` (y `application` cuando el tipo tiene excepción) al contrato
  `efeonce.email-modules` `0.2.0`, que decide si caben agenda, redes y baja. El adapter nunca quita ni agrega módulos
  por su cuenta (ADR de AXIS `EMAIL_MODULES_DECISION_V1.md` §7). Una excepción nueva es decisión del operador, con
  aprobador, fecha y motivo, en el registro de Greenhouse y en el de AXIS.
- Copy visible en `src/lib/copy/insights.ts` y `src/lib/copy/dictionaries/es-CL/emails.ts`, validado con
  `greenhouse-ux-writing`.
- `Sentry` sólo por `captureWithDomain`.

## Normative Docs

- `docs/ui/wireframes/TASK-1944-efeonce-email-modules-adoption.md`
- Canvas aprobado: <https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd> (versión 21, página «Correo»).
- Canon en AXIS `v0.3.38` (repo `axis-design-system`, `main` `c92160b`): ADR
  `docs/architecture/EMAIL_MODULES_DECISION_V1.md`, guía `docs/agent-composition/email-modules.md`, Lab
  <https://axis.efeonce.org/references/email/>.
- Skills: `efeonce-graphic-line` (módulos de correo), `greenhouse-email`, `resend-email-platform`,
  `greenhouse-ux-writing`, `axis-design-system`.

## Dependencies & Impact

### Depends on

- AXIS `v0.3.38` publicado (hecho el 2026-09-29): `@efeoncepro/axis-tokens` y `@efeoncepro/axis-ui-contracts` `0.3.38`,
  `@efeoncepro/axis-graphic-line` `0.13.0`, `@efeoncepro/axis-brand-assets` `0.4.6`, `@efeoncepro/axis-ui-registry`
  `0.3.3`.
- AXIS `v0.3.39` **publicado** (commit `1c18a2e`): `axis-tokens` y `axis-ui-contracts` `0.3.39` (contrato `efeonce.email-modules`
  `0.2.0`, con `purpose` y `application`) y `axis-ui-registry` `0.3.4`. Es el objetivo del Slice 1; se confirma al
  publicar.
- Credencial efímera de lectura de paquetes, autorizada por el operador para esa instalación (runbook de AXIS).
- `TASK-1774` (mecanismo de baja): el pie de Insights lleva un enlace de baja; mientras la baja no funcione, no se envía
  a nadie.
- Decisión del operador sobre el propósito del correo de Insights: **tomada el 2026-09-29** (Delta 2026-09-29).
- Registro de política de presentación de Greenhouse (foundation de TASK-1764), donde se declara la excepción de
  Insights.
- Escritura en el bucket público de medios (`GREENHOUSE_PUBLIC_MEDIA_BUCKET`) para subir los PNG, autorizada por el
  operador.

### Blocks / Impacts

- `TASK-1764` (umbrella de perfiles de pie): recibe los módulos como bloques del perfil. La tensión quedó resuelta para
  Insights por excepción; su registro de política debe admitir excepciones por tipo con aprobador, fecha y motivo.
- `TASK-1849` (biblioteca y presentación del correo de Insights): esta task construye la presentación del correo; 1849
  conserva el cableado de datos de la edición (hallazgos, cifras de «Lo esencial», tarjeta de decisión) y la ruta del
  portal.
- `TASK-1938` (PDF del AI Visibility Report): comparte el bump de AXIS y el adapter de la órbita. La que llegue primero
  hace el bump y la otra lo encuentra hecho.
- `TASK-1057` (paleta de correo desde AXIS) y `TASK-1043` (tipografía de correo): no se tocan `EMAIL_COLORS` ni el
  adapter tipográfico global.
- Consumidores del adapter de la órbita: `scripts/creative/layout-compiler/{compiler,resolve-graphic-line,render-graphic-line}.mjs`
  y `scripts/documents/render-efeonce-graphic-line.mjs`.

### Files owned

- `package.json` y `pnpm-lock.yaml` (sólo las cinco dependencias de AXIS)
- `scripts/creative/layout-compiler/graphic-line.mjs` y `graphic-line.test.mjs`
- `src/emails/efeonce-modules/**` [propuesta de ruta; se confirma en el plan]
- `src/emails/InsightsEditionDeliveryEmail.tsx`
- `src/emails/constants.ts` (sólo URLs de los PNG de correo)
- `src/lib/email/templates.ts` (sólo el registro y la vista previa del correo de Insights)
- El registro de política de presentación en `src/lib/email/**` (sólo la declaración de los dos `EmailType` de
  Insights y su excepción; la ruta la fija TASK-1764)
- `src/emails/__snapshots__/EmailTemplateBaseline.test.tsx.snap` y `src/emails/EmailTemplateBaseline.test.tsx`
- `src/config/efeonce-brand.ts` (sólo si la prueba de deriva pide un dato que falte, como el `tel` de cada teléfono)
- `src/lib/copy/insights.ts` y `src/lib/copy/dictionaries/es-CL/emails.ts`
- `docs/ui/wireframes/TASK-1944-efeonce-email-modules-adoption.md`
- `docs/ui/reviews/TASK-1944-efeonce-email-modules-adoption/`

## Current Repo State

### Already exists

- `src/emails/InsightsEditionDeliveryEmail.tsx`: el correo de TASK-1848, con las modalidades `portal_link`, `share_link`
  y `attachment`, `locale` `es`/`en` y copy en línea en el componente.
- `src/emails/components/EmailLayout.tsx`: layout compartido. Con `brand='efeonce'` cambia sólo el logo y el tagline;
  pie claro con disclaimer y baja opcional.
- `src/emails/components/EmailButton.tsx`: botón `#0375db` de radio 8.
- `src/emails/constants.ts`: `EMAIL_COLORS`, `EMAIL_FONTS` y `EFEONCE_LOGO_URL` en el bucket público de medios
  (`emails/efeonce-wordmark-white.png`).
- `src/config/efeonce-brand.ts`: `EFEONCE_LEGAL_NAME_FALLBACK`, `EFEONCE_TAX_ID_FALLBACK`, `EFEONCE_CONTACT`
  (`addressDisplay`, `phones` sin `tel`, `email`), `EFEONCE_SOCIAL_LINKS` y `EFEONCE_OPERATING_MARKETS`.
- `src/lib/email/types.ts`: `insights_edition_delivery` e `insights_edition_delivery_attachment`, de prioridad
  `transactional` y en `AGENCY_BRANDED_EMAIL_TYPES`.
- `src/lib/email/templates.ts`: `resolveInsightsEditionDelivery` para los dos tipos y la vista previa en
  `/admin/emails/preview`.
- `src/lib/efeonce-insights/delivery/dispatch.ts`: despacho de las modalidades vivas.
- `scripts/creative/layout-compiler/graphic-line.mjs`: `SUPPORTED_CONTRACT_VERSION = '0.3.1'`.
- La dirección aprobada y sus tres tableros en `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1/`.

### Gap

- Ningún correo usa los módulos, y no existe ningún componente de pie oscuro, píldora o agenda.
- El correo de Insights no está en `EmailTemplateBaseline.test.tsx`: su HTML no tiene red de regresión.
- Los PNG para correo de `axis-brand-assets` `0.4.6` no están en el bucket público.
- El adapter de la órbita está rojo con el juego fijado hoy (0 de 7).
- No hay prueba de deriva entre `efeonceEmail.institutional` de AXIS y `src/config/efeonce-brand.ts`.
- El propósito de los correos de Insights está decidido (`relationship_transactional` con la excepción
  `efeonce-insights-delivery`), pero no está declarado en ningún registro de Greenhouse: el registro de política de
  TASK-1764 todavía no existe y la ADR sigue `Proposed`.
- Greenhouse no pasa `purpose` ni `application` a ningún contrato de AXIS.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/emails/**` y `src/lib/email/**` (render server-side en Vercel y en `ops-worker`, que despacha la
  projection `insights_delivery_dispatch`)
- Future candidate home: `remain-shared`
  (los módulos sirven a correos de todos los dominios)
- Boundary: los componentes de `src/emails/efeonce-modules/**` y su adapter reciben un intent de
  `efeonce.email-modules` y devuelven React Email; consumidores autorizados: plantillas de `src/emails/**` registradas
  en `src/lib/email/templates.ts`
- Server/browser split: sólo servidor; la vista previa del admin recibe HTML ya renderizado
- Build impact: dependencias de AXIS ya presentes (sólo cambia la versión); los PNG no entran al bundle, se sirven del
  bucket
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente de Efeonce que recibe su informe de Insights; en adelante, cualquier destinatario de un correo
  Efeonce que adopte los módulos.
- Momento del flujo: cuando se emite una edición de Insights y se envía por enlace, portal o adjunto.
- Resultado perceptible esperado: el correo se reconoce como Efeonce y «La órbita», lleva al informe con un solo botón
  y cierra con la agenda y los datos de la empresa.
- Fricción que debe reducir: un correo genérico que no dice quién lo manda ni qué hacer después.
- No-goals UX: cambiar el despacho, los destinatarios, la recurrencia o el visor compartido.

### Surface & system decision

- Surface: correo HTML (React Email + Resend) y su vista previa del admin.
- Nav placement: `none` — no agrega destino.
- Composition Shell: `no aplica` — no es una vista del portal.
- Primitive decision: `new` para los cuatro módulos de correo; `extend` para `InsightsEditionDeliveryEmail`.
- Adaptive density / The Seam: `no aplica`; el ancho es 600 px en escritorio y 390 px en celular.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `src/lib/copy/insights.ts` y `src/lib/copy/dictionaries/es-CL/emails.ts`; lo canónico sale de AXIS.
- Access impact: `none`.

### State inventory

- Default: correo completo por modalidad con el pie canónico.
- Loading: no aplica (render en servidor antes del envío).
- Empty: nota, «Lo esencial» y tarjeta de decisión son opcionales y no se pintan sin dato.
- Error: intent inválido o render fallido → el correo no sale y el despacho registra el fallo.
- Degraded / partial: imágenes bloqueadas o fuente de reserva; todo se lee por `alt` y texto vivo.
- Permission denied: no aplica en el correo (destinatarios validados antes).
- Long content: ajuste de línea, nunca «…».
- Mobile / compact: 390 px a sangre, agenda y redes apiladas sin depender de media queries.
- Keyboard / focus: enlaces reales con nombre accesible; el botón es texto.
- Reduced motion: no aplica (correo estático).

### Interaction contract

- Primary interaction: abrir el informe desde `cta-primary`.
- Secondary: agendar desde `cta-agenda`; visitar el sitio o una red; preferencias o baja.
- Hover / focus / active: los que dé cada cliente de correo; no se dependen de ellos.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no aplica.
- Layout morph: no aplica.
- Stagger: no aplica.
- Timing / easing token: no aplica.
- Reduced-motion fallback: no aplica.
- Non-goal motion: la órbita de «Lo esencial» es una imagen fija.

### Implementation mapping

- Route / surface: HTML de `InsightsEditionDeliveryEmail` y `/admin/emails/preview`.
- Primitive / variant / kind: `EfeonceEmailFooter`, `EmailCtaPrimary`, `EmailCtaAgenda`, `EfeonceEmailBrandBlock`
  [nombres propuestos]; variante por `channel` (`desktop` / `mobile`) y por `line`.
- Component candidates: ver `## Implementation Mapping` del wireframe.
- Copy source: `src/lib/copy/insights.ts` y `src/lib/copy/dictionaries/es-CL/emails.ts`.
- Data reader / command: ninguno nuevo; el contexto del correo ya trae organización, período, modalidad, URL y
  vencimiento.
- API parity: sin acción de negocio nueva; el envío sigue por `insights.delivery.send` y su despacho.
- Access / capability: sin cambios.
- States to implement: los de `## State Copy` del wireframe.

### GVC scenario plan

- Scenario file: vista previa `/admin/emails/preview` por tipo y modalidad (scenario nuevo en
  `scripts/frontend/scenarios/` o `pnpm fe:capture --route=/admin/emails/preview`).
- Route: `/admin/emails/preview`.
- Viewports: 680 (marco de bandeja con tarjeta de 600) y 390.
- Quality profile: `premium`.
- Required steps: elegir el tipo, cada modalidad y cada locale; capturar.
- Required captures: tres modalidades × escritorio y celular, lado a lado con los tableros aprobados.
- Required `data-capture` markers: no aplica dentro del HTML del correo; el marco del preview se captura entero.
- Assertions: seis checks del adapter de AXIS; snapshot del HTML; prueba de deriva institucional.
- Scroll-width checks: 390 px sin scroll horizontal.
- Reduced-motion / focus evidence: no aplica.
- Review dossier: `docs/ui/reviews/TASK-1944-efeonce-email-modules-adoption/`.
- Baseline decision / surface ID: `email.insights-edition-delivery`, baseline nuevo tras la aprobación.

### Design decision log

- Decision: construir los cuatro módulos como piezas componibles desde el manifiesto de AXIS y aplicarlas primero a
  Insights.
- Alternatives considered: cambiar el default de `EmailLayout` (descartado: big bang sobre 30 tipos, prohibido por
  TASK-1764); copiar el HTML del canvas (descartado: valores fuera de AXIS); pie claro de TASK-1764 para Insights
  (descartado: no es lo aprobado para esta superficie).
- Why this pattern: un canon y muchos correos; cada tipo adopta cuando su perfil lo permite.
- Reuse / extend / new primitive: `new` (módulos) y `extend` (correo de Insights).
- Propósito (operador, 2026-09-29): Insights es `relationship_transactional` con la excepción
  `efeonce-insights-delivery`, que conserva agenda, redes y baja; los demás correos siguen la política sin excepción.
- Open risks: baja rota (TASK-1774); registro de política aún inexistente; Outlook para Windows y la píldora; imagen de
  la órbita por edición.

### Visual verification

- GVC scenario: vista previa del admin, más envío real a buzones de prueba.
- Viewports: 680 y 390.
- Required captures: tres modalidades en escritorio y celular; clientes de correo en claro y oscuro; imágenes
  bloqueadas.
- Required `data-capture` markers: no aplica.
- Scroll-width check: 390 px.
- Accessibility/focus checks: contraste del pie ≥ 4,5:1, `alt` en toda imagen, enlaces subrayados en el pie.
- Before/after evidence: correo actual contra correo nuevo con el mismo contexto de vista previa.
- Known visual debt: la píldora queda cuadrada en Outlook para Windows sin VML.
- Visual scorecard: `docs/ui/reviews/TASK-1944-efeonce-email-modules-adoption.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Fijar AXIS `v0.3.39` y el adapter de la órbita en el mismo commit

- Fijar `@efeoncepro/axis-tokens` y `@efeoncepro/axis-ui-contracts` `0.3.39` (contrato `efeonce.email-modules`
  `0.2.0`) y `@efeoncepro/axis-ui-registry` `0.3.4`, con `@efeoncepro/axis-graphic-line` `0.13.0` y
  `@efeoncepro/axis-brand-assets` `0.4.6` salvo que `v0.3.39` publique otras [verificar al publicar]. `v0.3.39` está en
  publicación: el slice se toma cuando esté en el registro. Instalar con una credencial efímera autorizada por el
  operador (userconfig temporal fuera del repo, borrado al terminar), según
  `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`.
- En el mismo commit, llevar `scripts/creative/layout-compiler/graphic-line.mjs` al contrato
  `efeonce.graphic-line-orbit` `0.5.0`: `SUPPORTED_CONTRACT_VERSION` y lo que el contrato `0.4.0` (medida con
  `severity`, `severityLabel`, `scaleVisible` y `glow`) y el `0.5.0` (recorrido de la medida, parte `travelled` del
  manifiesto) agregan. El pintor del adapter dibuja el recorrido bajo la estela con los valores de
  `efeonceGraphicLine.trajectory.measure.travelledPath`.
- Correr `pnpm brand:tokens`, `pnpm glitch:tokens` y `pnpm manzanitas:tokens`, con sus `--check` (regla de todo bump de
  `axis-tokens`), y `pnpm creative:layout:test`.

### Slice 2 — Los cuatro módulos desde el manifiesto

- Adapter que arma el intent y llama a `resolveEmailModulesIntent`; un `status: 'invalid'` no renderiza nada y se
  registra con `captureWithDomain`.
- El adapter pasa `purpose` en todo intent y `application` sólo cuando el tipo tiene una excepción declarada. El
  propósito y la excepción salen del registro de política de Greenhouse, nunca de una constante en la plantilla.
- Pruebas del contrato `0.2.0`: `relationship_transactional` sin `application` con agenda, redes o baja da
  `cta-agenda-not-allowed`, `footer-socials-not-allowed` o `footer-unsubscribe-not-allowed`; con
  `application: 'efeonce-insights-delivery'` resuelve el pie completo; una `application` desconocida o de otro
  propósito da `application-unknown` o `application-purpose-mismatch`.
- Componentes `EfeonceEmailFooter`, `EmailCtaPrimary`, `EmailCtaAgenda` y `EfeonceEmailBrandBlock` con tablas, estilos
  en línea, botones a prueba de clientes (VML en Outlook) y colores translúcidos precompuestos.
- Tamaño de cada imagen desde `EMAIL_ASSET_SEALS`; el eslogan según la línea (`email-slogan-{line}-negative`).
- Prueba de deriva: `efeonceEmail.institutional` de AXIS contra `src/config/efeonce-brand.ts` (razón social, RUT,
  dirección legal y de presentación, teléfonos, correo, URL, redes y mercados).
- Pruebas de los seis checks del adapter sobre el HTML y de la ausencia de «Suscribirme».

### Slice 3 — PNG en el bucket público

- Subir los doce PNG de `axis-brand-assets` `0.4.6` (`EMAIL_ASSET_SEALS`) al bucket de `GREENHOUSE_PUBLIC_MEDIA_BUCKET`,
  en una ruta versionada, con autorización del operador.
- URLs en `src/emails/constants.ts` junto a `EFEONCE_LOGO_URL`, derivadas del id y la versión.
- Verificar que el SHA-256 de cada archivo publicado coincide con su sello.

### Slice 4 — El correo de Insights con los módulos

- Reescribir `InsightsEditionDeliveryEmail` según los tres tableros: cabecera Insights, saludo, nota opcional,
  «Lo esencial» opcional con la órbita de medida (recorrido incluido), tarjeta de decisión opcional, `cta-primary`,
  avisos, grilla de adjuntos y el pie canónico con la línea Growth.
- Las tres modalidades y los dos locales; copy nuevo en `src/lib/copy/insights.ts`.
- La modalidad `portal_link` se diseña pero no se habilita (`INSIGHT_PORTAL_EDITION_ROUTE_AVAILABLE` sigue en `false`).
- Los bloques opcionales reciben sus datos por props; el cableado desde la edición es de TASK-1849.
- Intent con `purpose: 'relationship_transactional'` y `application: 'efeonce-insights-delivery'`: pie completo con
  agenda, redes, preferencias y baja, con `unsubscribeLabel` «Dejar de recibir estos informes».
- Declarar en el registro de política de presentación de Greenhouse (foundation de TASK-1764) el propósito de
  `insights_edition_delivery` e `insights_edition_delivery_attachment` y la excepción `efeonce-insights-delivery`, con
  aprobador (operador), fecha (2026-09-29) y motivo. Si el registro no existe al tomar el slice, el plan acuerda con
  TASK-1764 dónde nace la declaración; nunca una excepción implícita en la plantilla.
- Como Insights lleva baja, va además la cabecera `List-Unsubscribe` una vez que TASK-1774 la deje funcionando.
- Snapshot del correo en `EmailTemplateBaseline.test.tsx` y vista previa al día en `templates.ts`.
- El envío requiere la baja funcionando (TASK-1774). La decisión de propósito ya está tomada.

### Slice 5 — Evidencia en clientes de correo y adopción por tipo

- Envío real a buzones de prueba: Gmail web y app, Outlook para Windows, Outlook web y Apple Mail, en claro y oscuro,
  con imágenes bloqueadas; dossier y scorecard.
- Confirmar en TASK-1764 que la clasificación del correo de Insights y su excepción quedaron declaradas en el registro,
  y dejar escrita la regla de adopción de los demás tipos: cada uno entra por una cohorte de TASK-1764, con su perfil y
  su `purpose`, sin agenda, redes ni baja donde la política no los admite, y sin excepción que el operador no haya
  aprobado.
- Actualizar la documentación funcional y el manual de correo de Insights.

## Out of Scope

- Cambiar el default de `EmailLayout` o migrar los otros 28 tipos en esta task.
- Migrar `EMAIL_COLORS` a AXIS (TASK-1057) o el adapter tipográfico de correo (TASK-1043).
- Cablear los hallazgos, cifras y la tarjeta de decisión desde la edición (TASK-1849).
- Reparar el mecanismo de baja (TASK-1774).
- Crear la página de preferencias de correo si no existe [verificar]; si falta, es una task aparte.
- Cambiar el despacho, los destinatarios, la recurrencia o el visor compartido de Insights.
- Publicar el contrato en AXIS: `efeonce.email-modules` `0.2.0` lo publica AXIS en paralelo (`v0.3.39`); cualquier
  cambio posterior se pide a AXIS.
- Construir el registro de política de presentación completo (es de TASK-1764); aquí sólo se declara Insights.
- El formulario de captura de Growth que dice «Suscribirme» (`src/growth-forms-renderer/copy.ts`): es otra superficie.

## Detailed Spec

El detalle región por región, los estados, el copy y las reglas de cliente de correo viven en el wireframe
`docs/ui/wireframes/TASK-1944-efeonce-email-modules-adoption.md`.

Intent de ejemplo para el correo de Insights (forma del contrato `efeonce.email-modules` `0.2.0`; los nombres exactos
se confirman contra el paquete publicado):

```ts
resolveEmailModulesIntent({
  purpose: 'relationship_transactional',
  application: 'efeonce-insights-delivery', // excepción: permite cta-agenda, socials y unsubscribe
  line: 'growth',
  channel: 'desktop', // y un segundo render 'mobile' si el plan elige dos pasadas; ver Open Questions
  product: 'efeonce-insights',
  campaign: 'insights-report',
  modules: [
    { kind: 'cta-primary', label: 'Ver el informe completo  →', url: shareUrl, note: '3 capítulos · …' },
    { kind: 'cta-agenda', title: '¿Lo revisamos juntos?', body: 'Elige un horario y te mostramos…', url: 'https://efeoncepro.com/contacto/' }
  ],
  footer: {
    preferencesUrl,
    unsubscribeUrl,
    unsubscribeLabel: 'Dejar de recibir estos informes',
    reason: 'Recibes este correo porque tu organización trabaja con Efeonce.'
  }
})
```

Sin `application`, el mismo intent con `purpose: 'relationship_transactional'` es inválido
(`cta-agenda-not-allowed`, `footer-socials-not-allowed`, `footer-unsubscribe-not-allowed`): así queda el pie de
cualquier otro correo de servicio.

El resolver agrega `utm_medium=email`, `utm_source=efeonce-insights`, `utm_content=pie` y `utm_campaign` a la agenda
sin pisar los que ya traiga la URL. En la modalidad `attachment` no hay `cta-primary`: el intent lleva sólo la agenda.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- El bump de AXIS y el adapter de la órbita van en **un solo commit**: separados, el adapter queda rojo o el bump no
  compila la suite creativa.
- Slice 1 espera `v0.3.39` en el registro de paquetes.
- Slice 4 no se envía a clientes antes de dos condiciones: la excepción de Insights declarada en el registro de
  política y TASK-1774 con la baja funcionando. La decisión de propósito ya está tomada (2026-09-29).
- Si TASK-1938 hace el bump antes, el Slice 1 se reduce a verificarlo (y a subirlo a `v0.3.39` si fijó `v0.3.38`).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un correo de servicio sale con agenda y redes contra la política | email / compliance | low | el contrato `0.2.0` rechaza agenda, redes y baja fuera de su propósito salvo una excepción registrada; el adapter pasa `purpose` y `application` desde el registro; tipos nuevos sólo por cohorte de TASK-1764 | intent `invalid` registrado con `captureWithDomain`; prueba del contrato |
| El enlace de baja del pie no funciona | email | high hoy | bloqueo del Slice 4 por TASK-1774 | reclamos o rebotes en `email_deliveries` |
| El bump rompe la suite creativa o los tokens compilados | tooling / Composer | medium | adapter en el mismo commit; `brand:tokens`, `glitch:tokens` y `manzanitas:tokens` con `--check`; `creative:layout:test` | CI de `develop` |
| Outlook para Windows pinta mal la píldora o los filetes | email | medium | VML, colores precompuestos, filetes como celdas | revisión en buzón de prueba |
| Los PNG no cargan (bucket, ruta o caché) | email | low | ruta versionada, SHA-256 verificado, `alt` útil | imágenes rotas en el buzón de prueba |
| Los datos legales de AXIS y de Greenhouse se separan | brand / legal | low | prueba de deriva en CI | la prueba falla |
| El HTML crece y Gmail lo recorta (sobre 102 KB) | email | low | medir el tamaño en la prueba | tamaño del HTML en el test |

### Feature flags / cutover

- Sin flag nuevo. Los dos `EmailType` de Insights siguen con `enabled=false` en `email_type_config` y la entrega de
  Insights tiene sus propios interruptores; el correo nuevo sale sólo cuando se enciendan, igual que el actual.
- Si el operador quiere comparar, se puede sumar un flag temporal de presentación y registrarlo en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el runtime donde se lee (el render corre en el `ops-worker`).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit del bump y del adapter + `pnpm install` | < 15 min | sí |
| Slice 2 | revert del PR (componentes sin consumidor) | < 15 min | sí |
| Slice 3 | los PNG quedan en el bucket sin uso; borrarlos sólo con autorización | minutos | sí |
| Slice 4 | revert del correo de Insights + deploy de Vercel y del `ops-worker` | < 30 min | sí (los correos ya enviados no vuelven) |
| Slice 5 | revertir el commit de documentación | minutos | sí |

### Production verification sequence

1. Local: `pnpm creative:layout:test`, tests de los módulos, snapshot y prueba de deriva; vista previa en `localhost`.
2. Staging: vista previa del admin y envío a buzones de prueba en los cinco clientes, claro y oscuro.
3. Aprobación del operador del correo real contra los tableros.
4. Release normal; el `ops-worker` toma el render nuevo con su deploy.
5. Producción: abrir el primer correo real de Insights enviado con el diseño nuevo y verificar agenda, baja y enlaces.

### Out-of-band coordination required

- Decisión del operador sobre el propósito del correo de Insights: tomada el 2026-09-29. Quedan las Open Questions
  abiertas.
- Credencial efímera de paquetes y escritura en el bucket público, ambas autorizadas por el operador.
- Publicación de AXIS `v0.3.39` (contrato `0.2.0` con la excepción `efeonce-insights-delivery`) antes del Slice 1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El operador aprobó el correo y sus tableros quedaron en `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1/` (2026-09-29).
- [ ] `UI ready` permanece `no` hasta que el wireframe y el `## UI/UX Contract` tengan implementation mapping, GVC
  scenario plan y design decision log cerrados; si pasa a `yes`, `pnpm task:lint --task TASK-1944` queda sin hallazgos.
- [ ] Greenhouse fija `axis-tokens` y `axis-ui-contracts` `0.3.39` (contrato `efeonce.email-modules` `0.2.0`) y
  `axis-ui-registry` `0.3.4`, con `axis-graphic-line` y `axis-brand-assets` en las versiones que publique `v0.3.39`,
  instalados con credencial efímera autorizada.
- [ ] En el mismo commit, `graphic-line.mjs` acepta el contrato `efeonce.graphic-line-orbit` `0.5.0` y dibuja el
  recorrido; `pnpm creative:layout:test` queda verde.
- [ ] `pnpm brand:tokens --check`, `pnpm glitch:tokens --check` y `pnpm manzanitas:tokens --check` quedan verdes tras el
  bump.
- [ ] Los cuatro módulos existen como piezas componibles y leen todo valor del manifiesto de `resolveEmailModulesIntent`,
  de `efeonceEmail` y de `EMAIL_ASSET_SEALS`; ningún HEX, medida ni nombre de asset escrito a mano.
- [ ] `EmailLayout` conserva su default y `EmailButton` sigue sirviendo a los demás correos; el snapshot de los otros
  tipos no cambia.
- [ ] Un intent con `status: 'invalid'` no produce correo y queda registrado con `captureWithDomain`.
- [ ] El adapter pasa `purpose` en todo intent y `application` sólo para un tipo con excepción declarada, ambos leídos
  del registro de política; ninguna plantilla los fija a mano.
- [ ] Sólo el correo de Insights (`application: 'efeonce-insights-delivery'`) lleva agenda, redes y baja; un test
  prueba que el mismo intent sin `application` da `cta-agenda-not-allowed`, `footer-socials-not-allowed` y
  `footer-unsubscribe-not-allowed`, y que una `application` desconocida o de otro propósito es inválida.
- [ ] El registro de política de presentación de Greenhouse declara los dos `EmailType` de Insights como
  `relationship_transactional` con la excepción `efeonce-insights-delivery` (aprobador, fecha 2026-09-29 y motivo).
- [ ] La baja del pie de Insights dice «Dejar de recibir estos informes» (`unsubscribeLabel`) y el correo lleva la
  cabecera `List-Unsubscribe`.
- [ ] Una prueba compara `efeonceEmail.institutional` con `src/config/efeonce-brand.ts` y falla ante cualquier diferencia.
- [ ] Ningún correo de `src/emails/**` pinta «Suscribirme»; la agenda enlaza a `https://efeoncepro.com/contacto/` con
  `utm_medium=email`, `utm_source=efeonce-insights`, `utm_content=pie` y `utm_campaign=insights-report`, nunca a un
  `mailto:`.
- [ ] Los doce PNG de correo están en el bucket público, con SHA-256 igual a su sello, y cada `<img>` lleva `alt`,
  `width` y `height`.
- [ ] El correo de Insights coincide con los tres tableros aprobados en sus tres modalidades, en escritorio (tarjeta de
  600 px) y en celular (390 px, agenda y redes apiladas).
- [ ] La órbita de «Lo esencial» dibuja el recorrido desde las 12 al 60 % de opacidad y 0,75 × el trazo de la estela, va
  como PNG @2x y su `alt` lleva la cifra y la leyenda.
- [ ] Los bloques opcionales (nota, «Lo esencial», decisión) no se pintan sin dato y ninguna cifra ausente se muestra
  como 0.
- [ ] El correo de Insights está en `EmailTemplateBaseline.test.tsx` con al menos una modalidad de enlace y la de
  adjunto.
- [ ] El HTML pasa los seis checks del adapter de AXIS, verificado por test.
- [ ] Evidencia en Gmail web y app, Outlook para Windows, Outlook web y Apple Mail, en claro y oscuro, y con imágenes
  bloqueadas, en el dossier.
- [x] El operador decidió el propósito del correo de Insights (2026-09-29: `relationship_transactional` con la excepción
  `efeonce-insights-delivery`) y la decisión quedó registrada en TASK-1764 y en la ADR de presentación (Delta
  2026-09-29) antes del primer envío con el pie nuevo.
- [ ] El enlace de baja del pie funciona de punta a punta (TASK-1774 cerrada) antes del primer envío.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/emails src/lib/email`
- `pnpm creative:layout:test`
- `pnpm brand:tokens --check`, `pnpm glitch:tokens --check`, `pnpm manzanitas:tokens --check`
- `pnpm test` completo y `pnpm build` antes de cerrar
- Vista previa en `localhost` y envío real a buzones de prueba

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] La dirección `EFEONCE_EMAIL_MODULES_V1-direction.md` y el runbook de AXIS registran que Greenhouse fija `v0.3.39`.
- [ ] `efeonceEmail.applications` de AXIS y el ADR de AXIS reciben la aplicación implementada, para promover el
  contrato a `trial`.

## Follow-ups

- Adopción por cohorte de los demás tipos, dentro de TASK-1764, cuando su perfil lo permita.
- Otra excepción por tipo sólo con decisión del operador (aprobador, fecha y motivo), declarada en el registro de
  Greenhouse y en el de excepciones de AXIS.
- Página de preferencias de correo, si no existe.
- Promoción del contrato de `candidate` a `trial` en AXIS con la evidencia de esta task.

## Open Questions

- ~~**Propósito del correo de Insights.**~~ **Resuelta el 2026-09-29 por el operador:** `relationship_transactional`
  (va a clientes) con la excepción explícita `efeonce-insights-delivery`, que conserva el pie aprobado completo (agenda,
  redes, preferencias y baja). Elegida frente a «sólo el botón». Ver Delta 2026-09-29.
- ~~**Qué pie llevan los demás correos.**~~ **Resuelta el 2026-09-29:** siguen la política. Sin agenda, redes ni baja en
  transaccionales y de servicio; baja obligatoria en suscripción y marketing; redes opcionales en suscripción y
  obligatorias en marketing. El contrato `0.2.0` retira `cta-agenda-required` y valida por `purpose`.
- ~~**Texto de la baja.**~~ **Resuelta el 2026-09-29:** Insights usa «Dejar de recibir estos informes»
  (`unsubscribeLabel`).
- **Imagen de la órbita por edición.** Hornear un PNG por edición exige generarlo y servirlo: adjunto en línea (CID) en
  el envío o archivo público por edición. Si pide almacenamiento o un endpoint nuevo, es una task `backend-data` aparte.
- **Dos anchos en un HTML.** El resolver entrega valores por `channel`; el correo es uno solo. El plan decide si se
  resuelven los dos canales y se combinan con columnas híbridas o si el celular se deriva del escritorio.
- **Preferencias de correo.** No se verificó que exista una página de preferencias a la que enlazar [verificar].
