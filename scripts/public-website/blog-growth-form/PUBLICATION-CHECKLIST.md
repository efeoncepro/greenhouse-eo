# Suscripción del blog — pendientes de publicación y verificación

Fecha: 20/10/2026. **Estado: preparado en develop; ejecución detenida hasta autorización explícita del operador.**

Este checklist documenta trabajo futuro; no autoriza push, merge, release a main, publicación GTM/Forms, cambios WordPress ni envíos de prueba. El diseño fue aprobado. La preparación y sus pruebas están en la [auditoría](../../../docs/audits/public-site/2026-10-20-blog-growth-form-preparation.md); el contrato y las herramientas, en el [README del formulario](README.md).

## Punto de partida

- Trabajo local en develop: diseño `038316cfe`; verificación y corrección semántica `4adcf911e`.
- Forms `efeonce-blog-subscription`, key `6bc62588-a4a0-4214-9501-13b0c2948c81`, versión `fver-c6b28627-385c-43fc-995d-588bc0290fd0`, estado review en la última lectura. Ninguna versión publicada.
- Surface `fhsf-efeonce-blog-subscription`. WordPress `/blog/`, página18456, widget4246f0d; CF7 sigue activo.
- HubSpot portal48713323: formulario nativo `8c7cf91b-a1c9-4cbe-9d8c-cac773692561`, tipo de comunicación535702717. Ya configurado; no crear duplicados.
- GTM Web7 todavía usa `sign_up` para subscribe. La corrección local es `gh_newsletter_subscription_accepted`; Server10 sin cambios. Estos son estados fechados, no sustituyen una lectura fresca al reanudar.
- Ningún envío real ni recepción HubSpot/GA4 acreditados. Los checks completados de preparación no completan los checks de publicación de abajo.

## 0. Autorización y reanudación

- [ ] Registrar la autorización nueva del operador y su alcance: release, GTM, Forms, WordPress y único envío de prueba.
- [ ] Releer ramas/WIP, estado Forms/HubSpot, versiones GTM y el widget WordPress. Revisar diferencias respecto de la preparación, conservando trabajo concurrente.
- [ ] Revalidar la preparación y la propuesta local de corrección. No reutilizar fingerprints, hash del widget, recibos de release ni credenciales vencidos como evidencia vigente.

## 1. Release del código compatible

- [ ] Ejecutar el proceso canónico de promoción y sus checks sobre el alcance autorizado; PR258 está cerrada sin merge, no asumirla liberada.
- [ ] Verificar el commit realmente servido y la revisión del worker compatible con `communications` de HubSpot; checks locales no lo demuestran.
- [ ] Guardar `release-readback.json` con `released`, `workerCompatible`, `targetSha` y `workerRevision` respaldados por lecturas reales. No fabricar el recibo para desbloquear el publicador.

## 2. Corrección de GTM

- [ ] Partir de la versión live vigente y revisar la propuesta `measurement-correction.preview.json` contra su tag/fingerprint actuales.
- [ ] Corregir **el mismo tag**, sin añadir uno paralelo: `gh_form_submission_accepted` + `form_kind=subscribe` → `gh_newsletter_subscription_accepted`.
- [ ] Confirmar que sólo dispare tras aceptación del servidor; no por view, click, validación fallida o rechazo. Mantener subscribe excluido de `generate_lead` y separado del alta de cuentas `sign_up`.
- [ ] Confirmar parámetros permitidos (`form_slug`, `form_kind`, `surface_id`, correlación), sin email/PII. Mantener consentimiento analítico y ausencia de políticas Ads/Meta/UPD para la suscripción.
- [ ] Hacer readback del workspace, Quick Preview y prueba de navegador aislada sin registrar conversiones sintéticas en producción.
- [ ] Publicar sólo con autorización; releer la versión activa y guardar snapshots web/servidor. No modificar a mano el snapshot para simular que la corrección ya está publicada.

El activador histórico Web7 rechaza flags de escritura. No reutilizarlo ni quitar su guarda para publicar el mapping viejo. No activar Forms/WP antes de verificar la corrección de GTM.

## 3. Publicación Forms y sustitución WordPress

- [ ] Confirmar que el destino conserva el formulario HubSpot, el consentimiento requerido, el marcador de ocurrencia y el tipo de comunicación preparado. Mantener Gmail permitido y la casilla desmarcada.
- [ ] Publicar la versión Forms revisada mediante su comando gobernado y releer el contrato público, sin interceptarlo.
- [ ] Guardar respaldo durable y hash fresco del widget WP; ejecutar preflight del reemplazo antes de aplicar.
- [ ] Sustituir únicamente el widget de suscripción con el host y CSS aprobados; conservar CF7 compartido, footer y demás contenido.
- [ ] Verificar la URL pública en 1440, 390 y 320 px: fuentes, altura natural, sin overflow, campo/casilla/privacidad y estados de validación. Confirmar renderer único y Turnstile disponible.

## 4. Un envío controlado

- [ ] Acordar un correo de prueba autorizado y revisar que no exista ya una submission aceptada de esta verificación.
- [ ] Enviar una sola vez desde el blog público, con consentimiento explícito de newsletter, cookies analíticas elegidas en UI y Turnstile real. No evadir el captcha.
- [ ] Registrar hora, submission ID, versión/surface y correlación sin guardar el email ni payload crudo en git, logs o telemetría.
- [ ] Confirmar aceptación y mensaje de resultado. Si el resultado es desconocido, consultar recibos antes de decidir cualquier reintento; no repetir para fabricar evidencia.

## 5. Verificación independiente en HubSpot

- [ ] Confirmar submission `delivered` y attempt HubSpot `succeeded` del mismo envío. Un HTTP200 aislado no basta.
- [ ] Releer consentimiento guardado: política y casilla newsletter correctas.
- [ ] Encontrar **una única ocurrencia nativa** en el formulario HubSpot por `ef_greenhouse_submission_id`, con `conversionId` y cobertura de búsqueda completa.
- [ ] Releer la preferencia **SUBSCRIBED** para el tipo535702717 del correo autorizado. Existencia de contacto o campo de email no demuestra suscripción.
- [ ] Comprobar lifecycle subscriber para un contacto nuevo; preservar etapas posteriores de un contacto existente. No prometer pertenencia a una lista Glitch que no haya sido configurada y verificada.

## 6. Verificación independiente en GA4

- [ ] Observar una única ocurrencia `gh_newsletter_subscription_accepted` en DebugView/Realtime de la propiedad486264460 / stream `G-KYPPY57M14`, correlacionada con el envío autorizado.
- [ ] Confirmar `form_slug=efeonce-blog-subscription`, `form_kind=subscribe`, surface correcta y ausencia de correo/PII.
- [ ] Comprobar que **ese envío** no produzca `sign_up` ni `generate_lead`, ni active publicidad. No confundir eventos legítimos de otros formularios o de Meetings con esta prueba.
- [ ] Registrar evidencia de recepción GA4; `dataLayer`, tag fired o request del navegador por sí solos no acreditan recepción.

**Semántica:** el evento GA4 representa la solicitud aceptada por Greenhouse. La suscripción efectiva y la entrega se acreditan por separado con los checks de HubSpot. No fusionar ambos estados ni marcar la verificación completa cuando falte uno.

## Cierre y recuperación

- [ ] Completar únicamente los checks con evidencia, enlazar los recibos saneados en la auditoría y actualizar el tracking plan y handoff con el estado real.
- [ ] Si falla la entrega o medición, conservar submission y recibos, registrar el bloqueo y evitar otro envío automático.
- [ ] Si se requiere rollback autorizado, restaurar el widget desde el respaldo tomado en esta ejecución, preservando cambios concurrentes. Evaluar la versión GTM anterior capturada al reanudar; no volver ciegamente a Web6 ni borrar datos de suscriptores.

Los recibos operativos se conservan fuera de git en `.captures/2026-10-20-blog-growth-form/`; los registros versionados sólo enlazan evidencia saneada. Este checklist no afirma que la newsletter se haya enviado al buzón: esa entrega editorial es otra operación.
