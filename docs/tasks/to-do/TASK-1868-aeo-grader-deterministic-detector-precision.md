# TASK-1868 — AEO Grader: precisión de los detectores deterministas (probes ante sitios SPA y compuerta de revisión)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Dos detectores deterministas del AI Visibility / AEO Grader dan falsos positivos medidos el 2026-09-11. (1) Los probes
estructurales tratan como archivo real lo que un sitio SPA devuelve con 200: la aplicación HTML en `/llms.txt`,
`/robots.txt` y `/sitemap.xml`. (2) La compuerta de revisión humana busca términos de riesgo como substring y marca
"demandadas" o "denunciados" como si fueran demanda o denuncia. Esta task corrige ambos, con fixtures del caso real y
versión de readiness nueva donde cambian puntajes.

## Why This Task Exists

Medido en el panel competitivo de Sky (runs `EO-GRUN-00050`…`00054`, 2026-09-11):

1. **Probe de `llms.txt`.** `https://www.skyairline.com/llms.txt` responde 200 `text/html` con la aplicación (~26 KB).
   El probe lo reportó *"llms.txt presente con contenido curado para LLMs"* (score 100) porque sólo distingue 404,
   error y "trivial" (`src/lib/growth/ai-visibility/probes/structural/llms-txt.ts:14-49`); no mira `content-type` ni si
   el cuerpo es HTML. Falso: el sitio no tiene `llms.txt`.
2. **Probe de `robots.txt`.** Mismo sitio, `/robots.txt` → 200 `text/html` (también con user-agent Googlebot). El probe
   parsea el HTML como si fuera un robots sin reglas (`probes/structural/robots-txt.ts`) y concluye *"robots.txt no
   bloquea a ningún crawler IA"*: verdadero por accidente, pero oculta que no existe un robots real.
3. **Probe de `sitemap.xml`.** Mismo sitio → 200 `text/html`. El probe lo marca *"existe pero no parece un sitemap XML
   válido"* con score 40 (`probes/structural/sitemap.ts:40`): da crédito parcial por un archivo que no existe.
4. **Compuerta de revisión.** `RISKY_REVIEW_TERMS` se compara con `includes` sobre la narrativa extraída
   (`review-gates/gates.ts`, `containsRiskyLanguage`). Disparó con *"Problemas recurrentes denunciados en redes
   sociales"* (Avianca) y con una frase sobre la reorganización de Gol; "demanda" dispararía también con "rutas más
   demandadas", frase habitual en respuestas sobre aerolíneas. La razón que ve el revisor es genérica; no dice qué
   término ni qué frase la activó.
5. **Impacto aguas abajo.** El starter de `llms.txt` de Fix-It (`TASK-1269`) se genera siempre
   (`fix-it/generators.ts:320`), pero su justificación sale de los probes: `derivedFrom.probeKinds` lista sólo los probes
   con brecha medida (`probeGapKinds(probes, ['llms_txt','sitemap'])`, `generators.ts:180`). Con el falso positivo, a
   un sitio que no tiene `llms.txt` se le entrega el archivo diciendo que no deriva de ninguna brecha de `llms.txt`.

## Goal

- Un 200 con HTML en `/llms.txt`, `/robots.txt` o `/sitemap.xml` se trata como **archivo ausente**, con motivo explícito
  ("el sitio responde con su página HTML en lugar del archivo").
- La compuerta de revisión compara por palabra completa, con una lista de formas deliberada, y la razón de revisión
  incluye el término y la frase que la activaron.
- Readiness versionado (`ai_readiness_score_v2`) para que los puntajes corregidos no se comparen con los anteriores.

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
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — probes (Delta TASK-1266), review
  gates (§7.6, OQ#3 conservador), Delta 2026-09-11.

Reglas obligatorias:

- **Honest degradation:** "archivo ausente" es una medición; "no se pudo leer" sigue siendo `null`, nunca cero.
- **La compuerta sigue siendo conservadora:** bajar falsos positivos no puede dejar pasar lenguaje difamatorio real;
  cada término retirado o acotado lleva un caso de prueba.
- **Sin LLM en el veredicto:** ambos detectores siguen deterministas.

## Normative Docs

- `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md` § "Panel competitivo multi-marca"
- `docs/documentation/growth/ai-visibility-grader.md` § "Límites conocidos"

## Dependencies & Impact

### Depends on

- `TASK-1266` (probes estructurales) y `TASK-1227` (review gates) — complete.

### Blocks / Impacts

- `TASK-1269` (in-progress) — Fix-It decide artefactos según probes; recibe Delta.
- Informes existentes: sus probes quedan en readiness v1; los nuevos en v2.

### Files owned

- `src/lib/growth/ai-visibility/probes/structural/{llms-txt,robots-txt,sitemap}.ts`
- `src/lib/growth/ai-visibility/probes/structural/html-fallback.ts` (nuevo: detector compartido)
- `src/lib/growth/ai-visibility/review-gates/gates.ts`
- `src/lib/growth/ai-visibility/scoring/readiness-config.ts` (`AI_READINESS_SCORE_VERSION`)
- Tests y fixtures de ambos detectores

## Current Repo State

### Already exists

- Probes estructurales con fetcher SSRF-guarded (`probes/structural/*`), score de readiness versionado
  (`scoring/readiness-config.ts:13`).
- Compuerta de revisión determinista con `RISKY_REVIEW_TERMS` y razones (`review-gates/gates.ts`).

### Gap

- Ningún probe detecta el fallback HTML de un SPA.
- La compuerta usa substring y no expone qué la activó.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/ai-visibility/probes/**` y `review-gates/**` (corren en el `ops-worker`).
- Future candidate home: `domain-package`
- Boundary: `detectHtmlFallback(response)` compartido por los tres probes; `containsRiskyLanguage` pasa a devolver
  `{ matched: Array<{term, text}> }`.
- Server/browser split: server-only.
- Build impact: none
- Extraction blocker: none (lógica pura sobre respuestas ya obtenidas).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: resultados de probes (`greenhouse_growth.grader_probe_results`) y razones de revisión
  (`reviewReasons` de `ScoreStatusResolution`, `review-gates/gates.ts:26`; confirmar en Discovery dónde se persisten [verificar]).
- Consumidores afectados: readiness en informes, Fix-It (`TASK-1269`), cola de revisión.
- Runtime target: `staging` → `production` (`ops-worker`).

### Contract surface

- Contrato existente a respetar: `ProbeOutcome`, `ScoreStatusResolution`.
- Contrato nuevo o modificado: evidencia de probe con `htmlFallback: true`; `reviewReasons` con el término y la frase
  (texto acotado); `AI_READINESS_SCORE_VERSION = 'ai_readiness_score_v2'`.
- Backward compatibility: `compatible` (campos aditivos; versión nueva para puntajes corregidos).
- Full API parity: `N/A` — sin superficie nueva.

### Data model and invariants

- Entidades/tablas/views afectadas: `grader_probe_results` (evidencia) y el registro donde se persistan las razones de revisión [verificar].
- Invariantes que no se pueden romper:
  - Un fallback HTML nunca da score positivo en `llms.txt` ni `sitemap.xml`.
  - `robots.txt` con fallback HTML = "sin robots real" (acceso por defecto) con motivo explícito, no "no bloquea".
  - Fallo de red sigue siendo `null`.
  - Todo término de riesgo se compara por palabra completa, sin distinguir mayúsculas ni acentos.
- Write-target allowlist: `N/A — sin tablas nuevas`.
- Tenant/space boundary: sin cambios.
- Idempotency/concurrency: lógica pura; sin cambios.
- Audit/outbox/history: sin eventos nuevos.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: activo al desplegar (corrección determinista, sin flag), con readiness v2 para los runs nuevos.
- Backfill plan: no se recalculan runs viejos.
- Rollback path: revert PR + redeploy del worker.
- External coordination: redeploy del `ops-worker`.

### Security and access

- Auth/access gate: sin cambios.
- Sensitive data posture: la frase que activó la revisión es texto de terceros; se guarda acotada (≤200 caracteres) y
  sólo en superficies internas de revisión.
- Error contract: sin cambios.
- Abuse/rate-limit posture: sin cambios.

### Runtime evidence

- Local checks: fixtures del caso Sky (HTML de la app en las tres rutas; frases "denunciados", "demandadas", la de Gol) y
  casos de riesgo real que deben seguir activando la revisión.
- DB/runtime checks: n/a.
- Integration checks: re-correr probes sobre `skyairline.com` en staging.
- Reliability signals/logs: tasa de `review_required` por run (señal existente de cola si aplica) antes y después.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] `N/A — no capability`: corrige detectores internos del motor.

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

### Slice 1 — Detector de fallback HTML en los probes

- `detectHtmlFallback`: `content-type` `text/html` o cuerpo que empieza con `<!doctype html` / `<html` (tras espacios).
- `llms-txt.ts`: fallback → score 0, motivo "el sitio responde con su página HTML en lugar de `llms.txt`".
- `sitemap.ts`: fallback → score 0 (no 40), mismo motivo.
- `robots-txt.ts`: fallback → "sin robots.txt real (el sitio devuelve su página HTML)"; acceso por defecto, evidencia
  `htmlFallback: true`.
- `AI_READINESS_SCORE_VERSION` → v2; fixtures con el HTML de `skyairline.com`.

### Slice 2 — Compuerta de revisión por palabra completa y con evidencia

- Coincidencia por palabra completa, sin mayúsculas ni acentos, con lista de formas explícita (ej. "denuncia",
  "denuncias", "denunciado/a/s" como riesgo deliberado; "demanda" sólo en construcciones judiciales: "demanda judicial",
  "demandó a", "fue demandada"), revisada con fixtures del caso Sky.
- `reviewReasons` agrega el término y la frase (≤200 caracteres) que activaron la revisión.

## Out of Scope

- Detectar el bloqueo de crawlers por WAF (el 403 a GPTBot observado en Sky necesita pruebas desde IPs reales; follow-up).
- Cambiar el umbral de sentimiento negativo o el gate de exactitud (TASK-1238).
- Recalcular runs anteriores.

## Detailed Spec

- El detector de fallback se aplica sólo a rutas que deberían ser texto/XML; la home HTML no es fallback.
- Casos de prueba mínimos de la compuerta: "rutas más demandadas" → no activa; "fue demandada por pasajeros" → activa;
  "denunciados en redes sociales" → activa (riesgo reputacional deliberado); "estafa" → activa.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slices independientes; se pueden desplegar juntos. Ambos requieren redeploy del `ops-worker`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La compuerta deja pasar lenguaje difamatorio real | Reputación / legal | low | Casos de riesgo real en tests; formas deliberadas | revisión manual del primer lote |
| Sitios con `llms.txt` real servido como `text/html` | Probes | low | Detectar por cuerpo además del `content-type` | fixtures |
| Comparar readiness v2 con v1 | Scoring | low | Versión nueva | tests de tendencia |

### Feature flags / cutover

- Sin flag: corrección determinista y aditiva; readiness versionado separa los puntajes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR + redeploy del worker | < 20 min | sí |
| Slice 2 | Revert PR + redeploy del worker | < 20 min | sí |

### Production verification sequence

1. Tests con fixtures.
2. Staging: probes sobre `skyairline.com` → `llms.txt` 0, `sitemap.xml` 0, robots con motivo de fallback.
3. Producción por el release control plane; revisar la cola de revisión la primera semana.

### Out-of-band coordination required

- Redeploy del `ops-worker`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Con el HTML de `skyairline.com` en `/llms.txt` el probe da score 0 con motivo de fallback (test).
- [ ] Con HTML en `/sitemap.xml` el probe da 0, no 40 (test).
- [ ] Con HTML en `/robots.txt` el probe declara "sin robots.txt real" y guarda `htmlFallback: true` (test).
- [ ] Un fallo de red en cualquiera de los tres sigue siendo `null` (test).
- [ ] "rutas más demandadas" no activa la revisión; "fue demandada por" sí (tests).
- [ ] La razón de revisión incluye el término y la frase que la activaron (test).
- [ ] `AI_READINESS_SCORE_VERSION` es `ai_readiness_score_v2` y la tendencia no la compara con v1.
- [ ] Re-corrida de probes en staging sobre `skyairline.com` con los resultados esperados.
- [ ] Docs de límites actualizados (runbook, doc funcional, skills) y Delta en `TASK-1269`.

## Verification

- `pnpm local:check`
- `pnpm test`
- `pnpm task:lint --task TASK-1868`
- Probes en staging sobre `skyairline.com`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- Probe de bloqueo de crawlers IA por WAF, medido desde infraestructura que reproduzca al bot real.

## Delta 2026-09-11

- Task creada a pedido del operador tras medir los falsos positivos en el panel competitivo de Sky.

## Open Questions

1. ¿"denunciado/s" debe seguir activando la revisión? Propuesto: sí, como riesgo reputacional deliberado, pero con la
   frase visible para que el revisor decida rápido.
