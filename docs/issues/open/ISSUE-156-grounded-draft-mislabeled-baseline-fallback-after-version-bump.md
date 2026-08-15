# ISSUE-156 — Un draft grounded se lee como `baseline_fallback` después de cada bump de versión del cerebro

- **Ambiente:** producción (lane app + lane ecosystem + MCP)
- **Detectado:** 2026-08-15, en la verificación adversarial de la auditoría de oportunidad Growth SEO/AEO
- **Estado:** `open`
- **Relacionado:** `TASK-1666` (bridge grounded) · `TASK-1695` (bump de versión pendiente) ·
  `TASK-1698` y `TASK-1703` (dos bumps más en vuelo) ·
  `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`

---

## Síntoma

Un borrador de grounded queries que **sí** se autoró con el contexto SEO de la marca se le presenta
al operador como si **no** lo tuviera: `groundingMode: 'baseline_fallback'`, acompañado del
`fallbackNotice` que le dice que las preguntas *"no se consideran específicas de estas keywords"* y
que las revise con más atención.

El motor se acusa a sí mismo de no haber usado un contexto que sí usó. Y el lane MCP lo propaga
verbatim, así que un agente externo recibe la misma afirmación falsa.

## Causa raíz

El modo de grounding **no se persiste**: se **deriva por igualdad exacta** contra la constante de
versión vigente en el momento de la lectura.

`src/lib/growth/seo/grounded-query-reader.ts:89-90`:

```ts
const grounded =
  row.generationStrategy === 'llm' && row.systemPromptVersion === AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION
```

Y la constante ya se movió: `author-system-prompt.ts:33` está en `aeo-author.seo-grounded.v2` desde
la corrección del 2026-08-14. **Todo draft autorado con `v1` quedó mal etiquetado el día del bump**,
sin que nada cambiara en la fila.

El mismo patrón está en el dedupe del bridge (`grounded-query-bridge.ts:315-317`), aunque ahí el
efecto es menor: con authoring encendido, un draft de versión vieja no dedupea y se re-autora.
**El daño vive en el READ.**

## Por qué importa más de lo que parece

1. **Miente en la dirección pesimista.** Degradar un draft bueno a "fallback" entrena al operador a
   desconfiar de un artefacto correcto — y a ignorar el aviso cuando sí sea real.
2. **Se repite en cada bump, por diseño.** Hay **tres bumps en vuelo** (`TASK-1695`, `TASK-1698`,
   `TASK-1703`). Cada uno vuelve a mal etiquetar todo el histórico anterior.
3. **La versión es un identificador de instrumento, no un veredicto de calidad.** Usar la igualdad
   con la versión *vigente* como proxy de "fue grounded" confunde dos ejes distintos.

## Solución propuesta

**Conjunto append-only de versiones grounded conocidas** en vez de igualdad con la vigente:

```ts
export const KNOWN_GROUNDED_SYSTEM_PROMPT_VERSIONS = new Set([
  'aeo-author.seo-grounded.v1',
  'aeo-author.seo-grounded.v2'
]) // append-only: una versión que salió grounded lo fue para siempre
```

Aplicado en el reader y en el dedupe del bridge. Y la regla que evita la recaída: **todo bump del
cerebro grounded agrega su versión al set en el mismo commit** — hoy `TASK-1695` ya lo declara como
requisito y `TASK-1698`/`TASK-1703` deben heredarlo.

Alternativa más robusta y más cara, para evaluar: **persistir `grounding_mode` en la fila** cuando se
autora, y que el read lo lea en vez de derivarlo. Elimina la clase entera de bug, pero exige
migración + backfill de los drafts existentes (que es justamente lo que hoy no se puede hacer bien,
porque la información de si fueron grounded sólo vive en la versión del prompt).

## Verificación pendiente

⚠️ **El mecanismo está confirmado por lectura de código; el ALCANCE no.** Falta contar cuántos
`grader_prompt_sets` tienen `system_prompt_version = 'aeo-author.seo-grounded.v1'` con
`generation_strategy = 'llm'`. Si son cero, el issue es preventivo y su prioridad baja; si hay
drafts vivos, hay artefactos mal etiquetados frente a un operador hoy.

Query de dimensionamiento:

```sql
SELECT system_prompt_version, generation_strategy, count(*)
  FROM greenhouse_growth.grader_prompt_sets
 WHERE system_prompt_version LIKE 'aeo-author.seo-grounded%'
 GROUP BY 1, 2;
```

## Cómo se descubrió

No lo encontró el lint, ni los tests, ni la auditoría original: lo encontró una **pasada de
verificación adversarial** sobre las afirmaciones de esa auditoría, a la que se le pidió refutar en
vez de confirmar. La auditoría lo había anotado como *riesgo futuro* de los bumps en vuelo; la
verificación descubrió que **el primer bump ya ocurrió** y el riesgo ya se materializó.
