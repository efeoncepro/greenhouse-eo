# TASK-1977 — Relight que conserva el objeto exacto: `pnpm ai:inpaint relight` (transferencia de luz y relight físico)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-03

- El follow-up «relight de video» quedó como `TASK-1984` (EPIC-051), bloqueada por esta task: extiende el núcleo de luz a secuencias con coherencia temporal y compara contra un relight de video dedicado. No duplicar acá.

## Status

- Lifecycle: `to-do`
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
- Status real: `Sin empezar. Prueba de concepto del nivel 1 hecha el 2026-10-03 (script en la carpeta del canario): forma del objeto exacta y luz transferida, con dos defectos conocidos (altas luces que saturan y la silueta de IC-Light que no calza)`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir en el carril CLI una técnica de **relight que nunca regenera el objeto**: el modelo propone la luz y el
pipeline la aplica, calculada, sobre los píxeles ORIGINALES. Dos niveles: **(1) transferencia de luz** desde la salida
de un modelo generativo (IC-Light, Sunburst u otro) y **(2) relight físico** a partir de la geometría estimada del
objeto (normales y albedo) y de una luz declarada o medida en la escena. Forma, color, logo y texto quedan exactos; lo
que no se toca queda en delta 0, como en el resto de `pnpm ai:inpaint`.

## Why This Task Exists

- El canario del 2026-10-03 (`ai-generations/2026-10-03_task-1973-canary/README.md`, quinta tanda) midió que **ningún
  relight conectado conserva el objeto**: `fal:iclight-v2` dio la luz más convincente pero deformó la taza e inventó una
  ventana; `fal:image-apps-relighting` le cambió el color (blanca → lila); Sunburst por instrucción la conservó pero el
  relight es sutil.
- El estudio de mercado (guía §10.3) no encontró una API que garantice el objeto exacto: Beeble SwitchLight (PBR) vive
  en su app, Magnific regenera aunque «preserve detalles», Photoroom sólo corrige exposición.
- La prueba de concepto del nivel 1 (mismo día, gratis sobre la salida ya pagada de IC-Light) conservó la forma real de
  la taza y le pasó la luz y el rebote cálido, con delta 0 fuera de la taza + 60 px. Le faltan dos correcciones.
- Es un problema de visión y de cálculo de luz: **no requiere entrenar un LLM** ni modelos propios; los modelos de
  geometría existen preentrenados.

## Goal

- `pnpm ai:inpaint relight --mode transfer`: luz y tono de un modelo aplicados sobre el objeto original, con la silueta
  del modelo alineada y las altas luces comprimidas, sin bandas ni quemados.
- `pnpm ai:inpaint relight --mode physical`: relight calculado sobre normales y albedo estimados, con luz declarada
  (dirección, color, intensidad, ambiente) o medida en la escena.
- Ambos con la garantía del pipeline (zona protegida en delta 0 verificada), manifiesto, costo antes de gastar y código
  de salida por modo de falla.
- Canario real que compare los dos niveles contra Sunburst por instrucción sobre el compuesto de `place`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- Pipeline de inpainting (`docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §Pipeline de inpainting):
  recomposición sobre la original y verificación del archivo escrito.
- Lo sensible se compone y el modelo sólo pone material y luz (`.claude/rules/brand-photography.md`; contrato de
  selección de referencias de marca): el objeto nunca sale del modelo.
- ADR-024: se construye en CLI con forma de producto y núcleo sin `@/`; la luz calculada es núcleo graduable, los
  adaptadores de proveedor no. Debe respetar el manifiesto y el gate de TASK-1976 si ya existe.
- Canon cine: un plate del registro cine se regenera, no se relumina; esta técnica es para compuestos y correcciones
  locales, no para salvar un plate.
- Herramienta out-of-band: nunca importada por `src/app/**` ni por el runtime de `src/lib/**`.

## Normative Docs

- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§Pipeline de inpainting)
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§10.3 Reiluminar)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLI_FIRST_GRADUATION_DECISION_V1.md` (ADR-024)
- `docs/operations/brand-photography/EFEONCE_PHOTO_COLORIMETRY_V1.md` (temperatura, sombras neutras)
- `ai-generations/2026-10-03_task-1973-canary/README.md` (quinta tanda: relight)

## Dependencies & Impact

### Depends on

- TASK-1973 (técnicas, `place`, adaptadores `fal:iclight-v2` y `fal:image-apps-relighting`).
- Preferible después de TASK-1976 (frontera del núcleo), no bloqueante.

### Blocks / Impacts

- `place --finish element` puede pasar a usar esta técnica para su relight.
- Pendiente de relight de video (follow-up): la misma luz calculada por cuadro.

### Files owned

- `scripts/ai/inpaint/relight.ts` [nuevo] (núcleo: ganancia de luz, tono, compresión de altas luces, sombreado)
- `scripts/ai/inpaint/relight-run.ts` [nuevo] (orquestación y CLI)
- `scripts/ai/inpaint/adapters/` (adaptador de geometría para el nivel 2) [verificar endpoint en Discovery]
- `scripts/ai/inpaint/cli.ts` (subcomando `relight`)
- `src/lib/ai/fal-capabilities.ts` (capacidad de normales/albedo, si es de fal)
- Docs: spec §Pipeline de inpainting, guía §10.3, manual `docs/manual-de-uso/ai-tooling/expandir-y-separar-en-capas.md`

## Current Repo State

### Already exists

- `place --finish element` (relight por instrucción en zona objeto + halo), `fal:iclight-v2` y
  `fal:image-apps-relighting` conectados y verificados el 2026-10-03.
- Primitivas del núcleo reutilizables: `cutElement`/`pasteElement`/`integrationHalo` (`move.ts`), `maskFromLayers`
  (`layers.ts`), `estimateAlignment` (`alignment.ts`), `matchColorInRing` y `measureZones` (`recompose.ts`).
- Prueba de concepto del nivel 1 (`ai-generations/2026-10-03_task-1973-canary/relight/light-transfer-poc.ts.txt`; se corre copiándolo a `scripts/ai/inpaint/` como `.ts`): ganancia de
  luminancia suavizada (3 pasadas de caja, σ 6 y 14) y tono por canal (σ × 2,5) dentro de la silueta, aplicados sobre los
  píxeles originales y sobre la sombra de contacto de Sunburst. Salidas: `ai-generations/2026-10-03_task-1973-canary/relight/light-transfer-s6.png` y `light-transfer-s14.png`.

### Gap

- No hay subcomando `relight` ni núcleo de luz.
- Defectos medidos del nivel 1: (a) **altas luces que saturan**: un blanco no puede aclararse y la ganancia se recorta;
  (b) **silueta desalineada**: IC-Light dibuja el objeto con otra forma y su luz se cuela como una banda.
- No hay modelo de geometría (normales/albedo) conectado ni verificado.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/inpaint/**`, ejecutado con `tsx` en el equipo del operador
- Future candidate home: `undecided`
- Future candidate home note: núcleo de luz candidato a `@efeoncepro/axis-creative-core` (repo de AXIS) (ADR-024 §D5); el adaptador de geometría se queda en Greenhouse
- Boundary: núcleo de luz puro (buffers, máscaras, números, `sharp`); orquestación y adaptadores fuera; consumidores autorizados: CLI `ai:inpaint relight` y `place --finish element`
- Server/browser split: `n/a` (Node CLI; nunca en bundle ni runtime de producto)
- Build impact: `none` (fuera del grafo de Next)
- Extraction blocker: el adaptador de geometría sobre `@/lib/ai/*`, igual que los demás adaptadores

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Núcleo de transferencia de luz

- `relight.ts`: ganancia de luminancia con desenfoque normalizado por la máscara, tono por canal con desenfoque mayor,
  límites de ganancia y tono, y **compresión de altas luces** (curva suave en vez de recorte) para que un blanco tome luz
  sin quemarse.
- Pruebas sin disco: objeto gris + luz sintética conocida → ganancia recuperada; blanco con ganancia > 1 → sin píxeles
  saturados; fuera de la máscara, delta 0.

### Slice 2 — Alineación de la silueta del modelo

- Recortar el objeto en la salida del modelo (máscara de sujeto local o capa) y alinearlo con la silueta original
  (`estimateAlignment` o registro afín por contorno) antes de medir su luz; donde no calcen, interpolar la luz desde el
  interior. Detector: si la alineación falla sobre un umbral, código 3.

### Slice 3 — `pnpm ai:inpaint relight --mode transfer`

- CLI sobre una imagen + máscara del objeto (o `--layers`/`--layer`), `--light-from` (adaptador que propone la luz:
  `fal:iclight-v2` por defecto, o un PNG ya generado para no volver a pagar), `--prompt`, `--halo auto|off` (sombra de
  contacto con Sunburst por instrucción). Manifiesto, costo antes de gastar, verificación delta 0.
- Canario real sobre el compuesto de `place` del canario de TASK-1973 (reutiliza la salida de IC-Light ya pagada: USD 0).

### Slice 4 — Nivel 2: geometría estimada y relight físico

- Discovery: elegir y leer el contrato de un estimador de normales/albedo disponible por API (fal o Replicate), con
  precio oficial. Conectar como adaptador.
- Núcleo: sombreado Lambert con luz direccional + ambiente (color medido en la escena o declarado), sobre el albedo
  aproximado (original / su sombreado estimado); `--light "dir=left,elev=30,color=5200K,intensity=0.8,ambient=auto"`.
- Canario real comparando nivel 1, nivel 2 y Sunburst sobre el mismo compuesto (presupuesto a autorizar).

### Slice 5 — Documentación y decisión de default

- Spec, guía §10.3 (con lo medido), manual y skills (`greenhouse-ai-image-generator` + espejo, `ai-model-selection`).
- Decidir con evidencia si `place --finish element` pasa a usar `relight`.

## Out of Scope

- Relight de video (follow-up: la misma luz por cuadro, con ID-V2V o la geometría por cuadro).
- Reiluminar plates del registro cine (el canon los regenera).
- Entrenar o ajustar modelos (LoRA, fine-tune); un estilo de luz propio queda como follow-up opcional.
- Conectar Magnific (sin créditos al 2026-10-03) o Beeble.
- Globe y la extracción del paquete (ADR-024, TASK-1976).

## Detailed Spec

- **Principio:** el objeto nunca sale del modelo. El modelo (o el cálculo físico) aporta un **campo de luz**: ganancia
  por píxel suavizada + tono; el resultado es `original × ganancia × tono`, con compresión de altas luces. El detalle
  fino (textura, logo, texto) es el original por construcción.
- **Suavizado:** desenfoque normalizado por la máscara (`blur(L·M)/blur(M)`), para no mezclar el fondo en el borde.
  La prueba de concepto usó 3 pasadas de caja separables (σ 6 y 14): `sharp` sobre buffers crudos de 1 canal y 16 bits
  leyó mal los datos (asume 8 bits en la entrada cruda) y dejó la taza gris oscuro; se evita o se declara `depth`.
- **Nivel 2:** normales `n` y luz `l`: sombreado `s = max(0, n·l)·c_luz·k + ambiente`; albedo `a ≈ original / s_original`
  (estimado); salida `a × s_nueva`. Sombra de contacto y rebote: halo de Sunburst o cálculo simple sobre la superficie.
- **Códigos de salida:** 0 PASS · 2 FAIL (algo fuera de la zona cambió) · 3 REVISAR (alineación fallida, ganancia
  fuera de rango en una fracción grande del objeto, o altas luces que igual saturan).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. Slices 1–3 primero (nivel 1, gratis sobre lo ya pagado).
2. Slice 4 sólo con autorización de gasto del operador para su canario.
3. Slice 5 al final.

### Risk matrix

| Riesgo | Sistema | Prob. | Mitigación | Señal |
|---|---|---|---|---|
| La luz transferida se ve plana o falsa | Calidad | media | canario con revisión al 100 % contra Sunburst; nivel 2 si el 1 no alcanza | veredicto del operador |
| Silueta del modelo no alinea | Nivel 1 | alta | alineación + interpolación desde el interior; código 3 | umbral de alineación |
| El estimador de geometría no da calidad producción | Nivel 2 | media | canario antes de integrarlo como default | revisión al 100 % |
| Se usa para «salvar» un plate cine | Canon | baja | documentado en manual y skills | revisión del operador |

### Feature flags / cutover

N/A — herramienta out-of-band sin runtime de producción ni flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–5 | `git revert` del commit del slice | minutos | sí |

### Production verification sequence

N/A — no hay runtime de producción. Verificación: pruebas del núcleo, dry-runs y los canarios de los Slices 3 y 4.

### Out-of-band coordination required

- Autorización de gasto del operador para el canario del Slice 4 (y del Slice 3 si se pide una luz nueva).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm ai:inpaint relight --mode transfer` deja el objeto con sus píxeles originales (forma, color, texto) y la luz del modelo, con delta 0 fuera de la zona verificado.
- [ ] Un objeto blanco toma luz sin píxeles saturados en el objeto (medido en el canario).
- [ ] La silueta del modelo se alinea antes de medir la luz; si no alinea, sale con código 3.
- [ ] `--mode physical` produce un relight calculado desde normales/albedo con luz declarada, verificado en canario real.
- [ ] El canario compara nivel 1, nivel 2 y Sunburst por instrucción sobre el compuesto de `place`, con veredicto al 100 % y costos.
- [ ] El núcleo de luz no importa `@/`, disco ni red (respeta el gate de TASK-1976 si existe).
- [ ] Spec, guía §10.3, manual y skills (+ espejos) describen la técnica y lo medido.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai/inpaint`
- Dry-runs y canarios de los Slices 3 y 4
- `pnpm test` y `pnpm build` (gate de cierre; el build con autorización del operador si el equipo está cargado)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Evidencia del canario en `ai-generations/<fecha>_task-1977-canary/README.md`

## Follow-ups

- Relight de video con la misma luz calculada por cuadro (o ID-V2V Relight propagando un cuadro).
- Estilo de luz propio de Efeonce (LoRA sobre IC-Light) si el operador lo pide.
- Comparar con Magnific Relight cuando haya créditos y con Beeble SwitchX.

## Open Questions

- ¿El nivel 1 alcanza calidad producción una vez corregido, o el nivel 2 es necesario siempre? Se decide con el canario
  del Slice 4 (comparación al 100 %).
