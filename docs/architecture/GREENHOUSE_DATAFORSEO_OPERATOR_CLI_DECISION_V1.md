# DataForSEO Operator CLI Decision V1

> Status: Accepted · 2026-09-28
> Owner: Growth SEO / Platform
> Task: `TASK-1935`

## Delta 2026-09-28 — research compuesto

La CLI incorpora `research` como orquestador local sobre el mismo transporte. El flujo ejecuta Suggestions y
Related, permite Ideas de forma explícita, agrega Keywords for Site cuando hay target, enriquece con Overview y
limita SERP/competidores a la fase final. El preflight calcula un techo conservador agregado con los límites
declarados; una ejecución exige organización, entitlement, `--yes` y `--max-usd`. La salida conserva respuestas
por paso y una tabla deduplicada JSON/CSV; `missing`, `null` y cero no se colapsan.

## Context

Greenhouse ya posee un transporte DataForSEO con auth, breaker, allowlist y spend ledger, pero no una entrada de
terminal. El proveedor no publica un OpenAPI reutilizable: su documentación v3 está compuesta por páginas
WordPress parametrizadas. La portada oficial sí enumera las páginas concretas y el REST oficial conserva ID y
fecha de modificación de sus plantillas.

## Decision

1. `src/lib/ai/dataforseo.ts` sigue siendo el único transporte. Gana `requestDataForSeo` para GET y POST;
   `postDataForSeoTask` permanece compatible.
2. POST tiene un solo intento. GET admite hasta tres intentos ante 429/5xx, con backoff acotado y el mismo breaker.
3. `scripts/dataforseo/generate-catalog.ts` deriva un snapshot versionado desde el REST y las páginas concretas
   enlazadas por la portada oficial. No se inventa un OpenAPI.
4. El snapshot distingue `official inventory` de `executable coverage`. Las seis familias del allowlist pueden
   ejecutarse; TASK-1651-A agrega `ai_optimization` con el mismo CHECK del ledger y paridad TS↔SQL.
5. La CLI es server-only y local. Para gasto atribuible consume `enforceSeoRunEntitlement`; nunca fabrica una
   organización. Sin `--yes` opera como preview. Todo POST pagado exige un ceiling y una estimación verificable o
   declarada.
6. El lifecycle asíncrono separa submit, pending y result. Polling nunca resubmite el POST original.
7. Los GET de catálogo, modelos y polling no crean gasto y pueden operar sin organización. Todo POST de
   `ai_optimization` exige organización, entitlement y `consumer='aeo'`; el preview sigue siendo libre de org.
8. LLM Responses exige `max_output_tokens`; LLM Mentions exige `platform` explícita. `--max-usd` compara la
   estimación preflight y no se presenta como hard cap del proveedor.

## Alternatives rejected

- Mantener cientos de rutas a mano: drift inevitable y cobertura imposible de probar.
- Instalar un SDK o cliente REST paralelo: evita allowlist, breaker y ledger.
- Tratar todas las rutas oficiales como ejecutables: amplía gasto y superficie sin ADR, entitlement ni schema.
- Reintentar POST ante timeout: puede duplicar task y costo cuando el provider ya aceptó la primera llamada.

## Consequences

- El snapshot es grande, pero sólo lo carga tooling local; no entra a bundles del portal.
- Un cambio en la estructura HTML oficial puede romper la sincronización de forma visible; el snapshot anterior
  permanece usable hasta corregir el parser.
- Las estimaciones exactas seguirán siendo endpoint-specific. Cuando no haya base verificable, la CLI exige que el
  operador declare estimación y ceiling en vez de mostrar precisión falsa.

## Fitness functions

- `pnpm dataforseo:catalog:check` detecta drift.
- Tests comprueban rutas diarias, allowlist, Perú→2604, estados task y GET sin body/retry acotado.
- `pnpm typecheck`, lint y task lint protegen integración.

## Revisit triggers

- DataForSEO publica OpenAPI oficial estable.
- Una séptima familia se propone para Greenhouse.
- El catálogo supera el costo aceptable de sync o la portada deja de enumerar rutas concretas.
