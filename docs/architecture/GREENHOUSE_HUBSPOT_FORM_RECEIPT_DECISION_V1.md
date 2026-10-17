# ADR — Identidad nativa de cada entrega HubSpot Forms

- Status: `Accepted` — implementación solicitada por el operador el 2026-10-17.
- Date: `2026-10-17`.
- Owner: Growth / Integrations.
- Reversibility: `two-way`; columnas aditivas y mapping opt-in; rollback de código conserva recibos.
- Confidence: `high` en contrato local; round-trip del marcador requiere readback del primer envío real.
- Scope: Forms adapter/dispatcher y CLI local; sin nuevo servicio, secreto, endpoint público o cambio de consentimiento.
- Modular placement: `src/lib/growth/forms/destinations/hubspot`; store canónico y worker existentes.
- Extends: [rastreo de leads](GREENHOUSE_META_LEAD_TRACE_CLI_DECISION_V1.md).

## Decisión

El POST autenticado Forms documenta `redirectUri`/`inlineMessage`, no un `conversionId`.
No inventar ese ID ni convertir un recibo `hsforms-*` en identidad nativa.
Un mapping server-side opt-in `submissionIdProperty` envía el `fsub-UUID` generado por
Greenhouse como campo técnico. La propiedad debe existir y estar incluida en el formulario
HubSpot. No se deriva del payload del visitante, no se agrega a URLs/GA4/Meta y no se usa el
valor actual del contacto como prueba de una ocurrencia.

Después del HTTP exitoso se persiste un recibo pendiente en el intento existente. Una
reconciliación independiente, limitada y sólo GET consulta el historial del formulario:
portal y form GUID capturados en el recibo, campo/valor exactos, una única ocurrencia y
paginación completa. Sólo entonces guarda `provider_submission_id` = `conversionId`, con
método, fecha y cobertura. Duplicados quedan ambiguos; páginas incompletas, scopes denegados
y agotamiento son estados explícitos. La consulta no depende de email ni ventana temporal
para decidir identidad. Credencial y lector HTTP canónicos, siempre portal Efeonce `48713323`.

La recuperación del recibo no modifica la aceptación comercial ni vuelve a ejecutar el POST.
Un fallo de evidencia no es un fallo de entrega. Comprobaciones limitadas con backoff, máximo
ocho por intento y horizonte de 24 horas. Actualización condicional por versión de recibo;
un ID verificado no se reemplaza. No sobrescribir recibos sintéticos ni promover registros
históricos por email/hora: conservan su confianza original.

## Rollout y verificación

1. Release autorizado del código compatible; expansión aditiva dentro del release antes de reanudar
   dispatch. El worker comprueba columnas antes de cualquier POST. Owners/grants del ledger existentes.
2. Crear/reusar propiedad técnica string y agregarla al formulario nativo; readback del schema.
3. Configurar mapping opt-in en el destino gobernado y desplegar worker compatible.
4. Primer envío real autorizado: comprobar marcador en `values` del historial y persistencia del
   `conversionId`; reconsultar por identidad nativa. No fabricar un lead para declarar este gate.
5. Rollback: retirar `submissionIdProperty` y código de reconciliación; conservar IDs ya capturados.

La CLI continúa siendo sólo lectura; la escritura del recibo pertenece al dominio/worker.
El opt-in técnico usa un command interno de configuración de release con CAS del mapping:
no cambia versión de fuente, policy publicitaria, campos comerciales ni habilitación del destino.
No se crea una API/MCP pública para esta operación interna; exige autoridad de release y verificación
previa de la propiedad/form nativos por el operador. Retirar el opt-in usa el mismo command.
Los envíos anteriores a la activación no adquieren retrospectivamente el marcador.
Pruebas cubren ambigüedad, paginación, independencia del email/hora, denegación, CAS y ausencia
de un segundo POST. La evidencia de rollout se registra separada de las pruebas locales.
SQL deliberadamente [parqueado fuera del runner](../tasks/pending-migrations/hubspot-native-form-receipts.sql.pending)
hasta ese release; reactivar con `pnpm migrate:create` y timestamp nuevo. Probado en PostgreSQL 17.5
aislado (PGlite): Up repetido, binding, rechazo de reemplazo terminal/ID ausente/fuente ajena y CAS stale.
No se aplicó en la base compartida. Estado: código local, provisión HubSpot/mapping/rollout pendientes.

## Alternativas

- Email/hora o propiedad actual del contacto: correlación, no identidad de envío.
- Marcador en `pageUri`: rechazado; altera atribución y carece de contrato de round-trip suficiente.
- Asumir un ID no documentado en respuesta 200: rechazado.
- Webhook nuevo: diferido; polling acotado reutiliza worker y reader actuales.

## Referencias

- [POST autenticado oficial](https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-authenticated).
- [Historial de submissions: anuncio oficial](https://developers.hubspot.com/changelog/2019-01-23-new-feature-get-the-submissions-for-a-hubspot-form).

## Revisión local final del 17/10

El parser rechaza fechas UTC inexistentes y estados de verificación sin checks/fecha/cobertura.
Una fila marcada sin `conversionId` válido no acredita identidad nativa. El selector de pendientes
protege el cast de fecha con `pg_input_is_valid` (PostgreSQL 17); una fecha corrupta no aborta el batch.
Sin cambios de autoridad o rollout. [Evidencia](../audits/growth/2026-10-17-meta-cli-final-review.md).
