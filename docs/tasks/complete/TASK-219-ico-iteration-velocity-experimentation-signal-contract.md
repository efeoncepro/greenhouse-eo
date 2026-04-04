# TASK-219 - ICO Iteration Velocity & Experimentation Signal Contract

## Delta 2026-04-04 — implementación cerrada

- `TASK-219` ya dejó operativo el primer contrato runtime de `Iteration Velocity`.
- Se creó `src/lib/ico-engine/iteration-velocity.ts` como helper canónico para:
  - medir iteraciones útiles cerradas en ventana de `30d`
  - distinguir `available`, `degraded` y `unavailable`
  - propagar `confidenceLevel`, `evidenceMode` y `qualityGateReasons`
- `src/app/api/projects/[id]/ico/route.ts` ahora expone `iterationVelocity` y refuerza el scope con filtro por `space_id`.
- `Creative Hub` ya dejó de derivar `Iteration Velocity` desde `RpA`:
  - `src/lib/capability-queries/creative-hub-runtime.ts` ahora hidrata `workflowChangeRounds`
  - `src/lib/capability-queries/helpers.ts` consume el helper canónico y explicita la naturaleza proxy del dato
- La policy actual queda cerrada así:
  - `Iteration Velocity` no equivale a `pipeline_velocity`
  - una iteración útil requiere evidencia de versión/iteración interna sin arrastre correctivo client-facing
  - mientras no exista evidencia observada de mercado o ads-platform, la lane viaja como `proxy` y `degraded`
- No se abrió migración nueva:
  - esta slice cierra contrato + consumer inicial + project reader
  - materialización amplia y evidencia observada de mercado quedan para lanes posteriores

## Delta 2026-04-04

- `Iteration Velocity` se aclara como capacidad habilitada por el proceso productivo Greenhouse para que el cliente testee más rápido en mercado, medida con `ICO`.
- Cambia un supuesto importante:
  - esta lane no parte desde cero en consumers
  - `Creative Hub` ya expone `Iteration Velocity` de forma heurística derivada de `RpA`
  - eso no debe tratarse como contrato canónico
- También cambia el supuesto de fuentes:
  - hoy sí existe evidencia operativa reutilizable en `delivery tasks / projects` y en el bridge `campaign_project_links`
  - todavía no existe contrato ads-platform ni entidad canónica de experimento/variante
- Regla nueva para esta task:
  - `pipeline_velocity` no puede reciclarse como sustituto semántico de `Iteration Velocity`
  - `Iteration Velocity` no puede degradarse a conteo de comentarios, rondas o piezas

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Implementada`
- Rank: `7`
- Domain: `delivery / ico / experimentation`

## Summary

Definir `Iteration Velocity` como métrica puente canónica para medir la capacidad que habilitamos en nuestros clientes de testear más rápido en mercado una solución a partir del proceso productivo medido con `ICO`, aclarando qué evidencia operativa la sostiene, cómo se separa del retrabajo correctivo y cómo sirve a `Revenue Enabled`.

## Why This Task Exists

El contrato maestro plantea que el cliente gana más no solo porque lanza antes, sino porque puede iterar y optimizar más rápido en mercado.

Hoy esa parte todavía no está institucionalizada como contrato runtime serio. Si no se corrige ahora, `Iteration Velocity` corre el riesgo de convertirse en:

- cantidad de comentarios
- cantidad de rondas
- cantidad de piezas
- un proxy heurístico escondido detrás de `RpA`

Ninguna de esas cuatro cosas equivale por sí sola a capacidad real de testear más rápido en mercado.

## Goal

- Definir qué significa `Iteration Velocity` en Globe/ICO con semántica de negocio correcta.
- Formalizar qué evidencia operativa demuestra capacidad de testeo acelerado habilitada por Greenhouse.
- Separar esa señal de retrabajo correctivo, review friction y velocidad genérica de pipeline.
- Preparar la base para `RE Iteration`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`

Reglas obligatorias:

- `Iteration Velocity` no debe confundirse con `RpA`, con `pipeline_velocity` ni con rounds de corrección.
- una señal útil debe representar capacidad habilitada para testear más rápido en mercado, no solo actividad interna.
- la fuente debe ser auditable y debe distinguir evidencia fuerte, evidencia proxy y ausencia de evidencia.
- la métrica debe ser usable aunque la atribución financiera posterior siga siendo parcial.

## Dependencies & Impact

### Depends on

- `TASK-214`
- `TASK-216`
- `TASK-218`
- `TASK-220`
- `TASK-188`
- `TASK-213`

### Impacts to

- `TASK-221`
- `TASK-222`
- `TASK-223`
- readers de performance marketing y delivery
- `Creative Hub`

### Files owned

- `src/lib/ico-engine/*`
- `src/lib/capability-queries/*`
- `src/lib/projects/*`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Current Repo State

### Ya existe

- `Contrato_Metricas_ICO_v1` ya define `Iteration Velocity` como métrica puente
- `Creative Hub` ya expone un consumer visible de `Iteration Velocity`, pero aún heurístico
- `delivery tasks / projects` ya tienen señales operativas reutilizables para evidence policy:
  - `frame_versions`
  - `client_change_round_final`
  - `workflow_change_round`
  - `client_review_open`
  - `workflow_review_open`
  - `open_frame_comments`
- `campaign_project_links` ya permite conectar campañas con proyectos para razonamiento de lanzamiento / iteración

### Gap actual

- no existe contrato canónico que diga qué evidencia cuenta realmente como capacidad de iteración hacia mercado
- no existe source policy ni confidence policy formal por señal
- no existe distinción runtime fuerte entre iteración útil, review friction y retrabajo correctivo
- no existe carril específico en `ICO Engine`; hoy solo existe `pipeline_velocity`, que no es equivalente
- no existe cutover del consumer heurístico de `Creative Hub`

## Scope

### Slice 1 - Semantic contract

- definir `Iteration Velocity` como capacidad de testeo acelerado en mercado habilitada por Greenhouse
- separar esa semántica de retrabajo correctivo y de throughput operativo genérico

### Slice 2 - Evidence & source policy

- auditar y clasificar evidencia operativa reutilizable
- fijar source policy y confidence policy
- dejar explícito qué parte es evidencia observada versus proxy operativa

### Slice 3 - Runtime serving contract

- modelar `Iteration Velocity` como reader / serving contract serio
- dejarlo listo para consumers estratégicos y para reemplazar heurísticas locales

## Out of Scope

- cerrar atribución final de `Revenue Enabled`
- conectar todos los ad networks en esta misma lane
- rediseñar la UI de reporting ejecutivo

## Acceptance Criteria

- [x] Existe definición canónica de `Iteration Velocity` alineada con capacidad de testeo acelerado en mercado
- [x] La métrica distingue iteración útil de retrabajo correctivo y de `pipeline_velocity`
- [x] Existe source policy y confidence policy por señal de experimentación / iteración
- [x] `Iteration Velocity` queda listo como insumo serio para `RE Iteration`
- [x] Los consumers dejan explícito cuándo consumen contrato canónico versus heurística legacy

## Verification

- `pnpm exec vitest run src/lib/ico-engine/iteration-velocity.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `rg -n "new Pool\\(" src`
- `pnpm lint`
- `pnpm build`
