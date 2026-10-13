# TASK-2001 — plan de ejecución local (2026-10-04)

Goal confirmado por el operador en Codex. Sin push ni deploy. Studio main y Greenhouse develop compartidos;
implementación secuencial por dependencias causales, sin subagentes. Documentación en Greenhouse.

## Audit y decisiones

- ADR gobernante: Marketing Studio Strategy Layer §15 + API-first + SSOT/ingest; Delta de la task y UI aprobada prevalecen sobre los seis estados antiguos.
- TASK-1905 ya entrega catálogo/taxonomía/UTM; pendientes ICP y MCP no bloquean. TASK-2003 no tiene implementación ni archivos reservados, confirmado por su chat.
- Commit previo 3cc5fa968 conserva los bloques propios de Codex retirando TASK-1899 en TASK-2001/2002.
- Reusar kernel runCommand, permisos/actor/scopeCampaigns, ChannelValidator, renditionPath, audit y worker_run.
- Activaciones escribibles en campañas onedrive: son territorio de Studio y el import no las define.
- Emparejar sólo por referencia inequívoca de campaña (UTM id/slug), cuenta/plataforma y una candidata dentro de tolerancia. Una cuenta compartida nunca identifica una campaña.
- Organic: 15 minutos; paid: 0 días por cada extremo en zona IANA de la cuenta. Tolerancia versionada con el catálogo.
- Historial append-only; no guardar estado calculado. Published/delivering/ended requieren observación del proveedor.
- Validación en seco no escribe ni historial ni idempotency records; reprogramación sólo cambia plan.
- Evidencia owned: adapters de lectura HubSpot/WordPress; sin evidencia observada nunca simular publicación.
- Riesgos: enlaces entre campañas/organizaciones, pérdida de posts durante coexistencia, concurrencia y tracking congelada. Probar negativos con PostgreSQL real local.

## Orden de slices y evidencia

1. Esquema aditivo, relaciones/constraints/grants, Always On en commands y readers existentes; up/down/up local y pruebas reales de integridad/autoridad/replay.
2. Contratos y commands de activación, estados puros y validación: cada operación nace con ruta/tool/manifiesto. Tests focales + PostgreSQL antes de avanzar.
3. Registro de evidencia, descubrimiento Metricool, owned readers, vínculos y creación desde ejecución; historial y tracking freeze atómicos; mocks de proveedor + SQL real, nunca publicación externa.
4. Readers/calendario/atención, avisos y frescura, filtros de mercado, zona de cuenta/Santiago, previews de versiones exactas y permisos.
4b. Tracking URL pura con catálogo, validación de destino y comparación de evidencia; congelamiento y slug estable.
5. Compatibilidad/backfill en seco, CLI dinámica, manifiesto/manuales, check/build completos y QA. Datos reales se migran sólo en rollout autorizado.

Cada corte deja evidencia en la task. Flags STUDIO_ACTIVATIONS_ENABLED y MEDIA_WORKER_METRICOOL_DISCOVERY_ENABLED OFF por defecto. PostgreSQL temporal local, sin credenciales remotas.

## Cierre honesto

Implementación local no equivale a task complete: migraciones staging/prod, scheduler, backfill confirmado, herramientas remotas y canary MCP real quedan pendientes de autorización/dependencias. No ampliar TASK-2002 ni TASK-2003.

## Avance

Slices 1–4 PASS en Studio: 39a74c0, 78205fb, af608a8, 9bc974e. Último check: 264 tests + 7 gates, todos los carriles PostgreSQL habilitados, cero skips.

Delta blog recibido durante ejecución: CMS y dominio pertenecen a la cuenta owned del cliente; draft_url sólo se guarda/devuelve. Implementado slice de URL pública y confirmación personal de fecha, con herramienta MCP y evento confirmed_by. WordPress se generaliza a sitios del cliente autorizados. Dossier/gate/medición SEO-AEO fuera de alcance, follow-up sin ID. Se conserva íntegro el bloque del operador y sus referencias aprobadas de TASK-2002 (60ef4e26c).

Corte local final: tracking `946fda4`, backfill/CLI `4094da0`; 276 tests + 7 gates, build y 31 checks CLI con PG real PASS. Cinco migraciones up/down/up. [QA](../../audits/marketing-studio/TASK-2001-local-verification.md). No se declara runtime completo: endpoint owned HubSpot del owner y carril delegado TASK-2003 pendientes, además del rollout autorizado.

## Ampliación del operador — email con varios proveedores

Resend será el mayor volumen; prioridad de integración. No basta el reader HubSpot anterior.

1. Contrato de cuenta/proveedor y envío agregado con completitud, catálogo aditivo versionado y migración reversible. Mantener las operaciones API/MCP/CLI comunes y las identidades/UTM históricas.
2. Proyección de evidencia Resend sobre delivery/inbox/reconciliación de Greenhouse, vínculo explícito a campaña y reader paginado; pruebas de reintentos, eventos fuera de orden, envío parcial, tenancy y datos ajenos excluidos.
3. HubSpot y adapters separados para Engagement (tenant/BU) y Next (org/entorno), con pruebas de contrato y evidencia por proveedor; permisos/provisioning/canary separados del código local.
4. Cada slice: Studio check + Postgres real y prueba CLI, commits propios, flags OFF, sin push. No afirmar soporte operativo por añadir un enum o fixture.

El delta email de la task es el dueño del nuevo alcance. Los resultados del corte previo no certifican estos adapters.

## Rollout autorizado ejecutado — 2026-10-04

Studio aa6fa07 desplegado, cinco migraciones staging/prod, seis activaciones CL vinculadas y canary Metricool/CLI/scheduler PASS. [Evidencia](../../audits/marketing-studio/TASK-2001-release-2026-10-04.md). Continúan los slices email y las dependencias owned/TASK-2003.

## Siguiente corte autorizado — Resend/HubSpot/WordPress + QA UI/CLI

1. Contratos aditivos de providers y completitud de envío; migración y PG real, sin cambiar commands de la UI.
2. Puerto de evidencia Greenhouse: credenciales canónicas, bindings org/cuenta, sólo batch/broadcast marketing; nunca destinatarios ni transaccionales. Conectar readers Resend/HubSpot y probar con cuentas reales, sin enviar. Engagement/Next quedan explícitamente no conectados.
3. WordPress público efeoncepro.com: canary del reader y configuración lista para activación, CMS por sitio preservado.
4. Integrar/validar con UI de Claude y CLI; commits propios y revisión antes de un nuevo push.

Primer slice del corte: Studio `e62b5e3`, 285 tests + 7 gates con Postgres aislado, migración up/down/up. Contrato API 1.8.0 aditivo; providers y emailEvidence completitud sin alterar commands de Claude. Sin push.
