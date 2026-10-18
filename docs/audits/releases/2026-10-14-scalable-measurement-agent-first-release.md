# 14/10/2026 — Configuración escalable, CAPI y operación para agentes

Estado: **publicado y verificado**. [PR #255](https://github.com/efeoncepro/greenhouse-eo/pull/255)
promovió **todo develop comprometido** `627ea6a8d92bf49dfbcc639725b5ea0841637cfb` a
`main` `9690efad0c1b9d70d9b168d41131857e686b0f81`, merge 15:07:52Z, árboles completos
idénticos. El WIP ajeno sin commit no se incorporó. Cierre documental posterior en develop.

## Capacidad y límites

Políticas SQL con revisiones inmutables por fuente, versión, surface y origen; mapping tipado
y destinos independientes. Un formulario compatible nuevo se configura mediante datos, sin
nuevo código, build, redeploy ni publicación GTM. Un tipo nuevo de campo, proveedor, evento,
comportamiento u origen fuera de los dos hosts aprobados requiere su cambio gobernado.

Los agentes son clientes de primera clase. `pnpm --silent growth:measurement` ofrece
`discover → validate → apply → verify` sobre la Product API HTTPS autenticada y el mismo
cliente HTTP del panel. Discovery versionado, permisos efectivos, catálogo tipado, dry-run
sin escritura, CAS, idempotencia, auditoría y recibos privados permiten operar y recuperar
fallos sin SQL ni navegador. No se amplían OAuth, MCP ni la autoridad del operador.
[Manual operativo](../../manual-de-uso/growth/configurar-medicion-conversiones.md).

Growth Forms valida, normaliza y acepta; el destino HubSpot Forms y su outbox entregan a CRM.
Medición usa una proyección consentida independiente. Su mapping no sustituye el de HubSpot.
Denegar publicidad, desactivar una policy o fallar medición conserva la aceptación y el outbox
comercial. Una entrega publicitaria no demuestra entrega a CRM, ni viceversa.

Se conserva la infraestructura existente. Sin campañas ni proveedores nuevos. CRO, abandono,
newsletter y resultados CRM siguen fuera del goal limitado: TASK-2035 permanece parcial.
TASK-2034 conserva la primera conversión comercial consentida, conciliación del ledger con
proveedores y evolución de EMQ como pendientes de tráfico real.

## Release y runtime

- CI exact main `38586628533`, CI Deep `38586628413` y smoke `38586649584`: success.
- Vercel Production `dpl_843eUPPMzYQdBgxt9ELX3WD5w9oQ`: READY; contrato HTTP del alias
  `https://greenhouse.efeoncepro.com` verificado independientemente.
- [Orquestador 38591329633](https://github.com/efeoncepro/greenhouse-eo/actions/runs/38591329633):
  success, 15:40:05Z–15:56:33Z, dos gates Production aprobados para ese mismo run.
- Manifest `9690efad0c1b-b80fdb2e-e48e-4d1b-9724-3dd3286b1baa`: **released**,
  15:43:52.999Z–15:56:19.316Z. Sus arrays workflowRuns y postReleaseHealth vacíos no se usan
  como prueba: el job real de health pasó a las 15:54:05Z con HTTP 200 y el watchdog independiente
  16:00:03Z fue `ok`, exit 0, seis workers sincronizados, drift/data_missing cero.
- Ops `ops-worker-00778-d74`, Ready=True, 100 %, source `627ea6a8d`; Ops/auth/artifact
  conservaron esa revisión por change-gate con árbol completo idéntico a main. Los otros tres
  workers sirven el SHA target. No se redeplegó por diferencia de etiqueta equivalente.
- Captura Production ON; Ops HubSpot secure-submit, Meta, Google UPD y retención ON.
- Migración `20261014122346796_task-2036-growth-measurement-policy.sql`, grants y tipos
  aplicados; 679 migraciones al día. Trece fuentes y siete políticas publicadas tras cleanup.

El preflight verificó los once checks ajenos a clasificación del batch. La excepción auditada
cubre exclusivamente migraciones aditivas y permisos del release completo aprobado; el CLI
conserva `readyToDeploy=false/degraded` por esa advertencia. No se presenta como preflight sin
warnings ni se omitieron CI, Deep, smoke o READY. No hubo mutación SQL del control plane.

## Archivos y tags cambiados

- Contexto y matching: `src/lib/growth/measurement/visitor-request.ts`, `payload.ts`,
  `prepare.ts`, `dispatch.ts`, contratos/store y captura de los POST de Forms/Meetings.
- Política/API/agentes: `policy-contract.ts`, `policy-command.ts`, `policy-source.ts`,
  `policy-store.ts`, `policy-client.ts` en el mismo módulo; ruta
  `src/app/api/admin/growth/measurement/route.ts`, CLI `scripts/measurement/policy-cli.ts`,
  script package y consumer del inspector Growth Forms. El viejo cliente de vista reexporta
  el compartido; no contiene una segunda lógica de permisos.
- Bridge `scripts/measurement/hubspot-consent-bridge.js`, bundle consent-context y hosts:
  WordPress `/wp-content/plugins/eo-measurement-consent/assets/consent-bridge.v1.js`, Think
  `/measurement/consent-bridge.v1.js`. Ambos HTTP 200 con bytes iguales a la fuente, SHA256
  `4bbd77b35fdb60b128712bf4e00d64dd37815f0d93f5434868d559264f71b28a`, leídos 15:28Z.
- Server GTM `GTM-K2X4ZTTK`: **live 9**, estricto schema 2, publicado y releído 15:55:12Z.
  Único cambio de entidad: **customTemplate 30**, Client de ingreso, fuente
  `scripts/measurement/sgtm-lead-client.js`, SHA256
  `0c42c4e93a6e79fb291f5aa7bb353b6486b9a572146b719df2b6e78fe9eba1d7`.
  Se retiró compatibilidad temporal schema 1 después de verificar productores y cola vacía.
  Pixel **708931297255942**, tag Meta 6, tag GA4 18 y demás entidades sin cambios.
  Contenedor Web `GTM-NGHPGRLZ` permanece live 5. No test code fijo en fuente ni tags.

IP/UA vienen del request original del visitante; _fbp/_fbc consentidas y fbclid de landing
persistido tras grant. Esos cuatro campos van sin hash. Email, teléfono internacional,
nombres y external_id estable se normalizan antes de SHA-256 hex. `action_source=website`,
URL real segura sin query/fragment y tiempo ocurrido UNIX segundos. UUID estable para retries
y espejo de conversión; no hay Meta Lead de navegador activo. Consentimiento/GPC/revocación,
redacción Sentry y payload cifrado preservados. Google UPD conserva sólo user_data, sin una
segunda conversión GA4 y sin canaries Google sintéticos durante esta validación.

## Verificación proporcional

- 24 pruebas focales agentes/UI/red y 13 de frontera aceptación/HubSpot PASS. Foundation y
  Client/atribución conservan sus resultados propios; no se suman suites solapadas.
- UI real draft/review/publish con GET independiente y 12 estados. Fallos/denegación/conflicto
  de presentación usan intercepts locales explícitos. GVC premium final source 627ea6a8d,
  1440×1000/390×844, focus/reduced-motion/axe/layout/runtime/enterprise PASS; ambas imágenes
  efectivamente abiertas y revisadas. Scorecard 4.51, piso 4.3; contrato visual PASS. El walker
  completo local encuentra un symlink roto ajeno bajo una captura histórica: se preservó,
  no se debilitó el gate. Evidencia `.captures/2026-10-14T14-46-00_growth-measurement-policy/`.
- Sesión canónica interna y permisos efectivos usados por la CLI. La provisión de fixtures
  se hizo con comandos canónicos del dominio Forms desde su helper Ops; no se afirma que ese
  aprovisionamiento use sólo HTTP. La operación de políticas sí es exclusivamente HTTP.

### Fuente creada después del release: prueba de escalabilidad

Fuente `7f558eac-91f5-467e-bf31-ad1ef810817b`, creada 15:56:40.985Z después del completion
GitHub 15:56:33Z. Sin embed key ni submissions/bookings/contactos. CLI de producción: 14 llamadas,
discovery, dry-run sin mutación, negativos mapping/CAS, draft/replay/verify/review/publish.
Policy `c885a92e-e8bb-4bbb-8414-77efa7c83016`, revisión `350c3cda-3890-4fb9-abbf-f0465b522474`.
Mapping explícito businessEmail/phone/firstName/lastName, Meta únicamente, sitio principal.

Después se comprobó preparación canónica → cifrado → descifrado → CAPI live 9 → Meta Test Events.
Snapshots antes y después conservan el mismo main, deployment Production, Server 9, template y
tags: **ningún código/build/redeploy/publish GTM durante el alta y activación**.
Policy desactivada con CLI/GET y form/surface archivados con readback. Lectura HTTP independiente
16:07:01Z: fixture ausente, cabeza null, trece fuentes y siete políticas publicadas. Se conserva
la auditoría metadata. También se archivó la fixture anterior de staging.

### Test Events final sobre Server 9

Código real del Administrador usado temporalmente por petición; nunca persistido en código/tag.
Se renovó la escucha de la pestaña antes de la confirmación final. Eventos sintéticos/reservados:

| Evento | Host / fuente | Recepción UI independiente |
| --- | --- | --- |
| `43b16ffe-45cd-43c6-815d-a3077bb8e3db` | think.efeoncepro.com / formulario | Processed, Server, website; ocho claves; sin teléfono porque la fuente no lo mapea |
| `a5934334-8ac5-4c92-8a5d-810ad0ca22f2` | efeoncepro.com / agenda | Processed, Server, website; nueve claves |
| `c7dd1839-98ad-4890-b905-c1d4baa65863` | efeoncepro.com / fuente nueva | Processed, Server, website; nueve claves |

Nueve claves: client_ip_address, client_user_agent, fbp, fbc, external_id, em, ph, fn, ln.
Replay con el mismo UUID respondió 200. Consentimiento denegado, identidad sin hash y schema 1
fueron rechazados 400; no generaron eventos. URL exacta verificada en Preview y mapping oficial
directo page_location→event_source_url; la UI resumen de Meta agrupa por dominio.

Recibos privados: `.captures/meta-lead-fix-2026-10-14/` conserva `policy-final-published.json`,
`policy-final-live-listening-canary.json`, capturas/texto Meta finales, `policy-production-fresh-agent-proof.json`,
`policy-production-fresh-meta.json`, `production-new-source-boundary-proof.json`, cleanup/GET,
manifest/watchdog y hosts. Ningún payload con PII ni credencial se incorpora al repositorio.
No se enviaron pruebas ordinarias al dataset. Test Events no demuestra mejora EMQ, elegibilidad
de remarketing ni primera entrega comercial real; esos resultados siguen pendientes.

## Cierre documental

TASK-2036/2037 pasan a complete con criterios y evidencia registrados; TASK-2035 y TASK-2034
permanecen parciales por los límites anteriores. Skills Forms/Meetings/GTM espejo Codex/Claude,
manuales, runtime, tracking plan, flags, índices, handoff y ledger de tiempos sincronizados.
Task lint sin errores ni warnings para las tres tasks del goal; UI quality/contrato visual PASS.
Ops lint devuelve cero errores y 14 advertencias de paridad de epics históricos ajenos, sin
atribuirlas a este release ni cambiar esos artefactos. No cambió un contrato visual global ni
una regla transversal: DESIGN/AGENTS/CLAUDE y el harness de implementación no requieren delta.
