# Growth Public Forms Runtime Contract

> **Tipo:** arquitectura vigente
> **Creado:** 2026-06-30
> **Dominio:** Growth / Public Forms / Public Site
> **Doc base:** [GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md](./GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md)

Este documento captura contratos runtime vigentes que no deben crecer como deltas dentro del monolito de arquitectura base.

## Diagnóstico de medios (Agencia de Medios)

Alta del 2026-10-16, autorizada por el operador («crear uno dedicado» con su propio formulario HubSpot).
Registro de identidad; antes de operar, relee el contrato público.

| Identidad | Valor |
|---|---|
| Landing | `https://efeoncepro.com/servicios/agencia-de-medios/` (embed a cargo del operador) |
| Slug / form key | `efeonce-media-diagnostic` / `d784b9e2-f6e4-4e24-b059-f164fc82f734` |
| Surface | `fhsf-efeonce-media-diagnostic` (`https://efeoncepro.com`, `https://www.efeoncepro.com`) |
| Versión publicada | `fver-d448c02d-9fda-4612-9ba8-5bebd4a5139f` (v2 con destino `direct`; v1 `fver-fc49b604-243f-45b6-9489-d879123394d3` deprecada) |
| Presentación | `styleVariant=hubspot_pillar`, `static`, success card con acción a `/agenda/` |
| Destino | HubSpot «Lead Gen - Agencia de Medios» por `hubspot-destinations.registry.ts`; properties `gh_form_medios_{modelo_venta,canales,inversion_mensual}` + estándar (`jobtitle`, `country`, `message`) |
| Medición | Sin política publicitaria publicada |

Authoring: `scripts/growth/publish-media-diagnostic-form.ts` (dry-run por defecto, `--apply`); Turnstile
se copia de la versión publicada de `efeonce-creative-diagnostic`. Smoke secure-submit del 2026-10-16:
completo 200 y mínimo 200 con el contacto marcado `greenhouse-smoke+forms-20261016@efeonce.org`.

**Por qué `hubspot_pillar` y no `diagnostic_premium`.** El diseño pide «Dónde pautas hoy» como chips de
selección múltiple. El renderer sólo dibuja `multiselect` como chips bajo `hubspot_pillar`; en
`diagnostic_premium` cae a un `<select multiple>` nativo (verificado contra el bundle de producción). En
pillar, «¿Cómo vendes?» e «Inversión mensual» (diseño: listas desplegables) se ven como chips de
selección única; «País» usa `country_select`. Los `value` son estables, así que cambiar variante o control
más adelante no toca HubSpot ni la medición.

**Control `premium_select` (2026-10-18, code complete, pendiente de release).** `presentation.control: 'premium_select'` pide el listbox premium (sin banderas) para un `type: 'select'` en cualquier variante —en pillar, sin control, un `select` sale como chips—; en otro tipo el compiler bloquea (`presentation_control_type_mismatch`) y un renderer viejo o un valor desconocido caen al control por defecto. Su uso en medios (`salesModel`, `monthlyMediaBudget`) espera el release: `scripts/growth/activate-media-diagnostic-premium-select.ts --apply`, que se niega mientras `renderer-latest.js` de producción no contenga `"premium_select"`.

**Consentimiento.** El motor exige un consentimiento de procesamiento obligatorio para aceptar el envío
(`contact_permission`). La casilla opcional `marketing_updates` (novedades) queda en el snapshot de
consentimiento de Greenhouse, pero el adapter HubSpot envía `communications: []`: **no crea suscripción en
HubSpot**. Para que el opt-in llegue a HubSpot hace falta mapearlo a un `subscriptionTypeId` en el adapter.

**Pendientes.** Embed en la landing (el host dibuja el título «Agenda tu diagnóstico», la tarjeta oscura y el
fallback sin JS; con variante de estilo, el override de tokens apunta a
`greenhouse-form :is(.ghf-scope,.ghf-root[data-ghf-style-variant])`), primer envío humano real y política
de medición si el operador la quiere.

## Diagnóstico de pauta (Performance Marketing)

Alta del 2026-10-17 (TASK-1865), con formulario propio por decisión del operador («Uno propio»). Reemplaza al
`efeonce-performance-brief` del contrato original de la task, que nunca se publicó. Registro de identidad; antes de
operar, relee el contrato público.

| Identidad | Valor |
|---|---|
| Landing | `https://efeoncepro.com/servicios/performance-marketing/` (página `251997`; host card en el widget `greenhouse_performance_diagnostico`) |
| Slug / form key | `efeonce-performance-diagnostic` / `71ea684f-1ad9-4656-982b-159e4de46dd8` |
| Surface | `fhsf-efeonce-performance-diagnostic` (`https://efeoncepro.com`, `https://www.efeoncepro.com`) |
| Nombre / kind | «Diagnóstico de pauta · Performance Marketing» / `diagnostic_intake` |
| Versión publicada | No registrada en este documento; leerla del store (`getPublishedVersionBySlug`) antes de operar |
| Presentación | `styleVariant=hubspot_pillar`, `composition=multi_step_light` (dos pasos), CTA «Pide tu diagnóstico», success card con acción «Elegir un horario» a `/agenda/` |
| Destino | HubSpot `direct` a «Lead Gen - Performance Marketing» por `hubspot-destinations.registry.ts`; campos estándar del registro (`FIRST_NAME`, `LAST_NAME`, `EMAIL`, `COMPANY`, `WEBSITE`, `country`) + `gh_form_performance_{audiencia,canales,inversion_mensual,objetivo,prioridad,crm,rol}` |
| Medición | Pipeline GTM genérico; `generate_lead` sin verificar para este form ([Tracking Plan](../reference/measurement-gtm-ga4/TRACKING-PLAN.md#forms)) |

Authoring: `scripts/growth/publish-performance-diagnostic-form.ts` (dry-run por defecto, `--apply`). La v1 nace
`greenhouse_only`; el destino `direct` se adjunta después con
`pnpm growth:forms:activate-hubspot-destinations -- --only=efeonce-performance-diagnostic`, una vez sumada la fila al
registro. La política Turnstile se copia de la versión publicada de `efeonce-media-diagnostic`. En vivo el renderer
dibuja 26 inputs.

**Decisiones de mapeo (según el encabezado del publicador).** `hubspot_pillar` + `multi_step_light` es la combinación que el
renderer de producción ya dibuja (encabezado de paso con progreso, `select` como chips de selección única,
`multiselect` como chips con casilla); mismo patrón que `efeonce-hubspot-scope` y `efeonce-media-diagnostic`. El CRM es
condicional: «A empresas» y «A ambos» comparten el prefijo `b2b` (`b2b`, `b2b-b2c`) y la condición es
`includes: 'b2b'`. Sin íconos por opción. Nombre y apellido en un solo campo, partido en servidor. Los `value` de las
opciones son estables.

**Consentimiento.** Sólo la autorización obligatoria `contact_permission`. No hay casilla de novedades porque el
adapter HubSpot envía `communications: []` y quedaría guardada sin efecto.

**Pendientes.** Primer envío humano real desde navegador (Turnstile impide automatizarlo) para confirmar la entrega
en HubSpot y `form_destination_attempt`, verificación de `generate_lead` en GA4 y política de medición publicitaria
si el operador la quiere.

## Diagnóstico creativo (Agencia Creativa)

Alta del 2026-10-15, autorizada por el operador. Registro de identidad; antes de operar, relee el
contrato público y el ledger.

| Identidad | Valor |
|---|---|
| Landing WordPress | `/agencia-creativa/`, página `249582` |
| Slug / form key | `efeonce-creative-diagnostic` / `e913d958-2ad7-48a5-8015-dbff53eca4a3` |
| Surface | `fhsf-efeonce-creative-diagnostic` (`https://efeoncepro.com`, `https://www.efeoncepro.com`) |
| Versión publicada | `fver-79bbb3b4-a66e-4e23-9465-5344e6454b6d` (v2 con destino `direct`; v1 `fver-8f5ef209-c663-4345-ae24-6f7dd7285ebf` deprecada) |
| Presentación | `styleVariant=diagnostic_premium`, `static`, success card con acción a `/agenda/` |
| Destino | HubSpot «Lead Gen - Agencia Creativa» por `hubspot-destinations.registry.ts`; properties `gh_form_creative_{rol,freno,tamano_equipo,plazo}` |
| Medición | Política `485f38e5-76b2-4f9d-b922-44324faaa931` publicada (rev. `cf4ae435-…`), sólo `meta`, mapping email/phone/firstName/lastName |

Authoring: `scripts/growth/publish-creative-diagnostic-form.ts` (dry-run por defecto, `--apply`);
Turnstile se copia de la versión publicada de `efeonce-seo-diagnostic`. No hay casilla de
comunicaciones comerciales: el adapter HubSpot envía `communications: []`, así que una casilla
opcional quedaría guardada sin efecto. Un cambio de campos exige revisar también la política de
medición, porque cada versión nueva se revalida.

**Embed vivo (2026-10-15).** El módulo `greenhouse_creativa_diagnostico` de `/agencia-creativa/` incrusta
`<greenhouse-form form-key="e913d958-…" surface="fhsf-efeonce-creative-diagnostic" locale="es-CL"
color-scheme="light" appearance="bare">`. El renderer es dueño de campos, consentimiento y envío; el host,
del chrome de la tarjeta y del fallback sin JS. Contrato de la landing:
[AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md](public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md).
Falta el primer envío humano real (Turnstile bloquea automatización) para confirmar
`form_destination_attempt=succeeded`.

**Override de tokens con variante de estilo.** `diagnostic_premium` re-declara `--ghf-*` en
`.ghf-root[data-ghf-style-variant]`; un override sólo en `greenhouse-form` no gana (el CTA salió teal
`#36c8bf`). El host debe apuntar a `greenhouse-form :is(.ghf-scope,.ghf-root[data-ghf-style-variant])`.

**Brecha de fidelidad frente al canvas (mayormente configuración).** La versión publicada usa `select`
para `mainBlocker` y `startTimeline` y no declara iconos, aunque el renderer soporta `type: 'radio'` como
tarjetas (`ghf-choice-group--cards`) y `presentation.icon`. Las dos columnas dependen de
`@container (min-width: 520px)`; en vivo el formulario midió 516 px dentro de la tarjeta host de 588 px
(36 px de padding). La URL de privacidad cruda es copy del formulario. Brechas reales del renderer: look
exacto de chip/pill, checkbox AXIS `axis-choice` y listbox custom más allá de
`presentation.control: 'country_select'`. Remediación pendiente: versión nueva con radio + iconos por
`publish-creative-diagnostic-form.ts`, **conservando los mismos valores de opción** (el mapping HubSpot ya
existe), más ajuste de padding/ancho de la tarjeta host, y re-verificación en vivo.

**Corrección 2026-10-15 al párrafo anterior.** Dos afirmaciones no eran ciertas en el renderer servido:
`radio` sólo salía como tarjetas bajo `hubspot_pillar` (en `diagnostic_premium` caía a un input de texto
vacío), y la URL cruda de privacidad la dibujaba el renderer, no el copy del formulario. Ambas las corrige
el commit `ab622e958` (ver §«Renderer: opciones visibles, enlace de privacidad e íconos de etiqueta»).
La previsualización por intercepción en el host real (manual
[operar-motor-formularios.md](../manual-de-uso/growth/operar-motor-formularios.md)) destapó la primera
antes de publicar una versión.

**Versión en dos pasos: publicada 2026-10-18** (`fver-7178aede-93da-4f95-a00c-5b0225638583`, depreca `fver-79bbb3b4-…`, destino HubSpot copiado; política Meta `485f38e5` revisión 2 `01e72899` publicada y verificada con la CLI, misma configuración y mapping; verificación live en ambas landings a 1440/390 sin envío). Historia de la preparación:
`scripts/growth/activate-creative-diagnostic-two-step.ts` (commit `32395e5fb`; dry-run por defecto,
`--apply` publica) clona la versión publicada esperada `fver-79bbb3b4-…` conservando destinos,
seguridad, políticas y copy, y cambia a `composition: multi_step_light` con los pasos `operacion`
(`mainBlocker`, `marketingTeamSize`, `startTimeline` como `radio`, **mismos valores de opción**) y
`datos` (`firstName`, `lastName`, `email`, `phone`, `companyName`, `role`, `context`), más íconos de
etiqueta y placeholders. Rechaza `--apply` si el bundle de producción no trae el marcador CSS
`.ghf-root:not([data-ghf-style-variant="hubspot_pillar"]) label.ghf-choice` o si la versión publicada o
sus campos se movieron. Dry-run del 2026-10-15: `fieldsMatch=true`, `productionRendererReady=false`
(espera el release de Greenhouse que lleve `ab622e958`). Después de publicar: revincular la política de
medición (atada al `form_version_id` exacto) con `pnpm --silent growth:measurement` y verificar en vivo
las dos landings.

## Renderer: opciones visibles, enlace de privacidad e íconos de etiqueta

Contrato del renderer desde el commit `ab622e958` (code complete; llega a los hosts con el próximo
release de producción de Greenhouse, porque `renderer-latest.js` se construye en su `prebuild`).

- **`type: 'radio'`** = radiogroup nativo de tarjetas (`ghf-choice-group ghf-choice-group--cards`,
  `label.ghf-choice` con su `input type=radio`) en **cualquier** `styleVariant`. Ocupa la fila completa y
  pasa a dos columnas con `@container (min-width: 520px)`. Estilos tokenizados `--ghf-*` bajo
  `.ghf-root:not([data-ghf-style-variant="hubspot_pillar"])`; pillar mantiene sus chips/tarjetas para
  `select`/`multiselect`. Cambiar `select` → `radio` no cambia los `value`, así que destinos y medición
  reciben lo mismo; sí exige versión nueva del formulario.
- **Enlace de privacidad del consentimiento:** el texto visible es copy de sistema `privacyLinkLabel`
  según locale («Política de privacidad» / «Privacy policy»); `consent.privacyUrl` va sólo en `href`.
- **Íconos de etiqueta (`presentation.icon`):** SVG inline (`renderIcon`) **sin** atributo `data-icon`,
  para todos los íconos salvo `linkedin`, que conserva su glifo `in`. El CSS global de Ohio apunta a
  `[data-icon]` e inyecta texto heredado; con glifos de texto salían palabras como «user ID». Los íconos
  de control conservan `data-icon`. El host no debe reintroducir íconos por CSS sobre la etiqueta.

## Formularios diseñados en canvas: lo que el contrato admite (TASK-2044)

Un diseño de canvas se declara en el contrato; nunca se reproduce con CSS de la landing. Todos los campos son
opcionales y su ausencia deja el contrato público exactamente como antes (los formularios vivos no cambian de
veredicto ni de render). Contrato en `src/lib/growth/forms/contracts.ts` y `src/lib/growth/ctas/contracts.ts`;
validación en `policy-compiler.ts` y en el Action Registry del CTA.

| Lo que pide el diseño | Campo de contrato | Validación |
|---|---|---|
| Campo en media columna o fila completa | `fields[].presentation.width`: `auto` (default) · `half` · `full` | enum estricto; un valor desconocido invalida el campo (`fields_invalid`) |
| Casilla de consentimiento compacta | `consent.presentation`: `tile` (default) · `compact` (en `copy_refs_json`) | si no valida y la versión declara `presentation`/`privacyLinkLabel` → `consent_display_invalid` (bloquea) |
| Enlace a la política dentro de la frase | `checkboxes[].label` con un único `{privacyLink}` + `consent.privacyLinkLabel` (texto del enlace, máx. 80) | `consent_marker_unknown`, `consent_marker_repeated`, `consent_marker_html`, `consent_marker_without_privacy_url` (todos bloquean); casillas sin llaves no se evalúan |
| «Cerrar» en la tarjeta de éxito | `successBehavior.actions[]` con `kind: 'dismiss'` | sin `href` ni `target`; si los trae, el éxito no valida |
| Ícono del éxito | `successBehavior.icon`: `celebration` (default) · `orbit` (glifo de La órbita) · `none` | enum estricto (`success_behavior_invalid`) |
| Formulario en un popup al pulsar un botón | CTA `open_growth_form` con `presentation: 'dialog'` y `dialog: { eyebrow?, title?, lead? }` | encabezado estricto, texto plano; un encabezado sin `dialog` → `action_policy_invalid` |

Ejemplo de referencia (popup «Quiero ser partner», canvas «Partners — Efeonce» v14): Nombre y apellido, Correo de
trabajo, Empresa o plataforma y Sitio web con `width: 'half'`; «¿Qué ofreces y a quién le sirve?» con `width: 'full'`;
consentimiento `compact` con «Acepto que Efeonce use estos datos para responder mi propuesta, según su {privacyLink}.» y
`privacyLinkLabel: 'política de privacidad'`; éxito `success_card` con `icon: 'orbit'`, título «Recibido.» y acción
`dismiss` «Cerrar»; CTA con `presentation: 'dialog'` y encabezado «¿Eres una plataforma?» · «Sumémonos.» · bajada. El
anillo del eyebrow, el punto del título y la flecha del botón son piel de la landing (tokens y hooks de TASK-2045), no
contrato. No se admite: HTML del autor, otros marcadores, anchos en columnas distintas de dos, ni la colocación
interruptiva `popup_modal` (sigue sin implementar).

**Render (TASK-2045; en producción desde el release del 2026-10-24: formularios `1.2.0`, que incluye lo de `1.1.0`, y
CTA `1.4.0`).** Primer consumidor en vivo: el popup «Quiero ser partner» de `/partnership/` (formulario
`efeonce-partner-application`, CTA `partners-become-partner`). Un host que fije un bundle anterior a `1.1.0` ignora
`width`, `consent.presentation` e `icon`, omite `dismiss`, abre `dialog` inline y muestra `{privacyLink}` literal.
**Defecto conocido:** cerrar el diálogo con el primer campo enfocado dispara `gh_form_field_validation_failed` (la
validación del blur corre sobre el campo vacío); pendiente de corregir en el renderer.

Piel del anfitrión (sólo tokens y hooks; nunca selectores internos):

| Para | Tokens / hooks |
|---|---|
| Esquema | `color-scheme="dark"` (fuerza los tokens oscuros; `light` sigue igual) |
| Campos | `--ghf-field-min-height`, `--ghf-field-padding`, `--ghf-field-radius`, `--ghf-field-font-size`, `--ghf-field-gap`, `--ghf-field-focus-border`, `--ghf-placeholder` |
| Etiquetas | `--ghf-label-size`, `--ghf-label-weight`, `--ghf-label-line-height`, `--ghf-label-color`; hooks `required-mark`, `optional-mark` |
| Grilla | `--ghf-gap` (filas), `--ghf-column-gap` |
| Botón | `--ghf-btn-radius`, `--ghf-btn-min-height`, `--ghf-btn-padding`; ghost: `--ghf-btn-ghost-bg/-fg/-border`; hooks `submit`, `submit-arrow` (un copy terminado en «→» dibuja la flecha) |
| Consentimiento compacto | `--ghf-consent-box`, `--ghf-consent-accent`, `--ghf-consent-size`, `--ghf-consent-color`, `--ghf-consent-link`; hooks `consent`, `consent-link` |
| Éxito | `--ghf-orbit`; hooks `success-card`, `success-mark`, `success-content`, `success-title`, `success-body`, `success-actions`, `success-action`. `steps: []` explícito oculta los pasos por defecto |
| Pie | hooks `actions`, `readiness`, `summary` (los avisos vacíos siguen en el DOM por `aria-live`) |
| Diálogo del CTA | `--ghcta-dialog-surface/-fg/-border/-radius/-radius-sheet/-shadow/-backdrop/-blur/-padding/-padding-sheet/-max-width/-close-border/-close-hover/-focus` y motion `--ghcta-dialog-enter-duration/-exit-duration/-ease-enter/-ease-exit`; hooks `data-ghcta-dialog-eyebrow/-title/-lead/-close`; `data-sheet` bajo 760 px y `data-success` cuando el formulario muestra el éxito |

Hooks de formulario = atributo `data-ghf-part`. Eventos: `ghf:dismiss` (DOM, independiente de la telemetría) y
`data-ghf-busy` en el root mientras envía. Ejemplo completo: `scripts/public-website/partners-source/partner-dialog-skin.css`
(evidencia en `docs/ui/reviews/TASK-2045/`).

## Formulario en línea y reserva por evento (TASK-2053/2054)

En producción desde el release `40b330175855` (2026-10-24, renderer `1.2.0`, más el consentimiento por el acto de
suscribirse). Primer uso real: la suscripción a Glitch de la portada del blog (`/blog/`, ver «Suscripción a Glitch»
abajo). El formulario de reserva por evento no tiene todavía un evento real publicado. Falta un envío real de
verificación (ver «Estado de verificación»).

### Contrato (`ui_policy_json` de la versión)

| Clave | Valores | Cruza al navegador | Validación |
|---|---|---|---|
| `presentation` | `inline_pill` (ausente o `standard` = estándar) | sí (`renderContract.presentation`) | otro valor → `presentation_unknown` |
| `inlinePill.openLabel` · `submitLabel` · `successLabel` · `doneLabel` · `waitlistSuccessLabel` · `waitlistDoneLabel` | texto ≤ 80, sin HTML ni llaves; opcionales | sí (`renderContract.inlinePill`) | `inline_pill_labels_invalid`, `inline_pill_label_markup` |
| `inlinePill.note` | texto ≤ 280; admite un `{privacyLink}` (exige `privacyUrl`) | sí | `inline_pill_note_*` |
| forma del formulario | exactamente un campo visible `email` requerido + campos `hidden`; consentimiento sin casillas; `composition: 'static'`; éxito sin `redirect` ni `success_card` | — | `inline_pill_fields`, `inline_pill_consent_checkboxes`, `inline_pill_composition`, `inline_pill_success_behavior` |
| `fields[].staticValue` | ≤ 200, sólo en `type: 'hidden'` | sí; el servidor lo impone al aceptar | `static_value_not_hidden` |
| `eventRegistration.capacity` | entero 1–100 000; ausente = sin cupo | **no** | `event_registration_invalid` |
| `eventRegistration.overCapacity` | `waitlist` (default) · `reject` | no | ídem |
| `eventRegistration.statusField` | default `registration_status`; no puede ser un campo declarado | no | `event_registration_status_field_taken` |
| `eventRegistration.showRegistrationsCount` | `false` (default) · `true` | no | ídem |
| `eventRegistration.registrationsCountThreshold` | default 25 | no | ídem |

`eventRegistration` sólo en `form_kind: 'event_registration'` (`event_registration_wrong_kind`) y con un campo `email`.
Etiquetas por defecto del renderer (es-CL): suscripción «Suscribirme» / «Suscribirme» / «¡Listo!» / «Ya estás suscrito»;
evento «Reservar mi lugar» / «Reservar» / «¡Lugar reservado!» / «Te esperamos»; lista de espera «¡Estás en la lista!» /
«Te avisamos si se libera un lugar». La nota cae en `consent.noticeText` si `inlinePill.note` falta.

Publicar un evento: `pnpm growth:forms:publish-event-registration -- --config <json> [--apply] [--force]` (dry-run por
defecto con el compiler real; ejemplo `scripts/growth/forms/examples/webinar-aeo-2026-11-12.json`). No crea destinos:
el destino HubSpot de cada evento va por el registry de destinos.

### Envío y lista de espera

`POST …/submit` sin cambios de forma. Con política de reserva la respuesta suma `registrationStatus: 'confirmed' |
'waitlisted'`; con el cupo lleno y `reject` responde `409 { outcome: 'capacity_full' }` y no persiste nada (queda una
fila `rejected` con `rejection_reason_class = capacity_full`). El cupo se decide en la transacción del envío con un lock
por formulario; un correo ya confirmado no ocupa otro cupo.

### Consentimiento por el acto de suscribirse (`consentBy: 'submission'`)

Aprobado por el operador el 2026-10-24. En una presentación `inline_pill` de **suscripción** con aviso visible, enviar
el correo bajo ese aviso **es** el consentimiento: la píldora no tiene casillas (el compiler las bloquea), así que el
aviso es lo único que el visitante ve y acepta.

- **Evidencia (servidor).** Al aceptar el envío, `submitForm` guarda en
  `form_submission_consent_snapshot.notice_text_hash` el sha256 del `ui_policy.inlinePill.note` de la versión publicada
  (`inlinePillNoticeHash`, `src/lib/growth/forms/hash.ts`; recorta espacios). Si la versión no es `inline_pill` o no
  declara `note`, el hash es `null`. El navegador no puede escribirlo.
- **Destino HubSpot.** `mapping_json.communications[]` admite dos formas, excluyentes:
  `{ checkboxKey, subscriptionTypeId, text }` (casilla marcada, igual que antes) y
  `{ consentBy: 'submission', subscriptionTypeId, text }` (`text` = el aviso tal como se ve, sin el marcador). La
  entrada `consentBy` sólo suscribe si el snapshot tiene `notice_text_hash`; sin hash envía `communications: []`.
- **Mal formada.** Una entrada con `consentBy` **y** `checkboxKey` a la vez (o cualquier entrada inválida) hace fallar
  la entrega con `invalid_communications_mapping` (`retryable: false`) antes del POST: nunca se adivina la intención.
- **Alcance.** Sólo píldoras de suscripción con `inlinePill.note`. Una suscripción con casilla (formulario estándar)
  sigue exigiendo la casilla marcada; una casilla de procesamiento nunca autoriza publicidad.

Pruebas: `src/lib/growth/forms/destinations/hubspot/__tests__/adapter.test.ts` (con hash suscribe, sin hash no, entrada
con ambas fuentes → `invalid_communications_mapping` sin `fetch`) y `src/lib/growth/forms/__tests__/inline-pill-notice-hash.test.ts`.

### Conteo público

`GET /api/public/growth/forms/{slug|formKey}/registrations-count`

```json
{ "count": 310, "display": "310", "shown": true }
```

Bajo el umbral, sin `showRegistrationsCount` o en un formulario que no es de evento: `{ "count": null, "display": null,
"shown": false }`. `count` y `display` van redondeados hacia abajo a la decena (312 → 310; `display` con separador de
miles es-CL). Errores: `404 growth_form_not_found` (inexistente o API pública apagada), `429 rate_limited` con
`Retry-After` (30 lecturas por minuto por IP y por instancia), `500 internal_error`. `Cache-Control: public,
max-age=600`; el reader cachea 10 min por `formRef`. Sin sesión, CORS de los orígenes gobernados.

### Embed y piel del anfitrión

```html
<greenhouse-form data-dc-keep class="eo-inline-pill eo-inline-pill--glitch"
  form-key="<form_key>" surface="<fhsf-…>" locale="es-CL" color-scheme="dark" appearance="bare">
  <!-- respaldo: visible sin JS y hasta que el renderer monta; el renderer lo reemplaza -->
  <a href="<url de respaldo>" class="ghf-fallback">Suscríbete a Glitch</a>
  <p class="gxs__note" aria-hidden="true">Al suscribirte aceptas la política de privacidad. Te das de baja cuando quieras.</p>
</greenhouse-form>
<script src="https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js" defer></script>
```

Reglas del anfitrión (verificadas en la portada del blog, 2026-10-24):

- **El renderer es dueño de todo lo que hay dentro de `<greenhouse-form>`.** El anfitrión no resetea ni estila
  descendientes: un reset con especificidad de ID (`#host :is(...) {all:revert}`) anuló los estilos del renderer
  (texto duplicado, píldora aplastada). Si el anfitrión necesita un reset, lo excluye con `:not(greenhouse-form *)`.
- **Si el anfitrión re-renderiza su DOM** (morph, plantillas, autoplay), el elemento debe quedar opaco para ese
  motor (en la portada, `data-dc-keep`): sin eso, el autoplay del slider borraba el formulario ya montado.
- **Ancho.** El anfitrión le da a `<greenhouse-form>` `display: block` y el ancho de su columna (con `container-type:
  inline-size`, un elemento dimensionado por su contenido colapsa; una columna flex que encoge, también). Desde 480 px
  la píldora usa los anchos del canvas; con menos ocupa todo el ancho.
- **Respaldo.** Un hijo enlace (`a.ghf-fallback`) con la forma de la píldora en reposo + el aviso reservando su lugar
  evita el salto visual antes de que cargue el renderer y deja una salida sin JavaScript; al montar, el renderer
  reemplaza los hijos.
- **Alineación** sólo por tokens públicos (`--ghf-inline-align`, `--ghf-inline-note-align`), nunca con selectores
  internos.

Piel de referencia: `scripts/growth/forms/fixtures/inline-pill-host-skin.css`; piel real de la portada:
`efeonce-public-site-runtime` → `wp-content/plugins/eo-blog-home/assets/css/eobh-host.css`.

| Para | Tokens (default = canvas) |
|---|---|
| Tono | `--ghf-inline-tone` (#6ec207), `--ghf-inline-on-tone` (#001a33), `--ghf-inline-tone-hover`, `--ghf-inline-tone-active` (default `color-mix` del tono; declararlos para el valor exacto) |
| Tipografía | `--ghf-inline-font` (default `--ghf-font`) |
| Anchos | `--ghf-inline-width-idle/-open/-done` (suscripción 252/480/304; evento 236/470/360) |
| Alto | `--ghf-inline-height` (52px), `--ghf-inline-send-height` (42px) |
| Superficies | `--ghf-inline-open-bg`, `--ghf-inline-open-border`, `--ghf-inline-focus-border`, `--ghf-inline-done-border`, `--ghf-inline-done-fg`, `--ghf-inline-field-fg`, `--ghf-inline-placeholder`, `--ghf-inline-note-fg`, `--ghf-inline-error-fg`, `--ghf-inline-focus-ring` |
| Alineación | `--ghf-inline-align` (suscripción `flex-end`, evento `flex-start`), `--ghf-inline-note-align` |
| Movimiento | `--ghf-inline-duration-morph` (520ms), `--ghf-inline-ease` (cubic-bezier(0.2,0,0,1)), `--ghf-inline-spring`, `--ghf-inline-field-delay` (200ms), `--ghf-inline-check-duration` (420ms), `--ghf-inline-check-delay` (140ms), `--ghf-inline-note-delay` (260ms), `--ghf-inline-pulse-scale` (1.035) |

Hooks `data-ghf-part`: `inline`, `inline-pill` (con `data-ghf-inline-state = idle|open|loading|success|done`,
`data-ghf-inline-invalid`, `data-ghf-inline-waitlisted`), `inline-open`, `inline-input`, `inline-send`, `inline-ok`,
`inline-note`, `inline-error`, `inline-retry`; el root lleva `data-ghf-presentation="inline_pill"` y `data-ghf-busy`
mientras envía. Evento DOM `ghf:success` (`detail: { formKey, formSlug, instanceId, registrationStatus? }`, sin PII):
otra instancia del mismo `formKey` en la página pasa a «listo» sin reenviar; también lo escucha un formulario estándar.

Teclado: Enter abre y el foco entra al campo a los 260 ms; Esc con el campo vacío cierra y devuelve el foco al botón; tras
el éxito el foco va al mensaje. Errores en línea bajo la píldora; «Reintentar» sólo ante red, `rate_limited` o `error`.
Movimiento reducido: sin estiramiento, pulso ni dibujo. Gate visual: `node scripts/growth/forms/fixtures/inline-pill.scenario.mjs`
(evidencia en `docs/ui/reviews/TASK-2054-growth-form-inline-pill-renderer/`).

### Suscripción a Glitch (portada del blog)

| Identidad | Valor |
|---|---|
| Slug / form key | `efeonce-blog-subscription` / `6bc62588-a4a0-4214-9501-13b0c2948c81` (misma clave que la versión anterior) |
| Versión publicada | `fver-e6850cc8-4b39-40c7-9428-a148cfdd53bc` · política `efeonce-blog-glitch-subscription-pill-v1` |
| Superficie | `fhsf-efeonce-blog-subscription` |
| Destino | HubSpot form `8c7cf91b-a1c9-4cbe-9d8c-cac773692561`, `communications: [{ consentBy: 'submission', subscriptionTypeId: 535702717, … }]` |
| Etiquetas | «Suscríbete a Glitch» / «Suscribirme» / «¡Listo!» / «Ya estás suscrito a Glitch» |
| Aviso | «Al suscribirte aceptas la {privacyLink}. Te das de baja cuando quieras.» (`privacyUrl` `https://efeoncepro.com/politica-de-privacidad/`) |
| Seguridad | Turnstile invisible al enviar (misma site key que AEO) |
| Publicador | `pnpm growth:forms:publish-glitch-pill` (`scripts/growth/publish-glitch-inline-pill.ts`) |

El publicador corre en dry-run por defecto (compila en memoria con el compiler de publicación, sin tocar la base);
`--apply` crea el borrador, su destino HubSpot y lo deja en revisión; `--publish` además publica y se niega si
`origin/main` todavía no sirve el hash del aviso y `consentBy` (publicar antes dejaría suscriptores sin suscripción).
La portada se conecta con `pnpm public-website:blog-home subscription <form_key> --apply` (opciones WordPress
`eo_blog_glitch_form_key` y `eo_blog_glitch_form_surface`); sin formulario conectado la portada no muestra la
suscripción (`data-subscribe="off"`), nunca un éxito simulado.

### Estado de verificación

- Verificado en vivo: la píldora renderiza en los tres tableros de `/blog/` (escritorio, tablet, móvil) sin desborde.
- **Pendiente:** un envío real. El envío desde el navegador automatizado de Claude no salió: Turnstile lo rechazó (sin
  token, sin `POST /submit`; misma configuración que AEO, que funciona con personas). No se intentó eludir la
  verificación. Falta que una persona se suscriba y confirmar en HubSpot el contacto suscrito al tipo `535702717`.
- **Pendiente:** el formulario de reserva por evento espera un evento real (sin evento cargado, la portada oculta su
  sección).

## Content Marketing: presentación, host y distribución del renderer

Registro del rollout del 2026-08-31; para operar después, relee el contrato público y el ledger
canónico. La publicación de una definición, el bundle servido por su consumer y un submit aceptado
son evidencias distintas.

| Identidad | Valor del rollout |
|---|---|
| Landing WordPress | `/servicio-marketing-de-contenidos/`, página `242603` |
| Slug / form key | `efeonce-content-marketing` / `18b228e9-106a-402e-a6f2-a8c5469e73d7` |
| Surface | `fhsf-efeonce-content-marketing` |
| Versión publicada | `fver-e96ca2e9-d2b2-4f72-ad50-33d2b2be9245` (v3, revisión de copy 2026-08-31) |
| Presentación / composición | `content_marketing` / `multi_step_light` |
| Destino | `greenhouse_only`, cero destinos configurados en v3; no habilita entrega directa a HubSpot ni correo |

El authoring reproducible vive en `scripts/growth/publish-content-marketing-form.ts` y usa
`authorDraftForm → reviewForm → publishForm`. Los campos del primer paso son `fullName`, `email`
y `companyName`; el segundo contiene `mode` y `challenge`. El email corporativo, consentimiento,
Turnstile y success siguen en el contrato gobernado. No hay endpoint ni bridge de submit de WordPress.

La revisión editorial v3 usa `scripts/growth/revise-content-marketing-form-copy.ts`: preserva
campos funcionales, consentimiento, seguridad y policies; actualiza sólo copy de la versión.
La v2 se deprecó después del readback de v3. Recuperar copy anterior requiere otra versión por
commands; nunca editar una versión publicada en sitio ni reutilizar el writer con su baseline antiguo.
[Publicación, readback y recuperación](../audits/public-site/2026-08-31-content-marketing-business-conversion.md).

**Presentación canónica.** `renderer.ts` construye título del paso, ayuda opcional desde
`copy["step.<key>.help"]`, progreso anunciado y puntos decorativos; `styles.ts` gobierna la columna
única, espaciado y acciones de la variante. El host aporta la card y tokens `--ghf-*`, incluido
`--ghf-step-bg`; no copia campos, validación ni CSS de controles de otra landing. El ajuste no exige
schema, contrato de API o flag nuevo. El select nativo restaura su valor **después** de insertar
las opciones: tanto `initialValues` como volver a un paso deben reflejar el valor conservado.
La prueba de comportamiento es `src/growth-forms-renderer/__tests__/content-marketing.test.ts`;
no sustituirla por una comprobación textual de `select.value`.

**Host opaco.** El patcher de `scripts/public-website/content-marketing-client.cjs` conserva el nodo
`[data-cm-form-host]` y su `<greenhouse-form>` durante cada actualización de la landing. Nunca debe
reconstruir sus descendientes, perder foco/datos o reiniciar el custom element. El evento de modo puede
prellenar `initial-values` antes de que la persona escriba; después del primer `input`, el host deja
de cambiarlo. La captura real y las selecciones posteriores pertenecen al renderer.

**Distribución por consumer.** El widget carga `eo-content-forms` desde
`eo-elementor-widgets/assets/js/content-marketing-forms.js`, compilado de
`src/growth-forms-renderer/index.ts` por el build del paquete Content Marketing. Es un artefacto fijado
del mismo renderer, no una segunda implementación. La surface declara canal `stable`, pero eso no
prueba que `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js` tenga esta versión.
La publicación WordPress de este bundle no es un release global de Greenhouse. En cualquier promoción,
comprueba URL/hash servidos y compatibilidad; evita cargar dos bundles que compitan por registrar el
mismo custom element en una página.

**Evidencia del rollout.** `.captures/content-marketing/browser.json` registra montaje, validación
vacía, dos pasos, prefill de modo y regreso conservando valores, sin submission. El cierre técnico posterior intentó una submission sintética sin destinos externos: Turnstile
la bloqueó antes del POST y el ledger permaneció vacío. El tag GA4 sí se ejercitó separadamente
con `form_slug=smoke-test`: colector 204 en `G-KYPPY57M14`. No afirmar aceptación, entrega,
confirmación Realtime ni cierre E2E a partir de ese evento sintético.
El verificador `scripts/public-website/verify-content-marketing-business-conversion.cjs` añade la
revisión pública del copy v3, ambos pasos y retención de valores en 1440/878/390, sin enviar datos.
El ajuste posterior de cinco textos de la columna izquierda no cambia v3 ni el renderer.
La aceptación E2E y confirmación Realtime permanecen pendientes en
[TRACKING-PLAN.md](../reference/measurement-gtm-ga4/TRACKING-PLAN.md).
La implementación y su alcance viven en
[CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md](public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md).

## Public Host CORS

La autorizacion de surface por `origin_allowlist_json` no reemplaza el contrato CORS del navegador. Para hosts browser cross-origin, el motor debe cumplir ambas capas:

- **Transporte browser:** las rutas publicas que consume el browser (`GET /api/public/growth/forms/{slug}`, `POST /api/public/growth/forms/{slug}/submit`, `POST /api/public/growth/forms/{slug}/verify-email` y sus `OPTIONS`) reflejan `Access-Control-Allow-Origin` solo para origins publicos aprobados.
- **Autoridad del engine:** form publicado, surface activa, slug permitido, `originAllowed`, consent, honeypot, Turnstile, server validation, rate-limit y destination plan server-only siguen siendo obligatorios.
- **Secreto y mapping:** el browser nunca recibe destination mapping, portalId, el **HubSpot destination form GUID** (`form_destination.mapping_json.formGuid`), HubSpot property names ni secretos. (Desde TASK-1297, el render contract SÍ expone `form.formKey`: esa es la identidad **pública/opaca de Growth Forms** — NO el HubSpot GUID. Son cosas distintas: `formKey` ≠ HubSpot `formGuid`.)

### CORS gobernado — sin literal hardcodeado (TASK-1335)

Desde TASK-1335 el transporte CORS **no** tiene un set de origins hardcodeado en el route helper.
El resolver (`src/app/api/public/growth/forms/cors.ts`) computa el allowlist de transporte como la
**UNIÓN de `origin_allowlist_json` de las surfaces `active`** de `greenhouse_growth.form_host_surface`
(SoT único = la DB). Consecuencias:

- **Agregar/quitar un origin permitido = cambio de DATA (una fila en la DB), NUNCA de código.** Sumar
  un origin a una surface `active` lo mete automáticamente en la unión de transporte. Esto mata el drift
  entre el transporte CORS y la autoridad real del motor (que era el bug: `GET` respondía `200` pero el
  browser no recibía ACAO).
- **Cache in-memory (TTL ~90s) + stale-while-revalidate + stale-on-error.** El hot path público no
  bloquea en la DB por-request; ante DB caída se sirve el last-known-good. Cold start + DB no disponible
  → unión vacía (fail-closed) — pero en ese instante el render/submit ya están rotos igual (necesitan la
  DB), así que degradar a sin-ACAO es honesto, no una regresión nueva.
- **Invariante de fallo:** fail-CLOSED para el origin desconocido (unknown → sin ACAO); fail-SAFE para
  el data source (cache last-known-good, nunca unión vacía por un blip de DB).
- **El transporte es surface-agnóstico (unión), no surface-aware.** El preflight `OPTIONS /submit` no
  lleva `surfaceId`, así que el transporte no puede depender de una surface puntual; la autoridad fina
  por-surface (origin + slug + surface) sigue server-side en `submitForm` (doble defensa intacta). Una
  variante "surface-aware por request" rompería el preflight de TODOS los origins (incluido `/aeo-2`).
- **Filtro `.local` en producción:** pseudo-origins gobernados en la DB (`shadow.local`) no reciben ACAO
  bajo `NODE_ENV=production` (inocuo; un browser real nunca los tiene como origin).

Origins gobernados vigentes (derivados de la unión de surfaces `active`, NO de un literal):

- `https://efeoncepro.com`, `https://www.efeoncepro.com` — surfaces `fhsf-efeonce-aeo-diagnostic` (`/aeo-2`) + `fhsf-efeonce-lead-gen-web`.
- `https://think.efeoncepro.com` — surface `fhsf-ai-visibility-grader` (TASK-1335, habilita el embed del grader en Think).
- `https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app`, `https://shadow.local` — surface `fhsf-efeonce-lead-gen-web` (staging/dev; `.local` filtrado en prod).

Smoke live de referencia del primer rollout WordPress AEO:

- `OPTIONS /api/public/growth/forms/efeonce-aeo-diagnostic/submit` -> 204 con ACAO.
- `GET /api/public/growth/forms/efeonce-aeo-diagnostic?surfaceId=fhsf-efeonce-aeo-diagnostic` -> 200 con ACAO y `render_contract.security.captcha`.
- `POST /api/public/growth/forms/efeonce-aeo-diagnostic/submit` sin token -> `403 captcha_failed/missing_token` con ACAO y sin persistir submission.

Deploy que introdujo CORS en produccion: `greenhouse-qbxqrrzpm`.
Deploy que serializa `security.captcha` en produccion: `greenhouse-drl142ckj`.

## AEO WordPress Renderer

La landing publica `/aeo-2/` usa el renderer portable `<greenhouse-form>` en WordPress desde el cutover gobernado de TASK-1298 (2026-07-01). El bridge HTML temporal quedo reemplazado en el widget `convers`; el submit, la validacion, Turnstile, telemetry y destinos vuelven al contrato Growth Forms.

Identificadores vigentes:

- WordPress page: `postId=250265`, slug `aeo-2`, status `publish`.
- Elementor widget host: `convers`, wrapper `.gh-aeo-growth-form-card`.
- Form slug: `efeonce-aeo-diagnostic`.
- **Form key (identidad estable, TASK-1297):** `b120566a-dd1a-43c8-956a-4e0121e805b8` (AEO). El del AI Visibility Grader es `69cd5269-5f97-4d32-99c4-0b23f41aa2f5` (distinto). Embed/resolución preferida por `form-key`; `slug` queda como alias backward-compatible.
- WordPress embed: `<greenhouse-form form-key="b120566a-dd1a-43c8-956a-4e0121e805b8" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL" color-scheme="light" appearance="bare">` + `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js`.
- Form definition/current published version: `fdef-efeonce-aeo-diagnostic` / `fver-bfc40c59-8d95-4d38-8ae5-0da7dc4ab468` (v16, `style_variant=diagnostic_premium`, expone `copy.submit="Empezar con mi diagnóstico →"`, campo visible `fullName` label `Nombre completo` con placeholder `ej. María González`, `validation_schema.namePolicy.split_full_name`, placeholders `Selecciona tu país` / `Selecciona un rango`, `security.captcha` y `successBehavior.presentation="success_card"` con `steps=[]`, CTA `Agenda una reunión` y copy `Tu informe de visibilidad va en camino.`; v15 `fver-1139a7f7-4e62-4fb7-8e5c-be024652d217`, v14 `fver-2cc79ff4-6dcc-404e-b79b-094bd0a81e29`, v13 `fver-1f727049-6600-4d68-8089-1718b9edd54e`, v12 `fver-f933f877-c1ff-4e76-9832-2078ca64c6dd`, v7 `fver-f2f8abde-3b11-42b3-bf78-a309ef7678ad`, v6 `fver-9ec43a66-5372-45b7-829d-2c9e6381e27d`, v5 `fver-70c365c1-ea3b-4e84-b4b3-4fd852f951f4`, v4 `fver-dbdd6a02-7e89-4d65-b29e-7228b7475a94`, v3 `fver-9507f6a7-431d-4215-a699-9c713328b69b`, v2 `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657` y v1 `fver-efeonce-aeo-diagnostic-v1` deprecadas).
- Host surface: `fhsf-efeonce-aeo-diagnostic`.
- API base: `https://greenhouse.efeoncepro.com`.
- Turnstile site key in render contract: `0x4AAAAAADqwX2R7v-k9pItv`.
- HubSpot secure-submit destination: portal `48713323`, form GUID `8649e76c-8b01-41f3-9b0c-5713d7b4dba6` (`AEO - Lead Form`).

Premium modernization contract (live):

- `style_variant=diagnostic_premium` is the governed renderer path for the AEO premium pass. It keeps the look in the Growth Forms render contract + renderer tokens, not in WordPress page CSS.
- Script: `pnpm growth:forms:activate-aeo-reference-copy` dry-runs and `pnpm growth:forms:activate-aeo-reference-copy -- --apply` publishes a new AEO form version by `form_key=b120566a-dd1a-43c8-956a-4e0121e805b8` with the current reference copy. `pnpm growth:forms:activate-aeo-premium` remains the older premium-style activation helper.
- The script updates labels/placeholders/help/errors/submit/success copy, preserves fields, validation, Turnstile, destinations and policies, publishes vNext and deprecates the previous version.
- Applied production data: v16 `fver-bfc40c59-8d95-4d38-8ae5-0da7dc4ab468`.
- WordPress cutover backup meta: `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`.
- Live verification command: `pnpm public-website:verify-aeo-live-contract`.

## Success Card Renderer Contract

`successBehavior.presentation="success_card"` es un contrato transversal del renderer portable, no un snippet local de AEO. Cuando un form publicado lo declara, el browser debe recibir la card desde el render contract y `buildSuccessCard` la pinta dentro de `<greenhouse-form>`.

Queda transversal en `src/growth-forms-renderer/**`: la estructura `.ghf-success-card`, el mark SVG inline de celebración tipo party popper (`buildSuccessMarkGraphic`), el icono calendario para acciones `kind="schedule"`, la entrada con motion respetando `prefers-reduced-motion`, y la telemetry allowlisted sin PII.

Queda acotado a la variante premium: `style_variant=diagnostic_premium` renderiza la Success Card sin marco interno, sin línea superior, sin sombra propia y sin focus frame persistente; el host conserva la card exterior como única superficie visible. Si otra variante necesita ese tratamiento, debe promoverse a token/variant del renderer, no copiar CSS de AEO.

Queda AEO-only y temporal: los markers WordPress `gh-aeo-success-card-polish-v1`, `gh-aeo-success-card-compact-steps-v1`, `gh-aeo-success-card-recraft-popper-v1`, `gh-aeo-success-card-borderless-v1` y `gh-aeo-readiness-centered-v1` son bridge CSS live para `/aeo-2/` hasta que el bundle productivo sirva la fuente actualizada. No son patrón para otros forms.

## Tokenized Report Handoff (TASK-1336)

`successBehavior.kind="tokenized_report"` es una etiqueta de resultado cuyo comportamiento gobernado es un **handoff auto-descriptivo** hacia un reporte servido por token (el lead magnet AI/Brand Visibility). El submit aceptado NO significa reporte listo: entrega al host el punto de partida para hacer poll y navegar cuando esté `ready`, sin que el host hardcodee la ruta ni conozca el dominio del grader (Full API Parity).

Contrato (SoT `successBehaviorSchema` en `src/lib/growth/forms/contracts.ts`, espejo `RendererSuccessBehavior`):

- **Config (render contract, browser-safe):** `successBehavior.tokenizedReport.statusPathTemplate` — una ruta **relativa** acotada a la superficie pública (`/api/public/...`), con el placeholder `{handle}`. El schema es el leak boundary: valida que sea relativa bajo `/api/public/`, no protocol-relative y con `{handle}` (nunca una URL absoluta ni un endpoint privado). Para el grader su valor canónico es `/api/public/growth/ai-visibility/run/{handle}` (status reader de TASK-1245).
- **Handoff de entrada (evento `gh_form_submission_accepted`):** al aceptar el submit, el renderer sustituye `{handle}` por el `submissionId` (ya devuelto por `/submit`, válido como handle público async-safe) y emite `run_handle` + `status_url` (absoluta contra `api.baseUrl`) en el `CustomEvent`. Son claves **escalares allowlisted** (telemetry allowlist dura); NUNCA un objeto anidado, PII, `reportToken` ni ids internos. Si el behavior no declara `tokenizedReport` (tokenized_report legacy) o no hay `submissionId`, no se emite handoff (compat).
- **Status/report (polling `GET /api/public/growth/ai-visibility/run/[handle]`):** read-only, bounded (`queued|processing|ready|in_review|unavailable|not_found`). Devuelve `reportToken` SÓLO cuando existe snapshot publicable; el host arma la URL pública del reporte con ese token (`/brand-visibility/r/<token>`). El submit NUNCA trae status/token: el run no existe todavía al aceptar.

Reglas duras: **NUNCA** hardcodear la ruta de status en el renderer genérico (viene de la config `statusPathTemplate`, self-describing). **NUNCA** meter el `reportToken` ni status en la respuesta del submit ni en el handoff (sólo aparece al hacer poll cuando `ready`). **NUNCA** publicar el handoff mutando la versión publicada in-place: `pnpm growth:forms:activate-grader-tokenized-report` (dry-run) clona → publica → deprecara, con guard de runtime.

### Delta 2026-07-05 — Think Brand Visibility production handoff (TASK-1327)

El primer rollout real de `tokenized_report` en Think confirmó que el contrato tiene dos commits
separados:

1. `POST /api/public/growth/forms/{formKey}/submit` acepta la submission, verifica Turnstile y emite
   el handoff browser-safe (`run_handle`/`status_url`).
2. El dominio del grader procesa el outbox `growth.forms.submission_accepted` por
   `growth_grader_run_from_submission` y crea `grader_lead` + `grader_run`; sólo después el status
   puede avanzar hacia `ready` + `reportToken`.

Por eso `form_destination` no es el mecanismo correcto para crear un grader run. Una versión del form
con `DESTINATIONS: []` puede ser válida para `fdef-ai-visibility-grader`: el destination entrega leads
a sistemas externos; el run es trabajo de proyección de dominio. El síntoma "submit delivered pero el
loader poll-ea para siempre" se diagnostica en este orden: network/Turnstile/CORS del submit →
`form_submission` → outbox `growth.forms.submission_accepted` → consumer reactivo → `grader_lead` /
`grader_run` → status route CORS.

La causa raíz TASK-1327 post-Turnstile fue que el consumer fallaba con `category unresolved
(node=unknown)` para una categoría pública no mapeada. Regla de arquitectura: un intake público
aceptado no puede terminar en dead-end por clasificación de dominio. La proyección debe resolver con
taxonomy/fallback grounded o degradar explícitamente y dejar evidencia recuperable.

## WordPress Ohio Host Layer

El tema Ohio es un host CSS agresivo para controles nativos. El contrato vigente para
evitar una nueva pelea por landing es una capa compartida en el child theme, no CSS
pegado en cada pagina:

- Runtime repo: `efeonce-public-site-runtime`.
- CSS gobernado: `wp-content/themes/ohio-child/assets/css/growth-forms-host.css`.
- Enqueue gobernado: `wp-content/themes/ohio-child/inc/enqueue-and-layout.php`
  (`ohio-child-growth-forms-host`, versionado por `filemtime`).
- Estado live: desplegado en Kinsta el 2026-07-01 por rollout acotado de esos dos archivos
  (backup remoto `/tmp/greenhouse-growth-forms-host-layer-20260701T103729Z`), con hashes
  repo/live sincronizados y `pnpm public-website:verify-aeo-live-contract` verde.
- Scope unico: `.eo-growth-form`, `.gh-growth-form-host`,
  `.gh-aeo-growth-form-host`, `.gh-aeo-growth-form-card` + `<greenhouse-form>`.

Responsabilidad de la capa:

- contencion (`max-width:100%`, `min-width:0`, `overflow-x`);
- default tokens seguros para hosts genericos;
- hardening scoped de `.ghf-input`, `.ghf-textarea`, `.ghf-select`,
  `.ghf-select-trigger`, `.ghf-select-list` y `.ghf-btn` frente a reglas globales
  `input/select/button` de Ohio;
- reduced-motion defensivo solo dentro del host.

### Premium select/listbox overlay contract (TASK-1343)

Los selects premium (`style_variant=diagnostic_premium` y variantes equivalentes) resuelven el
stacking del listbox dentro del renderer portable, no en la landing. Cuando el usuario abre un
select, `src/growth-forms-renderer/renderer.ts` marca el `.ghf-field` activo con
`data-overlay-open="true"`; `styles.ts` eleva `.ghf-field:focus-within`,
`.ghf-field[data-overlay-open="true"]` y `.ghf-select-list` para que el menu quede por encima de las
filas siguientes del grid, incluso dentro de cards WordPress/Ohio.

Reglas de contrato:

- el host puede proveer chrome, layout, sticky lanes o tokens, pero no debe reconstruir el listbox ni
  resolver este bug con CSS page-scoped;
- el estado activo conserva `aria-expanded`, `role="listbox"`/`role="option"` y foco de teclado;
- las opciones selected/hover usan texto oscuro (`--ghf-fg`) sobre el fondo mint/premium; no usar
  `--ghf-accent-contrast` porque puede producir blanco sobre claro;
- el gate visual de cualquier host real debe abrir al menos un dropdown y comprobar que la opcion
  superior sea el elemento bajo el punto de prueba (`elementFromPoint`), que no haya overflow
  horizontal y que reduced-motion siga degradando honestamente.

### Editorial Premium Brief host composition (TASK-1598)

The Influencer brief establishes the approved **Editorial Premium Brief** public-site composition. Its canonical
visual contract is [GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md](../ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md).
It is not a new renderer variant: `diagnostic_premium` continues to own controls, values, listbox state, keyboard,
ARIA, validation, submit, Turnstile and success. The host owns one exterior paper surface, editorial header, trust
rail, responsive placement and surface-scoped semantic tokens.

The market/activation pictograms on the first surface are page-scoped decoration. They must not be copied to a
second landing through label matching, `MutationObserver` or parallel value state. Reuse is the graduation trigger
for browser-safe semantic option metadata in the form/render contract and renderer.

No responsabilidad de la capa:

- identidad, version, fields, validacion, condiciones, copy, Turnstile, submit,
  telemetry, HubSpot mapping o dispatch. Eso sigue en Greenhouse + renderer.

Rollout guard:

- El deploy del child theme no debe mezclar automaticamente el plugin
  `eo-elementor-widgets` salvo que el diff gobernado lo declare sincronizado o el release
  incluya explicitamente el plugin. Desde 2026-07-01 el export live y el binding incluyen
  `eo-elementor-widgets`; el reporte vigente
  `docs/operations/public-site-drift/drift-2026-07-01T10-54-46-557Z.json` muestra
  `releaseSafety.fullRepoDeploySafe=true`, `repo_pending_release=0`, `content_drift=0` y
  `live_untracked_file=0` despues de la reconciliacion acotada.
- Antes de aplicar a Kinsta, refrescar snapshot con `pnpm public-website:export-live-code`
  y verificar `pnpm public-website:diff-runtime`. Despues de aplicar, purgar Kinsta y
  correr el gate especifico de la landing; para AEO, `pnpm public-website:verify-aeo-live-contract`.

Field contract:

| Public field | Greenhouse persistence | HubSpot mapping |
| --- | --- | --- |
| `fullName` | yes; raw visible field preserved in Greenhouse | not mapped to HubSpot |
| derived `firstName` | yes; derived server-side from `fullName` when `namePolicy.mode="split_full_name"` | `firstname` |
| derived `lastName` | yes when derivable; never fabricated for one-token names | `lastname` |
| `email` | yes; `validator=corporate_email` | `email` |
| `brandWebsite` | yes | not mapped until HubSpot form/property exists |
| `country` | yes | `pais_gh` |
| `companySize` | yes | `tamano_de_la_empresa` |
| `mainCompetitor` | yes | `marca_de_competencia` |

## HubSpot Form Definition Upsert

HubSpot Forms secure-submit validates against the destination form definition. When a new
Greenhouse field is added to `form_destination.mapping_json.fieldMapping`, the HubSpot form may also
need the matching field in `fieldGroups`.

- Governed tool: `pnpm hubspot:forms:upsert-fields -- --config <json> [--apply]`.
- Implementation: `scripts/hubspot/upsert-form-fields.ts`.
- API used: HubSpot Forms API `2026-09-beta`, `PATCH /marketing/forms/2026-09-beta/{formId}`,
  scope `forms`.
- Dry-run is default. `--apply` reads the form, verifies CRM properties, creates missing properties
  only when the config includes `createProperty`, ensures `formField=true` when possible, and patches
  `fieldGroups` while preserving unrelated form settings.
- The tool does not replace Growth Forms as source of truth: after a HubSpot field addition, update
  the Greenhouse destination mapping server-side and run secure-submit smoke.
- AEO example config: `scripts/hubspot/examples/upsert-aeo-brand-website-field.json` plans
  `brandWebsite -> companies.domain` for the HubSpot destination form.

Runtime guardrails:

- WordPress must never know HubSpot mapping, portal credentials, destination secrets or Turnstile secret.
- The AEO form requires corporate email: the published field uses `validator=corporate_email` and `validation_schema.emailPolicy={mode:"block_field",field:"email"}`. Gmail/free/disposable addresses must be rejected before accepted submission.
- The AEO form captures one visible `fullName` field (`Nombre completo`). Server-side `submitForm` applies `validation_schema.namePolicy={mode:"split_full_name",sourceField:"fullName",firstNameField:"firstName",lastNameField:"lastName"}` before persistence/delivery. HubSpot receives native contact `firstname`/`lastname` from derived fields; the browser never sees this mapping.
- The current AEO published form declares `ui_policy_json.security.captcha` with public Turnstile site key `0x4AAAAAADqwX2R7v-k9pItv`, `required:true`, `mode:"invisible"` and `execution:"submit"`. Production public `GET` now serializes `render_contract.security.captcha`; public `POST` remains fail-closed without a token.
- The WordPress embed must keep validation in Growth Forms: field-level errors close to the input, `aria-invalid`/`aria-describedby`, debounced `/verify-email` for corporate email, and no `/submit` while field validation blocks. Do not regress to status-only/global validation or a landing-local submit bridge.
- A submit without Turnstile token must fail as `403 captcha_failed/missing_token` and must not create a lead.
- The browser origin must pass CORS before the public API response is consumable, but CORS does not replace form/surface/origin validation in the engine.
- Do not revert this surface to the old `ai-visibility-grader` slug or a meeting-link fallback unless explicitly rolling back.

Contrato renderer desde TASK-1294:

- `render_contract.security.captcha` puede declarar `provider:"turnstile"`, `mode:"invisible"`, `execution:"submit"`, `required:true` y `siteKey` publico.
- `<greenhouse-form>` carga `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, renderiza un widget invisible idempotente y envia `captchaToken` en el body de `POST /submit`.
- El server sigue siendo autoridad: `TURNSTILE_SECRET` nunca sale al browser y `submitForm` verifica/falla cerrado.

Post-cutover guardrails:

- conservar el mismo backend contract y surface;
- no mover mapping HubSpot ni consent policy a WordPress;
- no volver al bridge HTML salvo rollback explicito usando el backup meta;
- antes de declarar cambios futuros en este form, correr `pnpm public-website:verify-aeo-live-contract` y confirmar `heroans` estable.

## AXIS: formato de entrada optativo (2026-10-04)

El renderer admite un `inputBehaviors` factory explícito para compartir formato de teléfono, correo,
RUT y URL con AXIS. Adapter Greenhouse local, sin activación en embeds publicados ni cambio de pins;
el source AXIS está en `main`, con primitives 0.5.0 todavía pendiente de publicación.
El catálogo del selector Growth Forms conserva sus 18 países desde `CALLING_CODES`; la inyección de
formato no lo sustituye por los 245 países y territorios del catálogo AXIS. Ampliarlo exige una
adopción explícita y verificar selección/normalización/validación; no implica una nueva allowlist de negocio.
Ownership, compatibilidad, prueba real del package y promoción:
[GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md](GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md).
