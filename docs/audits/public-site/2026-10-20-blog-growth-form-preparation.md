# Growth Form de suscripción del blog — preparación 20/10/2026

**Status real: diseño aceptado por el operador y preparación verificada en develop; publicación detenida.** Sin merge, push, release a main, cutover WordPress ni envío real en esta revisión. El blog conserva CF7 y Forms permanece en review. HubSpot nativo y GTM Web7 fueron aplicados antes de la detención. La autorización anterior de publicación sigue revocada.

Pendientes operativos y criterios de evidencia: [checklist junto al formulario](../../../scripts/public-website/blog-growth-form/PUBLICATION-CHECKLIST.md). Documentado por pedido del operador; no ejecutado ni autorizado para publicación.

## Verificación final de preparación — 20/10/2026, 22:14 UTC

- [x] Diseño aceptado en móvil/escritorio; composición de marca guardada en `038316cfe`, sólo develop local.
- [x] Lectura independiente de Forms: versión `fver-c6b28627-385c-43fc-995d-588bc0290fd0` en review, ninguna versión publicada. Compilación para publicación PASS y contrato idéntico al de la preview aprobada.
- [x] Email único requerido, sintaxis de correo y emailPolicy off: admite Gmail/personal/corporativo. Consentimiento requerido y sin preselección, privacidad visible, Turnstile requerido.
- [x] HubSpot portal48713323 releído: formulario `8c7cf91b-a1c9-4cbe-9d8c-cac773692561`, email sin dominios bloqueados, marcador oculto de ocurrencia, consentimiento al tipo activo535702717 y lifecycle subscriber. Mapping de consentimiento y texto idénticos al contrato del motor.
- [x] Fuera de publicidad: fuente no comercial, Google Ads no elegible, cero políticas comerciales publicadas para esta identidad. Sin activar Meta/UPD/Ads.
- [x] GTM Web7/Server10 sin drift con los snapshots. Lectura del vínculo real tag→trigger confirma aceptación servidor + kind subscribe, excluida de generate_lead. El tag de Meetings generate_lead conserva su disparador separado.
- [x] Browser1440/390/320: correo inválido rechazado, Gmail válido exige consentimiento, cero POST submit y cero eventos accepted. Verificación opcional de email interceptada y abortada, sin tráfico de prueba hacia Forms. TypeScript y ESLint PASS.
- [x] 133 pruebas PASS: renderer/compilador/adapter HubSpot (103), telemetría y políticas (30). Sin contactos ni conversiones sintéticos enviados.
- [ ] Publicación del evento editorial corregido: pendiente de autorización y preview gobernada.
- [ ] Release compatible del worker, publicación Forms y sustitución WP: detenidos por el operador.
- [ ] Turnstile real, entrega/ocurrencia HubSpot, estado SUBSCRIBED y recepción GA4 de la misma suscripción: requieren el flujo publicado y un envío autorizado; no acreditados por estas pruebas.

### Corrección semántica de medición

El operador observó que `sign_up` corresponde al alta de una cuenta. Confirmado en la [referencia oficial de GA4](https://developers.google.com/analytics/devguides/collection/ga4/reference/recommended-events); Google muestra un evento custom para newsletter en su [guía de eventos](https://developers.google.com/analytics/devguides/collection/ga4/events). La elección inicial fue incorrecta.

La preparación local corrige **el mismo tag**, sin añadir otro: `gh_form_submission_accepted` + `form_kind=subscribe` → **`gh_newsletter_subscription_accepted`**, conforme a la gramática custom `gh_` del repositorio. Significa solicitud aceptada por Greenhouse, no creación de cuenta ni entrega/suscripción confirmada en HubSpot. Conserva `form_slug`, `form_kind`, `surface_id` y correlación, sin correo ni PII; no se marca key event ni se activa publicidad en esta operación.

**La versión activa Web7 aún usa `sign_up`.** El snapshot se conserva como verdad de lo publicado. `measurement-correction.preview.json` es sólo una propuesta local con versión/fingerprint esperados; no acredita workspace, Quick Preview ni publicación. El activador histórico Web7 rechaza sus flags de escritura para impedir reutilizar esa taxonomía por accidente. No activar el formulario antes de revisar y publicar la corrección con autorización nueva.

Verificador reproducible (lectura de Forms/HubSpot/GTM y escritura de evidencia local solamente):

```sh
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/verify-blog-subscription-prepared.ts
pnpm gtm:snapshot --check
pnpm exec tsx scripts/public-website/blog-growth-form/build-host-styles.ts --check
pnpm exec tsx scripts/public-website/blog-growth-form/preview.ts
```

Evidencia local: `.captures/2026-10-20-blog-growth-form/{prepared-readback.json,measurement-correction.preview.json,preview-evidence.json}`. Ningún comando de esta lista publica ni envía una suscripción. La preview bloquea todos los POST de Forms, incluida la verificación opcional del email.

## Historial de preparación (los estados de abajo son del momento descrito)

## Hechos verificados

- SSH/WP-CLI devuelve `https://efeoncepro.com`, página `18456` publicada, widget `4246f0d` con CF7 `17852` «Subscribe Form». La lectura no modificó contenido.
- No había Growth Form `subscribe`. Se creó vía `authorDraftForm`, luego `reviewForm` y readback independiente: `efeonce-blog-subscription`, key `6bc62588-a4a0-4214-9501-13b0c2948c81`, versión `fver-eb219d21-2683-466b-8aaf-dd9280b1b82a`, estado `review`.
- Correo personal/corporativo (`email_syntax`, emailPolicy off), consentimiento explícito sin marcar, captcha heredado de política publicada. El usuario preguntó por Gmail; se recomendó permitirlo en suscripción editorial. No se cambió ningún form comercial.
- Publicación bloqueada intencionalmente por destino ausente. `reviewForm.ok` en modo preview no certifica publicabilidad: se comprobó `compileFormVersion(...,{forPublication:true}).ok=false`.
- API HubSpot: portal `48713323`; tipo `535702717` Marketing Information activo/Email/no interno. Catálogo de formularios consultado completo sin coincidencias newsletter/suscripción/Glitch. No se creó destino ni se escribió CRM.
- Preview con renderer servido en producción y contrato de draft interceptado: 1440 y 390 px, un email, una casilla desmarcada, CTA Suscribirme, sin overflow, validación del envío vacío sin POST, dataLayer `gh_form_viewed` / `form_kind=subscribe`. No certifica Turnstile humano ni entrega.

## Bloqueos y límites

El mapping `communications` está en WIP previo local del adapter/activador; no se incorporó ni liberó ese trabajo. El activador requiere checkbox opcional; este form subscribe requiere consentimiento a su propósito único. Ese caso debe resolverse explícitamente antes de configurar destino. No activar una promesa de newsletter que sólo guarda un contacto.

El snapshot versionado GTM tiene `generate_lead` con trigger genérico `gh_form_submission_accepted`, sin distinción subscribe. La corrección propuesta es `sign_up` para subscribe y exclusión de generate_lead, sin Ads. **Snapshot no revalidado live**: `pnpm gtm:snapshot --check` falló por `invalid_grant/invalid_rapt`; gcloud CLI también pide reautenticación. No hay evidencia fresca del worker ni GTM por estas vías. No se alteraron permisos/credenciales.

## Evidencia y continuación

- [Preparación y secuencia de activación](../../../scripts/public-website/blog-growth-form/README.md).
- `.captures/2026-10-20-blog-growth-form/{draft-readback.json,render-contract.preview.json,preview-evidence.json,blog-1440.png,blog-390.png,form-1440.png,form-390.png}` (local/ignorado).
- Autoridad arquitectónica existente: Forms Engine Decision; Measurement Tagging Deployment Decision; Growth Measurement Policy Decision. Sin schema nuevo ni arquitectura de host paralela.
- Validación: preview funcional/visual PASS. Publicación, primer envío real, preferencia HubSpot y evento GA4 pendientes. No se necesita rollback público porque el sitio no se mutó.

## Corrección visual solicitada por el operador

Primera preview vertical rechazada como pesada. La composición candidata usa `host.css` con correo y botón contiguos, consentimiento sin tarjeta y jerarquía compacta; mantiene controles/estado/validación en el renderer. El preview verifica alineación de input/CTA además de overflow y errores. En este corte inicial aún no estaba aprobada; la versión refinada fue aceptada posteriormente, como se registra arriba.

## Activación autorizada — 20/10/2026

- CLI y ADC renovados con el runner canónico; `--check-only` vigente. Sin cambio de IAM ni scopes.
- Dirección editorial actual: suscripción única blog/Glitch, cada lunes (delta de TASK-1802 del20/10); misma identidad Forms, nueva versión con consentimiento explícito de Glitch.
- HubSpot portal48713323: formulario **Suscripción - Glitch | Blog Efeonce**, `8c7cf91b-a1c9-4cbe-9d8c-cac773692561`. Email requerido sin bloqueo de proveedores personales; consentimiento a tipo535702717; marcador de ocurrencia oculto `ef_greenhouse_submission_id`. GET independiente verificó campos/consentimiento. No hay lista Glitch en el catálogo de listas consultado; no se promete membresía de una lista inexistente.
- Forms versión `fver-c6b28627-385c-43fc-995d-588bc0290fd0` review, destino direct y surface `fhsf-efeonce-blog-subscription`. Publisher exclusivo verifica `form_kind=subscribe`; no cambia la guarda opcional de formularios comerciales. Compilación de publicación PASS; aún no publicado.
- GTM Web7 publicado21:28:42Z: añade sign_up/trigger subscribe y excluye subscribe del trigger de generate_lead;3 entidades cambiadas. Quick Preview sin error, versión congelada y readback live. Baseline rollback Web6; Server10 sin cambios. Esto acredita configuración, no primera recepción GA4.
- PR258: candidato89b4b89f1262d557a4b437c4849143125aa4dc88, sólo adapter HubSpot y sus pruebas.19tests + ESLint PASS. Sin flags, schema ni migraciones nuevas. CI/preview pendientes.
- WP guard hash3508e426… confirmado; preflight controles/render de10tipos PASS sin escritura. Writer y rollback guardados en `scripts/public-website/blog-growth-form/`; el CSS vive sólo dentro del widget de página, no exige tocar el tema.
- Preview1440/390 con el nuevo consentimiento PASS. Primer envío público, attempt de worker, preferencia SUBSCRIBED, ocurrencia nativa y GA4 todavía pendientes.

### Precisión de alta y reparación de CI

El formulario nativo fue actualizado y releído con `configuration.lifecycleStages` subscriber para Contact y Company; ambos valores existen en las propiedades del portal. Esto sigue el [contrato de Forms](https://developers.hubspot.com/changelog/update-to-forms-api-v3-and-the-lifecycle-stage). Las actualizaciones automáticas conservan etapas posteriores de contactos existentes ([regla de HubSpot](https://knowledge.hubspot.com/records/use-lifecycle-stages)).

CI39500396799 falló al provisionar Chromium: Playwright instalado no admite ubuntu26.04-x64. Candidato `bd936fa7c09f1b37103e07430ab19496fe2a549e` añade exclusivamente el pin Ubuntu24.04 en CI/CI Deep; revisión arquitectónica aprobada y equivalencia YAML de jobs/steps verificada. Cuatro archivos en PR258; ningún cambio del orquestador/gates productivos. El clasificador marca `cloud_release` por las rutas de workflows; se documenta la excepción acotada del batch, manteniendo la exigencia de CI, Deep y smoke verdes. Rollback: revertir el PR por el orquestador.
