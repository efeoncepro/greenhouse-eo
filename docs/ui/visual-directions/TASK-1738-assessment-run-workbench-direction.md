# TASK-1738 — Dirección visual: workbench de revisión del run de scoring IA

> **Tipo de documento:** Dirección visual versionada (repo-native benchmark)
> **Superficie:** `/agency/hiring/applications/[applicationId]?tab=assessment` → entrada en la card
> del assessment + `Dialog` de revisión del run
> **Modo:** `repo-native-benchmark`
> **Creado:** 2026-08-17 por Claude (sesión de diseño con skills de product design)
> **Evidencia de la pasada:** commits `856adc201` (implementación), `a533d10dd` (integración en la
> Application 360) y `38b4310d6` (correcciones desde el frame real) · GVC premium
> `.captures/2026-08-17T00-42-52_task1738-assessment-run-workbench/` (run REAL con
> `claude-sonnet-5`: 14 items, 11 mandatory / 2 sample / 1 batch)
> **Wireframe:** [`docs/ui/wireframes/TASK-1738-assessment-ai-review-workbench.md`](../wireframes/TASK-1738-assessment-ai-review-workbench.md)
> **Flow:** [`docs/ui/flows/TASK-1738-assessment-ai-review-workbench-flow.md`](../flows/TASK-1738-assessment-ai-review-workbench-flow.md)
> **Implementación:** `src/views/greenhouse/hiring/AssessmentAiRunWorkbench.tsx`

## Decision

**El workbench es una COLA DE TRABAJO CON TECHO HONESTO, no un panel de resultados de IA.**

La superficie existe para que un operador cierre excepciones a escala sin que el sistema le
permita jamás declarar completo lo que está parcial (herencia ISSUE-159) ni ver la propuesta de
la muestra ciega antes de juzgar. Por eso la dirección subordina TODO lo decorativo a dos hechos
que deben ser imposibles de perder de vista: **cuánto falta** y **por qué no se puede confirmar
todavía**. El único momento visual dominante es la cobertura; la cola es material de trabajo.

### Direcciones comparadas

| # | Dirección | Tratamiento | Veredicto |
|---|---|---|---|
| A | **Dashboard del run** (KPI cards de cobertura arriba, cola debajo) | 4–5 cards de métrica con número grande, la cola como tabla | **Descartada.** Convierte la cobertura en decoración de reporte y la cola en dato secundario; card-on-card dentro del `Dialog`, y el número grande premia el "ya está" en vez de "falta esto". |
| B | **Cola con cobertura sticky** | fila compacta de stat chips + banner de estado, fija arriba; cola de `Paper variant='outlined'` como material de trabajo; confirm con causas al pie | **Elegida.** La cobertura acompaña al operador durante todo el recorrido: el techo anti rubber-stamp deja de ser una pantalla inicial que se olvida al hacer scroll. |
| C | **Wizard item por item** (un item a la vez, avanzar/retroceder) | pantalla completa por item, progreso lineal | **Descartada.** Oculta la magnitud (no se ve cuánto falta ni la mezcla de riesgos) y hace imposible saltar a la excepción que importa; convierte una cola priorizada en un trámite. |

### Por qué B gana

- **La cobertura no se puede scrollear fuera de vista.** Es la única defensa visual contra el
  rubber-stamp; si se va con el scroll, el operador confirma con la memoria de lo que vio arriba.
- **La cola es material, no tarjetería.** Un `Paper variant='outlined'` por item, la evidencia por
  criterio dentro; cero card-on-card. El item pesa lo que pesa su decisión.
- **La consecuencia viaja en el label.** "Ver propuesta IA (queda registrado)" dice el costo antes
  del clic: el anti-anclaje deja de ser disciplina del operador y pasa a ser dato del manifest.

## Correcciones que impuso el frame real

Esta dirección no se fijó en el papel: se corrigió mirando el GVC sobre un run real (commit
`38b4310d6`). Lo que cambió y por qué:

- **La entrada salió del panel "Revisar evaluación" a la card del assessment.** Dentro del panel,
  una cola de excepciones pendiente quedaba invisible hasta cargar la revisión completa: el
  trabajo pendiente no puede vivir detrás de un gesto.
- **`manifestSummary` decía siempre 100%.** Renderizaba `{a}/{a}` — "excepciones 1/1" mientras los
  gates debajo decían "faltan 10". Es exactamente el bug class que esta superficie existe para
  impedir; ahora es resuelto/total.
- **Contraste AA de lo load-bearing.** `warning.main` como texto sobre blanco da 1,74:1 y pintaba
  las dos frases más importantes de la superficie (el registro del manifest y las causas por gate).
  Migradas a la tinta canónica `theme.greenhouseSemantic.warning.ink`. También `text.disabled`
  (2,29:1) en la procedencia del modelo y `subtitle2` (3,38:1) en el encabezado del confirm.
- **Los reason codes eran chips huérfanos** en el header, sin decir qué eran; ahora van bajo su
  etiqueta "Por qué requiere revisión".
- **La cobertura pasó a `sticky`** por la razón de arriba.
- **`sx={{ ms: 1 }}` no existía en MUI** (solo `marginInlineStart`): el margen simplemente no se
  aplicaba y nadie lo notaba porque el build pasaba.

## Desktop target (1440×900)

- `Dialog maxWidth='lg'` de `90vh` con scroll interno propio: el frame no compite con la
  Application 360 que lo hospeda.
- **REGION 1 — cobertura `sticky`**: fila compacta de stat chips (resuelto/total por carril) +
  banner `Alert severity='warning'` a ancho completo cuando `digestStale`. Números con
  `tabular-nums`; sin KPI cards.
- **REGION 2 — cola** ordenada `mandatory_review` → `quality_sample` → `batch_eligible`. Cada item
  es un `Paper variant='outlined'` con `p: 2.5`; la propuesta colapsada indenta con
  `borderInlineStart` de 2px en token `divider` — el filete es la cita, no una caja anidada.
- **REGION 3 — confirm**: `Paper variant='outlined'` con el manifest resumido y el CTA primario
  `disabled` + `aria-describedby` apuntando a las causas visibles. El disabled nunca es mudo.
- **Muestra ciega**: el item no trae propuesta en el DOM (contrato del reader, verificado por
  assertion GVC `notVisible`); la ausencia se declara con texto, sin tratamiento de "misterio".
- **Aporte por criterio sobre su peso** (`18 / 25`, delta TASK-1734 del 2026-08-17): sin
  denominador el operador no puede juzgar si el aporte es bueno.

## Mobile target (390×844)

- `Dialog fullScreen`; stat chips envuelven en 2 columnas; acciones de resolución apiladas
  `fullWidth` con la más comprometida al final (Devolver a manual → Corregir → Confirmar).
- REGION 3 pierde el `sticky` y cierra el scroll; el texto de la respuesta rompe con
  `overflowWrap: 'anywhere'`.
- `scrollWidth == clientWidth` verificado: los dos findings de layout del GVC son la tab strip
  scrolleable de la Application 360, no el workbench.

## Token mapping

| Intención | Token / primitive | Nunca |
|---|---|---|
| Frame del workbench | `Dialog maxWidth='lg'` con `blockSize: '90vh'`; `fullScreen` bajo `sm` | ruta dedicada ni modal a pantalla completa en desktop |
| Superficie de item de la cola | `Paper variant='outlined'` con `p: 2.5` | `elevation` alta, card-on-card |
| Superficie de confirmación | `Paper variant='outlined'` con `p: 3` | banda de color como "zona peligrosa" |
| Cita de la propuesta plegada | `borderInlineStart: '2px solid'` + `borderInlineStartColor: 'divider'` | caja rellena anidada dentro del item |
| Tinta de advertencia (registro del manifest, causas por gate) | `theme.greenhouseSemantic.warning.ink` | `warning.main` como texto (1,74:1 sobre blanco) |
| Banner de contenido desactualizado | `Alert severity='warning'` a ancho completo | esconder el stale y dejar confirmar |
| Chips de cobertura y de clase de riesgo | `GreenhouseChip kind='status'` (`variant='label'`/`'outlined'`) | KPI cards, color sin texto |
| Cobertura fija | `position: 'sticky'` en REGION 1 | cobertura como pantalla inicial que se scrollea fuera |
| Escalera de texto | `theme.typography.{body1,body2,caption,overline}` | `fontSize` inline; `subtitle2` como texto load-bearing (3,38:1) |
| Numéricos (cobertura, puntajes, aportes) | `fontVariantNumeric: 'tabular-nums'` | monospace |
| Procedencia del modelo | `text.secondary` | `text.disabled` (2,29:1) — es evidencia auditable, no decoración |
| Input de puntaje | `CustomTextField type='number'` 0–100 | slider (se requiere precisión) |
| CTA bloqueado por gate | `disabled` + `aria-describedby` a la causa visible | disabled mudo |
| Espaciado | escala `4n` del tema (`sx` numérico) | px sueltos; props inexistentes (`ms`, que MUI ignora en silencio) |
| Motion | `Collapse`/`Dialog` por defecto; `prefers-reduced-motion` los desactiva | stagger, celebración, revelado animado |

## Anti-patterns

- **KPI cards de cobertura.** Convierten el techo anti rubber-stamp en decoración de reporte y meten
  card-on-card dentro del diálogo (dirección A).
- **Resumen que siempre da 100%.** Cualquier `{a}/{a}` en el manifest es el bug class que esta
  superficie existe para impedir: el resumen es siempre resuelto/total.
- **Cobertura que se scrollea fuera de vista.** Si el operador la pierde, confirma de memoria.
- **Propuesta abierta por defecto en `mandatory_review`.** Replicaría el anclaje del precargado
  actual; plegada + registro al expandir convierte el anti-anclaje en dato del manifest.
- **Cortina visual sobre la muestra ciega.** La ausencia es del payload, no del CSS; simularla sería
  mentirle a la medición de calidad.
- **CTA disabled sin causa visible**, o cualquier estado que presente un run parcial como completo.
- **Celebración al confirmar / revelado animado**: la superficie decide sobre personas.
- **Color como único portador de significado**: todo chip lleva texto.

## Verificación de la pasada

- GVC premium 1440×900 + 390×844 sobre run real; assertion `notVisible` de la muestra ciega
  verde; `scrollWidth == clientWidth` en ambos viewports.
- `sawProposalBeforeScoring` contrastado contra la DB en ambas direcciones (`true` al expandir y
  confirmar; `false` al devolver a manual sin expandir).
- axe sobre el `Dialog` portaleado: findings de contraste resueltos salvo el `Alert severity='info'`
  del tema (3,94:1, preexistente portal-wide).
- Scorecard: `docs/ui/reviews/TASK-1738-assessment-ai-review-workbench.scorecard.json` (average
  4,46; `visualImpact` 4,0 con excepción estructural declarada).

## Deuda visual declarada

- `Alert severity='info'` del tema rinde 3,94:1 (host card, preexistente, blast radius
  portal-wide). No se parcha acá: es causa raíz global con chip propio.
