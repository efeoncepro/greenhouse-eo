# Meta Lead — contexto del visitante, 14 de octubre de 2026

## Alcance y diagnóstico

Autorización: corregir end-to-end el matching del píxel708931297255942 sin cambiar tags ajenos,
respetando consentimiento y sin pruebas ordinarias al dataset. ADR existente:
[Meta mediante GTM Server](../../architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md).
No hay nuevo proyecto, servicio, cron, secreto ni dependencia.

El backend publicado ya tomaba IP/UA y website; el canary anterior omitía IP/UA. Consulta PG
últimos7d al corte:0 measurement_conversion. Test Events muestra varios Leads anteriores de
servidor. No se atribuyen los14 casos reportados a conversiones comerciales sin conciliación.
Defectos confirmados: external_id ausente; fbclid sin persistencia entre páginas y _fbp no
creado en la ruta sólo CAPI. El tag oficial sí soportaba los nueve campos.

## Cambios

- payload.ts: email lowercase/sin whitespace; nombres NFKC/lowercase/sin signos/espacios;
  external_id SHA256(email normalizado), fallback teléfono internacional; em/ph/fn/ln preservados.
- visitor-request.ts + POST Forms/Meetings: snapshot de primer XFF/IP real válido y UA original,
  formatos IPv4/v6/puerto, sin hash ni fallback del worker. Proyección cifrada/retry existentes.
- bridge + context.ts: landing fbclid en memoria; _fbp first-party y _fbc de clic real sólo tras
  ads grant. Cookies compartidas90d, sessionStorage consentido de fallback; GPC/revoke limpia.
- sGTM customTemplate30: external_id SHA256 permitido y test_event_code autenticado por petición.
  Server7 publicado12:06:32Z, comparación semántica contra6: sólo template30 diferente.
  Meta tag6/Pixel, GA4 tag18, todos los activadores, variables, Clients y transforms intactos.
- Sentry scrub: submit/book sin body, headers, cookies, env, query ni user. Logs de medición
  conservan sólo clases/contadores. No se registran contactos, IP, identificadores ni secretos.
- Herramienta verify-lead-context.ts exige código real temporal en env; prepare-preview-canary
  ya no escribe códigos en el tag. Entrada legacy delega al verificador seguro.

## Validación externa

Código real obtenido y verificado en la UI Meta Probar eventos; se suministró sólo en env de
la ejecución y en top-level test_event_code de cada petición. No se fija ni reproduce aquí.
Preview workspace9 compilado y diff congelado. HTTP saliente a Meta v25: Lead, website,
event_source_url https://efeoncepro.com/aeo-2/, event_time entero UNIX y los nueve campos de
user_data; 200/events_received1. La UI muestra sólo el dominio en su resumen de URL.

| Prueba | efeoncepro.com formulario | Think reserva |
| --- | --- | --- |
| Preview Test Events | 6c979cdd-e25c-4dae-9697-46017844c143 | c553b759-0689-418d-8d56-617bc5d07d54 |
| Server7 live, Test Events | 25564838-25da-4fbc-8214-80e0cb44388e | 7f4e4062-3488-470b-ac11-da793b3daa74 |
| Meta UI | Procesado / Servidor / website | Procesado / Servidor / website |
| Matching recibido | IP, UA, fbp, fbc, external_id, em, ph, fn, ln | mismos nueve campos |
| Replay mismo UUID | HTTP200, ID conservado | HTTP200, ID conservado |
| Negativos | denied y external_id crudo →400 | denied y external_id crudo →400 |

Datos de prueba sintéticos: email example.com, teléfono reservado, IP RFC5737 y UA explícito.
No se crean submissions, bookings ni contactos CRM. No se envía UPD Google en el canary.
El replay en Test Events no certifica por sí solo deduplicación en reportes de producción.
No existe emisor Pixel Lead de navegador: un único sender backend; browser futuro requerirá
Lead/eventID compartido. El espejo GA4 sigue siendo una sola conversión.

## Hosts, release y rollback

WordPress: bridge publicado con guardas de hashes, PHP idéntico y backup remoto
/tmp/efeonce-consent-before-20261014-120656.tar. Runtime commit421eaa3.
Think: PR14 mergeado43806bd30237; Preview Vercel verde antes de merge. Bridge SHA256 común:
4bbd77b35fdb60b128712bf4e00d64dd37815f0d93f5434868d559264f71b28a.

Backend/renderers: commit ba9b8c9cc en develop, sin push/release de Greenhouse al corte.
El operador pidió consolidarlo con configuración escalable; goal acotado confirmado y
[plan de TASK-2035](../../tasks/plans/TASK-2035-plan.md) pendiente del checkpoint P1.
No afirmar backend desplegado sólo por el canary directo sGTM.
QA nativo live WP/Think1440/390:4 superficies PASS, banner automático/default denied,
ads-only, preferencias/reapertura, revocación, sin nuevas PageViews a destinos (interceptadas).
Rollback sGTM: versión6. Bridge: snapshot exacto anterior; Think revert del PR14. Backend:
release previo main d692ab51dc48. Captura/entrega pueden desactivarse por sus flags existentes,
sin tocar la aceptación comercial ni reactivar triggers legacy12/17.

Pruebas locales al corte:63 Vitest (measurement/context/Meetings/Sentry),25 Client,8 atribución
y16 bridge. CI del release, readback de hosts y estado final se añaden al cerrar.

## Límites

Primera conversión comercial consentida real sigue sin observar; TASK-2034 permanece parcial.
La EMQ se vuelve a medir después con tráfico real; no se promete puntaje ni serving.
No se amplió la allowlist ni se implementó la configuración/CRO de TASK-2035.


## Cierre runtime14/10 —16:07Z

[Release completo y evidencia final](../releases/2026-10-14-scalable-measurement-agent-first-release.md):
PR255/main9690efad; CI/Deep/smoke/Production READY; orquestador38591329633 success y manifest
9690efad0c1b-b80fdb2e-e48e-4d1b-9724-3dd3286b1baa released. Dos gates aprobados, health200,
watchdog ok/6 runtimes/drift0. Ops/auth/artifact conservan627ea6a8d con árbol completo idéntico
al target; no reconstruir por etiqueta. Server9 publicado15:55:12Z, sólo customTemplate30,
sha0c42c4e…; schema1 live400 y controles de consentimiento/identidad cruda400.

CLI agent-first probada en staging y producción. Una fuente nueva posterior al contrato inicial
se creó15:56:40Z y configuró por HTTP; policyc885a92e-e8bb-4bbb-8414-77efa7c83016, revision1.
Meta Test Eventc7dd1839-98ad-4890-b905-c1d4baa65863: Processed/Server/website y nueve claves.
Think43b16ffe-45cd-43c6-815d-a3077bb8e3db: ocho claves (sin teléfono no mapeado); agenda
a5934334-8ac5-4c92-8a5d-810ad0ca22f2: nueve. UI expandida verificada y capturada; código real
sólo temporal por petición. Una sesión de escucha inactiva exigió reactivar Web antes de la
confirmación UI; los ACK anteriores no se presentaron como esa confirmación.

Snapshots antes/después de la nueva alta: mismo main9690efad, deploymentdpl_843eUPPMzYQdBgxt9ELX3WD5w9oQ,
Server9 y fingerprint/template/tags; cero cambios de código/build/redeploy/publicación por el alta.
Disable por CLI/readback; Form/surface archivadas y HTTP posterior13 fuentes/siete políticas.
Cero submissions/bookings/contactos CRM o canaries GA4. Configuración de medición nunca reemplaza
el destino HubSpot Forms/CRM. Tráfico comercial/EMQ y el resto de TASK-2035 continúan pendientes.
