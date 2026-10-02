# TASK-1950 — AEO X-Ray: contratos, ediciones y sharing

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Foundation implementada y verificada localmente; demo Think autónoma publicada y aceptada; actor real, migración compartida y rollout del provider pendientes`
- Rank: `1`
- Domain: `content|growth|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; Think y AXIS checkout actual; sin worktrees`

## Summary

AEO X-Ray: contratos, ediciones y sharing. Ejecuta el plan aprobado del 30/09/2026 para un dossier con landing y blog
completos, composición por tokens y acceso tokenizado por edición.

## Why This Task Exists

El X-Ray actual limita el contenido a un artículo estático y carece de control de acceso revocable.
El banco necesita evaluar trabajo real y sus decisiones técnicas antes de la reunión.

## Goal

- Entregar contrato portable, snapshots inmutables y grants seguros con API parity.
- Preservar SKY y distinguir muestra, propuesta, implementación demostrada, verificación y medición.
- Robustecer la experiencia original completa (brecha, pieza, radiografía y derivados), no sustituirla por dos páginas de prosa; el consumer enriquecido es TASK-1951.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/think/aeo-xray-composer-extension-plan-2026-09-30.md`
- `docs/think/radiografia-aeo-architecture.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/EFEONCE_AEO_XRAY_COMPOSITION_AND_SHARING_DECISION_V1.md`

## Normative Docs

- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Runtime existente Think y primitives de acceso Greenhouse; contratos AXIS.

### Blocks / Impacts

- Piloto Banco Pichincha Perú, preservando muestra SKY de TASK-1410.

### Files owned

- `src/lib/aeo-xray/`, adapters API y migración aditiva nuevos.
- Contrato/tokens XRay en paquetes existentes de `../axis-design-system/`.

## Current Repo State

### Already exists

X-Ray estático en `../efeonce-think/src/content.config.ts` y `src/lib/efeonce-insights/sharing/` como patrón.

### Gap

Un artículo fijo y URL sin revocación. Faltan composición multipieza, edición y grant propios.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/aeo-xray/` propuesto en Greenhouse; Think y paquetes existentes AXIS
- Future candidate home: `remain-shared`
- Boundary: `manifest AXIS validado y proyección XRayWebModel; commands/readers dueños del acceso`
- Server/browser split: `DB y bearer sólo servidor; browser recibe contenido allowlisted sin secretos`
- Build impact: `contrato AXIS generado con hash; sin nuevo deployable ni librerías pesadas`
- Extraction blocker: `authz y persistencia permanecen en Greenhouse; Think sólo API`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `nuevo dominio src/lib/aeo-xray; case/draft/edition/grant`
- Consumidores afectados: `Think SSR, App API y carril programático gobernado`
- Runtime target: `local, staging, production`

### Contract surface

- Contrato existente a respetar: `src/lib/efeonce-insights/sharing/` como patrón, no autorización compartida
- Contrato nuevo o modificado: `XRayWebModelV1; commands y reader público propios`
- Backward compatibility: `gated; SKY legacy conserva rutas`
- Full API parity: `lógica en commands/readers; adapters no duplican policy`

### Data model and invariants

- Entidades/tablas/views afectadas: `case, draft, edition y share grant nuevos; esquema definitivo en migración`
- Invariantes que no se pueden romper:
  - Edición inmutable; grant limitado a edición exacta; prospect no concede autoridad.
  - No bearer persistido ni difundido; assets privados revalidan grant.
- Write-target allowlist: `crear boundary test del dominio con destinos nuevos explícitos`
- Tenant/space boundary: `tenant propietario desde actor autorizado, target CRM independiente`
- Idempotency/concurrency: `revisión optimista draft, transacción emisión y claves idempotentes`
- Audit/outbox/history: `historia append-only de cambios y emisión/revocación sin token`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `flag OFF hasta gates`
- Backfill plan: `sin backfill de clientes ni migración automática SKY`
- Rollback path: `desactivar superficie y conservar ediciones/revocaciones`
- External coordination: `release control plane y migración con readback`

### Security and access

- Auth/access gate: `capabilities propias con grant a rol real; bearer para lectura exacta`
- Sensitive data posture: `sin datos financieros personales; redacción de bearer`
- Error contract: `códigos sanitizados, sin errores SQL ni existencia de otros casos`
- Abuse/rate-limit posture: `reutilizar rate limiter canónico; límites de grants/TTL/payload`

### Runtime evidence

- Local checks: `AXIS 34/34; dominio Greenhouse 22/22 (PG opt-in omitido en suite y ejecutado aparte); distribución por hashes verificada`
- DB/runtime checks: `Up aplicada y comandos/readers/trigger probados en PostgreSQL 18.6 efímero local con rol runtime; NO aplicada a staging/producción`
- Integration checks: `Pendiente acreditar extremo a extremo con actor y grant reales en runtime compartido; fixture y pruebas locales no lo sustituyen`
- Reliability signals/logs: `IDs de operación y hashes; nunca bearer`
- Production verification sequence: `gates locales, staging, release, grant real y revocación de canary`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Foundation

Contrato validado y fronteras explícitas conforme al plan, documentación y fixtures.

### Slice 2 — Implementación e integración

Case/draft/edition/grants, commands/readers, authz, API y pruebas DB.

## Out of Scope

Editor visual drag-and-drop, CMS del banco, captación bancaria, envío de correo y cambios CRM.

## Detailed Spec

El detalle de entidades, payload, grafo, UX, invariantes y aceptación vive en el plan aprobado
`docs/think/aeo-xray-composer-extension-plan-2026-09-30.md`; no duplicar el canon.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contrato y ADR → foundation/renderer en paralelo → integración → contenido revisado → QA → rollout.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga bearer o borrador | acceso | medium | grant y proyección allowlisted, no-store | prueba negativa falla |
| Romper muestra SKY | Think | medium | legacy independiente y regresión | gate browser |
| Claim financiero inválido | contenido | medium | fuentes fechadas, revisión humana | QA editorial |

### Feature flags / cutover

Nuevo acceso default OFF durante construcción; preview local con fixture explícita sin ruta productiva.

### Rollback plan per slice

Desactivar entrada nueva; conservar snapshots y revocaciones. Migración additive sin backfill destructivo.

### Production verification sequence

Gates locales → staging API/SSR → negativos acceso → revisión visual → release gobernado → readback.

### Out-of-band coordination required

Release y distribución AXIS conforme al control plane; no publicar automáticamente tras tests locales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Contrato y límites de ownership quedan implementados y validados **localmente**. AXIS 34/34, fuente portable y distribución reproducible; [evidencia](../../audits/aeo-xray/TASK-1950-contracts-local-pg.md). No implica paquete publicado ni consumer aprobado.
- [x] Edición fija y grant no revelan borrador ni otra organización; revocación y expiración verificadas **localmente**. Pruebas de dominio y PostgreSQL efímero con dos organizaciones, revisión optimista, retry idempotente, trigger inmutable, revoke/withdraw y negativos de expiración; actor/runtime real sigue en el criterio separado.
- [x] Dos piezas del caso Pichincha resuelven con el contrato neutral; regresión legacy 46 y extensión 198 verificadas. Demo Think publicada y aceptada por el operador; evidencia final del consumer en TASK-1951 y dossier de implementación. Esto no certifica grants Greenhouse.
- [ ] Evidencia de runtime, rollback y estados pendientes registrada sin confundir código con operación. Plan de rollback y límites documentados; no hay ensayo/readback del runtime público ni rollback ejecutado.
- [ ] Tenant/authz, idempotencia, audit y errores sanitizados pasan negativos con actor real. La suite local pasa; falta actor real autorizado y su canary, no se reemplaza por mocks.
- [ ] Migración y boundary allowlist verificados; grants/assets no eluden revocación. Up y triggers pasan en PG efímero, más negativos locales de assets; falta aplicar/verificar contra entorno compartido y storage real detrás del grant.
- [ ] Capability registry y grants, API programática y readback del reader completos. Schema/commands/authz/routes existen localmente; no se asignaron grants de rol reales ni se certificó su lectura pública desplegada.

## Verification

### Avance verificado — 2026-09-30

- Se implementaron case/draft, ediciones selladas, grants digest-only, authz/API y media privada por edición. No se ejecutó release, migración compartida, envío de correo ni cambio CRM.
- Se recuperó la composición original completa en el contrato: narrativa, machine, evidencia/fan-out, átomos, cuatro pantallas y coreografía; elegir landing/artículo amplía esa experiencia. Emisión rechaza artefactos sin `experience`; un borrador puede estar incompleto.
- Se cerró deriva máquina/espécimen con validación fail-closed: metadata conocida contra SEO objetivo, árbol completo de encabezados, ALT contra asset aprobado, page-schema canónico y FAQ Q/A. Propuestas personalizadas no se reescriben y los datos factuales no se recalculan. El intent externo Pichincha resolvió ambas piezas tras consolidar el FAQ duplicado; eso no es aprobación visual ni publicación.
- `pnpm exec vitest run src/lib/aeo-xray`: **22 passed**, 1 integración opt-in omitida. `python3 scripts/qa/verify-aeo-xray-local-pg.py`: **1 passed**, migración/SQL/commands reales en cluster temporal local detenido y eliminado. `node scripts/qa/verify-aeo-xray-distribution.mjs`: siete archivos íntegros.
- AXIS tests focales: **34/34** y build de contracts correcto. La suite completa AXIS conserva tres fallos fuera de X-Ray; no se declara verde global. [Evidencia y reproducción](../../audits/aeo-xray/TASK-1950-contracts-local-pg.md).
- Gates focales de contrato/runtime descritos en el plan aprobado.
- `pnpm task:lint --task TASK-1950`
- `git diff --check`

## Closing Protocol

- [x] Lifecycle in-progress, archivo, registry y README sincronizados con evidencia; integración pendiente explícita.
- [x] Handoff/changelog, arquitectura, documentación y manual actualizados; dossier y skills enlazados.
- [x] Impacto cruzado revisado: Think, AXIS, Greenhouse y CRM separados; no se publica Greenhouse ni se envía correo por inferencia.

## Follow-ups

Exportación PDF/deck y editor visual sólo si nuevo pedido los requiere.

## Corte de entrega — 2026-09-30

El X-Ray de TASK-1951 fue aceptado por el operador y publicado por un carril de muestra autónoma en Think; eso no activa estas APIs, no ejecuta esta migración y no emite un grant Greenhouse. El usuario pidió enviar la demo al cliente antes de integrar Greenhouse y prohibió su promoción a producción. Se mantiene el lifecycle `in-progress` y se preservan sin tildar los acceptance criteria que requieren actor/runtime compartidos.

En el cierre documental se repitieron las pruebas focales: **22 tests passed y 1 integración opt-in omitida**, kit multicliente **1 passed**, distribución portable **7 archivos verificados**; AXIS **34/34** y export `--check` **8 archivos**. La evidencia PostgreSQL efímera del avance previo permanece fechada; no se repitió ni se aplicó a staging/producción. Véase [dossier de implementación](../../think/aeo-xray-implementation-dossier-2026-09-30.md) y [handoff de integración](../../think/aeo-xray-release-handoff.md).
