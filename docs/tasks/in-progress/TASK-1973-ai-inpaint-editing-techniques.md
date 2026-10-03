# TASK-1973 — Técnicas de edición sobre el pipeline de inpainting: expandir, capas, borrar, fondo y detalle

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `En implementación 2026-10-03 (Claude, develop local-first, sin push)`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Lleva al pipeline de `pnpm ai:inpaint` (TASK-1965) las técnicas de edición que hoy no tiene o hace a mano:
expandir el lienzo a otro formato (outpaint), separar una pieza en capas con Seedream Layerize para obtener máscaras
por elemento y un clean plate, borrar objetos, cambiar el fondo con el sujeto intacto y rehacer una zona a más
resolución. Todas reusan la garantía del núcleo: lo que no se edita queda en delta 0, verificado sobre el archivo.

## Why This Task Exists

- **El outpaint existe fuera del núcleo.** `pnpm foto:expandir` (`scripts/foto/expandir.mjs`) arma su propia máscara y
  su propio «reponer original» para cambiar de formato (las horizontales 1,91:1 de CMP-004). Es la duplicación que
  TASK-1965 dejó como follow-up: cada caso nuevo agrega otra copia de la recomposición, sin la verificación delta 0
  ni la corrección de color del núcleo.
- **Un ad nace multiformato** (regla del operador 2026-10-02 en `efeonce-advertising-creative` →
  `references/paid-format-safe-zones-and-craft.md` §0): 4:5, 9:16, 1:1 y 1,91:1 desde la escena aprobada, sin
  regenerarla. Hoy no hay un modo de expansión verificado por formato.
- **Las máscaras siguen siendo dibujadas.** `ai:mask` tiene rectángulo, polígono, alfa, luminancia y sujeto; en una
  escena con varios objetos no hay forma de pedir «la máscara de la taza». Seedream 5 Pro Layerize ya está en el
  catálogo (`seedream5-pro-layerize`, verificado 2026-09-16 sobre un KV: 8 capas con alfa real y bounding box) y
  devuelve exactamente eso, más una imagen base que es un clean plate.
- **Borrar, cambiar fondo y rehacer detalle** se hacen hoy con prompts ad hoc sobre `ai:image` o a mano, sin máscara
  canónica ni verificación.

## Goal

- `pnpm ai:inpaint expand`: expandir a un formato o lienzo con la foto original en delta 0.
- `pnpm foto:expandir` delega su recomposición en el núcleo sin cambiar su interfaz ni sus salidas aprobadas.
- `pnpm ai:layers`: separar una pieza en capas y usar cada capa como máscara con nombre y la base como clean plate.
- Modos `erase`, `background` y `detail` sobre el mismo pipeline, cada uno con canario real y su presupuesto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §Pipeline de inpainting (contrato del núcleo de TASK-1965)
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` §5.1 (trampas de Sunburst con máscara) y §5.2 (Seedream, Layerize)
- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` §Layerize (contrato y precio por capa)
- `docs/architecture/GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_DECISION_V1.md` (Superseded: no autoriza `src/lib/media/**`)

Reglas obligatorias:

- **Out-of-band**: todo vive en `scripts/ai/inpaint/**` (y el delegador de `scripts/foto/expandir.mjs`). Nunca lo importa
  `src/app/**` ni el runtime de `src/lib/**`.
- **El pipeline recompone y verifica; el adaptador nunca.** Todo modo nuevo termina en `recompose` +
  `verifyRecomposition` sobre el archivo escrito (delta máximo 0 fuera de la zona) y en `manifest.json`.
- **Las capas son contenido regenerado**: Layerize se usa como segmentador y fuente de clean plate, nunca como fuente
  de píxeles para lo que no cambia. La máscara sale del alfa de la capa y se aplica sobre la imagen ORIGINAL.
- **Una `--mask` explícita del operador nunca se altera**; sólo las máscaras derivadas (boceto, capa, sujeto) pueden
  crecer o ajustarse, y el manifiesto lo registra.
- **Estimación antes de gastar y tope con `--yes`**; Layerize cobra por capa y la cantidad la decide el modelo: la
  estimación declara la cota (16 capas) y el costo real se registra.
- Marca: logos y assets de marca nunca se generan ni se borran/reconstruyen con IA; se componen con el arte oficial
  (`docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`). La guarda de marca del núcleo aplica a todos los modos.

## Normative Docs

- `docs/manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md` (v2.x, flujo y señales del pipeline)
- `.claude/skills/efeonce-advertising-creative/references/paid-format-safe-zones-and-craft.md` §0, §0b, §0c (multiformato y `foto:expandir`)
- `.claude/rules/brand-photography.md` («Cambio de formato» con `foto:expandir`)
- `ai-generations/2026-10-02_task-1965-canary/README.md` (hallazgos medidos del núcleo)

## Dependencies & Impact

### Depends on

- `TASK-1965` (núcleo `scripts/ai/inpaint/**`: máscara, recorte, recomposición, verificación, adaptadores, boceto)
- `src/lib/ai/fal-capabilities.ts` (`seedream5-pro-layerize`, `flux-pro-fill`, Seedream edit) y `src/lib/ai/fal.ts`
- `scripts/foto/expandir.mjs` (consumidor a migrar; último cambio `2ff39fe96`, CMP-004)

### Blocks / Impacts

- `TASK-1925` (migración de `scripts/foto` y `scripts/ai` al taller `efeonce-brand-workshop`): el delegador de
  `foto:expandir` pasa a depender del núcleo; recibe Delta.
- `TASK-1495` (Globe, formatos destino multiformato): es producto en otro repo; no se toca ni se comparte código.
- Follow-up de video (VACE + SAM 2) queda en una task aparte.

### Files owned

- `scripts/ai/inpaint/expand.ts`, `scripts/ai/inpaint/layers.ts`, `scripts/ai/inpaint/techniques.ts` [nuevos]
- `scripts/ai/inpaint/pipeline-image.ts`, `scripts/ai/inpaint/cli.ts`, `scripts/ai/inpaint/mask.ts` (extensiones)
- `scripts/ai/inpaint/layers-cli.ts` y script `ai:layers` en `package.json` [nuevos]
- `scripts/foto/expandir.mjs` (sólo la recomposición, delegada; interfaz intacta)
- `docs/manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md`, manual nuevo `docs/manual-de-uso/ai-tooling/expandir-y-separar-en-capas.md` [nuevo]
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`, `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`
- Skills `greenhouse-ai-image-generator`, `efeonce-advertising-creative` (referencia de formatos) y `ai-model-selection` (+ espejos)

## Current Repo State

### Already exists

- Núcleo de TASK-1965 en `scripts/ai/inpaint/`: `mask.ts` (fuentes, operaciones, guardas), `recompose.ts`
  (recomposición, `matchColorInRing`, verificación), `crop.ts`, `alignment.ts` (reencuadre, guía de zona),
  `sketch.ts` (boceto, `growMaskToObject`), `pipeline-image.ts`, `pipeline-video.ts`, adaptadores OpenAI y fal.
- `pnpm foto:expandir` con `--lienzo`, `--ancla`, `--fundido`, `--reponer no` (recomposición propia).
- `seedream5-pro-layerize` en el catálogo: base + hasta 16 capas PNG con alfa, `name`, `z_index`, `bounding_box`;
  `pnpm ai:fal` la descarga como `NN-<nombre>.png` + `layers.json`. Precio USD 0,03375/capa (≤ 1536²) o 0,0675.
- Máscara de sujeto local con IMG.LY (`maskFromSubject`).

### Gap

- No hay modo de expansión en el núcleo ni presets por formato; `foto:expandir` no verifica delta 0.
- No hay máscara por elemento con nombre ni uso del clean plate de Layerize.
- No hay modos `erase`, `background` ni `detail` con contrato, canario y señales propias.
- Layerize no está medido sobre fotografía (sólo sobre un KV plano), ni si la base se cobra como capa.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/inpaint/**` y `scripts/foto/expandir.mjs`, ejecutados con `tsx`/`node` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: el taller `efeonce-brand-workshop` de TASK-1925 o Creative Studio; esta task no lo decide
- Boundary: núcleo puro sin `@/`; adaptadores sobre `src/lib/ai/fal.ts` y `src/lib/ai/openai-image.ts`; consumidores autorizados: CLIs `ai:inpaint`, `ai:layers`, `ai:mask` y `foto:expandir`
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: adaptadores sobre `@/lib/ai/*` y el resolver de secretos, igual que TASK-1965

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — `pnpm ai:inpaint expand` (outpaint multiformato)

- `expand.ts`: lienzo destino por `--to 4:5|9:16|1:1|1.91:1` o `--canvas WxH`, `--anchor`, `--scale` (escena al N % del
  lienzo), relleno inicial del área nueva (espejo de bordes o neutro) y máscara generada: área nueva editable + franja
  de fundido sobre la foto (`--blend px`).
- La foto original queda en delta 0 en su zona (verificación del núcleo); la franja de fundido es la única zona de la
  foto que se toca y queda declarada en el manifiesto.
- Adaptadores con máscara (Flare, Flux Fill) y Sunburst sin máscara con guía de zona, igual que el núcleo.
- Canario real: la base del canario de TASK-1965 a 9:16 y a 1,91:1.

### Slice 2 — `foto:expandir` delega en el núcleo

- `scripts/foto/expandir.mjs` conserva flags y salidas; la máscara, la recomposición y la verificación pasan a
  `expand.ts`. `--reponer no` sigue entregando la salida del modelo sin reponer (y el manifiesto lo marca).
- Regresión: reproducir dos horizontales aprobadas de CMP-004 y comparar contra las publicadas; diferencia sólo donde
  el núcleo mejora (corrección de color) y documentada.
- Coordinación previa con la sesión dueña de CMP-004 (último cambio `2ff39fe96`).

### Slice 3 — `pnpm ai:layers` y máscaras por capa

- `layers.ts` + `layers-cli.ts`: corre `seedream5-pro-layerize` (estimación con cota de 16 capas, `--yes` sobre el tope),
  guarda capas, `layers.json` y el clean plate en la carpeta de la corrida, con caché por hash.
- `ai:mask --from-layer <layers.json> --name <nombre|índice>`: máscara canónica desde el alfa de la capa, ubicada con
  su bounding box sobre el lienzo de la base; soporta varias capas unidas.
- Prompt con `<bbox>` para pedir la separación de una región concreta.
- Canario: la foto de la mesa y un KV plano; registrar capas obtenidas, calidad del clean plate, costo real y si la base
  se cobra.

### Slice 4 — Borrar objetos (`erase`)

- `ai:inpaint erase`: zona = máscara (explícita, de capa o de sujeto) dilatada; dos fuentes de relleno: clean plate de
  Layerize (sin prompt) o un modelo con máscara con prompt de fondo.
- Señal de residuo: el objeto borrado no reaparece (diferencia de la zona contra la base > umbral y comparación con el
  clean plate cuando existe).
- Canario: borrar la taza de la base del canario con las dos fuentes.

### Slice 5 — Cambio de fondo con el sujeto intacto (`background`)

- `ai:inpaint background`: máscara = inverso del sujeto (IMG.LY o capa), con el sujeto protegido en delta 0.
- Medición de costura en bordes finos (pelo, bordes translúcidos): delta en la franja del borde y revisión al 100 %.
- Canario sobre una pieza sin personas reales ni marcas.

### Slice 6 — Pasada de detalle por zona (`detail`)

- `--zone-resolution <long-edge>`: el recorte con contexto se genera a una resolución fijada (p. ej. 2048 px de lado)
  para rehacer una textura, unas manos o un detalle, y vuelve a su tamaño con la recomposición.
- Canario con Flare y Sunburst sobre un detalle de la base.

### Slice 7 — Recomponer elementos desde capas

- Mover, escalar o reordenar una capa sobre el clean plate de forma determinística (sin IA) y una pasada sólo de
  integración (sombra de contacto, reflejo) con máscara de halo automática alrededor del elemento.
- Canario: mover el cuaderno de la base del canario.

### Slice 8 — Documentación y skills

- Manual nuevo de expandir y capas; manual de edición por zona con los modos `erase`, `background` y `detail`.
- Spec del generador, guía de selección (Layerize sobre foto, costos medidos), skills y espejos.

## Out of Scope

- Video: borrar o seguir objetos con `wan-vace-14b/inpainting` y `sam2/video` (task aparte, follow-up de TASK-1965).
- Cualquier ruta API, UI o consumo desde el runtime de Greenhouse (tooling out-of-band; el producto vive en Globe).
- Generar, borrar o reconstruir logos o assets de marca.
- Cambiar los defaults de `ai:image` o el comportamiento aprobado de `foto:*` más allá de la delegación de
  `foto:expandir`.
- Personas reales del equipo en canarios de cambio de fondo (identidad: reglas de `brand-photography.md`).

## Detailed Spec

### Expandir

```
lienzo destino (formato) → foto anclada (escala, ancla) → relleno inicial del área nueva
→ máscara: área nueva = 255, franja de fundido sobre la foto = degradado, resto de la foto = 0
→ adaptador → recomposición del núcleo → verificación (foto fuera de la franja en delta 0)
```

El relleno inicial importa: un pad sólido invita al modelo a inventar un panel; el espejo de bordes da contexto
(receta ya medida en `.claude/rules/brand-photography.md`, «Editar con otro aspect ratio»).

### Capas como segmentador

| Uso | De dónde salen los píxeles |
|---|---|
| Máscara de un elemento | Alfa de la capa → máscara canónica; se edita la ORIGINAL |
| Borrar | Clean plate de Layerize sólo dentro de la máscara del elemento; el resto, la original |
| Mover/escalar | La capa del elemento compuesta sobre el clean plate; luego halo de integración |

Nunca se arma la pieza final juntando capas regeneradas donde no hubo edición.

### Manifiesto

Cada modo agrega su bloque: `expand` (lienzo, ancla, escala, franja), `layers` (capas, costo real, clean plate),
`erase` (fuente de relleno, señal de residuo), `background` (franja de borde), `detail` (resolución de la zona).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 (la delegación necesita el modo `expand` verificado).
- Slice 3 antes de Slice 4 (fuente clean plate) y de Slice 7.
- Slices 5 y 6 son independientes y pueden ir después de Slice 1.
- Slice 8 cierra al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La delegación cambia piezas de CMP-004 ya aprobadas | Producción creativa | medium | Regresión contra horizontales publicadas; interfaz intacta; coordinación con la sesión dueña | Diferencia en la regresión del Slice 2 |
| Layerize cobra más de lo estimado (capas decididas por el modelo, base cobrable sin dato) | Cuentas fal | medium | Estimación con cota de 16 capas, `--yes`, costo real en el manifiesto, `ai:fal --balance` antes y después | Manifiesto `layers.costUsd` |
| Usar píxeles regenerados de capas donde no hubo edición | Calidad de piezas | low | Regla de diseño: la capa sólo aporta máscara o clean plate; verificación delta 0 de la original | Veredicto del núcleo |
| Borrar deja residuo o inventa contenido | Calidad de piezas | medium | Señal de residuo + revisión al 100 % | Aviso del modo `erase` |
| Costura en bordes finos al cambiar fondo | Calidad de piezas | high | Medición de la franja de borde y revisión humana | Aviso del modo `background` |

### Feature flags / cutover

Sin flag: comandos y modos nuevos de terminal, aditivos. `foto:expandir` mantiene su interfaz; si la regresión del
Slice 2 no es limpia, la delegación no se mergea y el comando sigue con su recomposición propia.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1, 3–7 | `git revert` de los commits del slice; las corridas quedan en `ai-generations/` | < 5 min | sí |
| Slice 2 | revert del delegador: `foto:expandir` vuelve a su recomposición propia | < 5 min | sí |
| Slice 8 | revert de docs y skills + espejos | < 5 min | sí |

### Production verification sequence

1. `pnpm local:check` y pruebas focales de `scripts/ai/inpaint` por slice.
2. Dry-run de cada modo sobre la base del canario.
3. Canario real por modo con autorización de gasto del operador (presupuesto estimado: expandir ≈ USD 0,05, capas
   ≈ USD 0,60–1,00, borrar ≈ USD 0,10, fondo ≈ USD 0,05, detalle ≈ USD 0,05, recomposición de elementos ≈ USD 0,05).
4. Regresión de `foto:expandir` contra dos horizontales de CMP-004.
5. Sin deploy: la herramienta no corre en Vercel ni Cloud Run.

### Out-of-band coordination required

- Autorización de gasto del operador por canario.
- Coordinación con la sesión dueña de CMP-004 antes de tocar `scripts/foto/expandir.mjs`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm ai:inpaint expand --to <formato>` entrega el lienzo destino con la foto original en delta 0 fuera de la franja de fundido, verificado en canario real a 9:16 y a 1,91:1.
- [ ] `pnpm foto:expandir` conserva flags y salidas; su recomposición vive en el núcleo y la regresión contra dos horizontales aprobadas de CMP-004 está documentada.
- [ ] `pnpm ai:layers` separa una pieza, guarda capas, `layers.json` y clean plate con caché por hash, y registra el costo real.
- [ ] `pnpm ai:mask --from-layer` produce una máscara canónica desde una capa con nombre, y la edición resultante deja el resto de la ORIGINAL en delta 0.
- [ ] Layerize está medido sobre fotografía y sobre un KV plano: capas obtenidas, calidad del clean plate y si la base se cobra, en la guía de selección.
- [ ] `erase` borra un objeto con clean plate y con modelo con máscara, con señal de residuo y canario real.
- [ ] `background` cambia el fondo con el sujeto en delta 0 y reporta la costura en la franja de borde.
- [ ] `detail` rehace una zona a la resolución pedida y vuelve a su lugar en delta 0 fuera de la zona.
- [ ] Mover una capa sobre el clean plate + halo de integración produce una pieza con el resto en delta 0.
- [ ] Ningún archivo de `src/app/**` ni del runtime de `src/lib/**` importa los módulos nuevos.
- [ ] Manuales, spec, guía y skills (+ espejos) describen los modos nuevos.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai`
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)
- Dry-runs y canarios reales por modo (ver Production verification sequence)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Delta registrado en `TASK-1925` por la dependencia nueva de `foto:expandir`
- [ ] Evidencia de cada canario (manifiestos y hallazgos) en `ai-generations/<fecha>_task-1973-canary/README.md`

## Follow-ups

- Video: borrar y seguir objetos con `fal-ai/wan-vace-14b/inpainting` y `fal-ai/sam2/video` (task aparte).
- Lote de ediciones (`--batch`) con concurrencia acotada y caché.

## Open Questions

- ¿El relleno inicial del área nueva al expandir es espejo de bordes o neutro por defecto? Propuesta: espejo (medido
  menos invento en `brand-photography.md`); se confirma con el canario del Slice 1.
- ¿`erase` prefiere clean plate o modelo con máscara por defecto? Se decide con el canario del Slice 4 (costo vs. calidad).
