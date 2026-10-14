# Plan — TASK-2035: configuración escalable y CAPI

## Alcance y aprobación

Goal confirmado por el operador14/10/2026: **limitar ahora a configuración escalable y CAPI**.
Un único release final completo develop→main. No ejecutar los slices CRO, abandono, newsletter,
CRM/outcomes del paraguas; siguen pendientes. No nuevo servicio, proyecto, cron ni gasto.
Checkpoint de este plan: **aprobado por el operador14/10/2026** mediante «Apruebo el plan; ejecuta».
La ejecución sigue el alcance acotado y el orden documentado. La corrección CAPI previa fue
encargada y autorizada por separado; commit ba9b8c9cc, backend aún sin release.

## Discovery summary

- Forms se autoriza/publica por datos; form_key UUID ya es estable, form_version_id identifica
  contenido y form_host_surface permite origen/formulario. Matching enumera seis slugs en
  payload.ts y en sgtm-lead-client.js: publicar un formulario no resuelve esas dos listas.
- DB leída14/10: seis Forms comerciales publicados, cada uno con surface activa; versiones
  actuales AEO17/SEO4/cotización3/lead-gen1/social2/grader8. Ningún contacto/valor de submission leído.
- Cuatro Forms capturan fullName; namePolicy explícita genera firstName/lastName normalizados.
  El mapping debe reconocer esas salidas tipadas sin inventar un split ni perder el matching.
- Drift real: binding activo fhsf-efeonce-lead-gen-web/discovery; allowlist de matching espera
  efeonce-discovery-30. Resolver desde el binding real, no activar una segunda agenda.
- measurement_conversion/delivery, cifrado48h, consentimiento y worker ya existen. Se reutilizan.
  Ledger últimos7d al corte:0 conversiones; Test Events anteriores no prueban aceptaciones reales.
- CAPI corregida: Server7 sólo customTemplate30, WP421eaa3/Think PR14 ya publicados; Preview
  y live Test Events confirmaron website y nueve claves. Emisor Lead Meta sólo backend.
- Cockpit existente /admin/growth/forms usa AdaptiveSidecarLayout e inspector/composer/evidence.
  No crear otra navegación/pantalla administrativa ni rediseñar el cockpit.
- No otra task dueña de configuración de matching/API/UI hallada en el barrido de registry y
  superficies. TASK-2034 mantiene matching y primera conversión; TASK-1359/1509/1510/1885/1802/
  1866 conservan sus contratos y pendientes. TASK-2035 coordina sin absorberlos.

## Access model

- Operación interna Efeonce; configuración no entra en render contracts públicos ni dataLayer.
- Capabilities finas growth.measurement.read/author/publish/disable, catalogadas y con grants
  explícitos a roles internos pertinentes y pruebas de denegación client/actor sin permiso.
  No depender sólo de un boolean admin. No ampliar identidad, OAuth, permisos cloud ni MCP.
- Commands/readers canónicos reciben autoridad verificada y se comparten con Product API/CLI/UI.
  No UI-only. El POST público no puede seleccionar/autorizar su propia policy.
- Rutas administrativas bajo /api/admin/growth/measurement; la UI consume esos mismos contratos.
  Sin nuevo view_code, destino de sidebar ni cambios de startup policy.

## Architecture decision

- Conservar ADR Meta CAPI Server Accepted y Full API Parity.
- Formalizar antes de schema/código la propuesta como decisión de policy versionada, con
  tabla dueña, identidad/scope, lifecycle, envelope, revocación y rollout; indexarla una vez.
- Dominio actual src/lib/growth/measurement, los commands Forms/Meetings como fuente y ops-worker
  como dispatcher. No packages/apps/repos nuevos. Future home domain-package es sólo metadata.
- El envelope autenticado v2 reutiliza el bearer backend ya existente, schema cerrado y prueba
  de policy publicada resuelta server-side. No un segundo secreto/HMAC ni autoridad browser.
  Incluye policy/version, identidad fuente y versión/binding, surface, propósito comercial y
  clasificador coherente. sGTM valida auth, shape, tipos, origen, consentimiento, UUID/tiempo y
  hashes; deja de enumerar slugs. Todo campo de control queda fuera de custom_data Meta.

## Backend/data contract

- Nueva policy versionada server-only en greenhouse_growth, con revisiones inmutables al
  publicar y auditoría append-only de actor/acción/versión. Draft→validación/review→publish;
  disable independiente. Estado destino/config/HTTP/provider diferenciados.
- Alcance Forms = form_key + form_version_id + surface_id + orígenes aprobados. Meetings =
  scheduler_key + surface_id + fingerprint de la autoridad activa. No nombre visible como ID.
- Mapping declara email/teléfono E.164/nombres tipados; reconoce sólo campos declarados y las
  salidas explícitas de namePolicy. Bloquea texto libre, tipos incompatibles, forms editoriales/
  postulaciones y versiones no publicadas. No secretos/contactos en configuración/admin DTO.
- Destinos Meta/GoogleUPD independientes y OFF por defecto. Google sigue requiriendo ads+analytics
  y client_id real, user_data sin events; no se inventa otra conversión GA4.
- Captura resuelve policy vigente sin caché autorizante; snapshot de revisión junto a proyección
  cifrada e inserción en transacción de aceptación/confirmación. Fallo de policy omite medición,
  nunca altera aceptación de negocio. Revisar que el savepoint conserva este aislamiento.
- Revocación: worker revisa policy publicada/destino antes de cada envío; cola de revisión
  desactivada/sustituida no se entrega, con clase segura. HTTP ya iniciado no se puede retirar.
  No reautorizar un retry usando una revisión nueva ni reconstruir consentimiento histórico.
- Concurrencia: lock/CAS para crear/revisar/publicar con revisión esperada; idempotency key por
  mutación, auditoría dentro de transacción; publisher concurrente no pisa trabajo ajeno.
- Migración aditiva mediante migrate:create. Seed reproducible/dry-run de equivalencia: seis
  Forms actuales y la única agenda/binding real autorizado, orígenes sólo efeoncepro.com/Think.
  Surface/modelos/hosts ajenos siguen desactivados. No crear contactos/meetings/submissions QA.
- Rollout inicial coordinado: congelar diff y rollback, pausar captura publicitaria durante la
  transición si es necesario, release completo+workers, aplicar migración/seed canónico, publicar
  Client v2 compatible con runtime desplegado y reactivar/verificar flags al final. No dejar
  workers viejos interpretando policies nuevas ni un Client que acepte cualquier evento browser.
- Rollback: capture/destinations OFF, policy disable/revisión anterior y contrato compatible;
  conservar ledger/ciphertext/retención y nunca reactivar legacy MetaLead12/17.

## Skills

- Plan/contratos: greenhouse-task-execution-hook, greenhouse-task-planner, software-architect-2026.
- Fuente/destinos: greenhouse-growth-forms, greenhouse-growth-meetings, greenhouse-gtm-ga4-operator.
- UI: greenhouse-ai-design-studio y sus lanes MUI/Vuexy/copy; reutilizar inspector/controls.
- Verificación/cierre: greenhouse-browser-diagnostics, greenhouse-qa-release-auditor,
  greenhouse-production-release, greenhouse-secret-hygiene, greenhouse-documentation-governor.

## Subagent strategy

Sequential. Policy/schema→captura/envelope→API→UI→cutover tiene dependencia causal y archivos
compartidos. No hay autorización vigente de subagentes; no se usa fork ni checkout alterno.
WIP comercial/documental ajeno queda intacto; commits y staging sólo de archivos/hunks propios.

## Execution order

1. Registrar dos unidades dependientes, IDs propuestos2036 (foundation backend-data) y2037
   (consumer ui-ux), tras revalidar IDs libres. Mantener umbrella2035 con alcance restante abierto.
   ADR, matriz de contratos, addenda y ownership antes de implementación.
2. Foundation: schema/revisiones/auditoría, contrato y validación de fuente/campos, reader/commands
   con auth/idempotencia/CAS, API programática y pruebas; seed equivalente con dry-run.
3. Integrar Forms/Meetings y cola/worker: mapping desde datos normalizados, policy snapshot,
   destinos independientes, chequeo de revocación y envelope sGTMv2. Retirar ambas listas fijas
   sólo al completar sustitución segura; no quitar el guard sin reemplazo.
4. UI dependiente: sección Medición en el cockpit existente, selección de formulario/agenda y
   surface, mapping por opciones tipadas, destinos, validación/bloqueos y guardar→revisar→publicar/
   desactivar. Wireframe/flow/dirección repo-native/primitive mapping antes de JSX; GVC1440/390,
   teclado/contraste/empty/error/denied/concurrency/reduced-motion. Sin JSON libre ni nueva ruta.
5. Verificar backend/DB/ACL/concurrencia/consentimiento/GPC/revoke/destinos/versión/rename/scope
   ajeno y regresión Forms/Meetings/GA4/Careers. Tests focales y CI completo; sin build Next pesado
   local. Preview sGTM y Meta Test Events con código real temporal, nunca ordinario.
6. Un único release final de TODO develop→main. CI/Deep, Vercel, orquestador, manifest, workers,
   migración, GTM, hosts y flags con recibos independientes y rollback. Seguir intento existente
   si aparece otro coordinador. No tocar tags ajenos, PixelID ni crear infraestructura.
7. Prueba de escalabilidad: crear/revisar/publicar una policy compatible desactivada inicialmente
   mediante API/UI y habilitarla en escenario controlado sin cambios de fuente/build/redeploy/
   publish GTM después del contrato inicial. Validar transporte sólo Test Events; no negocio falso.
   Revertir config QA al finalizar y conservar auditoría/receipts sanitizados.
8. Docs/skills espejos, lifecycle/checklists y handoff. Cerrar sólo lo demostrado; primera
   conversión comercial/EMQ real permanecen pendientes hasta evidencia real independiente.

## Files to create

- Unidad backend y unidad UI dependiente (IDs propuestos, sin reservar hasta aprobación).
- ADR de policy; wireframe/flow/dirección/escenario/capturas/review de la unidad UI.
- Migración y módulos policy-contract/policy-store/policy-command/policy-reader en measurement.
- Rutas Product API administrativas, herramienta seed/verify y tests del contrato/autoridad.
- Panel de configuración consumidor y copy canónico, sin reglas de negocio en JSX.

## Files to modify

- measurement/contracts,payload,prepare,store,dispatch y los commands Forms/Meetings.
- scripts/measurement/sgtm-lead-client.js y sus pruebas; frozen-diff antes de publicación.
- entitlements catalog/runtime y pruebas de grants/negativos.
- GrowthFormsAdminCockpitView.tsx sólo para incorporar el consumer del primitive.
- Tracking Plan/runtime10, docs arquitectura/funcional/manual, tasks/índices/skills y roots
  mediante hunks propios. No tocar tareas/comercial pendientes de otros agentes.

## Files to delete

Ninguno previsto. No retirar colas, eventos, controles de consentimiento ni receipts históricos.

## Risk flags

- PrioridadP1: schema, autorización publicitaria y cutover coordinado requieren este checkpoint.
- Campo incompatible/versionado/revocación: debe bloquear matching y explicar el motivo al operador.
- Rollback mezclando Client viejo/runtime nuevo podría perder matching; flags y compatibilidad
  se validan antes del flip. La operación comercial no depende del éxito publicitario.
- La disponibilidad de datos reales limita la prueba comercial; no falsificar accepted/booked.
- Edición de UI existente no autoriza rediseñarla ni alterar formularios/contactos reales.

## Open questions

Resueltas por propuesta del plan: persistencia en el dominio Growth, revisión inmutable/sin
caché autorizante, bearer server-to-server v2, revocación de cola al envío, independencia de
contacto/analytics/ads, seed explícito y nuevo acceso fino. La agenda usa binding discovery
verificado; no se inventa un calendario efeonce-discovery-30 inexistente.
Plan aprobado; unidades2036/2037 registradas para ejecutar. No decisión de newsletter,
ventanas de abandono o lifecycle CRM: quedaron fuera del goal actual.

## Preflight read-only 2026-10-14

pg:doctor PASS: CLI/ADC alineadas a efeonce-group, conexión runtime greenhouse_app con
membresía greenhouse_runtime y sin greenhouse_migrator. No DDL, seed ni write ejecutados.
La migración usará el perfil migrator canónico separado, nunca privilegios nuevos del runtime.
Schema de Forms/Meetings/measurement inspeccionado por metadata. El binding discovery real
continúa siendo la única agenda activa; no se cambia sólo para hacer pasar una fixture.
Task2035 movida a in-progress por la toma autorizada; checkpoint humano aprobado después de ese preflight.
