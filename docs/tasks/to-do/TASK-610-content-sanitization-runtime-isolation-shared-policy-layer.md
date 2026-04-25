# TASK-610 — Content Sanitization Runtime Isolation + Shared Policy Layer

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `—`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-610-content-sanitization-runtime-isolation`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Sacar la sanitizacion HTML operativa del runtime SSR sensible del portal y convertirla en una capability shared, Node-safe y policy-driven. El objetivo inmediato es cerrar el crash productivo provocado por `isomorphic-dompurify` + `jsdom`, pero la solucion no debe ser un parche puntual: debe dejar contrato canonico reusable para producto, cotizaciones, emails, Nexa y futuros rich-text inputs.

## Why This Task Exists

El repo hoy tiene un helper puntual de `TASK-603` (`src/lib/commercial/description-sanitizer.ts`) que usa `isomorphic-dompurify` en codigo server productivo. Ese helper se consume desde paths de outbound HubSpot y drift detection, por lo que una dependencia de emulacion DOM (`jsdom`) termino entrando al runtime SSR del portal y rompio en produccion por conflicto ESM/CJS (`html-encoding-sniffer` -> `@exodus/bytes/encoding-lite.js`).

Ese error visible es solo el sintoma. El problema arquitectonico de fondo es mayor:

- sanitizacion HTML operativa vive como helper ad hoc y no como capability compartida
- paths criticos del runtime dependen de librerias browser/DOM-oriented
- sanitizacion, derivacion de texto plano y consumo read/write estan acoplados en un solo modulo
- no existe versionado de policy ni contrato canonico persistible para contenido "raw" vs "safe"

La solucion correcta debe:

1. aislar la sanitizacion de runtime del portal respecto de `jsdom` o equivalentes
2. formalizar politicas de sanitizacion reutilizables por dominio
3. permitir persistir y consumir contenido safe/derivado sin recalcular en cada read critico
4. dejar rollout sin downtime y con backfill/audit claros

## Goal

- Eliminar cualquier dependencia de `jsdom` o emulacion DOM del runtime server critico para sanitizacion HTML operativa.
- Crear una capability shared de sanitizacion con policies versionadas y API reusable.
- Separar explicitamente contenido `raw`, `sanitized` y derivados plain-text cuando el dominio lo necesite.
- Migrar el caso actual de descripciones de producto HubSpot a este contrato sin romper outbound ni drift detection.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`

Reglas obligatorias:

- Ningun path critico SSR/server del portal puede depender de emulacion DOM para sanitizar contenido operativo.
- La sanitizacion debe ser Node-safe, deterministic y policy-driven; no confiar en heuristicas por surface.
- Los dominios no deben inventar whitelists paralelas si la capability shared ya cubre el caso.
- La derivacion `raw -> sanitized -> plain` debe ser auditable y versionable.
- Rollout must be no-downtime: primero additive, luego consumer cutover, luego cleanup.
- El fix no puede limitarse a "cambiar de libreria" sin dejar contrato institucional reutilizable.

## Normative Docs

- `docs/tasks/complete/TASK-603-hubspot-products-outbound-contract-v2-cogs-unblock.md`
- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/commercial/description-sanitizer.ts`
- `src/lib/hubspot/hubspot-product-payload-adapter.ts`
- `src/lib/commercial/product-catalog/drift-detector-v2.ts`
- `src/lib/commercial/__tests__/description-sanitizer.test.ts`
- `src/lib/hubspot/__tests__/hubspot-product-payload-adapter.test.ts`
- `package.json`
- `pnpm-lock.yaml`

### Blocks / Impacts

- Product Catalog outbound a HubSpot (`TASK-603` runtime path)
- Drift detection / reconcile del catalogo (`TASK-604`, `TASK-605`)
- futuros rich-text payloads operativos en quotations, email y surfaces similares
- capacidad institucional de sanitizacion reusable para IA/Nexa y futuros inputs HTML

### Files owned

- `src/lib/commercial/description-sanitizer.ts`
- `src/lib/hubspot/hubspot-product-payload-adapter.ts`
- `src/lib/commercial/product-catalog/drift-detector-v2.ts`
- `src/lib/content/[nuevo modulo shared]`
- `docs/architecture/[nuevo o delta especializado]`
- `docs/documentation/[si aplica]`
- `package.json`

## Current Repo State

### Already exists

- Existe sanitizacion puntual para descripciones de producto en `src/lib/commercial/description-sanitizer.ts`.
- El outbound HubSpot de productos consume ese helper desde `src/lib/hubspot/hubspot-product-payload-adapter.ts`.
- Drift detection reutiliza `derivePlainDescription()` para comparar plain text derivado.
- El repo ya tiene precedentes de sanitizacion textual/server-side en Nexa, Finance presentation y guards de payload, pero no una capability shared para rich HTML.

### Gap

- No existe una capability shared `content sanitization` con policies versionadas.
- El helper actual usa `isomorphic-dompurify` en runtime server productivo.
- No hay separacion formal entre contenido raw, contenido safe y derivados plain-text.
- No hay strategy de backfill ni de policy versioning para cuando cambie la sanitizacion.

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

### Slice 1 — Shared content sanitization module + policy registry

- Crear un modulo shared Node-safe para sanitizacion de rich HTML y derivacion de plain text.
- Definir al menos una policy versionada inicial: `hubspot_product_description_v1`.
- Exponer una API explicita tipo `sanitizeRichHtml(input, policyId)` y `derivePlainTextFromSanitizedHtml(html, policyId)`.

### Slice 2 — Product catalog additive contract

- Definir el contrato canonico de persistencia para el caso actual de producto, separando donde aplique `raw`, `sanitized` y derivados.
- Si Discovery confirma que hace falta schema additive, agregar columnas/campos versionados sin romper consumers actuales.
- Dejar trazable `sanitizationPolicyVersion` o equivalente para permitir re-sanitize/backfill futuro.

### Slice 3 — Consumer cutover (outbound + drift)

- Migrar `hubspot-product-payload-adapter` para consumir la capability shared y dejar de depender de `isomorphic-dompurify`.
- Migrar `drift-detector-v2` para no recalcular contenido con una dependencia pesada en cada read critico.
- Eliminar dependencia productiva de `jsdom` en estos paths.

### Slice 4 — Backfill, auditability and observability

- Definir y ejecutar estrategia de backfill/recompute para rows existentes si el contrato additive lo requiere.
- Registrar metadata minima de version/policy y cualquier cambio relevante entre raw/safe para debugging.
- Dejar smoke check o script operacional para verificar que el runtime productivo ya no carga `jsdom` por este carril.

### Slice 5 — Docs and institutionalization

- Actualizar la arquitectura/documentacion para formalizar la regla: no usar emulacion DOM en sanitizacion operativa server-side.
- Documentar el pattern reusable para futuros rich-text inputs del portal.
- Dejar follow-ups explicitos para surfaces/dominios que aun queden con sanitizacion ad hoc.

## Out of Scope

- Rediseñar todos los rich-text editors del portal en esta misma task.
- Reescribir masivamente todas las sanitizaciones textuales simples del repo.
- Abrir un microservicio separado solo para sanitizacion si la capability local shared resuelve el caso con menos complejidad.
- Cambiar el contrato funcional de producto en HubSpot mas alla de la sanitizacion y derivacion de texto.

## Detailed Spec

La solucion objetivo debe verse asi:

1. `ContentSanitizationPolicyRegistry`
   - `hubspot_product_description_v1`
   - lista de tags permitidos
   - attrs permitidos
   - URI schemes permitidos
   - reglas de plain-text derivation

2. `Shared module`
   - `src/lib/content/sanitization/policies.ts`
   - `src/lib/content/sanitization/sanitize-rich-html.ts`
   - `src/lib/content/sanitization/derive-plain-text.ts`
   - `src/lib/content/sanitization/types.ts`

3. `Product contract`
   - input raw del operador/upstream
   - contenido safe para outbound/render
   - derivado plain-text para comparaciones y contexts que no aceptan rich HTML
   - policy/version persistible o, como minimo, reproducible

4. `Consumer model`
   - outbound HubSpot consume safe HTML + plain derivado
   - drift detection consume plain derivado/safe contract, no librerias DOM
   - reads criticos no recalculan sanitizacion compleja salvo fallback defensivo controlado

La task debe decidir en Discovery entre dos variantes validas:

- **Variante A — additive minimal schema**
  mantener columnas actuales y agregar metadata/version derivada minima

- **Variante B — explicit raw/safe split**
  introducir columnas diferenciadas para raw vs safe si el modelo actual mezcla demasiado ambos roles

Regla: elegir la variante con mejor balance entre no-downtime, claridad futura y blast radius controlado.

## Acceptance Criteria

- [ ] Los paths productivos actuales de sanitizacion HTML ya no dependen de `isomorphic-dompurify` ni de `jsdom`.
- [ ] Existe un modulo shared de sanitizacion rich HTML con policies versionadas y API reusable.
- [ ] El caso de descripciones de producto HubSpot consume ese contrato shared sin regression funcional visible.
- [ ] Existe estrategia documentada y ejecutable de backfill/migracion para contenido ya persistido si aplica.
- [ ] Queda formalizada en arquitectura la regla de no usar emulacion DOM en sanitizacion operativa server-side.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/commercial/__tests__/description-sanitizer.test.ts src/lib/hubspot/__tests__/hubspot-product-payload-adapter.test.ts`
- `pnpm why isomorphic-dompurify`
- smoke local/build orientado a confirmar que el carril ya no intenta cargar `jsdom` en runtime productivo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado con fix, validaciones y riesgo residual
- [ ] `changelog.md` quedo actualizado si cambio el contrato visible/operativo
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-603`, `TASK-604` y `TASK-605`

- [ ] la documentacion de arquitectura deja explicitado el pattern shared de sanitizacion reusable

## Follow-ups

- Extender la capability shared a quotation rich text si discovery confirma casos reales
- Auditar otros consumers con rich HTML o markdown-to-HTML antes de que entren al runtime productivo
- Evaluar si `isomorphic-dompurify` puede salir por completo del repo o quedar solo en contextos no productivos
