# TASK-1940 — Kit de referencia del traje biónico de Nexa

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Status real: `Slice 1 en aprobación: hoja de diseño publicada en canvas (2026-10-01)`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

El traje biónico de Nexa (placas blancas mate sobre malla navy, costuras de luz azul y lentes envolventes
transparentes) existe sólo como texto dentro de fichas de foto, así que cada imagen lo redibuja distinto y el modelo
llegó a inventarle un cohete en el pecho. Esta task lo convierte en un kit de referencia como el del uniforme —vistas
aisladas, vistas puestas en Nexa, detalle de la placa pectoral con el isotipo **incrustado**, las gafas como objeto
aparte, manifiesto y LEEME— y lo registra en el catálogo de `foto:prompt` para que ninguna ficha vuelva a describirlo a
mano. Decisión del operador del 2026-09-29.

## Why This Task Exists

El traje se aprobó dentro de una foto (`NX5b`, lámina «¿Listos para la carrera? Vamos.» del deck), no como objeto. Sin
kit, la descripción viaja copiada entre fichas (`NX3`, `NX4`, `NX5`, los pilotos de Marketing con Manzanitas) y el modelo
reconstruye el diseño en cada corrida: placas en otros lugares, costuras en otro color y, en `NX3`, un cohete en la placa
pectoral que no es marca de Efeonce. Es el mismo problema que el kit de prenda resolvió para el polo, el hoodie y las
chaquetas: **lo sensible se compone y el modelo sólo pone material y luz**, y la referencia correcta tiene que existir
para poder elegirla ([selección de referencias](../../operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md)).

## Goal

- Un diseño único del traje, fijado en un kit versionado fuera de git (con huella en el lock), del que salen todas las
  fotos de Nexa en registro cine.
- El isotipo de la placa pectoral como pieza **incrustada navy al ras**, compuesta siempre con el SVG oficial y nunca
  dibujada por el modelo.
- `foto:prompt` resuelve el traje por catálogo (`objetos: [{ objeto: 'traje-bionico-nexa' }]`), con su regla de uso: sólo
  Nexa y sólo registro cine.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/operations/brand-photography/README.md` (índice del canon fotográfico)
- `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md` (§2 alcance: Nexa protagonista; traje de ficción permitido)
- `docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md` (arte plano → producir vistas; pieza en uso → usar en escena)
- `docs/operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md` (código de vestuario por registro)
- `docs/architecture/nexa-intelligence/voice/nexa-identity-canon.md` (identidad de Nexa)

Reglas obligatorias:

- El isotipo **no se genera**: se compone con `pnpm foto:isotipo <plate> --centro x,y --ancho w --prenda clara` (variante
  positiva sobre placa blanca), después de mirar el pecho al 100 % con `pnpm foto:emblema`. Técnica declarada en el
  manifiesto: **incrustado** (decisión del operador del 2026-09-29).
- Identidad de Nexa **A** (la canónica, `ai-generations/_identidad-nexa/`); nunca la B del turnaround con blazer.
- El traje es sólo de Nexa y sólo del registro cine. Nunca en documental ni en personas del equipo.
- Las vistas puestas se producen **editando** desde el plate aprobado, no generando desde cero (editar conserva, generar
  reconstruye). Con otro aspect ratio el sujeto cambia de escala: padear espejando y recortar (regla del pipeline).
- Tras agregar el kit al catálogo, resellar `scripts/foto/assets.lock.json` con `pnpm foto:assets:lock`.

## Normative Docs

- `.claude/rules/brand-photography.md` (se carga sola al tocar `scripts/foto/**`)
- `.claude/skills/greenhouse-ai-image-generator/references/garment-reference-kit.md` (geometría del emblema, vistas, cuerpo entero)
- `ai-generations/2026-09-17_polo-efeonce/LEEME.md` y `final/efeonce-polo-manifiesto.json` (forma de un kit)
- `ai-generations/_identidad-nexa/LEEME.md`

## Dependencies & Impact

### Depends on

- `ai-generations/2026-09-26_deck-nexa/plates/NX5b-nexa-bionica-isotipo.png` (diseño aprobado) y su ficha
  `ai-generations/2026-09-26_deck-nexa/fichas/NX5-nexa-bionica-lentes-cintura.json`
- `scripts/foto/isotipo.mjs` (`--prenda clara`) y `scripts/foto/build-prompt.mjs` (catálogo de objetos)
- `ai-generations/_identidad-nexa/` (anclas y ángulos de Nexa A)

### Blocks / Impacts

- `TASK-1941` (Sparks): las costuras y el azul del traje fijan el acento que comparten los agentes; se recomienda cerrar
  esta primero.
- `TASK-1926` (registro cine en el pipeline): sus fichas cine con Nexa pasan a declarar el traje por catálogo.
- `TASK-1931` (banco de plates): las fotos nuevas de Nexa en traje entran con procedencia del kit.
- `TASK-1925` (repo taller): el kit y su entrada de catálogo migran con el resto de `foto:*`.

### Files owned

- `ai-generations/<fecha>_traje-bionico-nexa/` (kit: `final/`, `LEEME.md`, manifiesto, fichas y prompts; binarios fuera de git)
- `scripts/foto/build-prompt.mjs` (sólo la entrada `traje-bionico-nexa` y su registro por escena)
- `scripts/foto/assets.lock.json` (resellado)
- `docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md` (delta)
- `docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md` (fila del kit nuevo)

## Current Repo State

### Already exists

- Diseño aprobado dentro de la foto `NX5b` (traje navy, placas blancas en hombros, pecho y antebrazos, costuras
  #0375DB, lentes envolventes transparentes con línea azul superior, isotipo compuesto sobre la placa).
- Kits de prenda del uniforme con el patrón a copiar: `ai-generations/2026-09-17_polo-efeonce/` (21 vistas, manifiesto,
  `usoPorVista`, `macroEmblema`), hoodie, softshell, bomber y gorra.
- Catálogo `foto:prompt` con `tipo: 'prenda'`, `PRENDAS_CON_EMBLEMA` y registros por escena (`scripts/foto/build-prompt.mjs`).
- `pnpm foto:isotipo` con variante positiva para prenda clara, y `pnpm foto:emblema`.

### Gap

- El traje no existe como objeto: ni vistas aisladas, ni vistas puestas, ni macro de la placa, ni manifiesto.
- El catálogo no lo conoce; las fichas lo describen a mano y el modelo lo redibuja (cohete inventado en `NX3`).
- Nada impide hoy pedirlo en una persona del equipo o fuera del registro cine.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `greenhouse-eo/scripts/foto` y `ai-generations/` (kit fuera de git, huella en el lock)
- Future candidate home: `undecided`
- Boundary: kit de referencia de marca + entrada del catálogo de `foto:prompt`; consumers = operador y agentes que componen fotos de Nexa
- Server/browser split: `n/a` — CLI local en Node
- Build impact: `none` — no entra al bundle de Next ni a los workers
- Extraction blocker: `none` más allá de los de TASK-1925 (migración de `foto:*` al taller `efeonce-brand-workshop`)

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

### Slice 1 — Hoja de diseño y aprobación

- Una lámina del traje desde `NX5b`: frente, espalda, tres cuartos y detalle de la placa pectoral, en fondo de estudio,
  editando desde el plate aprobado. Isotipo incrustado compuesto con `foto:isotipo --prenda clara`.
- Publicarla en el canvas «La órbita» (página propia o Deck) con título «NUEVA · …» y pedir la aprobación del operador
  antes de producir el resto.

### Slice 2 — Vistas del kit

- Vistas aisladas (fondo de estudio y transparente, 1600×1600): `01-frente`, `02-espalda`, `03-tres-cuartos-izquierda`,
  `04-tres-cuartos-derecha`, `05-lateral`, `10-detalle-placa-isotipo` (macro).
- Vistas puestas en Nexa A (fondo de estudio, 1200×1600): `13-puesto-frente`, `14-puesto-espalda`.
- Gafas como objeto aparte: `20-gafas-frente` y `21-gafas-tres-cuartos`.
- Cada vista mirada al 100 %: isotipo incrustado igual al SVG oficial, costuras en #0375DB, placas en el mismo lugar.

### Slice 3 — Manifiesto, LEEME y catálogo

- `LEEME.md` y manifiesto con `cuando_usarla` por vista, técnica de marca (`incrustado`) y regla de uso (sólo Nexa,
  sólo cine).
- Entrada `traje-bionico-nexa` en `scripts/foto/build-prompt.mjs` (`tipo: 'prenda'`, `usoPorPersona.nexa`,
  `macroEmblema`, `tipoEmblema: 'isotipo'`), registrada como prenda con emblema y restringida al registro cine; abortar
  con mensaje claro si la ficha la pide para otra persona o fuera del cine.
- Resellar `scripts/foto/assets.lock.json` y pruebas del catálogo en verde.

### Slice 4 — Canon y skills

- Delta en `EFEONCE_PHOTO_REGISTER_CINE_V1.md` (el traje por catálogo, nunca descrito en la escena), fila en
  `EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`, nota en `_identidad-nexa/LEEME.md` y en las skills que describen el
  traje (`design-studio`, `greenhouse-ai-image-generator`), con espejos `.codex`.

## Out of Scope

- Los agentes Sparks (TASK-1941).
- Regenerar las fotos ya aprobadas (`NX5b` y derivadas) con el kit: sólo las nuevas lo usan.
- Traje para personas del equipo o para otro registro.
- El comando `foto:cine` y la idempotencia del pipeline (TASK-1926).
- Publicar el kit en AXIS (`axis-brand-assets`): follow-up si el operador lo pide.

## Detailed Spec

- Formato y nombres copian el kit del polo: `efeonce-traje-bionico-nexa-<VV>-<vista>-<WxH>-v01-<fondo>.png`.
- La placa pectoral: isotipo navy encastrado al ras, sin borde ni relieve, ancho medido contra `NX5b`; el manifiesto
  guarda `centro`, `ancho` y `brillo` usados con `foto:isotipo` para cada vista que lo muestre.
- La guarda del catálogo reutiliza el mecanismo de registros por escena existente (no una lista escrita a mano) y su
  mensaje explica la regla.
- Costo estimado: ~12 ediciones en `high` más la hoja de diseño, del orden de USD 1 a 2. El CLI imprime `usage` por
  corrida: registrar el costo real en el LEEME.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (aprobación del diseño) antes del 2. El 3 depende del 2. El 4 al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El modelo reinventa el isotipo o agrega marcas en la placa | Tooling / marca | high | isotipo siempre compuesto; `foto:emblema` al 100 % en cada vista | emblema distinto al SVG en la revisión |
| Deriva del diseño entre vistas (placas o costuras cambian) | Tooling / marca | medium | editar desde `NX5b` y desde la vista frente aprobada, nunca generar de cero | comparación lado a lado en la hoja del kit |
| La guarda rompe fichas cine vigentes | Tooling | low | la guarda sólo actúa si la ficha pide el traje | prueba de regresión de `build-prompt` |
| Choque con TASK-1926/1918 en `build-prompt.mjs` | Tooling | medium | cambio acotado a una entrada del catálogo; avisar a las sesiones activas | conflicto de merge |

### Feature flags / cutover

- Sin flag: repo-only change, tooling local aditivo; las fichas que no piden el traje no cambian.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–4 | `git revert` del commit del slice; el kit fuera de git se conserva | minutos | sí |

### Production verification sequence

1. Hoja de diseño aprobada por el operador en el canvas.
2. Pruebas de `scripts/foto` en verde y `pnpm foto:assets:check` sin faltantes.
3. Una ficha cine con Nexa y `objetos: [{ objeto: 'traje-bionico-nexa' }]` compila con `foto:prompt`, y una ficha que lo
   pide para otra persona aborta con el mensaje de la regla.

### Out-of-band coordination required

- Aprobación del operador de la hoja de diseño (Slice 1). Copia del kit en OneDrive `5. Contenidos/13- Branding/`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La hoja de diseño del traje quedó aprobada por el operador en el canvas.
- [ ] El kit tiene las 10 vistas del Slice 2, cada una con el isotipo incrustado igual al SVG oficial, revisado al 100 %.
- [ ] El manifiesto declara técnica `incrustado`, `cuando_usarla` por vista y la regla «sólo Nexa, sólo cine».
- [ ] `foto:prompt` resuelve `traje-bionico-nexa` por catálogo y aborta si se pide para otra persona o fuera del cine.
- [ ] `scripts/foto/assets.lock.json` quedó resellado y `pnpm foto:assets:check` pasa.
- [ ] El registro cine, la selección de referencias y las skills citan el kit (con espejos `.codex`).

## Verification

- `pnpm local:check`
- Pruebas de `scripts/foto` (`build-prompt.test.ts`, `isotipo.test.ts`)
- `pnpm foto:assets:check`
- Revisión visual al 100 % de cada vista

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] TASK-1926 y TASK-1925 quedaron con delta: el traje se declara por catálogo y migra con `foto:*`

## Follow-ups

- Publicar el kit en `axis-brand-assets` si el operador lo pide.
- Revisar si `NX5b` y sus derivadas se regeneran con el kit (decisión del operador).
