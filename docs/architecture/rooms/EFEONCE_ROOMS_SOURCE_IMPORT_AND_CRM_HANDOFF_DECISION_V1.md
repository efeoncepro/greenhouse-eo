# Rooms — importación de fuentes y handoff CRM V1

- Status: Accepted para implementación local por continuidad EPIC-052 y pedido del operador2026-10-29 de terminar backend sin UI.
- Owner: Rooms Platform; TASK-2076, EPIC-052 R14.
- Runtime: repo hermano efeonce-rooms; sin credenciales/conectores reales, producción, Auth o UI.

## Fuente y frontera verificadas

Greenhouse `src/lib/aeo-xray/types.ts` declara `XraySharedResponse`: modelVersion1.0, header,
AxisAeoXrayManifest y expiresAt. Think consume ese envelope mediante accept/transport; no se importa
el runtime Astro. El manifest usa contract `efeonce.aeo-xray`, versiones0.1.0/0.2.0, schema
`axis.aeo-xray-composition.v1` y status resolved. Otra versión es unsupported explícito.

Rooms no transforma un grant de sala en autoridad sobre X-ray ni acepta URLs/bearers del navegador.
Un puerto server-owned debe verificar actor, organización efectiva, edición y expiración en cada
lectura. El puerto default está ausente; preview informa source_not_configured, sin fixture de éxito.
Los tests inyectan una fuente sintética explícita. No existe conector real habilitado por este ADR.

## Mapping nativo versionado

`rooms.xray-native.v1` transforma texto editorial, preguntas frecuentes y citas en bloques/fragments,
y anotaciones en diagnóstico/evidencia/relaciones nativas. Conserva IDs fuente, edición/revisión/hash,
fechas, referencias y estado de claims declarado. Metadata SEO y JSON-LD quedan como texto escapado,
nunca como HTML/JS ni afirmación de despliegue. Ninguna llamada a buscador, crawling, scoring o pago.

Preview enumera campos incluidos/convertidos/excluidos. Medios, tablas, experiencia especializada,
marcas/tokens y navegación no tienen mapping lossless en este corte; se excluyen con razón y requieren
aceptación exacta antes de aplicar. Un flow no se convierte en lineage por inferencia. Nunca truncar
contenido para aparentar soporte. Límites: fuente1MB, capacidades nativas de manifest y metadatos
acotados; excederlas da unsupported. URLs con credenciales/query/fragmento o esquema activo se omiten
con exclusión visible; nunca se descargan bytes desde el JSON.

Que la fuente declare verified/measured no es una certificación de Rooms: su estado se conserva como
declaración de origen, junto a las limitaciones. El contrato nativo actual conserva evidencia
`author-declared`; no se inventan métricas, resultados ni causalidad.

`rooms.source_imports` conserva metadata de mapping inmutable (IDs fuente/revisión/hash, campos,
exclusiones, actor, hora de captura SQL y expiración de autoridad fuente), nunca el payload original ni
contenido SQL duplicado. La procedencia V3 conserva un resumen de menos de1000 caracteres con hashes;
no se amplía su schema. El reader interno exige también evidence.read, pagina imports10/max25 y
muestra validatedAt para distinguir la validación CRM histórica de una autorización presente.
Fechas fuente de precisión día permanecen yyyy-mm-dd; capturedAt queda null si no existe hora, nunca
se inventa medianoche como observación.

La aplicación vuelve a leer/reautorizar la fuente; hash diferente invalida la revisión. Conserva CAS
expectedRevision y llama `content.importManifest` canónico. La revisión de integraciones y la
escritura canónica comparten una transacción, con receipts por intención; no hay un segundo writer de
contenido. Snapshot publicado anterior permanece inmutable.

## Referencia HubSpot y handoff

Referencia mínima: provider hubspot, portalId, objectType deal/company y objectId decimales como strings;
owner interno activo de la organización. Un verificador read-only server-owned revalida pertenencia y
autoridad; default ausente da unavailable, nunca crea un objeto ni replica un pipeline CRM. No hay
URLs, emails, importes, fases ni propiedades externas en este contrato.

Link actual y solicitudes de handoff se conservan en tablas propias. Solicitar handoff fija edición
publicada/hash, referencia y responsable en una fila inmutable; revisión/receipt/audit/outbox se
confirman juntos. Estado pending y event `integrations.handoff.requested` acreditan una intención
persistida. **No prueban envío, sincronización, recepción ni entrega.** Este corte no tiene writer
outbound ni consumidor externo; delivery=not_configured. Una caída CRM no bloquea lectura/publicación
de una edición autorizada ni modifica su contenido.

## Acceso, recuperación y rollback

Integrations.read/manage sólo para internos, con grant efectivo por room; roles no autoconceden nada.
Importar añade content.edit, rooms.read y evidence.read sobre el borrador. Replays revalidan autoridad
Rooms actual antes de devolver metadata. No se mantienen transacciones SQL durante lecturas externas;
al volver se comprueban autoridad/CAS y expiración otra vez.

Migración11 amplía grant CHECK22→24 sin backfill/grants automáticos. Down restaura22 sólo cuando no hay
datos ni grants nuevos; datos durables se retienen y se revierte el consumidor. Audit/outbox no contienen
cuerpos de fuente, credenciales ni PII. No hay cambio de configuración ni producción por implementar.

## Alternativas y límites

- Iframe/rasterización: descartados como certificación de experiencia SEO/AEO nativa.
- Abrir o consultar HubSpot al cargar una sala: descartado; lectura independiente de CRM.
- Datos de muestra como fallback de un conector ausente: descartado; estado explícito unavailable.
- Ampliar provenance para alojar metadatos técnicos: preservar contrato V3 y registrar mapping aparte.

El perfil X-ray completo, medios remotos, experiencia especializada, conectores con credenciales,
writer outbound, reconciliación real y QA visual mantienen gates propios. El adapter local no los cierra.

## Evidencia local 2026-10-29

16 pruebas focales PASS/0skip:7 de schemas/mapping y9 PostgreSQL sobre cluster efímero iterativo;
rollback forzado de receipt alias prueba atomicidad con el writer canónico. Think fixture-minimal.json
pasó su resolver AXIS real y el adapter produjo9bloques/2evidencias/3relaciones/5exclusiones, sin red ni
mutaciones en Think. El ensayo inicial detectó WIP multimedia fuera de este dominio; el cierre conjunto posterior pasó337tests0skip, lint/types/build, fresh13/43 y restorePG16/18. Ninguna
prueba de puerto fake certifica autorización o entrega en un proveedor real.

Candidato local verificado3c7bcb5 y fronteras de release: [recibo29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
El cierre de la task local no certifica interfaz, proveedores reales ni producción.
