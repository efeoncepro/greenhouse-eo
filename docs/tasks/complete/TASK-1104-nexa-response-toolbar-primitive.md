# TASK-1104 — Promover `NexaResponseToolbar` a primitive (variants embedded/floating/docked)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-06-13 — COMPLETADA

- Primitive `NexaResponseToolbar` creada en `src/components/greenhouse/primitives/nexa-response-toolbar/` (types + controller `kind→variant` + 3 variants + 4 tests del controller, verde).
- 3 variants: `embedded` (en-flow, hairline-top, prompt + feedback izq + copiar/compartir/regenerar der — el del canvas) / `floating` (anclada, solo-ícono, derecha) / `docked` (barra fija ancho completo, fondo paper). Kinds `responseSettle`→embedded / `chatMessage`→floating / `surfaceBar`→docked.
- Contrato preservado: `onControl(control)` con `NexaResponseToolbarControl = copy|share|helpful|unhelpful|regenerate`, labels es-CL override-ables (poda de `undefined` → no pisa defaults), clipboard self-contained optimista, feedback colapsa a acuse.
- **Corrección de spec**: el toolbar co-located NO tenía control "Detener" (eso vive en `NexaComposerActionButton` variant `stop`, en el composer — no en el settle-toolbar). No se agregó un control fantasma; la migración es byte-idéntica.
- Migración canvas: `NexaAnswersCanvas` consume `<NexaResponseToolbar variant='embedded' …>`; se borró el componente co-located (157 líneas) + `RESPONSE_TOOLBAR_DEFAULTS`. **GVC `nexa-answers-surface` byte-idéntico** (0 findings nuevos; frames `nexa-response-toolbar` + `…-feedback-ack` idénticos al golden).
- Lab `/design-system/nexa-response-toolbar` + page (guard `plataforma.design_system`) + route-reachability (strict, 0 orphans) + catálogo + scenario GVC `design-system-nexa-response-toolbar` (0 findings, 3 variants + acuse). Entrada en `ui-platform/PRIMITIVES.md`.
- Cierre: `local:check` (tsc + lint) verde; barrel `index.ts` exporta componente + types + controller.

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|nexa`
- Blocked by: `none` (extracción de un componente ya construido) · consumer trigger: `TASK-1078` (Nexa floating) / `TASK-1089` (Answer Trace)
- Branch: `task/TASK-1104-nexa-response-toolbar-primitive`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extraer la **response toolbar** (hoy co-located dentro de `NexaAnswersCanvas` como `NexaResponseToolbar` — feedback ¿útil? + copiar/compartir/regenerar/detener) a una **primitive canónica** en `src/components/greenhouse/primitives/`, con variants `embedded` (en-flow, la del canvas) / `floating` (anclada, para Nexa Chat) / `docked` (barra fija inferior), preservando el contrato `onResponseControl` + `NexaAnswersResponseControl` ya definido. Promoción YAGNI-gated: se hace cuando exista el **segundo consumer** real (Nexa Chat TASK-1078 o Answer Trace TASK-1089).

## Why This Task Exists

La response toolbar nació co-located en el canvas (TASK-1096, commit `78d30ee40`) — decisión correcta para un primer consumer. Pero el "chrome de confianza del asistente" (¿útil? + copiar/compartir/regenerar) es genérico de **cualquier** surface conversacional: Nexa Chat (TASK-1078), Answer Trace (TASK-1089), futuras. Cuando emerja el segundo consumer, copiar el componente forkearía el contrato (`onResponseControl`, labels, el colapso a acuse). Esta task promueve el componente a primitive **cuando ese segundo consumer aparezca** — no antes (evita abstracción especulativa).

## Goal

- Mover `NexaResponseToolbar` a `src/components/greenhouse/primitives/nexa-response-toolbar/` con barrel export + controller `kind→variant`.
- **3 variants**: `embedded` (en-flow, la actual del canvas) / `floating` (anclada a un mensaje, para el dock de Nexa Chat) / `docked` (barra fija inferior de una surface conversacional).
- Preservar el contrato existente: `onResponseControl(control: NexaAnswersResponseControl)`, labels opcionales con defaults es-CL, copia self-contained (clipboard), feedback que colapsa a acuse, control "Detener" condicional.
- El canvas consume la primitive (`embedded`) sin cambio de comportamiento; el segundo consumer usa `floating`/`docked`.
- Lab interno + GVC + contrato en `ui-platform/PRIMITIVES.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — DEPENDENCIES & IMPACT
     ═══════════════════════════════════════════════════════════ -->

## Dependencies & Impact

**Trigger (YAGNI):** ejecutar cuando exista un segundo consumer real — `TASK-1078` (Nexa floating expandible) o `TASK-1089` (Answer Trace). Hasta entonces, el componente co-located es correcto.

**Depende de:**
- El contrato ya construido en TASK-1096: `NexaAnswersResponseControl`, `onResponseControl`, labels en el copy. Se promueve, no se rediseña.

**Archivos owned:**
- Nuevo: `src/components/greenhouse/primitives/nexa-response-toolbar/` (componente extraído + types + controller + barrel).
- Modificado: `NexaAnswersCanvas.tsx` (consume la primitive `embedded` en vez del co-located).
- Lab `/admin/design-system/nexa-response-toolbar` + route-reachability + scenario GVC.

**Impacta a:** Nexa Chat (TASK-1078), Answer Trace (TASK-1089) — heredan el contrato sin forkear.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC
     ═══════════════════════════════════════════════════════════ -->

## Detailed Spec

> Protocolo Primitive+Variants+Kinds. La extracción es de bajo riesgo (el componente ya existe + GVC-verificado); el foco es el contrato de variants + no romper el canvas.

### Slice 1 — Extracción + variant `embedded`

- Mover el componente a la carpeta de primitive con su estado interno (feedback/copied) + el contrato `onResponseControl`.
- `embedded` = el rendering actual (hairline top + feedback izq + controles der). El canvas lo consume; GVC diff antes/después = idéntico.

### Slice 2 — Variants `floating` + `docked`

- `floating`: compacta, anclada a un mensaje (íconos con tooltip, sin el prompt "¿Te sirvió?" expandido hasta hover) — para el dock de Nexa Chat.
- `docked`: barra fija inferior de la surface (full-width, separada del scroll).
- Resolver `kind→variant` (`responseSettle`→embedded, `chatMessage`→floating, `surfaceBar`→docked).

### Slice 3 — Lab + GVC + docs

- Lab con los 3 variants + estados (pre-voto, acuse, copiado, con/sin Detener).
- GVC desktop+mobile + `ui-platform/PRIMITIVES.md` + catálogo `/admin/design-system`.

## Verification

- `pnpm local:check` + `pnpm test` verde.
- GVC diff del canvas (consume `embedded`) = sin regresión.
- GVC del Lab (3 variants) desktop+mobile, 0 findings, a11y (teclado como acción primaria donde el control colapsa — patrón TASK-1096).

## Out of Scope

- El cableado a feedback real (`POST /api/platform/app/knowledge/feedback`) = TASK-1101. Acá la primitive solo emite `onResponseControl`.

## Notas de origen

Propuesta P2 de la sesión TASK-1096 (2026-06-13). Componente origen: `NexaResponseToolbar` co-located en `NexaAnswersCanvas.tsx` (commit `78d30ee40`).
