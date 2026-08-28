# TASK-1703 — Router cheap-first del eje HERRAMIENTA (y sólo del eje herramienta)

## Delta 2026-08-27

- El bloqueante `TASK-1696` está **code complete**: el ledger tiene dimensión de consumidor y
  `resolveAeoBudget` mide el gasto en dólares por organización — cerrado por TASK-1696. El gate nace
  en shadow (calcula, registra y emite señal sin bloquear), que es justo lo que esta task necesita:
  al cambiar el proveedor por defecto el gasto se mueve y ahora se ve.
- La ruta declarada en §Depends on quedó stale: TASK-1696 ya no vive en `docs/tasks/to-do/`.

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
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-15 (2) — cifras corregidas por verificación adversarial

Una verificación adversarial contra PG real corrigió los costos por observación que esta task
heredó de la auditoría fuente. **Causa raíz única:** se promedió sobre
`greenhouse_growth.provider_observations` sin excluir el tráfico de prueba — 102 observaciones de
adapters `fake-*` con costo CERO (30 de ellas `fake-gemini`) inflaron los denominadores. Los
**totales en dólares no estaban contaminados** (los fakes cuestan 0), pero **los promedios por
observación sí**.

| Métrica | Valor original | Valor verificado (PG, 2026-08-15) |
|---|---|---|
| gemini / observación | USD 0,0040 | **USD 0,005242** (`gemini-3-flash-preview`, n=115 succeeded) |
| openai / observación | ~USD 0,0323 (implícito en el 7,4×) | **USD 0,038417** (`gpt-4.1`, n=159) |
| anthropic / observación | USD 0,0845 | **USD 0,084487** ✅ correcto |
| google_ai_overview / observación | ~USD 0,0026 | **USD 0,004000** (n=23) |
| perplexity / observación | ~USD 0,0055 | **USD 0,000670** (`sonar`, n=87) |
| gemini vs medición SERP DataForSEO | 0,9× "paridad" | **1,2×** — gemini queda **20% POR ENCIMA** de una medición SERP, no a la par |
| gemini vs openai | — | **7,3× más barato** (la dirección sobrevive con holgura) |

Método correcto: promedio sobre observaciones `status='succeeded'` con `model NOT LIKE 'fake-%'`.
Nota adicional: bajo el provider `gemini` conviven **dos modelos reales** (`gemini-3-flash-preview`
USD 0,005242 y `gemini-2.5-flash` USD 0,002500) más el `fake-gemini` de prueba — "el costo de
gemini" no es un número único y hay que decir con qué modelo se midió.

**Lo que NO cambia:** el 92% del gasto concentrado en OpenAI + Anthropic (USD 6,11 + USD 2,53 de
USD 9,4222) se verificó y es correcto — los dólares totales no dependen de los denominadores. La
tesis de la task (cheap-first en el eje herramienta, cobertura intocable) sobrevive con holgura.
**Lo que sí cambia es el argumento de venta:** ya no es "paridad con el proveedor", es "7,3× más
barato que el default actual, a 1,2× de una medición SERP".

## Summary

El motor AEO usa LLMs para **dos cosas distintas** y esta task existe para grabar la diferencia
antes de que alguien la borre optimizando. El eje **HERRAMIENTA** —extracción de prosa, autoría de
prompts, juicio interno— **sí se abarata cambiando de modelo**: Gemini mide **USD 0,005242 por
observación** (`gemini-3-flash-preview`), **7,3× más barato que el default OpenAI actual** y a
**1,2× del costo de una medición SERP de DataForSEO**. El eje **COBERTURA** —qué
motores se observan: OpenAI, Anthropic, Perplexity, Gemini, Google AI Overview— **NO se abarata
cambiando de modelo**, porque no se puede medir qué dice ChatGPT usando Gemini. Esta task alinea
los **tres** surfaces del eje herramienta sobre el mismo patrón cheap-first con gate de eval, y
**no toca un solo adapter de cobertura**.

## Why This Task Exists

🔴 **Esta es la distinción más peligrosa del plan de economía del módulo, y la razón por la que
esta task se escribe aparte en vez de resolverse dentro de un "ahorro de LLM" genérico.**

La auditoría midió que **el 92% del gasto del grader es OpenAI + Anthropic**: USD 6,11 + USD 2,53 =
USD 8,64 de USD 9,4222 de vida completa (45 runs, 767 observaciones). La lectura ingenua de ese
número es "cambiemos OpenAI y Anthropic por Gemini y bajamos el gasto un 90%".

**Ese gasto es COBERTURA, no herramienta.** OpenAI y Anthropic aparecen ahí porque el grader los
**observa como motores de respuesta**: son dos de los cinco motores cuya percepción de la marca es
el producto. Reemplazarlos por Gemini no abarata la medición: **deja de medir dos de los cinco
motores** — y lo hace en silencio, porque el reporte sigue mostrando un score compuesto que se ve
igual de sano con tres motores que con cinco. Es la peor clase de ahorro: uno que no se ve en el
número que se mira.

La distinción, en la forma en que hay que verificarla en el repo:

| Eje | Dónde vive | ¿Se abarata cambiando de modelo? | Por qué |
|---|---|---|---|
| **COBERTURA** | `src/lib/growth/ai-visibility/providers/*-adapter.ts` (5 adapters) | **NO** | El modelo **es** la unidad de medida. Preguntarle a Gemini qué diría ChatGPT es no medir ChatGPT. |
| **HERRAMIENTA** | `normalization/prose-extraction/router.ts` · `brand-intelligence/router.ts` · `prompt-packs/authoring/author-prompt-set.ts` | **SÍ** | El modelo es un instrumento intercambiable: lo que importa es la calidad del output estructurado, verificable con eval sobre golden set. |

Hoy los tres surfaces de herramienta **no comparten criterio**:

- `brand-intelligence/router.ts` **ya es cheap-first** (`gemini → openai → anthropic`, primer
  proveedor CONFIGURADO gana) y lo declara en su docstring.
- `prompt-packs/authoring/author-prompt-set.ts` tiene el mismo orden en su array `PROVIDERS`, pero
  la regla es implícita (orden del array) en vez de declarada, y su Anthropic viene pinneado a
  `claude-haiku-4-5-20251001` — o sea, alguien ya intuyó la regla y la aplicó a mano en un solo
  proveedor.
- `normalization/prose-extraction/router.ts` **es el único que arranca caro**: su default es
  `anthropic` por ser *behavior-preserving* respecto de TASK-1227, seleccionado por flag
  (`GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER`), y su propia tabla `EXTRACTION_PRICING`
  registra que Gemini cuesta **8× menos en input y 10× menos en output** que Anthropic. Y es el que
  más corre: `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` está en `true` por default en el
  ops-worker, con el comentario *"Cost-bearing (1 call/finding/run)"*.

Es decir: el surface de herramienta más caliente del motor es el único que quedó con el default
caro, mientras dos vecinos ya resolvieron el patrón. Esta task cierra esa asimetría **con evidencia
de eval, no por precio**, y deja el criterio escrito para que el próximo surface de herramienta no
vuelva a decidirlo desde cero.

## Goal

- Los **tres** surfaces del eje herramienta resuelven proveedor con el **mismo patrón cheap-first
  declarado**: orden explícito, primer proveedor configurado gana, degradación honesta, override
  por flag para eval.
- El default de `prose-extraction` pasa de `anthropic` a `gemini` **sólo si la eval sobre el golden
  set lo respalda**; si no lo respalda, la task cierra con el default intacto y la evidencia
  registrada.
- El eje **cobertura** queda explícitamente fuera y protegido: la task deja escrito el invariante y
  el criterio para detectar una violación futura.
- El patrón queda **documentado y compartido; el módulo NO** — no nace un cuarto router común.

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
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§invariantes de providers LLM:
  nunca un SDK paralelo dentro de un dominio; el cliente canónico vive en `src/lib/ai/**`)

Reglas obligatorias:

- 🔴 **NUNCA cambiar el modelo de un adapter de COBERTURA para ahorrar.** Los cinco adapters de
  `providers/` son la unidad de medida del producto; cambiar cuál modelo responde es cambiar qué se
  mide, no cuánto cuesta.
- **Se comparte el PATRÓN, no el módulo.** Un cuarto router "común" copiado diverge en su fallback
  (veredicto §5.1 de la auditoría). Cada surface conserva su router; lo que se unifica es la regla
  escrita + los tests que la verifican.
- **NUNCA instanciar un SDK LLM dentro del dominio.** Los tres surfaces ya consumen
  `generateStructured{Gemini,OpenAI,Anthropic}` de `src/lib/ai/**`. Esto no cambia.
- **Degradación honesta:** flag OFF, secret ausente, schema inválido o error de proveedor ⇒
  fallback determinista/`null`, nunca throw al caller. Es el invariante vigente de los tres
  routers.
- **La eval manda sobre el precio.** Un proveedor más barato con peor precisión en el golden set
  **no** se adopta. El criterio de aceptación es "igual o mejor", no "más barato".
- **El extractor NUNCA asigna score** y las señales que puntúan siguen siendo las deterministas
  (§4 de la auditoría).

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§2.2 nota de
  cobertura, §2.3 tabla de comparación, §5.1 "compartir el patrón, no el módulo")
- `docs/tasks/complete/TASK-1271-growth-ai-visibility-cost-efficient-prose-extraction-router.md`
  (contrato del router de extracción, su flag y su harness de eval)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del `PROSE_EXTRACTION_PROVIDER` y del
  `_SHADOW_ENABLED`)

## Dependencies & Impact

### Depends on

- **`TASK-1696` — dimensión de consumidor en `seo_provider_spend_daily` + gate USD per-org del
  grader** (`docs/tasks/to-do/TASK-1696-growth-provider-spend-consumer-dimension-grader-usd-gate.md`).
  Bloqueante. Sin medidor y sin techo, cambiar el proveedor por defecto mueve el gasto pero no lo
  hace visible, y la auditoría es explícita en que la restricción activa es la instrumentación, no
  el presupuesto. Verificar que esté cerrada al tomar esta task.
- `src/lib/growth/ai-visibility/normalization/prose-extraction/**` (router + 3 adapters + prompt +
  contratos).
- `src/lib/growth/ai-visibility/brand-intelligence/router.ts` (referencia del patrón ya correcto).
- `src/lib/growth/ai-visibility/prompt-packs/authoring/author-prompt-set.ts`.
- `src/lib/growth/ai-visibility/evals/**` (`golden-set.v1.json`, `prose-extraction-eval.ts`,
  `eval-runner.ts`, `archetype-coverage-eval.ts`).
- `src/lib/ai/{anthropic,google-genai,openai}.ts` (helpers estructurados canónicos).

### Blocks / Impacts

- `TASK-1704` (cadencia y muestreo): el N≥3 del modo `full` **sólo cabe** en el techo de USD 2 si
  el eje herramienta ya está en su costo bajo. 1704 declara esta task como dependencia.
- `TASK-1698` (posicionamiento declarado): toca `ProseExtractionInput` y `prompt.ts`. Conflicto de
  archivo, no de contrato — coordinar orden de merge y dejar `## Delta` en la que llegue segunda.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`: gana la sección
  que define los dos ejes y el invariante de cobertura.

### Files owned

- `src/lib/growth/ai-visibility/normalization/prose-extraction/router.ts`
- `src/lib/growth/ai-visibility/normalization/prose-extraction/contracts.ts`
- `src/lib/growth/ai-visibility/prompt-packs/authoring/author-prompt-set.ts`
- `src/lib/growth/ai-visibility/brand-intelligence/router.ts`
- `src/lib/growth/ai-visibility/flags.ts`
- `src/lib/growth/ai-visibility/evals/prose-extraction-eval.ts`
- `src/lib/growth/ai-visibility/__tests__/prose-extraction-router.test.ts`
- `services/ops-worker/deploy.sh`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- **Eje cobertura, 5 adapters:** `providers/{openai,anthropic,perplexity,gemini,google-ai-overview}-adapter.ts`
  + `providers/registry.ts` + `providers/fake-adapter.ts`. Cada uno con su flag
  (`GROWTH_AI_VISIBILITY_{OPENAI,ANTHROPIC,PERPLEXITY,GEMINI,GOOGLE_AIO}_ENABLED`) y su secret;
  sin flag/secret el adapter resuelve `skip` limpio.
- **Eje herramienta, 3 surfaces:**
  - `normalization/prose-extraction/router.ts`: registry de 3 adapters, selección **por flag**
    (`resolveProseExtractionConfig`), default `anthropic` behavior-preserving, `EXTRACTION_PRICING`
    con `anthropic: {0.8, 4}`, `gemini: {0.1, 0.4}`, `openai: {0.1, 0.4}` USD/1M tokens,
    `estimateExtractionCostUsd`, cost-cap `_PROSE_EXTRACTION_MAX_COST_USD` (default 0.02),
    override de modelo por proveedor sin deploy (`_PROSE_EXTRACTION_MODEL_{ANTHROPIC,GEMINI,OPENAI}`).
  - `brand-intelligence/router.ts`: **cheap-first ya implementado** — *"picks the first CONFIGURED
    provider in cheap-first priority order (gemini → openai → anthropic)"*, degradación honesta,
    `provider` forzable para eval/shadow sin tocar el flag.
  - `prompt-packs/authoring/author-prompt-set.ts`: array `PROVIDERS` en orden
    `gemini → openai → anthropic`, primer configurado gana, override `options.provider` para eval,
    Anthropic pinneado a `claude-haiku-4-5-20251001`.
- **Juicio interno determinista (NO es candidato a router):** `accuracy/detector.ts` es
  *"DETERMINISTA-first (sin IO, sin LLM)"* y `fix-it/generators.ts` es determinista. Confirmado en
  código: el eje herramienta tiene exactamente **tres** surfaces LLM, no más.
- Flags de eval ya existentes: `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER` (no `*_ENABLED`;
  `anthropic|gemini|openai`) y `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_SHADOW_ENABLED` (eval-only,
  default OFF, no afecta el path de runs).
- Harness de eval con golden set y fixtures de metodología.

### Gap

- El criterio cheap-first está **implementado dos veces e implícito las dos**: en un docstring
  (brand-intelligence) y en el orden de un array (authoring). No hay test que lo verifique, así que
  un reorder accidental pasa verde.
- `prose-extraction` —el surface que más corre y el único con cost-cap propio— sigue con el default
  caro y su selección es por flag plano, no por prioridad con fallback: si el proveedor elegido no
  está configurado, degrada a determinista en vez de intentar el siguiente.
- No existe en ninguna parte del repo la declaración escrita de la distinción **cobertura vs
  herramienta**, ni un detector que impida "abaratar" un adapter de cobertura.
- La eval no compara proveedores del extractor sobre el golden set como **gate de adopción**; el
  shadow flag existe pero no hay un criterio de aceptación registrado.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/ai-visibility/**`, ejecutado por el portal (Vercel) y por el
  ops-worker Cloud Run (drain async + re-grade).
- Future candidate home: `domain-package`
- Boundary: cada surface conserva **su** router como única puerta a su proveedor. El contrato
  compartido es la regla escrita + los tests de patrón, no un módulo. Los clientes LLM canónicos de
  `src/lib/ai/**` siguen siendo la única forma de hablar con un proveedor.
- Server/browser split: los tres routers son `import 'server-only'` y resuelven secretos
  server-side. Al browser no llega ni el proveedor ni el modelo (metadata interna de
  observabilidad).
- Build impact: none — no agrega dependencias; reusa los SDK ya presentes.
- Extraction blocker: los secretos de los tres proveedores se resuelven con el mismo mecanismo
  `*_SECRET_REF` compartido con el resto del portal; extraer el dominio exige mover esa resolución.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: ninguno persistido — cambia la **selección de proveedor** de tres
  routers y su metadata de observabilidad (`ProseExtractionMetadata.providerId/model/costEstimateUsd`)
- Consumidores afectados: run-engine del grader (portal + ops-worker), harness de eval, reportes
  que muestran procedencia de extracción
- Runtime target: `local`, `staging`, `production`, `worker`

### Contract surface

- Contrato existente a respetar: `ProseExtractionProvider` / `ProseExtractionResult` /
  `ProseExtractionMetadata` (`normalization/prose-extraction/contracts.ts`);
  `BrandIntelligenceProvider` (`brand-intelligence/contracts.ts`); `AuthorProvider`
  (`prompt-packs/authoring/author-prompt-set.ts`).
- Contrato nuevo o modificado: orden de prioridad explícito y exportado por surface (p. ej.
  `PROSE_EXTRACTION_PRIORITY = ['gemini', 'openai', 'anthropic']`), con fallback al siguiente
  proveedor configurado cuando el elegido no lo está. La firma pública de `extractProse` /
  `readBrandIntelligence` / `authorPromptSet` **no cambia**.
- Backward compatibility: `gated` — el flag `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER` sigue
  siendo override explícito; el cambio de default vive detrás de la eval + un flip declarado.
- Full API parity: `N/A — no capability`. No introduce ni modifica una acción de negocio: es
  selección interna de instrumento detrás de contratos ya gobernados. La capability que gobierna el
  run (`growth.ai_visibility.run.execute` / `run.operator`) no cambia.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla cambia de shape. `grader_observations` /
  `grader_runs` siguen registrando modelo y costo estimado por observación `[verificar nombres
  exactos durante Discovery]`.
- Invariantes que no se pueden romper:
  - 🔴 **Cobertura ≠ herramienta.** Ningún cambio de esta task toca `providers/*-adapter.ts` ni
    los flags `GROWTH_AI_VISIBILITY_{OPENAI,ANTHROPIC,PERPLEXITY,GEMINI,GOOGLE_AIO}_ENABLED`.
  - Se comparte el patrón, **no** el módulo: cero archivos nuevos que centralicen la selección de
    proveedor de los tres surfaces.
  - Degradación honesta preservada en los tres: sin proveedor configurado ⇒ fallback determinista,
    nunca throw.
  - El modelo real usado queda registrado en la metadata de cada observación — la serie histórica
    debe poder responder "con qué instrumento se midió esto".
  - El cost-cap del extractor (`_PROSE_EXTRACTION_MAX_COST_USD`) sigue siendo el circuit breaker;
    bajar el precio no autoriza subir el techo.
  - 🔴 **Toda consulta de costo del grader excluye el tráfico de prueba y declara su ventana.**
    Obligatorio: `model NOT LIKE 'fake-%'` (los adapters fake cuestan CERO y hunden cualquier
    promedio por observación — hoy son 102 de 767 filas), y declarar explícitamente si el
    resultado **incluye o excluye** `run_kind='smoke'` (28 de 45 runs). Un promedio por observación
    se calcula además sobre `status='succeeded'`: `skipped`/`failed` valen 0 por diseño
    (`cost.ts:50-53`) y meterlos en el denominador reporta un costo que nadie pagó ni pagará.
    **Ésta es la causa raíz única de los cinco errores de cifras del lote 2026-08-15**; toda cifra
    de costo nueva en esta task, en su PR o en cualquier doc derivado nace con estos filtros o no
    se publica.
- Tenant/space boundary: sin cambios — la selección de proveedor es global por runtime, no
  per-org. El gate de gasto per-org es responsabilidad de `TASK-1696`.
- Idempotency/concurrency: sin cambios; la extracción es una llamada sin estado por observación.
- Audit/outbox/history: sin eventos nuevos. La trazabilidad vive en la metadata por observación
  (provider + model + version + cost) que ya se persiste.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `shadow` primero. La eval corre con `_SHADOW_ENABLED` sin afectar runs; el cambio
  de default sólo ocurre tras el veredicto de la eval.
- Backfill plan: **ninguno**. Las observaciones ya extraídas con Anthropic se conservan tal cual —
  son evidencia de lo que se midió con el instrumento de ese momento. Re-extraer retroactivamente
  falsificaría la serie.
- Rollback path: `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER=anthropic` en los dos runtimes +
  redeploy. Sin migración que revertir.
- External coordination: el flip toca **Vercel y ops-worker** (el extractor corre en los dos);
  actualizar `services/ops-worker/deploy.sh` como SoT y aplicar en vivo con
  `gcloud run services update --update-env-vars`. Fila del ledger actualizada.

### Security and access

- Auth/access gate: sin cambio. Los secretos de los tres proveedores ya se resuelven server-side
  vía `*_SECRET_REF` y están cableados en el ops-worker
  (`OPENAI_API_KEY_SECRET_REF`, `ANTHROPIC_API_KEY_SECRET_REF`, credenciales Vertex para Gemini).
- Sensitive data posture: el excerpt enviado al modelo es respuesta pública de un motor; ninguna
  PII. El posicionamiento (si `TASK-1698` ya shippeó) es contenido comercial del cliente. **Cambiar
  de proveedor cambia a quién se le manda ese contenido** — verificar que el proveedor destino esté
  cubierto por los términos vigentes antes del flip (ver §Out-of-band).
- Error contract: `captureWithDomain(err, 'growth', ...)`; el error crudo del proveedor nunca llega
  al caller ni al cliente. Invariante vigente de los tres routers.
- Abuse/rate-limit posture: cost-cap por extracción vigente + gate per-org de `TASK-1696`. El
  fallback en cascada NO debe convertirse en reintento múltiple cobrado: si el primer proveedor
  configurado falla en runtime, se degrada honesto — sólo se salta al siguiente cuando **no está
  configurado**, que es gratis.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/ai-visibility` + tests nuevos de patrón (orden de
  prioridad, fallback por no-configurado, no-cascada ante error de runtime).
- DB/runtime checks: `SELECT` de solo lectura sobre las observaciones de staging verificando que el
  modelo registrado corresponde al proveedor esperado post-flip.
- Integration checks: corrida de eval con los tres proveedores sobre el golden set + una corrida
  `full` real en staging.
- Reliability signals/logs: reparto de `providerId` en `ProseExtractionMetadata` + tasa de
  `not_configured` / `provider_error` antes y después del flip.
- Production verification sequence: ver §Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Declarar los dos ejes y protegerlos

- Sección nueva en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`: **cobertura vs
  herramienta**, con la lista concreta de archivos de cada eje y la regla dura de que un adapter de
  cobertura no se cambia por precio.
- Docstring de invariante en `providers/registry.ts` y en `providers/index.ts` nombrando la regla.
- Test de guardia sobre el registry de cobertura: los 5 provider ids esperados están presentes y
  cada uno mapea a su adapter; un cambio de mapeo rompe el test con un mensaje que explica **por
  qué** (no es un test de tipos, es un test de significado).

### Slice 2 — El patrón cheap-first, escrito y verificado en los tres surfaces

- Exportar en cada surface su orden de prioridad como constante nombrada, con comentario que
  justifique el orden por **calidad-verificada-primero, costo-como-desempate** (no sólo precio).
- `prose-extraction/router.ts`: pasar de "flag elige uno, si no está configurado degrada" a
  "prioridad con fallback al siguiente **no configurado**, flag como override explícito", igual que
  brand-intelligence.
- Test de patrón compartido (uno por surface, misma forma): el orden es el declarado; el primer
  configurado gana; el override por flag/opción respeta la selección; un error de runtime **no**
  cascadea a otro proveedor cobrado.

### Slice 3 — Eval como gate de adopción del default

- Extender `evals/prose-extraction-eval.ts` para correr el golden set con los tres proveedores y
  emitir una tabla comparable: precisión de `brandMentioned`, `sentimentLabel`,
  `categoryAssociations`, `messageDriftClaims`, tasa de `schema_invalid`, costo estimado y
  latencia.
- Criterio de aceptación registrado **antes** de correrla: Gemini se adopta como default si iguala
  o mejora la precisión de Anthropic en el golden set; si empata dentro del ruido, gana el barato;
  si pierde, **no se adopta** y la task cierra documentando el motivo.
- Correr con `_SHADOW_ENABLED` en staging (no afecta runs) y registrar el resultado en la task.

### Slice 4 — Flip del default (condicional al veredicto de Slice 3)

- Cambiar el default de `resolveProseExtractionConfig` a `gemini` **sólo** si Slice 3 lo respalda.
- Declarar el valor en `services/ops-worker/deploy.sh` y en Vercel; actualizar la fila del ledger
  con los dos runtimes nombrados y el veredicto de la eval como razón.
- Verificar en la revisión activa del ops-worker, no sólo en el `deploy.sh`.

## Out of Scope

- 🔴 **NO cambia qué motores se observan.** Los cinco adapters de `providers/` no se tocan, sus
  flags no se tocan, y la elegibilidad por modo en `policy.ts` no se toca. Cualquier PR de esta
  task que modifique un archivo bajo `providers/` fuera del test de guardia del Slice 1 está fuera
  de contrato.
- **NO crea un cuarto router** ni un módulo `provider-selection` compartido. Se comparte el patrón
  y los tests; los tres routers siguen siendo tres (veredicto §5.1 de la auditoría: *"un 4.º router
  copiado diverge en fallback"*).
- **NO** cambia el cost-cap del extractor ni los techos de `policy.ts` (`light` 0.5 / `full` 2 /
  `internal_audit` 5). Eso es `TASK-1704`.
- **NO** construye el gate de tokens per-org (es `TASK-1696`, su dependencia).
- **NO** cambia el prompt del extractor ni su schema (eso es `TASK-1698`).
- **NO** re-extrae observaciones históricas.
- **NO** toca el proveedor de la lectura grounded de brand intelligence ni del autor de prompts más
  allá de hacer explícito y testeado el orden que **ya** tienen.

## Detailed Spec

**Los dos ejes, en archivos concretos del repo:**

```
COBERTURA (NO se abarata cambiando de modelo)
  src/lib/growth/ai-visibility/providers/openai-adapter.ts             → ChatGPT
  src/lib/growth/ai-visibility/providers/anthropic-adapter.ts          → Claude
  src/lib/growth/ai-visibility/providers/perplexity-adapter.ts         → Perplexity
  src/lib/growth/ai-visibility/providers/gemini-adapter.ts             → Gemini
  src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts → Google AI Mode (DataForSEO)

HERRAMIENTA (SÍ se abarata cambiando de modelo, con eval)
  src/lib/growth/ai-visibility/normalization/prose-extraction/router.ts   ← default caro HOY
  src/lib/growth/ai-visibility/brand-intelligence/router.ts               ← ya cheap-first
  src/lib/growth/ai-visibility/prompt-packs/authoring/author-prompt-set.ts ← ya cheap-first (implícito)

DETERMINISTA (sin LLM, no aplica)
  src/lib/growth/ai-visibility/accuracy/detector.ts
  src/lib/growth/ai-visibility/fix-it/generators.ts
```

**Aritmética que sostiene la decisión (medida, no estimada):**

Todas las cifras salen de `provider_observations` con `status='succeeded'` y
`model NOT LIKE 'fake-%'` (ver `## Delta 2026-08-15 (2)`; sin ese filtro los promedios se hunden
hasta un 24%).

| Comparación | Valor |
|---|---|
| 1 observación Gemini (`gemini-3-flash-preview`, n=115) | USD 0,005242 |
| 1 observación Gemini (`gemini-2.5-flash`, n=12) | USD 0,002500 |
| 1 observación OpenAI (`gpt-4.1`, n=159) | USD 0,038417 |
| 1 observación Anthropic (`claude-sonnet-4-6`, n=30) | USD 0,084487 |
| 1 medición SERP DataForSEO (rank capture) | USD 0,004364 |
| **Gemini vs OpenAI (el ahorro real de esta task)** | **7,3× más barato** |
| Gemini vs 1 medición SERP | **1,2×** (20% por encima) |
| 1 observación OpenAI vs 1 medición SERP | 8,8× |
| 1 observación Anthropic vs 1 medición SERP | 19,4× |
| `EXTRACTION_PRICING` anthropic (in/out por 1M) | 0,8 / 4 |
| `EXTRACTION_PRICING` gemini (in/out por 1M) | 0,1 / 0,4 |

**Ahorro proyectado del eje herramienta** (sustituyendo el default por Gemini, a volumen constante):

```
por observación:   0,038417 − 0,005242 = USD 0,033175 ahorrados  (−86%)
vs Anthropic:      0,084487 − 0,005242 = USD 0,079245 ahorrados  (−94%)
sobre el gasto de vida completa del eje herramienta: los USD 8,64 concentrados
hoy en OpenAI+Anthropic caerían a ~USD 1,2 al mismo volumen de observaciones.
```

El número que importa **no** es una paridad con el proveedor: gemini queda **1,2×, un 20% POR
ENCIMA** de lo que cuesta comprarle una medición SERP a DataForSEO. Lo que sostiene la decisión es
la comparación contra el **default actual**: usar el motor propio como herramienta cuesta **7,3×
menos** de lo que cuesta hoy, y queda en el mismo orden de magnitud que comprar un dato al
proveedor. Ahí es donde el motor propio deja de ser un lujo y pasa a ser el default razonable — que
es exactamente la regla de decisión adoptada en §4 de la auditoría, con la corrección de que el
argumento es "mismo orden de magnitud", no "paridad".

**Forma del patrón (misma en los tres, sin módulo común):**

```ts
/** Orden cheap-first: calidad verificada por eval primero, costo como desempate. */
export const <SURFACE>_PRIORITY = ['gemini', 'openai', 'anthropic'] as const

// 1. Si hay override explícito (flag/opción) → ese proveedor, sin fallback silencioso.
// 2. Si no → primer proveedor de PRIORITY con isConfigured() === true.
// 3. Si ninguno → degradación honesta (fields=null / baseline determinista). NUNCA throw.
// 4. Error de runtime del proveedor elegido → degradación honesta. NUNCA cascada cobrada.
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (declarar y proteger los ejes) **va primero**. Es barato y es lo único que impide que el
  resto de la task se malinterprete como "cambiemos modelos para ahorrar".
- Slice 2 (patrón + tests) → Slice 3 (eval) → Slice 4 (flip).
- 🔴 **Slice 4 NO puede shippear sin el veredicto de Slice 3.** Cambiar el default por precio, sin
  eval, es exactamente el error que esta task existe para prevenir en el otro eje.
- `TASK-1696` (gate de tokens) debe estar cerrada antes de Slice 4: mover el gasto sin medidor lo
  vuelve invisible.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Alguien "extiende" la task al eje cobertura y el grader deja de medir OpenAI/Anthropic con el score viéndose sano | producto AEO / confianza del reporte | **high** | Slice 1 primero: sección de arquitectura + docstrings + test de guardia del registry; `## Out of Scope` explícito | Test de registry de cobertura + conteo de motores con observación exitosa por run |
| Gemini degrada la precisión de `messageDriftClaims` o `categoryAssociations` y el score se mueve sin causa de negocio | scoring AEO | medium | Eval como gate de adopción con criterio escrito ANTES de correrla; shadow primero | Delta de precisión por campo en la eval del golden set |
| Fallback en cascada convierte un error de runtime en 2-3 llamadas cobradas por observación | costo | medium | El fallback salta sólo por `not_configured` (gratis), nunca por `provider_error`; test explícito | Costo estimado por observación en `ProseExtractionMetadata` |
| Default cambiado en Vercel y no en ops-worker → dos runtimes extrayendo con instrumentos distintos | cross-runtime | **high** | `deploy.sh` como SoT + `--update-env-vars` en vivo + verificación en la revisión activa + fila de ledger con los dos runtimes | Reparto de `providerId` por runtime en la metadata |
| El contenido enviado al modelo cambia de proveedor sin revisar términos de uso | legal / rights | low | Verificación de términos antes del flip (§Out-of-band); los tres proveedores ya están en uso en el motor, así que es confirmación, no habilitación | Revisión documentada en la task |
| Reorder accidental del array de prioridad en un refactor futuro | herramienta | medium | Test de patrón por surface que asserta el orden declarado | Test rojo en CI |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER` (ya existe, no es `*_ENABLED`): pasa de override
  a **override sobre una prioridad**; su valor por defecto cambia sólo en Slice 4.
- `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_SHADOW_ENABLED` (ya existe, eval-only, default OFF): es el
  carril de Slice 3. No afecta el path de runs.
- Sin flags nuevos. Si Discovery concluye que hace falta uno, va con su fila en el ledger en el
  mismo PR.
- ⚠️ Multi-runtime: portal (Vercel) + ops-worker (Cloud Run). Los dos leen el mismo flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR — docs + tests, sin runtime. | <10 min | sí |
| Slice 2 | Revert PR. El patrón es refactor de selección; el comportamiento con flag explícito no cambia. | <15 min | sí |
| Slice 3 | N/A — eval en shadow, cero impacto en runs. | — | sí |
| Slice 4 | `GROWTH_AI_VISIBILITY_PROSE_EXTRACTION_PROVIDER=anthropic` en Vercel + ops-worker + redeploy. Las observaciones ya extraídas con Gemini se conservan (registran su modelo). | <10 min | sí |

### Production verification sequence

1. Merge Slice 1 y 2; CI verde con los tests de guardia y de patrón.
2. Staging: correr la eval de Slice 3 con los tres proveedores sobre el golden set; registrar la
   tabla comparativa en la task.
3. Decisión explícita documentada: adoptar Gemini como default, o no adoptarlo y cerrar la task con
   el default intacto.
4. Si se adopta: flip en staging (Vercel + `deploy.sh` + `--update-env-vars`), verificar en la
   revisión activa del ops-worker y correr un `full` real.
5. `SELECT` de solo lectura sobre las observaciones de staging: el modelo registrado corresponde a
   Gemini y el costo estimado por observación cayó al rango esperado. ⚠️ La consulta **debe** llevar
   `model NOT LIKE 'fake-%'` + `status='succeeded'` y declarar si incluye `run_kind='smoke'`; sin
   eso el número que se reporte es el mismo error que este lote corrigió.
6. Producción con cooldown de 24 h. Monitorear 7 días el reparto de `providerId`, la tasa de
   `schema_invalid` y el costo por observación.

### Out-of-band coordination required

- Verificar que el proveedor destino esté cubierto por los términos de uso vigentes para el
  contenido que se le envía (respuestas de motores + posicionamiento del cliente si `TASK-1698` ya
  shippeó). Los tres proveedores ya se usan en el motor, así que es una confirmación documentada,
  no una habilitación nueva.
- El flip toca dos planos de configuración (Vercel y Cloud Run) y requiere acceso a ambos.
- Sign-off de quien opere el módulo sobre el criterio de aceptación de la eval **antes** de
  correrla — definirlo después de ver los números es cómo se adopta un peor instrumento.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` declara los ejes **cobertura** y
      **herramienta** con la lista de archivos de cada uno y la regla dura de no abaratar cobertura.
- [ ] Existe un test de guardia que rompe si el registry de cobertura cambia el mapeo
      `provider id → adapter`, con mensaje que explica por qué es un cambio de medición.
- [ ] Ningún archivo bajo `src/lib/growth/ai-visibility/providers/` cambió su modelo, su flag ni su
      elegibilidad por modo.
- [ ] Los tres surfaces de herramienta exportan su orden de prioridad como constante nombrada y
      tienen un test que asserta ese orden.
- [ ] `prose-extraction/router.ts` hace fallback al siguiente proveedor **no configurado** y
      **nunca** cascadea tras un `provider_error`.
- [ ] No existe ningún módulo nuevo que centralice la selección de proveedor de los tres surfaces.
- [ ] La eval del golden set corrió con los tres proveedores y su tabla comparativa está registrada
      en la task, con el criterio de aceptación escrito **antes** del resultado.
- [ ] El default de `prose-extraction` cambió sólo si la eval lo respalda; si no, la task cierra con
      el default intacto y el motivo documentado.
- [ ] Si hubo flip: el valor está en `services/ops-worker/deploy.sh`, verificado en la revisión
      activa del ops-worker, aplicado en Vercel, y con la fila del ledger actualizada nombrando los
      dos runtimes.
- [ ] Cero re-extracción de observaciones históricas.
- [ ] 🔴 Toda cifra de costo del grader producida por esta task (task, PR, docs derivados) se
      calculó con `model NOT LIKE 'fake-%'` + `status='succeeded'` y declara si incluye o excluye
      `run_kind='smoke'`. El invariante quedó escrito en la spec del dominio, no sólo en esta task.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/growth/ai-visibility`
- `pnpm test` (suite completa antes de cerrar)
- `pnpm build` (gate de cierre, con autorización del operador)
- Eval de proveedores sobre `evals/golden-set.v1.json` con evidencia registrada
- Corrida `full` real en staging post-flip (si aplica)
- `pnpm flags:audit --strict --no-vercel`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1704` recibe un `## Delta` con el costo real por observación post-flip, porque su
      aritmética del N≥3 depende de este número.
- [ ] `TASK-1698` recibe un `## Delta` si `ProseExtractionInput` o el router cambiaron antes de que
      la tomen.

## Follow-ups

- Señal de reliability con el reparto de `providerId` del eje herramienta y el costo por
  observación — hoy ese dato vive sólo en la metadata interna y no está en ningún tablero.
- Aplicar el mismo criterio de eval-antes-de-adoptar al surface de autoría de prompts, que hoy
  hereda el orden cheap-first sin haberlo evaluado sobre un golden set propio.
- Evaluar el pin de modelo de cada proveedor (`_PROSE_EXTRACTION_MODEL_*`,
  `GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_MODEL_*`) contra las generaciones nuevas de la flota.

## Open Questions

- ¿El criterio de desempate ante empate estadístico en la eval es el costo, o la latencia? Afecta
  el modo `light` público, donde la latencia sí es producto.
- ¿`TASK-1696` entrega también el costo **realizado** por observación (no sólo el estimado)? Su
  Summary habla de separar dólares facturados de dólares estimados en el ledger; si el realizado
  llega por observación, el gate de adopción debe usar ese número en vez de la tabla referencial de
  `EXTRACTION_PRICING`.
