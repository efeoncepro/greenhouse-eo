# Growth Measurement Policy — API interna V1

Contrato implementado de configuración; versión de discovery `growth-measurement-policy.v1`.
[ADR](../architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md),
[funcionamiento](../documentation/growth/medicion-gtm-ga4.md),
[manual CLI/panel](../manual-de-uso/growth/configurar-medicion-conversiones.md) y
[evidencia productiva14/10](../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).

## Alcance y autoridad

`GET|POST /api/admin/growth/measurement` es Product API interna, autenticada por sesión canónica
ligada a una persona (`agent-session` o portal). El actor y tenant se resuelven en servidor.
No es una ruta pública de ingestión ni un endpoint `api/platform/*`; no acepta tokens de integración,
actor/rol elegido en el cuerpo ni implica nuevas tools MCP/Nexa, scopes OAuth o acceso multi-tenant.

| Capacidad efectiva | Operaciones |
| --- | --- |
| `growth.measurement.read` / `read` / `tenant` | Discovery y readback |
| `growth.measurement.author` / `execute` / `tenant` | Draft y review |
| `growth.measurement.publish` / `execute` / `tenant` | Publish |
| `growth.measurement.disable` / `execute` / `tenant` | Disable |

Todas exigen tenant `efeonce_internal`; un rol privilegiado dentro de tenant cliente no basta.
El preflight requiere read más la capacidad de la acción. La CLI/panel necesitan también read
para verificar una escritura, aunque la autorización del command comprueba su capacidad específica.

## Discovery y validación

GET devuelve `{sources, policies, permissions, contract}`. `contract` identifica versión,
endpoint, operaciones, campos requeridos, destinos, lifecycle y reglas de concurrencia/retry.
`sources` incluye scope estable, nombre, versión efectiva, orígenes elegibles, campos tipados
(`email|tel|text`, derivados cuando corresponde) y blockingReasons. `policies` incluye revisión,
estado, config y publishedRevisionId. No contiene contactos, secretos ni cuerpos de conversiones.

POST `{ "dryRun": true, "command": <comando> }` vuelve a leer catálogo/autoridad y devuelve
`contractVersion`, `dryRun`, `ok`, blockers y, cuando válido, command/impact de metadata.
No escribe drafts, auditoría ni conversiones. La validación no reserva estado; ejecución vuelve
a validar bajo lock. Errores schema devuelven rutas/códigos sin valores del input.

## Comandos estrictos

Cada POST de escritura recibe un comando directo (sin envelope dryRun):

| Acción | Campos |
| --- | --- |
| `draft` | `action`, `scope`, `config`, `expectedPublishedRevisionId`, `idempotencyKey` |
| `review`, `publish`, `disable` | `action`, `policyId`, `revisionId`, `expectedPublishedRevisionId`, `idempotencyKey` |

`expectedPublishedRevisionId` es UUID o null y debe coincidir con la cabeza actual.
`idempotencyKey` es UUID por operación intencional. Repetirlo con otro contenido produce conflicto.
`scope` contiene `sourceKind:form_submission|meeting_booking`, `sourceKey` y `surfaceId`.
Forms usa form_key UUID estable; Meetings usa scheduler_key. Descubrirlos, nunca inferirlos del slug.

`config` contiene:

- `purpose:commercial_lead`, `sourceVersion` exacta del catálogo y `origins` elegibles.
- `destinations:[]|[meta]|[google_upd]|[meta,google_upd]`, sin duplicados; activación expresa.
- `mapping` con claves opcionales email/phone/firstName/lastName y valores que son **nombres de campos**.
  Email o teléfono es obligatorio; tipos deben coincidir. No contactos literales, hashes, IP, JS o URLs libres.

El servidor limita origins a los dos HTTPS aprobados. Forms pinnea versión publicada; Meetings,
fingerprint del binding activo. Cambiar versión/alcance/campos exige revisar/publicar una revisión
compatible. No confundir la política de matching con el fieldMapping de HubSpot Forms o telemetryPolicy.

Respuesta de command: `{ok, policy?, blockingReasons, error?}`. Éxito entrega revisión metadata;
publicación apunta la cabeza a esa revisión, reemplazando la previa. Ediciones crean revisiones
inmutables; review precede publish. Disable exige revisión publicada actual y elimina su cabeza.
Auditoría append-only registra actor, operación, fingerprint/clave y resultado sanitizado.

| HTTP | Interpretación |
| --- | --- |
| 200 | Lectura/validación válida o command aceptado; todavía hacer readback |
| 401 / 403 | Sesión o permisos no autorizan |
| 400 | JSON malformado |
| 404 | Revisión no encontrada |
| 409 | Cabeza/estado concurrente o clave con contenido diferente |
| 413 | Cuerpo mayor de 16.384 caracteres |
| 422 | Comando/configuración inválida o bloqueada |
| 503 | Catálogo/store no disponible |

## Recuperación y verificación

Cliente compartido: `src/lib/growth/measurement/policy-client.ts`. CLI:
`scripts/measurement/policy-cli.ts` (`pnpm --silent growth:measurement`). Panel reutiliza ese cliente;
permisos y reglas viven en commands/store del servidor, no en dos implementaciones consumidoras.

Reservar recibo privado0600 antes de POST. Guardar revisión recibida **antes** del GET independiente.
Outcome desconocido: repetir mismo origen/comando/clave/recibo; no crear otro UUID ni nueva intención.
Recibo conocido: retry sólo GET. Verificar estado de revisión y cabeza publicada; publish exige
head=revision, disable exige head=null. Conflicto requiere redescubrir y reconciliar, nunca sobrescribir.
La CLI acepta sólo origen HTTPS sin path/credenciales y cookies de sesión vigentes exact-host;
no sigue redirects. Salidas/códigos y setup de sesión en el manual; no imprimir storage state.

Esta API configura autoridad de medición. No crea submissions/bookings/contactos ni envía un
canary a Meta/Google. Consentimiento del visitante, captura cifrada y revalidación antes de HTTP
siguen siendo gates separados. Alta compatible por datos está probada en producción; recepción
Test Events no prueba primera conversión comercial, mejora EMQ ni elegibilidad de remarketing.


## Delta Google Ads online — implementación local17/10

`sources[].googleAdsEligible` identifica elegibilidad técnica; `config.googleAds` opcional contiene
`conversionKey: commercial_lead|meeting_booking`, `enhancedConversions: boolean` y `activationAt` ISO.
La validación exige fuente/versión/origen y propósito compatible; no amplía destinos Meta/UPD.
`destinations: []` puede coexistir con Ads-only. Discovery y dryRun declaran el impacto Ads;
no publican GTM ni encienden `GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED` (default OFF).

El panel preserva ese fragmento al editar; autoría inicial Ads por API/CLI en esta unidad, sin
nueva tool MCP. La respuesta pública Forms/Meetings puede contener el recibo dedicado
`googleAdsConversion` tras commit/enqueue, con cache private/no-store; no es este DTO administrativo.
[Contrato, privacidad y activación](../manual-de-uso/growth/activar-conversiones-google-ads.md).
