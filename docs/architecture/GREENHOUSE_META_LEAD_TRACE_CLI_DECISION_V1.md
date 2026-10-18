# ADR — Rastreo operativo de un lead desde la CLI Meta

- Status: `Accepted` — implementación local solicitada por el operador el 2026-10-17.
- Date: `2026-10-17`.
- Owner: Growth / Marketing Operations.
- Reversibility: `two-way`; lector local sin mutaciones externas.
- Confidence: `high` en fronteras y clasificación; verificación remota sujeta a acceso/cobertura.
- Validated as of: `2026-10-17`; readback local/HubSpot de una ocurrencia existente, sin mutación.
- Scope: diagnóstico local de sólo lectura de Growth Forms de Efeonce, medición y HubSpot.
- Extends: [CLI Meta](GREENHOUSE_META_AGENT_WRITE_CLI_DECISION_V1.md).
- Modular placement: adaptador local en `scripts/meta`; proyección de datos en el dominio
  `src/lib/growth/forms`; conexiones, credenciales y tablas canónicas existentes. Sin nuevo deployable.

## Decisión

Rastrear por `submission_id` o UUID de `measurement_conversion.event_id`. Una búsqueda privada
por email y ventana acotada devuelve candidatos; nunca elige arbitrariamente entre varios envíos.
La salida es metadata operacional allowlisted, sin contactos, valores de formulario, hashes de
identidad ni payloads cifrados. La identidad necesaria para consultar HubSpot permanece en memoria.

El lector de Forms es un companion del store canónico. La CLI usa PostgreSQL mediante `getDb`,
perfil runtime y transacción `READ ONLY`; nunca crea pools, obtiene credenciales de migrator/ops,
descifra matching o modifica estados. Este carril es tooling del operador autorizado por acceso
local a las credenciales canónicas; no se expone como API pública, MCP ni permiso de usuario.

HubSpot se consulta con el resolver de token canónico y verificación previa del portal Efeonce
`48713323`. Cada lectura conserva su límite, paginación y error de acceso. No se crean contactos,
submissions, propiedades ni asociaciones. Un contacto ya existente no acredita ese envío.
Un match por email/formulario/tiempo es correlación; no sustituye un ID de ocurrencia exacto.
`hsforms-<submission_id>` es un recibo local sintético, nunca un ID nativo de HubSpot.

La evidencia se separa por etapa: aceptación de Forms, proyección/consentimiento, cola de Meta,
ACK del tag servidor, historial de formulario HubSpot y existencia del contacto CRM.
`http_accepted` en medición conserva su significado de ACK de sGTM; no se eleva a procesamiento,
atribución ni visualización de un evento individual en Meta. Sin conversión persistida hay varias
causas posibles: no inventar consentimiento denegado ni una falla concreta.

## Contrato runtime

- `leads find --input archivo.json --limit N`: archivo JSON privado `0600`, regular, sin symlinks,
  con `{email,since?,until?}`. Email sólo como selector en memoria. Ventana default siete días UTC,
  máximo 31 días; límite 1–20, default diez. La salida contiene candidatos operativos, no su email.
- `leads trace`: exactamente uno de `--submission-id fsub-UUID` o `--event-id UUID`. No se aceptan
  emails por argumento. `--source-only` omite HubSpot y no admite opciones de paginación remota.
- Trace remoto: `--pages` 1–10 (default tres), `--limit` 1–50 (default cincuenta), acotado además
  por el límite del proveedor de submissions HubSpot (cincuenta por página). No seguir `paging.next`
  como URL; sólo reconstruir el endpoint fijo con un cursor `after` validado.
- Runtime canónico `greenhouse_app`, transacción PostgreSQL `READ ONLY`, aislamiento repeatable read
  y timeout local. Sin pool paralelo, credenciales de migrator/ops, cambios de roles o flags.
- `find` busca el hash canónico; sólo cuando `lead_email_hash` es NULL puede contrastar el único
  campo tipado email del schema del formulario. Ese fallback no descifra matching ni expone identidad.
- El companion del store proyecta metadata de `form_submission`, `measurement_conversion`,
  `measurement_delivery` y `form_destination_attempt`; targets privados a HubSpot no son enumerables
  en el resultado. El renderer emite `meta-lead-trace.v1` dentro del envelope de la CLI.
- HubSpot usa `getHubSpotAccessToken` existente, portal `48713323`, GET del historial de submissions
  de su form GUID y GET del contacto por email. No se agregan fuentes de secreto, permisos o escrituras.
  Scopes pertinentes: `forms` y `crm.objects.contacts.read`; una denegación queda visible y no autoriza
  ampliar scopes. No se consulta otra cuenta por el solo hecho de que el token tenga acceso.

## Evidencia y correlación

| Etapa | Lo que puede afirmar el lector |
| --- | --- |
| Fuente Forms | Registro y lifecycle de esa ocurrencia; aceptación o rechazo, sin inventar calidad comercial. |
| Consentimiento/proyección | Snapshot observado, policy revision y presencia de payload cifrado; no contenido ni validez de su proyección Meta. |
| Cola Meta | Estado local, intentos y clase de error; ACK sGTM sólo cuando su contrato persistido lo acredita. |
| Procesamiento Meta | Matching, deduplicación y atribución individuales permanecen desconocidos en esta CLI. |
| Destino HubSpot local | Intento/HTTP registrado; `hsforms-*` identifica un recibo sintético local. |
| Historial HubSpot remoto | Native conversion ID observado puede acreditar ocurrencia; email/form/tiempo sólo candidato/correlación, múltiples matches ambiguos. |
| Contacto CRM | Existencia e identidad coincidente por separado; un contacto previo no prueba creación o recepción de este envío. |

Ausencia tras páginas incompletas no es `not_found` definitivo. Errores o scopes denegados son
indisponibilidad, nunca ausencia de leads. La falta de conversión persistida no permite deducir
consentimiento denegado ni atribuir una falla sin evidencia. No se redispatcha una fuente, modifica
el estado de cola, genera una conversión sintética o descifra PII para resolver el diagnóstico.

## Alternatives Considered

| Alternativa | Decisión |
| --- | --- |
| Scripts SQL/API puntuales o nuevas credenciales de ops | Rechazado: companion canónico y sesión runtime READ ONLY. |
| Contacto encontrado como prueba de todo el recorrido | Rechazado: identidad de persona no es identidad de ocurrencia. |
| Buscar el UUID individual en stats Meta agregados | Rechazado: la API agregada no acredita procesamiento de ese evento. |
| API/MCP público de trazas | Diferido: requeriría autoridad, privacidad y contrato de producto propios. |

## Verificación requerida

- Rechazo de selectores inválidos antes de abrir conexiones.
- Fuente rechazada, cola pendiente, error terminal, ACK y ausencia de proyección diferenciados.
- Portal ajeno, contacto previo, múltiples candidatos y páginas incompletas no producen éxito falso.
- JSON, errores y artefactos sin PII, secretos ni URLs autenticadas.
- Lectura real acotada e independiente de cada proveedor disponible; ninguna conversión sintética.

Readback real: una ocurrencia Forms de Efeonce Performance resuelta por submission ID y event UUID;
fuente `delivered`, ACK sGTM 200, historial HubSpot `correlated` y contacto confirmado por identidad.
El contacto no se atribuye causalmente a ese envío; procesamiento/matching/deduplicación/atribución
Meta permanecen desconocidos. `coverage.complete` significa observables solicitados cubiertos,
no confirmación de toda etapa externa. Los destinos HubSpot reales sin verificación, incluido un
mapping inválido, quedan en `coverage.uncheckedHubspotDestinations` y mantienen el resultado parcial. Sin nuevo envío, redispatch o mutación CRM.

Evidencia privada en `/Users/jreye/Documents/Meta-Efeonce-Connection/lead-trace-verification-2026-10-17/`;
IDs, horas y salidas: [manual de CLI](../manual-de-uso/growth/consultar-meta-con-agentes.md).
Suite local completa: 172 tests en nueve archivos PASS (105 del corte v2, 15 modelo de traza,
20 orquestador, 17 lector HubSpot y 15 store). TypeScript strict focal incluyendo imports canónicos
DB/source/tests y ESLint global de los archivos propios PASS. Lectores reales read/find y CLI
completo/source-only/evento verificados sin mutaciones. Código local completo; revisión y cierre
global conservan sus gates propios. Esta evidencia no certifica procesamiento individual de Meta.

## Revisit When

Delta 2026-10-17: [identidad nativa de entregas HubSpot](GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md)
añade recibos escritos por el worker; la CLI sigue READ ONLY. Lee el snapshot de destino/marcador y el
ID nativo persistidos sin depender del mapping actual. Un UUID nativo distinto del `fsub-*` ya no se
confunde con el ID de fuente. Lectura compatible con schema previo; activación del writer pendiente.
[Límite individual Meta](../documentation/growth/meta-individual-event-verification.md): no hay GET
documentado por `event_id`; mejorar recibo CAPI es una propuesta separada, todavía sin implementar.

Fuentes distintas de Growth Forms, matching descifrado, export de identidad, redispatch, cambios CRM,
consultas multiportal, nuevas credenciales o promoción a API/MCP/producto.

## References

- [Companion del store](../../src/lib/growth/forms/lead-trace-store.ts).
- [Resolver canónico HubSpot](../../src/lib/hubspot/access-token.ts).
- [Contacts: GET por email y propiedades](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide).
- [Spec oficial Contacts 2026-03](https://github.com/HubSpot/HubSpot-public-api-spec-collection/blob/main/PublicApiSpecs/CRM/Contacts/Rollouts/424/2026-03/contacts.json).
- [Account info: portalId](https://github.com/HubSpot/HubSpot-public-api-spec-collection/blob/main/PublicApiSpecs/Account/Account%20Info/Rollouts/144923/v3/accountInfo.json).
