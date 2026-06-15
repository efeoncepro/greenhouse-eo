# TASK-1132 — Nexa Expression Layer + Fluent Visual Cues

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|nexa|design-system|content`
- Blocked by: `none`
- Branch: `task/TASK-1132-nexa-expression-layer-fluent-visual-cues`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Crear una capa formal de expresion visual para Nexa que combine la identidad propia existente (mark, avatar, glow, spectrum, answer surfaces) con un set curado de visual cues inspirados/derivados de Fluent Emoji. La meta es que Nexa se sienta mas agencia creativa y menos asistente plano, sin convertir el chat en un sticker-bot ni dejar que el LLM elija emojis libremente.

## Why This Task Exists

TASK-1124 ya actualizo la voz de Nexa para ser mas calida, estrategica y creativa con sobriedad, incluyendo uso gobernado de emojis. El runtime tambien ya tiene una identidad visual rica (`GreenhouseNexaBrandMark`, `NexaSenderMark`, `NexaExpressiveText`, `NexaPromptDock`, `NexaAnswersCanvas`, glow/spectrum). El gap actual es que no existe una capa semantica unica que traduzca intenciones como `ready`, `reviewing`, `risk`, `idea`, `source` o `next_step` a una decision visual consistente: Fluent-style cue, Nexa mark, icono sobrio, chip textual o nada segun sensibilidad.

## Goal

- Definir un registry tipado de cues visuales de Nexa con reglas por contexto, sensibilidad y placement.
- Integrar un set curado de Fluent visual assets o una estrategia equivalente gobernada por licencia/atribucion y compatibilidad visual con AXIS/Nexa.
- Extender `NexaExpressiveText`/answer surfaces de forma accesible para renderizar cues semanticos sin HTML libre, sin estilos arbitrarios y sin que el LLM controle assets.
- Crear Lab/Design System specimen y GVC para validar que la capa se ve premium, consistente y no juguetona.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE_DOMAIN_PLAYBOOK.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Nexa conserva identidad propia primero: `GreenhouseNexaBrandMark`, `NexaSenderMark`, `NexaFace`, glow/spectrum y primitives existentes son la base. Fluent acompana, no reemplaza la marca.
- El dominio entra por datos; no crear un chat/surface paralelo ni chrome especial por dominio.
- El LLM no elige assets ni URLs. Puede emitir intencion semantica si el contrato lo permite; la UI resuelve el visual cue desde registry.
- No usar emojis/visual cues como unico significado. Toda senal debe tener texto o `aria-label` suficiente.
- En contextos sensibles (finanzas, nomina, legal, seguridad, compromisos contractuales) degradar a iconografia sobria o texto; evitar cues decorativos.
- No hardcodear HEX/font/spacing/motion en views. Usar tokens AXIS/Nexa y primitives existentes.

## Normative Docs

- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`
- `docs/documentation/plataforma/nexa-conversational-experience.md`
- `public/images/nexa-mark/nexa-icon-spec.md`

## Dependencies & Impact

### Depends on

- `TASK-1124` — system prompt V2 + voice contract complete.
- `src/lib/nexa/nexa-system-prompt.ts` — contrato de voz actual y regla de emojis gobernados.
- `src/components/greenhouse/primitives/nexa-expressive-text/*` — renderer serializable actual.
- `src/components/greenhouse/primitives/greenhouse-nexa-brand-controller.ts` — assets y colores Nexa existentes.
- `src/components/greenhouse/primitives/GreenhouseNexaBrandMark.tsx`
- `src/components/greenhouse/primitives/GreenhouseNexaAnimatedMark.tsx`
- `src/components/greenhouse/primitives/NexaSenderMark.tsx`
- `src/components/greenhouse/primitives/nexa-answer-bubble/*`
- `src/components/greenhouse/primitives/nexa-conversation-bubble/*`
- `src/views/greenhouse/admin/design-system/NexaChatLabView.tsx`
- `src/views/greenhouse/admin/design-system/NexaBrandLabView.tsx`

### Blocks / Impacts

- `TASK-1112` — Nexa Chat ↔ Answers Experience Unification puede consumir cues cuando el chat adopte answer-turns estructurados.
- `TASK-1110` — Nexa Answers Experience puede mostrar la capa en Moment/Answer specimens.
- `TASK-1078` — floating chat expandible puede usar cues en empty states/prompts si se retoma.
- Futuras surfaces de Nexa por dominio que necesiten senales visuales consistentes.

### Files owned

- `src/components/greenhouse/primitives/nexa-expression-cue/*`
- `src/components/greenhouse/primitives/nexa-expressive-text/*`
- `src/components/greenhouse/primitives/index.ts`
- `src/views/greenhouse/admin/design-system/NexaChatLabView.tsx`
- `src/app/(dashboard)/design-system/nexa-chat/page.tsx`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/HISTORIAL.md`
- `docs/documentation/plataforma/nexa-conversational-experience.md`
- `public/images/nexa-expression-cues/*` o `src/components/greenhouse/primitives/nexa-expression-cue/assets/*` si se decide vendorear assets.

## Current Repo State

### Already exists

- `GreenhouseNexaBrandMark` y assets propios de Nexa (`public/images/nexa-mark/*`).
- `NexaSenderMark` como avatar por mensaje con arco teal + spark blanco.
- `NexaFace` como avatar/cara real.
- `GreenhouseNexaAnimatedMark` para blink/momentos ambient.
- `GreenhouseSpectrumBeam` con paleta `nexa` para entrypoints y glow.
- `NexaExpressiveText` con segmentos `emoji`, `citation`, `break` y estilos cerrados.
- Dependencias `@emoji-mart/react`, `@emoji-mart/data` y `emoji-mart` instaladas, pero no usadas por Nexa; sirven para picker, no para identidad visual.

### Gap

- No existe un registry `cue -> visual treatment` para Nexa.
- No existe decision documentada de Fluent Emoji vs assets propios vs Unicode por contexto.
- `NexaExpressiveText` soporta emoji Unicode, pero no un cue semantico gobernado.
- No hay Lab/GVC que compare uso sobrio vs excesivo ni estados sensibles.
- No hay test que impida que cues reemplacen texto/aria o que un asset externo se convierta en dependencia no gobernada.

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

### Slice 1 — Registry de expresion visual

- Crear un contrato tipado para cues: `ready`, `reviewing`, `risk`, `idea`, `source`, `next_step`, `opportunity`, `missing_context`, `blocked`, `sensitive`.
- Definir metadata por cue: label visible, `ariaLabel`, tono semantico, prioridad visual, contexts permitidos (`chatText`, `answerSurface`, `stateChip`, `emptyState`, `promptDock`), y degradation policy por sensibilidad.
- Resolver cada cue a treatment: `nexaMark`, `fluentAsset`, `tablerIcon`, `statusDot`, `textOnly`, `none`.

### Slice 2 — Fluent asset strategy

- Decidir vendoring vs package/CDN. Preferencia: vendorear solo el set curado si la licencia/atribucion queda clara y el peso es bajo.
- Documentar licencias/atribucion de Fluent Emoji y cualquier restriccion de uso.
- Normalizar naming, tamanos, fallback y cache strategy.
- Asegurar que los assets no introduzcan colores/estilos no gobernados fuera de un contenedor/token AXIS.

### Slice 3 — Primitive `NexaExpressionCue`

- Crear `NexaExpressionCue` + controller `resolveNexaExpressionCue()` en `src/components/greenhouse/primitives/nexa-expression-cue/`.
- Soportar variants/kinds sin duplicar `NexaExpressiveText`.
- Render accesible: `role='img'` solo cuando aporta significado; decorativo con `aria-hidden` cuando el texto ya cubre significado.
- Tests unitarios del resolver, fallback sensible y plain-text/aria.

### Slice 4 — Integracion con texto expresivo y answer surfaces

- Extender `NexaExpressiveTextSegment` con `type: 'cue'` o un wrapper equivalente, preservando backwards compatibility.
- Asegurar que `getNexaExpressiveTextPlainText()` devuelva texto accesible y estable.
- Integrar cues en specimens de `NexaConversationBubble`, `NexaAnswerBubble`, `NexaProvenanceTrace` o `NexaAnswersCanvas` solo donde agreguen valor.
- Mantener el prompt V2 como policy de alto nivel; no permitir asset/URL libre desde el modelo.

### Slice 5 — Lab, GVC y documentacion

- Agregar specimen en `/design-system/nexa-chat` o crear seccion dedicada dentro del Lab existente.
- Mostrar buenos usos y anti-patrones: creativo sobrio, estado listo, riesgo sensible, fuente/evidencia, siguiente paso.
- Actualizar `PRIMITIVES.md`, `HISTORIAL.md` y doc humano de Nexa.
- Crear/actualizar scenario GVC para desktop + mobile, con lectura visual del frame.

## Out of Scope

- No cambiar el comportamiento del retrieval de Knowledge.
- No cambiar el system prompt salvo que el plan justifique un bump de version siguiendo `GREENHOUSE_NEXA_SYSTEM_PROMPT_GOVERNANCE_V1.md`.
- No agregar un picker de emojis al chat.
- No permitir que usuarios o LLM inserten cualquier emoji/asset arbitrario.
- No reemplazar iconografia sobria existente en estados financieros/legales/sensibles.
- No usar CDN externo en runtime sin decision explicita de seguridad/licencia/performance.

## Detailed Spec

### Concepto

La capa se llama provisionalmente `Nexa Expression Layer`. Su contrato no es "emoji pack", sino "intencion visual gobernada". Un cue debe poder renderizarse de manera distinta segun contexto:

| Cue | Uso | Default visual | Degradacion sensible |
|---|---|---|---|
| `ready` | respuesta lista / accion completada | Fluent check o icono check | icono sobrio + texto |
| `reviewing` | Nexa busca/revisa | Nexa animated mark / lupa | thinking beat + texto |
| `risk` | riesgo operativo | warning sobrio | warning sobrio obligatorio |
| `idea` | propuesta creativa | Fluent lightbulb | texto only si sensible |
| `source` | evidencia/fuente | pin/document cue | icono documento + texto |
| `next_step` | accion siguiente | compass/arrow cue | CTA textual |
| `opportunity` | oportunidad creativa/comercial | spark controlado | texto only si sensible |
| `missing_context` | falta contexto | puzzle/question cue | texto explicito |
| `blocked` | bloqueado | stop/lock cue | icono sobrio + texto |
| `sensitive` | tema sensible | none/textOnly | none/textOnly |

### Contract sketch

```ts
export type NexaExpressionCueKey =
  | 'ready'
  | 'reviewing'
  | 'risk'
  | 'idea'
  | 'source'
  | 'next_step'
  | 'opportunity'
  | 'missing_context'
  | 'blocked'
  | 'sensitive'

export type NexaExpressionCueContext =
  | 'chatText'
  | 'answerSurface'
  | 'stateChip'
  | 'emptyState'
  | 'promptDock'

export type NexaExpressionCueTreatment =
  | 'nexaMark'
  | 'fluentAsset'
  | 'tablerIcon'
  | 'statusDot'
  | 'textOnly'
  | 'none'
```

### Acceptance posture

El resultado debe sentirse como una agencia creativa con sistema operativo propio: visual y humano, pero preciso, accesible y con prueba. La UI decide el tratamiento visual; el contenido sigue liderando con datos, evidencia o siguiente paso.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (registry) -> Slice 2 (asset strategy) -> Slice 3 (primitive) -> Slice 4 (integration) -> Slice 5 (Lab/GVC/docs).
- Slice 4 no puede tocar surfaces runtime si Slice 3 no tiene fallback accesible y tests.
- Slice 5 debe correr GVC antes de considerar la task cerrada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Nexa se vuelve demasiado juguetona o decorativa | UI / marca / confianza | medium | registry curado, contexts permitidos, anti-patterns en Lab, review visual GVC | feedback usuario / QA visual |
| Visual cue reemplaza significado textual | a11y / UX | medium | `ariaLabel` obligatorio o `aria-hidden` decorativo; tests de plain text | tests a11y / review |
| Assets Fluent introducen peso/licencia no gobernada | frontend / legal / performance | medium | vendorear set minimo, doc de licencia, no CDN sin decision | bundle diff / review legal |
| Inconsistencia con marca Nexa | design-system | medium | Nexa mark sigue siendo identidad primaria; Fluent solo acento | GVC / DS review |
| Estados sensibles usan iconografia inapropiada | finance / payroll / legal / trust | low-medium | degradation policy por sensitivity y tests | QA curated cases |

### Feature flags / cutover

- Si la integracion toca runtime visible fuera del Lab, agregar flag presentation-only `NEXA_EXPRESSION_CUES_ENABLED` default `false`.
- Si se limita a Lab/Design System y tipos no consumidos por runtime, sin flag — additive, no production behavior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir registry/types | <10 min | si |
| Slice 2 | Retirar assets/strategy doc o volver a Unicode/iconos sobrios | <15 min | si |
| Slice 3 | Revertir primitive/export | <15 min | si |
| Slice 4 | Apagar flag o revertir callsites | <10 min con flag / <30 min revert | si |
| Slice 5 | Revertir Lab/docs/scenario | <15 min | si |

### Production verification sequence

1. Validar unit tests del resolver y texto accesible.
2. Validar `pnpm lint`, `pnpm exec tsc --noEmit --pretty false`, tests focales y build si toca runtime.
3. Ejecutar GVC del Lab en desktop y mobile, leer frames PNG y ajustar hasta que la capa se vea premium y no juguetona.
4. Si hay flag runtime, deploy staging con flag OFF, luego ON para smoke visual; rollback = flag OFF + redeploy si aplica.

### Out-of-band coordination required

- Validar licencia/atribucion de Fluent Emoji antes de vendorear assets.
- Si se decide usar assets externos no vendoreados, aprobar explicitamente seguridad/performance/licencia antes de runtime.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un registry tipado de cues visuales de Nexa con fallback por contexto y sensibilidad.
- [ ] Existe una decision documentada de Fluent visual assets: vendoring/package/CDN, licencia, atribucion, peso y fallback.
- [ ] `NexaExpressionCue` o equivalente renderiza cues accesibles sin HTML libre, sin estilos arbitrarios y sin que el LLM controle assets.
- [ ] `NexaExpressiveText` preserva plain text/aria estable cuando use cues.
- [ ] El Lab de Nexa muestra buenos usos y anti-patrones; GVC desktop + mobile revisado visualmente.
- [ ] Las docs vivas (`PRIMITIVES.md`, `HISTORIAL.md`, doc humano si aplica) quedan sincronizadas.
- [ ] No hay regresion en contexts sensibles: finanzas/nomina/legal/seguridad degradan a iconografia sobria o texto.

## Verification

- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- Tests focales:
  - `pnpm exec vitest run src/components/greenhouse/primitives/nexa-expression-cue`
  - `pnpm exec vitest run src/components/greenhouse/primitives/nexa-expressive-text/nexa-expressive-text.test.ts`
- GVC:
  - `pnpm fe:capture --route=/design-system/nexa-chat --env=local --hold=3000`
  - mobile viewport/scenario equivalente si existe o se crea.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se verifico que la capa no introduce un emoji pack abierto ni un picker de emojis fuera de scope

## Follow-ups

- Evaluar si el prompt V3 debe permitir emitir intenciones estructuradas de cue dentro del render plan, no como texto libre.
- Evaluar si `TASK-1112` debe consumir cues en el chat runtime cuando unifique answer-turns.

## Open Questions

- ¿Se vendorean assets Fluent como SVG/PNG curados o se construye una version propia inspirada en su lenguaje visual?
- ¿El cue `opportunity` debe usar Fluent-style sparkle o preferir siempre el Nexa mark para evitar confundir con IA generica?
- ¿La capa debe vivir solo en `NexaExpressiveText` o tambien como primitive standalone para chips/cards fuera del texto?
