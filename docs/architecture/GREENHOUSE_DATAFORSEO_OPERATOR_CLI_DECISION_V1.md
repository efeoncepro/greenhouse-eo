# DataForSEO Operator CLI Decision V1

> Status: Accepted · 2026-09-28
> Owner: Growth SEO / Platform
> Task: `TASK-1935`

## Context

Greenhouse ya posee un transporte DataForSEO con auth, breaker, allowlist y spend ledger, pero no una entrada de
terminal. El proveedor no publica un OpenAPI reutilizable: su documentación v3 está compuesta por páginas
WordPress parametrizadas. La portada oficial sí enumera las páginas concretas y el REST oficial conserva ID y
fecha de modificación de sus plantillas.

La herramienta debe servir a personas y agentes sin crear una segunda integración: descubrir capacidades,
previsualizar payloads y costo, ejecutar una ruta gobernada, recuperar tasks asíncronas y componer research de
keywords. Inventario oficial, autorización Greenhouse y disponibilidad runtime son tres planos distintos.

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

## Technical architecture

```text
documentación oficial DataForSEO
        │ catalog:sync/check
        ▼
data/dataforseo/endpoints.v3.json
        │
        ├── catalog search/list/describe
        ├── quick ── presets + market resolver
        ├── run ──── payload JSON genérico
        ├── task wait ── GET acotado, nunca resubmit
        └── research ─── Labs discovery → overview → SERP/competitors
                         │
                         ▼
               requestDataForSeo
          allowlist · auth · breaker · cost
                         │
              entitlement + spend ledger
```

### Components and ownership

| Component                                       | Responsibility                                                                                                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `scripts/dataforseo/generate-catalog.ts`        | Lee REST WordPress y documentación renderizada oficiales, normaliza rutas v3 concretas y escribe/comprueba el snapshot. |
| `data/dataforseo/endpoints.v3.json`             | Inventario versionado con digest, método, path, campos, modo y estado ejecutable. Es evidencia, no autorización.        |
| `src/lib/ai/dataforseo-catalog.ts`              | Loader tipado, búsqueda y mapeo de la familia del proveedor al allowlist cerrado de Greenhouse.                         |
| `src/lib/ai/dataforseo-cli-presets.ts`          | Builders pequeños para operaciones frecuentes; la identidad de mercado sale de `src/lib/growth/markets`.                |
| `src/lib/ai/dataforseo-keyword-research.ts`     | Plan, estimación, payloads, extracción/deduplicación y CSV del flujo compuesto de keywords.                             |
| `scripts/dataforseo/cli.ts`                     | Orquestación local, preview, confirmación, validación, preflight de entitlement, outcomes y artefactos.                 |
| `src/lib/ai/dataforseo.ts`                      | Transporte único: credenciales, prefijo, timeout, retry, breaker y notificación de costo.                               |
| `src/lib/growth/seo/entitlement.ts`             | Decisión de quota y presupuesto por organización antes del gasto.                                                       |
| `src/lib/growth/seo/register-provider-spend.ts` | Registra el recorder del ledger; la CLI lo importa en el entrypoint.                                                    |

La CLI consume estos contratos. No es dueña de credenciales, autorización de familias, política de presupuesto ni
persistencia productiva.

## Command and execution contracts

### Catalog

`catalog info|list|search|describe` sólo lee el snapshot. `catalog_only` significa que la ruta existe en el
inventario oficial pero Greenhouse no autorizó su familia. `dataforseo:catalog:sync` refresca la fuente oficial;
`dataforseo:catalog:check` detecta drift sin convertir una ruta nueva en autorización.

### Quick and run

`quick` construye payloads para operaciones frecuentes de SERP, Labs, Backlinks, OnPage y AI Optimization. `run`
acepta ID/path y JSON objeto o arreglo, y permite alcanzar cualquier ruta catalogada sin mantener cientos de ramas.
Ambos convergen en el mismo `execute` y transporte.

El validador local comprueba requireds extraídos, batch limit y dos invariantes AI de alto riesgo:
`max_output_tokens` para LLM Responses y `platform` para LLM Mentions. No se presenta como validador OpenAPI:
parámetros condicionales, enums y formas anidadas siguen siendo contrato del proveedor visible en `describe`.

### Task lifecycle

`task wait` reemplaza `{id}`/`$id` o agrega el ID a un path task-get, y hace polling GET acotado. Los códigos
`20100`, `40601` y `40602` son pending; `20000` es éxito; los demás `>=40000` son errores de task. El polling
nunca repite `task_post`. GET puede reintentar 429/5xx; POST tiene un intento porque el timeout puede llegar después
de que el proveedor aceptó y cobró.

### Composed research

`research` es un orquestador local, no un endpoint nuevo. Ejecuta Suggestions y Related, permite Ideas de forma
explícita y, con target, agrega Keywords for Site y Competitors. Deduplica candidatas, enriquece con Keyword
Overview y compra SERP orgánica live sólo para finalistas acotadas. La estimación usa máximos declarados de filas y
tasks (`conservative_max_rows_v1`); ejecutar exige organización, entitlement, confirmación y ceiling.

El JSON conserva tasks crudas por paso. El CSV es sólo la tabla normalizada de keywords. No se afirma una decisión
automática de cobertura editorial, un score de oportunidad ni una métrica AI cross-platform.

## Authorization, cost and tenancy

- El registry ejecutable está cerrado a `serp`, `labs`, `backlinks`, `onpage`, `domain` y `ai_optimization`.
- Todo POST fuera de SERP exige `organizationId`; SERP permite prospectos públicos sin org. Si existe org, el
  recorder de gasto es obligatorio para cualquier familia.
- Toda llamada declara `consumer: seo|aeo`; AI Optimization usa `aeo`, y los presets SEO/research usan `seo`.
- La ejecución pagada exige estimación conocida o declarada más `--max-usd`. Es comparación previa, no un límite
  transaccional del proveedor.
- El entitlement se consulta antes de ejecutar. Limitación conocida: una corrida compuesta larga no reconsulta
  después de cada llamada, por lo que necesita estimación agregada conservadora.
- El costo registrado es `cost` de la respuesta completa; no se inventa un costo por task.

## Output and failure contract

El artefacto genérico contiene `queriedAt`, surface, request resuelto, status por task, costo, latencia, breaker y
tasks crudas. `--out` crea en modo exclusivo (`wx`) para no sobrescribir evidencia. Research puede sumar CSV.
Secretos y raw HTTP error bodies no se emiten.

Exit codes estables: `0` éxito/preview válido, `2` uso o validación local, `3` bloqueo de autorización/entitlement/
presupuesto, `4` error de task, `5` HTTP/transporte, `6` éxito sin datos y `7` pending.

## Coverage and runtime state

El snapshot del 2026-09-28 contiene 545 rutas oficiales; 320 caen en las seis familias autorizadas: 160 SERP,
45 Labs, 22 Backlinks, 28 OnPage, 12 Domain Analytics y 53 AI Optimization. Las demás son `catalog_only`.
Cobertura significa que la CLI genérica puede enrutar un payload válido por el transporte gobernado; no significa
que cada endpoint tenga preset, estimador específico o smoke pagado.

`ai_optimization` está code-complete en registry, catálogo, transporte y guards locales. La migración
`migrations/20260928095506879_task-1651-ai-optimization-family.sql` está versionada pero no aplicada a staging ni
producción al 2026-09-28. Los GET gratuitos/modelos y previews son utilizables. Los POST pagados no se declaran
operativos hasta aplicar el CHECK y verificar en staging entitlement, `consumer=aeo` y readback del gasto.
Captura recurrente, schema, readers, MCP y schedules quedan fuera de la CLI y pertenecen a `TASK-1651-B`.

## Known limitations

- La fuente oficial es documentación HTML/WordPress, no OpenAPI; la validación extraída es parcial.
- El pricing no es uniforme. Sin estimador verificable, el operador debe declarar `--estimated-usd`.
- `research` es secuencial y no tiene checkpoint, caché, resume ni paginación automática; repetir puede recomprar.
- Sus finalistas siguen un orden basado en volumen, no un modelo de prioridad de negocio o relevancia editorial.
- El CSV no normaliza SERP features, PAA, AI Overview ni URLs competidoras; esa evidencia queda en JSON.
- El flujo compuesto usa SERP live. Task-based standard es preferible para lotes no urgentes y se opera con
  `run` + `task wait`.
- Ejecutabilidad no crea un data product: un consumer recurrente requiere schema, writer, idempotencia/frescura,
  readers, MCP parity, rollout y evidencia runtime.

## Alternatives rejected

- Mantener cientos de rutas a mano: drift inevitable y cobertura imposible de probar.
- Instalar un SDK o cliente REST paralelo: evita allowlist, breaker y ledger.
- Tratar todas las rutas oficiales como ejecutables: amplía gasto y superficie sin ADR, entitlement ni schema.
- Reintentar POST ante timeout: puede duplicar task y costo cuando el provider ya aceptó la primera llamada.

## Consequences

- El snapshot es grande, pero sólo lo carga tooling local; no entra a bundles del portal.
- Un cambio en el HTML oficial puede romper la sincronización de forma visible; el snapshot anterior permanece
  usable hasta corregir el parser.
- Las estimaciones exactas siguen siendo endpoint-specific. Sin base verificable, la CLI exige estimación y
  ceiling en vez de mostrar precisión falsa.

## Fitness functions

- `pnpm dataforseo:catalog:check` detecta drift.
- Tests comprueban rutas diarias, allowlist, Perú→2604, AI guards, research, estados task y GET sin body/retry.
- `pnpm typecheck`, lint y task lint protegen integración.

## Revisit triggers

- DataForSEO publica OpenAPI oficial estable.
- Se propone una séptima familia.
- El catálogo supera el costo aceptable de sync o la portada deja de enumerar rutas concretas.
- Research necesita checkpoint/resume, paginación, normalización SERP o un workflow AI compuesto.
