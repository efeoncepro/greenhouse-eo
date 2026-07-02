# ISSUE-111 — Flake de tests en CI/ci-deep bloqueó el preflight de un release productivo (pdf-parse bajo Node 24)

## Ambiente

CI (GitHub Actions) — workflows `CI` (job `Fast feedback and conditional build`, step `Test`) y `CI Deep Verification` (job `Coverage and deep test observability`, step `Coverage` = `pnpm test:coverage`). Reproducido sobre los merge commits de release `1ac49552d` (2026-06-30) y `347f35c0d` (2026-07-02).

## Detectado

2026-06-30, durante una promoción a producción vía el slash command `/release`. El preflight (`ci_green`) abortó el orquestador **dos veces seguidas** porque CI y ci-deep estaban en `failure` sobre el merge commit. **Recurrió el 2026-07-02** en otro release (merge `347f35c0d`), bloqueando el preflight 3 veces más (falló también en 2 re-runs → dejó de comportarse como flake ocasional y pasó a fallar de forma casi determinista en el runner).

## Síntoma

- `CI` y `CI Deep Verification` en `failure`. Resumen de vitest: **1 archivo de test con 3 tests fallando** (2026-06-30: `8709 tests / 3 failed`; 2026-07-02: `8743 tests / 3 failed`).
- El **mismo árbol** había pasado CI verde ~40 min / ~2 h antes (código y `pnpm-lock.yaml` idénticos entre el run verde y el rojo).
- El ruido de stderr Vertex (`Permission 'aiplatform.endpoints.predict' denied`, `Model overloaded`) es un **red herring**: son mocks intencionales en `src/lib/nexa/nexa-service.test.ts` y esos tests pasan.

## Causa raíz (identificada 2026-07-02)

El archivo flaky es **`src/lib/payroll/generate-payroll-pdf.test.ts`** (3 de sus tests, TASK-782 disaggregation). Los tests **renderizaban el PDF a binario y lo re-parseaban con `pdf-parse@1.1.1`** para asertar landmarks de texto. `pdf-parse@1.1.1` (sin mantenimiento) **bundlea un pdf.js antiquísimo (v1.10.100, ~2016)** cuyo path de carga/parse lanza `UnknownErrorException: Illegal character: 41`.

**Detonante temporal:** el **cutover del runtime de CI de Node 20 → Node 24 el 2026-06-22** (commit `1d0c731fd` "chore: cut app runtime to node 24", TASK-845, release `3a39c68ba`). Bajo Node 20 ese pdf.js viejo era estable; bajo Node 24 se volvió intermitentemente incompatible → falla no-determinista que fue escalando su frecuencia hasta bloquear releases (~8 días después). Coincide con el reporte del operador: "hasta el mes pasado esto servía".

El detalle no se veía en el stdout del job (vitest lo emite al artifact `test-observability`, no a consola). Se identificó descargando ese artifact (`summary.md` / `vitest.log`) del attempt fallido.

Bug class: dependencia de test frágil que re-parsea un artefacto binario. Precedente relacionado del mismo síntoma (flake CI bajo coverage): `ISSUE-052`.

## Impacto

- Bloqueó el preflight del orquestador 5 veces en total (2 el 2026-06-30 + 3 el 2026-07-02) → re-runs de CI/ci-deep (~15-20 min c/u) + fricción operativa durante releases productivos.
- No afectó producción: el preflight bloquea **antes** de mutar el ecosistema (workers/manifest). El frontend Vercel ya estaba live (auto-deploy en push), idéntico a develop verde.

## Solución (aplicada 2026-07-02)

Fix robusto — **eliminar la dependencia frágil**, no bypassear ni subir timeouts:

1. **Helper de test compartido `src/test/react-pdf-text.ts`** (`extractReactPdfText`): camina el árbol de elementos react-pdf y extrae el texto de cada `<Text>` **sin renderizar a binario ni usar pdf-parse**. Determinista, idéntico en CI y local. Seguro porque las primitivas react-pdf son *string host types* (se matchean por identidad, nunca se invocan) y los componentes de documento son presentacionales puros (sin hooks), así que el árbol resuelve por recursión.
2. **Patrón SSOT en los generadores**: `buildPayrollPeriodReportElement` (`generate-payroll-pdf.tsx`) y `buildFinalSettlementDocumentElement` (`final-settlement/document-pdf.tsx`) exponen el elemento `<Document>` que **producción renderiza a Buffer** y **los tests inspeccionan** — misma fuente, dos consumers.
3. **Ambos tests de payroll PDF migrados** a aserciones exactas sobre los runs de texto (más precisas que los regex de spacing que dependían de cómo pdf-parse concatenaba).
4. **`pdf-parse` eliminado de `package.json`** (era la única dependencia frágil; solo esos 2 tests lo usaban).

## Prevención (cómo evitamos que vuelva)

- **Estructural (aplicada):** `pdf-parse` ya no es dependencia del repo. Re-introducirla exige un `pnpm add` deliberado y revisable; `--frozen-lockfile` en CI falla si alguien la agrega sin actualizar el lockfile.
- **Patrón canónico (aplicado):** cualquier aserción futura sobre texto de un PDF react-pdf debe usar `extractReactPdfText` sobre el elemento `<Document>` (vía el `build*DocumentElement()` del generador). **NUNCA** re-parsear el PDF binario en un test (`pdf-parse`/pdf.js/`pdfjs-dist` sobre el output). Un test que necesite el binario debe justificarlo explícitamente.
- **Observabilidad (nota operativa):** cuando CI reporte "N tests failed" sin detalle en consola, el detalle vive en el artifact `test-observability` (`summary.md`/`vitest.log`) del attempt — descargarlo con `gh run download <run-id> --name test-observability` antes de asumir "flake genérico".
- **Follow-up opcional (no bloqueante):** un lint rule custom `greenhouse/no-pdf-binary-reparse` (archivo propio, para no pisar los `no-restricted-imports` scopeados del core isomórfico) que bloquee `pdf-parse`/`pdfjs-dist` en tests. Se deja como mejora, ya que la remoción de la dependencia + el patrón canónico cubren el caso.

## Verificación

- ✅ `pnpm vitest run src/lib/payroll/generate-payroll-pdf.test.ts src/lib/payroll/final-settlement/document-pdf.test.tsx` — 7/7 verdes, determinista (múltiples corridas).
- ✅ `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` — 569 passed (boundary gate).
- ✅ `pnpm test` (suite completa) — **8639 passed, 0 failed** (antes: 3 failed).
- ✅ `pnpm typecheck` limpio · `pnpm lint` limpio sobre los archivos tocados · `pnpm build` verde.

## Estado

`resolved` — 2026-07-02. Causa raíz identificada y eliminada (dependencia frágil removida + patrón determinista canónico). El release que lo destapó pudo completar su preflight `ci_green` sin re-runs ni bypass.

## Relacionado

- Detonante temporal: cutover Node 20→24 del 2026-06-22 (`1d0c731fd`, TASK-845, release `3a39c68ba`).
- Releases que lo destaparon: `1ac49552d` (2026-06-30) y `347f35c0d` (2026-07-02).
- Precedente del bug class (flake CI bajo coverage): `ISSUE-052`.
- Distinto del false-positive del watchdog `worker_revision_drift` → `TASK-920`.
