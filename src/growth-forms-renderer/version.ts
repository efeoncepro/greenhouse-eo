/**
 * TASK-1231 — Growth Forms portable renderer · versioning.
 *
 * `RENDERER_VERSION` versiona el comportamiento del bundle; `CONTRACT_VERSION`
 * (espejo de la SoT `src/lib/growth/forms/contracts.ts`) versiona la forma del
 * payload. Arch §19.2: el wrapper de cada host pinea un canal (`preview|beta|stable`).
 *
 * `1.1.0` (2026-10-23, TASK-2045): kit de formularios diseñados — `color-scheme="dark"`, ancho declarado,
 * tokens de campo/etiqueta/placeholder/botón, consentimiento compacto con `{privacyLink}`, éxito con
 * `icon` y acción `dismiss` (`ghf:dismiss`), `data-ghf-busy` y Turnstile junto al formulario. Primer bump
 * desde el núcleo: el valor viaja en la telemetría y separa el antes del después.
 *
 * `1.2.0` (2026-10-24, TASK-2054): presentación `inline_pill` (píldora que se estira en el campo de correo,
 * loader de la órbita, éxito con check y estado final), `staticValue` de campos ocultos, `registrationStatus`
 * y lista de espera, y el evento DOM `ghf:success` que sincroniza instancias del mismo formulario.
 *
 * `1.3.0` (2026-10-24, TASK-2056): logo opcional en el rótulo de la píldora, declarado por el anfitrión
 * (`inline-label-logo` + `inline-label-logo-text`); el nombre accesible sigue siendo el texto completo.
 *
 * `1.4.0` (2026-10-31): atributo de anfitrión `inline-initial-state="open"` — la píldora nace con el campo de
 * correo a la vista, sin mover el foco ni hacer scroll, y Escape no la pliega. Lo usa el footer de efeoncepro.com;
 * sin el atributo, nada cambia.
 */
export const RENDERER_VERSION = '1.4.0'

/** Debe ser idéntico a `CONTRACT_VERSION` de la SoT (parity test lo verifica). */
export const RENDERER_CONTRACT_VERSION = 'greenhouse-growth-public-forms.v1'

export const RENDERER_CHANNELS = ['stable', 'beta', 'preview'] as const
export type RendererChannel = (typeof RENDERER_CHANNELS)[number]
