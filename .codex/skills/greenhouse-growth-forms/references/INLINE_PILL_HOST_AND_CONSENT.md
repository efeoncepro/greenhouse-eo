# Píldora en línea (`inline_pill`): consentimiento por el acto, publicador y anfitrión

Leer antes de publicar una versión `inline_pill`, de declarar `communications` con `consentBy`, o de incrustar la
píldora en un anfitrión que tiene plantilla propia. Caso fuente: suscripción a Glitch en la portada del blog
(`/blog/`, 2026-10-24). Contrato completo (tabla de claves, tokens, hooks, teclado):
`docs/architecture/growth-public-forms-runtime-contract.md` §Formulario en línea y reserva por evento.

Estado (2026-10-24): en producción desde el release `40b330175855` (renderer `1.2.0` + consentimiento por el acto).
**Pendiente:** un envío real hecho por una persona y el primer formulario de evento real.

## Contrato en una línea

`ui_policy.presentation: 'inline_pill'` + `ui_policy.inlinePill { openLabel, submitLabel, successLabel, doneLabel,
waitlistSuccessLabel, waitlistDoneLabel, note }`. Un solo campo visible `email` requerido (+ `hidden`), sin casillas
de consentimiento, `composition: 'static'`, éxito sin `redirect` ni `success_card`; el compiler bloquea el resto
(`inline_pill_*`). `note` ≤ 280 con un único `{privacyLink}` (exige `privacyUrl`).

## Consentimiento por el acto de suscribirse (`consentBy: 'submission'`)

Aprobado por el operador el **2026-10-24**. En una píldora de **suscripción** con aviso visible, enviar el correo bajo
ese aviso es el consentimiento (la píldora no puede tener casillas).

- **Servidor:** `submitForm` (`src/lib/growth/forms/commands.ts`) guarda en
  `form_submission_consent_snapshot.notice_text_hash` el valor de `inlinePillNoticeHash(version.ui_policy_json)`
  (`src/lib/growth/forms/hash.ts`): sha256 del `inlinePill.note` recortado, o `null` si la versión no es
  `inline_pill` o no declara `note`. El navegador no lo controla.
- **Adaptador HubSpot** (`src/lib/growth/forms/destinations/hubspot/adapter.ts`): `communications[]` acepta
  `{ checkboxKey, subscriptionTypeId, text }` **o** `{ consentBy: 'submission', subscriptionTypeId, text }`. La entrada
  `consentBy` suscribe sólo si el snapshot tiene `notice_text_hash`. `text` = el aviso como se ve (sin el marcador).
- **Mal formada:** una entrada con `consentBy` y `checkboxKey` a la vez (o cualquier entrada inválida) →
  `invalid_communications_mapping`, `retryable: false`, **sin POST**.
- **Alcance:** sólo píldoras de suscripción con `inlinePill.note`. Una suscripción por casilla no cambia (sin casilla
  marcada no hay suscripción). Nunca extender `consentBy` a otra presentación o a un formulario comercial sin una
  decisión nueva del operador.
- **Pruebas:** `src/lib/growth/forms/__tests__/inline-pill-notice-hash.test.ts` y el bloque «consentBy submission» de
  `src/lib/growth/forms/destinations/hubspot/__tests__/adapter.test.ts` (con hash suscribe, sin hash no, ambas fuentes
  → mal formada sin `fetch`).
- Registro de la decisión: `docs/architecture/DECISIONS_INDEX.md` (fila Growth Forms del 2026-10-24).

## Publicador de la píldora de Glitch

```bash
pnpm growth:forms:publish-glitch-pill             # dry-run
pnpm growth:forms:publish-glitch-pill --apply     # borrador + destino + revisión
pnpm growth:forms:publish-glitch-pill --publish   # + publicar (exige origin/main con el código)
```

`scripts/growth/publish-glitch-inline-pill.ts`, perfil PostgreSQL `ops`.

- **dry-run:** compila en memoria con `compileFormVersion(..., { forPublication: true })`; sólo lee la base.
- **`--apply`:** si no existe una versión con la política `efeonce-blog-glitch-subscription-pill-v1`, la crea desde
  la base `fver-c6b28627-385c-43fc-995d-588bc0290fd0` (quita casillas y el error de la casilla), agrega el destino
  HubSpot y la pasa a revisión. Idempotente.
- **`--publish`:** además verifica con `git show origin/main:…` que `main` tenga `inlinePillNoticeHash`, su uso en
  `commands.ts`, `consentBy === 'submission'` en el adaptador y `src/growth-forms-renderer/inline-pill.ts`. Si falta,
  aborta: publicar antes dejaría suscriptores sin suscripción.

Identidades publicadas: formulario `efeonce-blog-subscription`, clave `6bc62588-a4a0-4214-9501-13b0c2948c81` (la misma
de antes, la portada no se reconfigura), versión `fver-e6850cc8-4b39-40c7-9428-a148cfdd53bc`, superficie
`fhsf-efeonce-blog-subscription`, HubSpot form `8c7cf91b-a1c9-4cbe-9d8c-cac773692561`, subscription type `535702717`.
Etiquetas «Suscríbete a Glitch» / «Suscribirme» / «¡Listo!» / «Ya estás suscrito a Glitch»; aviso «Al suscribirte
aceptas la {privacyLink}. Te das de baja cuando quieras.» Turnstile invisible (misma site key que AEO).

Conectar la portada: `pnpm public-website:blog-home subscription <form_key> --apply` (opciones WP
`eo_blog_glitch_form_key` / `eo_blog_glitch_form_surface`); `off` la desconecta. Operación de la portada: skill
`efeonce-public-site-wordpress` → `references/blog-home-operation.md`.

## Receta del anfitrión

```html
<greenhouse-form data-dc-keep class="eo-inline-pill eo-inline-pill--glitch" form-key="…" surface="…"
  locale="es-CL" color-scheme="dark" appearance="bare">
  <a href="…" class="ghf-fallback …">Suscríbete a Glitch</a>
  <p class="gxs__note" aria-hidden="true">Al suscribirte aceptas la política de privacidad. …</p>
</greenhouse-form>
```

1. Renderer desde Greenhouse, una vez por página: handle WordPress `gh-growth-forms-renderer-latest` →
   `<origen>/growth-forms/renderer-latest.js` (el mismo handle que el widget Elementor, así no se carga dos veces).
2. Si el anfitrión re-renderiza su DOM, el elemento queda opaco para ese motor (`data-dc-keep` en la portada).
3. El anfitrión **no** resetea ni estila dentro de `<greenhouse-form>`: su reset lleva `:not(greenhouse-form *)`.
4. `display: block` + ancho explícito (480 px = ancho abierto del canvas, `max-width: 100%`; móvil a ancho completo).
5. Alineación sólo con `--ghf-inline-align` / `--ghf-inline-note-align` (suscripción `flex-end`/`right` por defecto).
6. Respaldo hijo `a.ghf-fallback` con la forma de la píldora en reposo + el aviso reservando su lugar; el renderer
   reemplaza los hijos al montar (`replaceChildren`).
7. Tono con `--ghf-inline-tone`, `--ghf-inline-on-tone`, `--ghf-inline-tone-hover`, `--ghf-inline-tone-active`;
   tipografía con `--ghf-font`.

Piel real: `efeonce-public-site-runtime` → `wp-content/plugins/eo-blog-home/assets/css/eobh-host.css`; el reset vive en
`scripts/public-website/blog-v3/build-plugin.cjs` (`HOST_RESET`) y el marcado en `bind-canvas.cjs` (`LIVE_PILL`).

## Trampas reales (2026-10-24, todas vistas en vivo)

- **Éxito simulado:** los formularios del canvas sólo simulaban el envío; tras el corte `/blog/` decía «¡Listo!» sin
  registrar nada (~40 min). Regla: sin formulario real conectado, la suscripción no se muestra (`data-subscribe="off"`).
  Nunca un éxito que no pasó por `POST /submit`.
- **Morph del anfitrión:** el autoplay del slider re-renderizaba la sección y borraba el formulario montado. Solución:
  `data-dc-keep`.
- **Reset con especificidad de ID:** `#eobh :is(...) {all:revert}` anuló los estilos del renderer (texto duplicado,
  píldora aplastada); hubo que desconectar en minutos. Solución: `:not(greenhouse-form *)`.
- **Columna flex que encoge** (`.gxw`): el elemento colapsaba a su contenido. Solución: ancho explícito.
- **Salto visual antes del renderer:** sin respaldo, el hueco aparecía al cargar. Solución: `a.ghf-fallback` + aviso.
- **Turnstile y navegadores automatizados:** el envío desde el navegador integrado de Claude no salió (sin token, sin
  `POST /submit`). Es el comportamiento correcto; **no eludir la verificación**. La prueba de envío la hace una persona y
  se confirma en HubSpot (contacto suscrito al tipo `535702717`).

## Verificar sin exponer

- Fixture del renderer: `node scripts/growth/forms/fixtures/inline-pill.scenario.mjs` (≤ 1 % contra el canvas).
- Portada con el formulario real, sin envíos posibles:
  `node scripts/public-website/blog-v3/preview/serve.cjs --subscribe <formKey>` (proxy local GET-only `/__ghf/`).
- En vivo: `pnpm public-website:blog-home verify --browser` (8 anchos 320–1920 sin desborde + axe en tres tableros).
