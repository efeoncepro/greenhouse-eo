# Suscripción del blog → Growth Forms

Estado: **publicación detenida; trabajo conservado en develop y preview para revisión**. No reanudar release ni cutover sin nueva instrucción. Pedido del operador del 20/10/2026.

## Contrato preparado

- WordPress: `/blog/`, página `18456`, widget `4246f0d`, `ohio_contact_form` → CF7 `17852`.
- Reemplazar únicamente ese widget por un host `<greenhouse-form form-key="6bc62588-a4a0-4214-9501-13b0c2948c81" surface="fhsf-efeonce-blog-subscription" locale="es-CL" appearance="bare" color-scheme="light" base-url="https://greenhouse.efeoncepro.com">…</greenhouse-form>` y cargar el renderer estable una sola vez.
- Slug `efeonce-blog-subscription`, kind `subscribe`; email personal/corporativo, consentimiento requerido y sin preselección, captcha de la política publicada de Contacto. Ningún cambio del footer ni del CF7 compartido.
- Preparación inicial en `scripts/growth/prepare-blog-subscription-form.ts`; contrato final de Glitch, destino y publicación en `scripts/growth/activate-blog-subscription.ts`, no en WordPress.
- La versión final `fver-c6b28627-385c-43fc-995d-588bc0290fd0` tiene destino HubSpot directo y compilación de publicación correcta. Permanece en revisión hasta acreditar worker compatible. Nunca sustituir el destino por `greenhouse_only`.

## Composición corregida tras feedback visual

El operador rechazó la primera preview vertical. `host.css` conserva la banda y el texto del blog; correo y botón forman una fila unificada, sin sombras grandes ni tarjeta alrededor del consentimiento. Label y aviso siguen accesibles; privacidad visible. La clase local `.eo-blog-subscription` limita la composición al bloque. No modifica controles ni validación del renderer. Su CSS está preparado localmente y todavía no distribuido en WordPress.

### Refinamiento visual local — 20/10/2026

`host-layout.css` compone el bloque y `build-host-styles.ts` genera `host.css` con roles del paquete AXIS instalado: papel, azul y acción turquesa Growth con tinta oscura. No utiliza negro ni el token lima `cta-growth`. Bricolage Grotesque y Poppins consumen los archivos de marca existentes del plugin de consentimiento, con nombres de fuente aislados al bloque. La preview verifica su carga.

La columna Elementor del formulario deja el flex con wrap y utiliza flujo de bloque; el widget recupera altura natural. El estado de respuesta vacío no reserva una fila. Se conserva la validación al aparecer mensajes. El título separa introducción e idea principal por peso, y el espaciado móvil usa la escala de AXIS.

Verificación local: 1440, 390 y 320 px, altura del widget igual al formulario, sin desbordes, consentimiento sin preselección y errores de envío vacío. Capturas del bloque y del blog completo en `.captures/2026-10-20-blog-growth-form/`. Son previews en navegador con contrato interceptado; no acreditan publicación, entrega a HubSpot ni conversión GA4.

## Preparar y previsualizar

```sh
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/prepare-blog-subscription-form.ts
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/prepare-blog-subscription-form.ts --apply-draft
pnpm exec tsx scripts/public-website/blog-growth-form/build-host-styles.ts
pnpm exec tsx scripts/public-website/blog-growth-form/preview.ts
```

Sin flag, el preparador no escribe en Greenhouse. `--apply-draft` crea/reusa un único draft y lo deja en revisión; nunca publica. Rechaza versiones/ownership inesperados. Preview usa el renderer de producción y contrato interceptado sobre el blog real, bloquea cualquier POST de Forms y sólo elige cookies esenciales. No prueba aceptación ni entrega. Artefactos en `.captures/2026-10-20-blog-growth-form/`.

## Activación y verificación

La autorización inicial de release y reemplazo fue revocada por el operador. Esta sección conserva el historial y la secuencia pendiente; no autoriza ejecutarla. CLI y ADC se renovaron y comprobaron el 20/10.

1. `scripts/growth/activate-blog-subscription.ts --apply-hubspot` creó y releyó «Suscripción - Glitch | Blog Efeonce» (`8c7cf91b-a1c9-4cbe-9d8c-cac773692561`, portal `48713323`). Un correo visible, marcador de ocurrencia oculto, consentimiento al tipo activo `535702717`, lifecycle `subscriber`. Acepta Gmail. `--prepare` creó la versión review, destino y surface.
2. `scripts/gtm/activate-blog-subscription.ts` publicó Web7: `gh_form_submission_accepted` + `form_kind=subscribe` → `sign_up`; excluye subscribe de `generate_lead`. Sin PII ni Ads/Meta Lead. Server10 conservado; Web6 es rollback. Primera recepción GA4 todavía pendiente.
3. PR258 fue cerrada sin merge. El commit local `ae4a64767` en develop conserva el mapping explícito `communications` del adapter con sus pruebas. Dos workflows de pruebas fijan Ubuntu24.04 porque Ubuntu26.04 no soporta el browser de la versión instalada. No cambia workflows productivos, flags ni migraciones. Release canónico y readback del worker pendientes.
4. `--publish` exige `.captures/2026-10-20-blog-growth-form/release-readback.json` con evidencia real: `released`, `workerCompatible`, `targetSha`, `workerRevision`. No fabricar este recibo desde pruebas locales. Después, GET público independiente del contrato.
5. `replace.php` exige hash fresco, gates verdaderos y preflight controles/render. Guarda snapshot durable y usa `Document::save`, verifica hermanos/settings/metas/CF7, purga caché. Inputs: spec JSON y `host.css`; `apply:false` sólo verifica. Wrapper canónico `pnpm public-website:wpcli -- --eval-file scripts/public-website/blog-growth-form/replace.php --input-file <spec> --input-file scripts/public-website/blog-growth-form/host.css --wp-user 12`.
6. `verify-live.ts` revisa la URL pública a 1440/390 sin interceptar contrato ni escribir DOM. `--submit` hace un único envío interno controlado con consentimiento/cookies elegidos en UI y Turnstile real. Si ya existe una submission aceptada, prohíbe repetir. Una dificultad del captcha nunca autoriza evadirlo.
7. `scripts/growth/verify-blog-subscription.ts` relee submission, consentimiento, attempt, preferencia SUBSCRIBED y ocurrencia nativa única por marcador. Releer GA4 realtime y conservar el hit `sign_up` de la misma sesión sin correo ni payload crudo.

Los scripts de Growth usan `pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs`; los de navegador `pnpm exec tsx`. Artefactos operativos en `.captures/2026-10-20-blog-growth-form/` (ignorados).

Rollback: antes del cutover, ninguna reversión WP es necesaria. Después, restaurar el nodo original desde el snapshot mediante Document::save, preservando cambios concurrentes; no borrar CF7, submissions o attempts. El snapshot concreto se registra cuando exista, no se inventa una ruta de backup.

ADRs existentes: `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md` (tipo subscribe y host), `GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1.md` (medición), `GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md` (exclusión comercial).
