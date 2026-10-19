# Corrección gobernada de clasificación comercial Forms V1

Extiende el [ADR Forms](GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md). No modifica el modelo
base ni sus versiones publicadas. Operador autorizó18/10 corregir Lead Gen Web, cuyo propósito era
comercial aunque el tipo heredado era lead_magnet. [Aplicación y readback](../audits/growth/2026-10-18-commercial-forms-policy-publication.md).

## Ubicación y autoridad

- Contrato administrativo estricto: `src/lib/growth/forms/classification-contract.ts`.
- Command compartido: `classification.ts`; SQL sólo en `correctCommercialFormClassificationStore` de `store.ts`.
- CLI explícita de mantenimiento: `scripts/growth/correct-commercial-form-kind.ts`, perfil ops.
- API admin: `/api/admin/growth/forms/{formId}/classification`, contexto interno + growth.forms.author,
  actor de sesión y path/key coincidentes; implementada localmente, todavía no desplegada.

La CLI llama el primitive canónico como los otros scripts de mantenimiento Forms. El identificador
actor registra quién opera; no reemplaza la credencial ni el permiso PG. La API no acepta identidad,
destinos, riesgo o flags de autorización aportados en el body. No se agregó tool MCP ni autoridad
externa: es mantenimiento interno acotado, no una nueva capacidad comercial delegada a clientes.

## Transacción y concurrencia

Sólo lead_magnet→quote_request con intención comercial confirmada por el autor y razón explícita.
Fuente activa, riesgo low/medium y propósito no vacío. Se bloquea la definición con FOR UPDATE,
compara SHA256 de todos sus metadatos y exige una única versión publicada esperada, FOR SHARE.
Cambian sólo form_kind y updated_at. Un hash comparativo posterior protege key, slug, nombre,
propósito, riesgo, actor original y demás metadatos; no se actualizan versiones/destinos/consentimiento.
Una divergencia lanza conflicto dentro de la transacción y revierte. Reintentar con el hash viejo
no vuelve a mutar. Un cambio concurrente obliga a redescubrir/revisar, no a actualizar el hash a ciegas.

La corrección no publica políticas Ads. El reader ya desplegado reevalúa elegibilidad desde la
definición corregida y la política se publica por su propio validate/draft/review/publish/CAS.
No hay excepción por slug ni autorización global de lead magnets. Contacto conserva su tipo general;
AI Grader conserva diagnostic_intake y su intención comercial confirmada por el operador.

## Evidencia, fallo y runtime

La CLI reserva journal0600 con wx antes de ejecutar. Si ya existe, no repite la mutación; unknown
exige leer/reconciliar. Tras commit conserva resultado y GET canónico independiente. El journal
contiene metadatos de definición, hashes, actor, razón y versión; nunca valores de una submission.
El nuevo endpoint comparte command y devuelve409 canónico sin detalle SQL. Su código está listo para
un release futuro; la corrección aplicada no dependió de desplegarlo. GET del catálogo y GET público
productivos verificaron quote_request con la misma versión. No se envía un lead para comprobarlo.

20 pruebas nuevas cubren permisos/identidad, schema, CAS, riesgo/estado, unicidad de versión y campos
preservados; regresión focal53 PASS y TypeScript/ESLint PASS. Configuración no prueba recepción Ads
ni atribución. [Manual operativo](../manual-de-uso/growth/corregir-clasificacion-comercial.md).


Publicación y canarios del endpoint: [release Grader/clasificación](../audits/growth/2026-10-18-grader-measurement-release.md).
La corrección registra auditoría durable en el store neutral canónico
`greenhouse_core.api_platform_command_executions` ([API Platform](GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md)).
`recordCommandAudit` y `completeCommandExecution` usan el mismo PoolClient que el UPDATE Forms:
si cualquiera falla, se revierte la transacción completa. El principal interno proviene del actor
validado; la ruta `growth.forms.classification.correct` conserva actor, razón, identidad, versión y
hashes antes/después en el resultado auditado, sin valores de submissions ni definición completa.
La respuesta agrega `commandExecutionId` para correlación. No incorpora migraciones ni un almacén
paralelo. Es auditoría transaccional durable; la tabla canónica no es append-only. El TTL es lógico,
no una garantía de inmutabilidad. CAS conserva el rechazo del retry; no se promete replay200.
La CLI conserva además su journal previo a la ejecución.
