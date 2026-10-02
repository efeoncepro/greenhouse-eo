# TASK-1965 — Pipeline de inpainting de imagen y video en los CLIs (`ai:mask` + `ai:inpaint`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
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
- Status real: `Code complete local 2026-10-02 (Slices 1–6 + boceto/referencias + Sunburst sin máscara, commits c215c16d3…9528d5301 en develop, sin push). Pendiente: canario real de Sunburst sin máscara y de boceto (requiere autorización de gasto) y de Seedream edit`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte la edición por zona (inpainting) de los CLIs de medios en un pipeline con garantías: máscara canónica
→ preparación (recorte con contexto) → generación por adaptador de proveedor → **recomposición obligatoria de la
zona protegida** → verificación medida → manifiesto de la corrida. Nacen `pnpm ai:mask` y `pnpm ai:inpaint
image|video`. Hoy esos pasos son snippets que el manual pide pegar a mano, y un error silencioso cuesta dinero o
entrega una pieza con la zona protegida alterada.

## Why This Task Exists

- **El modelo no preserva lo que está fuera de la máscara.** Medido 2026-09-17: GPT Image 2.5 con `--mask` alteró la
  zona protegida hasta **221/255** (media 4,85), y la caja de los ojos del sujeto se movió 147/255
  (`docs/manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md` §5). La garantía tiene que darla el pipeline, no
  el proveedor. Hoy la recomposición es un bloque de código que el operador copia del manual.
- **La máscara se arma a mano** con un `node -e` del manual. Hay una trampa documentada sin guarda en el comando: en
  `sharp`, `blur()`/`linear()` sobre un raw de 1 canal devuelven 3 canales; sin `.toColourspace('b-w')` la máscara sale
  **100 % transparente** sin error, el modelo repinta la escena entera y se paga.
- **La lógica máscara + recomposición ya está duplicada**: `scripts/foto/expandir.mjs` reimplementa su propia máscara
  y su propio reponer-original para el outpaint de CMP-004. Cada caso nuevo agregaría otra copia.
- **Solo un carril acepta máscara** (`ai:image` → OpenAI). `ai:fal` y el carril Higgsfield no registran ningún
  endpoint con máscara; Seedream edit trabaja por instrucción sin máscara.
- **Video no tiene camino**: sólo edición por instrucción (`flux3-edit`, `seedance25-r2v --task editing`, Omni `edit`),
  sin máscara, sin recomposición por frame y sin control de deriva temporal.
- **Recorte con contexto inexistente**: una zona chica en una imagen grande sale borrosa porque se genera a la
  resolución de la imagen completa.

## Goal

- Una máscara canónica, validada antes de gastar, con operaciones y vista previa: `pnpm ai:mask`.
- `pnpm ai:inpaint image` garantiza **delta máximo 0** en la zona protegida o falla, con dry-run, costo estimado,
  caché por hash y manifiesto de la corrida.
- Proveedores intercambiables por adaptador: OpenAI (máscara) y fal (máscara verificada + edición sin máscara con
  recomposición), declarados en el catálogo con su convención de máscara y su deriva medida.
- `pnpm ai:inpaint video` con recomposición por frame sobre máscara fija o con keyframes, control de alineación y QA
  temporal, sobre los motores de edición de video ya registrados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (invariantes AI image + LLM providers; CLI canónico)
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` (§5.1 trampas de `--mask`, §6.8 editar video,
  §7 reglas de gasto)
- `docs/architecture/GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_DECISION_V1.md` (**Superseded**: no autoriza
  `src/lib/media/**` ni `content.media` en este repo)
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md` (el runtime productivo de medios vive en
  Globe/Creative Studio, no aquí)

Reglas obligatorias:

- **Out-of-band**: el pipeline es herramienta de terminal. **NUNCA** lo importa `src/app/**` ni un módulo runtime de
  `src/lib/**`; el camino de imagen del producto sigue siendo `src/lib/ai/image-generator.ts`.
- **NUNCA** crear `src/lib/media/**`: el ADR que lo proponía quedó reemplazado por Creative Studio.
- **NUNCA** un cliente/SDK paralelo: los adaptadores reusan `editOpenAIImage` (`src/lib/ai/openai-image.ts`) y
  `runFalModel`/`uploadFalFile`/`awaitFalRequest` (`src/lib/ai/fal.ts`); secretos por el resolver canónico.
- **NUNCA** gastar sin estimación previa; un endpoint nuevo entra al catálogo sólo con esquema verificado y
  `verifiedAt` real (regla vigente de `fal-capabilities.ts`).
- **NUNCA** aceptar como criterio una diferencia promedio de píxeles: el criterio es el delta **máximo**.
- Marca: un logo o asset de marca no se genera ni se arregla con inpaint; se compone el SVG oficial después
  (`docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`).

## Normative Docs

- `docs/manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md` (flujo manual vigente y mediciones que esta task
  convierte en comando)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/ai/openai-image.ts` (`editOpenAIImage`, estimación de tokens de salida, validación de tamaño)
- `src/lib/ai/fal.ts`, `src/lib/ai/fal-capabilities.ts`, `src/lib/ai/fal-input-rules.ts`, `src/lib/ai/fal-pricing.ts`
- `scripts/ai/remove-bg.ts` (fuente de máscara por sujeto)
- `scripts/ai/resolve-output-dir.ts` y la convención `ai-generations/<fecha>_<slug>/`
- `scripts/media/archive-ai-generation.mjs` (archivo de binarios de la corrida)
- `ffmpeg`/`ffprobe` en el PATH local (Homebrew) para el slice de video

### Blocks / Impacts

- `TASK-1925` (migración de producción de marca a `efeonce-brand-workshop`): el cierre de imports sellados que calcula
  desde `scripts/ai` crece con `scripts/ai/inpaint/**`; recibe Delta.
- `TASK-1497` / `TASK-1572` (Globe): **no se tocan**. Son la edición regional gobernada del producto Globe en su propio
  repo; esta task es tooling de terminal de Greenhouse. No hay código compartido.
- `scripts/foto/expandir.mjs`: consumidor candidato del núcleo de recomposición (follow-up, no en esta task).

### Files owned

- `scripts/ai/inpaint/**` (núcleo + adaptadores + CLIs + pruebas)
- `scripts/ai/generate-image.ts` (solo el aviso de `--mask` → `ai:inpaint`)
- `src/lib/ai/fal-capabilities.ts` (campos de máscara y filas nuevas verificadas)
- `package.json` (scripts `ai:mask`, `ai:inpaint`)
- `docs/manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md`
- `docs/manual-de-uso/ai-tooling/editar-una-zona-de-un-video.md` (nuevo)
- `docs/documentation/ai-tooling/generador-visual-assets.md`
- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`, `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- Skills: `greenhouse-ai-image-generator`, `motion-design-studio`, `ai-model-selection` (+ espejos)

## Current Repo State

### Already exists

- `pnpm ai:image --image --mask` (`scripts/ai/generate-image.ts`): valida formato y dimensiones de la máscara e
  imprime costo estimado; sólo modelos OpenAI.
- `editOpenAIImage` en `src/lib/ai/openai-image.ts:788` con soporte `mask` y verificación de mime/dimensiones.
- Catálogo fal con contrato por endpoint (`FalOperation`, slots de referencia, límites de video, pricing, validación
  previa al gasto) en `src/lib/ai/fal-capabilities.ts`; endpoints de edición sin máscara: `seedream5-pro-edit`,
  `seedream5-lite-edit`; video: `flux3-edit`, `seedance25-r2v` (`--task editing`).
- Carril Higgsfield (`src/lib/ai/higgsfield-capabilities.ts`, 43 esquemas) sin endpoints con máscara.
- `scripts/foto/expandir.mjs`: outpaint con máscara propia y reposición del original (implementación ad hoc).
- `pnpm ai:image:rmbg` (`scripts/ai/remove-bg.ts`) con relleno de huecos y `--key-background`.
- `sharp` 0.34.5; `ffmpeg`/`ffprobe` instalados en el equipo del operador.

### Gap

- No hay comando para construir, operar ni validar máscaras; la trampa de 1 canal no tiene guarda.
- La recomposición y la verificación de delta máximo son manuales.
- No hay recorte con contexto, dry-run de inpaint, caché por hash ni manifiesto de corrida de edición.
- El catálogo no declara convención de máscara ni deriva fuera de zona por endpoint.
- No existe inpainting de video ni QA temporal.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/ai/inpaint/**` ejecutado con `tsx` desde `package.json` (equipo del operador; no entra al build de Next ni a ningún worker)
- Future candidate home: `undecided`
- Future candidate home note: taller `efeonce-brand-workshop` de TASK-1925 o Creative Studio; esta task no lo decide
- Boundary: núcleo puro (máscara, recorte, recomposición, verificación, manifiesto) sin I/O de red; adaptadores delgados sobre `src/lib/ai/openai-image.ts` y `src/lib/ai/fal.ts`; consumidores autorizados: sólo los CLIs `ai:mask`/`ai:inpaint` y, como follow-up, `scripts/foto/*`
- Server/browser split: `n/a` (Node CLI; nunca en bundle de cliente ni runtime de producto)
- Build impact: `none` (scripts fuera del grafo de Next; `ffmpeg` como binario externo del equipo, detectado al arranque)
- Extraction blocker: los adaptadores dependen de `@/lib/ai/*` y del resolver de secretos, igual que `ai:image`; el núcleo queda sin dependencias de `@/` para poder moverse solo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Máscara canónica y `pnpm ai:mask`

- `scripts/ai/inpaint/mask.ts`: tipo canónico (1 canal, 8 bits, 255 = editable, dimensiones explícitas).
- Fuentes: rectángulo por fracciones, polígono normalizado, alfa de un PNG, luminancia con umbral, sujeto vía el
  núcleo de `remove-bg`.
- Operaciones: dilatar, erosionar, difuminar (feather), invertir, unir, intersectar.
- Guardas: rechaza 0 % y 100 % editable salvo flag explícito, imprime % editable y caja envolvente, y rechaza
  máscaras con un número de canales inesperado (regresión de la trampa de 1 canal).
- Conversión a convenciones de proveedor: `alpha-transparent-editable` (OpenAI) y `white-editable` (fal y otros).
- Vista previa: PNG con la zona editable superpuesta sobre la base.
- CLI `pnpm ai:mask` con `--base`, fuentes, operaciones, `--out`, `--preview`, `--inspect <mask>`.
- Pruebas unitarias con imágenes sintéticas.

### Slice 2 — Recomposición, verificación y recorte con contexto

- `recompose.ts`: aplica la salida del modelo sólo donde la máscara abre, con el degradado de la máscara, sobre la
  base original; normaliza canales (`removeAlpha` en ambos lados) antes de comparar.
- `verify.ts`: delta máximo y medio en zona protegida, en zona editada y en la franja de costura; el veredicto exige
  **delta máximo 0** en la zona protegida.
- `crop.ts`: caja envolvente + margen de contexto, escalado a la grilla del proveedor y regreso al tamaño original
  (ida y vuelta probada).
- Pruebas: recomposición en delta 0, desalineación 3 vs 4 canales, costura y ida y vuelta del recorte.

### Slice 3 — `pnpm ai:inpaint image` con adaptador OpenAI

- Contrato de adaptador (`adapters/types.ts`): capacidades (`supportsMask`, `maskConvention`, tamaños, calidades),
  `estimate()` y `run()`.
- Adaptador OpenAI sobre `editOpenAIImage`.
- Pipeline: máscara → recorte automático cuando la zona ocupa menos de un umbral → generación → recomposición →
  verificación → manifiesto.
- `--dry-run` (máscara, recorte, payload sin secretos, costo, sin llamar al proveedor), `--count N` con hoja de
  contacto, `--force` para saltar la caché.
- Caché por hash de base + máscara + prompt + modelo + parámetros: una corrida repetida no vuelve a pagar.
- Carpeta de corrida bajo `ai-generations/` con `manifest.json` (hashes, parámetros, costo estimado y real,
  veredicto), compatible con `media:archive-ai-generation`.
- Guarda de marca: si el prompt nombra logo, isotipo o marca, avisa y remite a componer el SVG oficial
  (`--allow-brand` para continuar).
- `ai:image --mask` sigue funcionando e imprime un aviso que apunta a `ai:inpaint image`.

### Slice 4 — Adaptadores fal: con máscara verificada y edición sin máscara

- Extender el tipo de capacidad fal con `mask` (campo, convención) y `driftOutsideMask` medido.
- Verificar en el OpenAPI de fal al menos un endpoint de imagen que acepte máscara antes de registrarlo; si ninguno
  pasa la verificación, el slice registra solo el carril sin máscara y deja la fila con máscara como follow-up
  documentado.
- Adaptador para `seedream5-pro-edit`/`seedream5-lite-edit` (sin máscara): la máscara se usa sólo para recomponer,
  nunca se envía.
- Pruebas con fetch simulado; canario real opcional a calidad mínima, con autorización de gasto del operador.

### Slice 5 — `pnpm ai:inpaint video`

- Máscara de video: fija (cámara quieta) o por keyframes interpolados (rectángulo/polígono por tiempo).
- Estrategia `edit-recompose`: motor de edición registrado (`flux3-edit`, `seedance25-r2v --task editing`) +
  recomposición por frame sobre la secuencia PNG decodificada del original.
- Estrategia `first-frame`: el frame elegido se edita con el pipeline de imagen y entra como referencia del motor
  de edición cuando su contrato admite imágenes.
- Normalización de la salida del motor a la resolución, fps y duración del original. Aborta si la duración difiere
  en más de un frame o si la deriva de encuadre en la zona protegida supera el umbral (recomponer daría ghosting).
- QA temporal: delta máximo 0 en la zona protegida sobre la secuencia PNG antes del encode; parpadeo dentro de la
  zona (varianza del delta entre frames consecutivos); hoja de frames.
- Encode final de alta calidad y copia del audio original.
- Estimación de costo y confirmación con la misma política de `ai:fal`.

### Slice 6 — Documentación y skills

- Reescribir el manual de edición por zona de imagen para usar los comandos y crear el manual de video.
- Guía de selección (§5.1, §6.8, nueva receta) y spec del generador visual: el pipeline, su contrato y sus trampas.
- Documentación funcional del generador visual.
- Skills `greenhouse-ai-image-generator`, `motion-design-studio`, `ai-model-selection` + espejos `.codex`.

## Out of Scope

- Seguimiento de objeto con SAM 2 y motores de video con máscara (follow-up tras verificar endpoints y esquema).
- Gemini Omni (`ai:omni`) como motor de `ai:inpaint video`: exige URIs GCS y su contrato propio; follow-up.
- Migrar `scripts/foto/expandir.mjs` al núcleo de recomposición (follow-up; es pipeline de marca activo).
- Cualquier ruta API, command gobernado, UI o consumo desde el runtime de Greenhouse: es tooling out-of-band; si un
  producto lo necesita, vive en Globe/Creative Studio (TASK-1497/1572).
- Outpaint como comando nuevo (`foto:expandir` ya lo cubre).
- Cambiar defaults o comportamiento de `ai:image` más allá del aviso de `--mask`.

## Detailed Spec

### Convenciones de máscara

| Convención | Quién | Editable | Protegido |
|---|---|---|---|
| Canónica (interna) | núcleo | 255 en 1 canal | 0 |
| `alpha-transparent-editable` | OpenAI `editOpenAIImage` | alfa 0 | alfa 255 |
| `white-editable` | fal y otros con `mask_url` | blanco | negro |

La conversión vive sólo en el adaptador. El núcleo nunca recibe ni emite otra convención.

### Contrato del adaptador

```ts
interface InpaintAdapter {
  id: string
  kind: 'image' | 'video'
  capabilities: { supportsMask: boolean; maskConvention: MaskConvention | null; sizes: SizeRule; maxInputs: number }
  estimate(req: InpaintRequest): Promise<CostEstimate> // nunca llama al proveedor para generar
  run(req: InpaintRequest): Promise<InpaintCandidate[]> // salida cruda; el pipeline recompone
}
```

El pipeline, y no el adaptador, recompone y verifica. Así ningún proveedor nuevo puede saltarse la garantía.

### Veredicto de verificación (imagen)

`PASS` si el delta máximo en la zona protegida es 0 tras recomponer. `FAIL` en otro caso, con el reporte: delta
máximo, delta medio, caja del peor píxel y ruta del diff. El CLI sale con código distinto de 0 en `FAIL`.

### Manifiesto de corrida

`ai-generations/<fecha>_<slug>/inpaint/<runId>/manifest.json` con: `runId`, hash de base y máscara, adaptador,
modelo, parámetros, prompt, caja de recorte, costo estimado y real, candidatos y veredicto por candidato. Nunca
secretos ni URLs firmadas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. Slice 5 requiere Slice 2 (recomposición) y Slice 3 (pipeline de imagen para
  `first-frame`). Slice 6 cierra después de 5.
- Ningún adaptador (Slices 3–5) se mergea sin la verificación del Slice 2 cableada en el pipeline.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gasto no previsto por una máscara 100 % editable o un loop de candidatos | Cuentas OpenAI/fal | medium | Guardas de cobertura, `--dry-run`, estimación previa, caché por hash | Línea `$ costo` y `manifest.json`; no hay signal de runtime (tooling) |
| La recomposición oculta un resultado malo (costura visible) | Calidad de piezas | medium | Reporte de costura + hoja de contacto; revisión humana obligatoria antes de entregar | Veredicto en el manifiesto |
| Ghosting en video por desalineación del motor | Calidad de video | high | Abort por deriva de encuadre en zona protegida antes de recomponer | Mensaje de abort con la medición |
| Romper el uso actual de `ai:image --mask` | Operadores/skills | low | Solo se agrega un aviso; pruebas existentes de `generate-image` verdes | Tests de `scripts/ai` |
| Crecer el cierre de imports de TASK-1925 | Migración al taller | low | Núcleo sin imports `@/`; Delta en TASK-1925 | Revisión al ejecutar TASK-1925 |

### Feature flags / cutover

Sin flag: comandos nuevos y aditivos de terminal, sin runtime de producto. `ai:image` no cambia de comportamiento.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–3 | `git revert` de los commits del slice; sin estado persistido fuera de `ai-generations/` | < 5 min | sí |
| Slice 4 | revert + quitar las filas nuevas del catálogo fal | < 5 min | sí |
| Slice 5 | revert; las corridas quedan como archivos locales | < 5 min | sí |
| Slice 6 | revert de docs y skills + espejos | < 5 min | sí |

### Production verification sequence

1. `pnpm local:check` y pruebas focales de `scripts/ai/inpaint` verdes.
2. Corrida `--dry-run` de imagen sobre una base real del repo: máscara, recorte y costo correctos sin gasto.
3. Canario de imagen real a calidad mínima con autorización de gasto: veredicto `PASS` (delta máximo 0).
4. Canario de video real corto (≤ 5 s, 720p) con autorización de gasto: PNG en delta 0 y reporte de parpadeo.
5. Sin deploy: la herramienta no corre en Vercel ni en Cloud Run.

### Out-of-band coordination required

Autorización explícita del operador para el gasto de los canarios reales (imagen y video). Nada más: repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `pnpm ai:mask` construye máscaras desde rectángulo, polígono, alfa, luminancia y sujeto, y aplica dilatar, erosionar, difuminar, invertir, unir e intersectar. — `mask.test.ts` (fuentes y operaciones); sujeto corrido en vivo sobre la base del canario (taza y cuaderno detectados, IMG.LY local, gratis). Intersectar existe en el núcleo; el CLI une fuentes y aplica el resto.
- [x] `pnpm ai:mask` rechaza una máscara 0 % o 100 % editable sin flag explícito, y una prueba reproduce la trampa de 1 canal de `sharp` y la ve rechazada. — `mask.test.ts` «trampa de canales»; además se encontró y cubrió la trampa del lado de la escritura (PNG de 3 canales desde 1).
- [x] La conversión a `alpha-transparent-editable` y a `white-editable` tiene pruebas de ida y vuelta. — `mask.test.ts` «convenciones de proveedor».
- [x] `pnpm ai:inpaint image` sale con código distinto de 0 si el delta máximo en zona protegida no es 0 tras recomponer, con prueba sintética que lo demuestra. — `recompose.test.ts` (un byte basta para FAIL) + `exitCodeFor` (2 con algún FAIL); el CLI propaga el código.
- [x] `--dry-run` produce máscara, recorte, payload sin secretos y costo sin llamar al proveedor (prueba con fetch simulado que verifica cero llamadas). — `pipeline-image.test.ts` (adaptador simulado, 0 llamadas) y dry-run real sobre 4500×4500 y sobre el canario.
- [x] Una segunda corrida idéntica no llama al proveedor (caché por hash) salvo con `--force`. — `pipeline-image.test.ts` y `pipeline-video.test.ts`; el hash incluye `adapter.revision`.
- [x] Cada corrida escribe `manifest.json` con los campos de la Detailed Spec y sin secretos. — prueba «no guarda secretos» + manifiestos reales en `ai-generations/2026-10-02_task-1965-canary/`.
- [x] El catálogo fal declara convención de máscara por endpoint, y ninguna fila con máscara existe sin `verifiedAt` real. — `flux-pro-fill` con `mask` y `verifiedAt: 2026-10-02` tras canario real (planta puesta, delta 0).
- [ ] La edición sin máscara de Seedream pasa por el mismo pipeline y queda en delta 0 en la zona protegida. — **sin canario real de Seedream**: el camino sin máscara está probado con adaptador simulado y en vivo con OpenAI; falta una corrida de `fal:seedream5-*-edit`.
- [x] `pnpm ai:inpaint video` aborta ante deriva de encuadre o diferencia de duración, y en el camino feliz la secuencia PNG queda en delta 0 en la zona protegida y conserva el audio original. — `pipeline-video.test.ts` con ffmpeg real (abort por encuadre corrido, ±1 cuadro, audio copiado) + canario `flux3-edit` 5 s: 120 cuadros PASS, deriva 11,16/255.
- [x] `ai:image --mask` conserva su comportamiento e imprime el aviso hacia `ai:inpaint image`. — `scripts/ai/generate-image.ts`, sólo se agregó el aviso.
- [x] Ningún archivo de `src/app/**` ni del runtime de `src/lib/**` importa `scripts/ai/inpaint/**`, y no existe `src/lib/media/`. — `grep -rl scripts/ai/inpaint src` vacío; `src/lib/media` no existe (2026-10-02).
- [x] Manuales de imagen y video, documentación funcional, guía de selección, spec del generador y las tres skills (+ espejos) describen los comandos. — commits `510053612` y `9528d5301`; `pnpm skills:mirrors` y `pnpm models:inventory` verdes.

## Verification

- `pnpm local:check`
- `pnpm vitest run scripts/ai`
- `pnpm test` y `pnpm build` (gate de cierre), solo con autorización si el build se vuelve pesado en el equipo
- Dry-run real de imagen y video; canarios reales con autorización de gasto (ver Production verification sequence)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Delta registrado en `TASK-1925` con el crecimiento de `scripts/ai`
- [ ] Evidencia de los canarios (manifiestos y veredictos) referenciada en la task

## Follow-ups

- Seguimiento de objeto (SAM 2) y motor de video con máscara, tras verificar endpoints y esquema.
- `ai:omni` como motor de `ai:inpaint video`.
- `scripts/foto/expandir.mjs` sobre el núcleo de recomposición.
- Endpoint de imagen con máscara en fal si el Slice 4 no encuentra uno verificable.

## Delta 2026-10-02

- Alcance agregado durante la ejecución, por hallazgos medidos y pedido del operador: Sunburst con máscara devuelve un panel negro plano (3 de 3), así que `--provider-mask auto` lo hace editar sin máscara, con `--color-match` en anillo (método de `foto:isotipo --acabado`) y detector `suspectFlatPanel`; modo `--sketch` / `--reference` (equivalente por API del Markup de ChatGPT), respaldado por la documentación oficial de OpenAI leída el 2026-10-02 (la máscara es guía; para zonas idénticas, componer sobre el original).
- Follow-ups confirmados con esquema OpenAPI: `fal-ai/wan-vace-14b/inpainting` (video con `mask_video_url`) y `fal-ai/sam2/video` (seguimiento) existen; no se conectaron.

## Open Questions

- Umbral de cobertura para activar el recorte automático: queda en 25 % (los canarios 1536×1024 cayeron en imagen
  completa con 45–55 %, y un recorte sobre 4500² se activó con 8 %). Resuelta.
- Umbral de deriva que aborta la recomposición de video: queda en 12/255. El canario `flux3-edit` midió 11,16 con
  cámara quieta: el margen es estrecho y se revisa con más clips. Resuelta con reserva.
