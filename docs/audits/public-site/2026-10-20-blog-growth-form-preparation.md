# Growth Form de suscripción del blog — preparación 20/10/2026

**Status real: publicación detenida por el operador; conservar trabajo en develop y revisar preview.** Sin merge ni release a main, sin cutover WordPress y sin envío real. HubSpot nativo y GTM Web7 ya estaban aplicados antes de la detención. Forms permanece review y el blog conserva CF7. La autorización de publicación anterior quedó revocada; no reanudarla sin instrucción nueva. Los apartados siguientes conservan el historial.

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

Primera preview vertical rechazada como pesada. La composición candidata usa `host.css` con correo y botón contiguos, consentimiento sin tarjeta y jerarquía compacta; mantiene controles/estado/validación en el renderer. El preview verifica alineación de input/CTA además de overflow y errores. No está publicada ni aprobada visualmente por el operador.

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
