# TASK-1925 — Migrar la producción de marca al taller `efeonce-brand-workshop`

## Delta 2026-10-02

- `scripts/foto/` sumó en TASK-1940: catálogo del traje y los lentes, `validarTrajeNexa`, claves `acabadoMarca`/`macroEnUso`/`instruccionEnUso` y `foto:isotipo --marca logotipo --tecnica`. Migran con el resto de `foto:*`, junto al kit `ai-generations/2026-10-01_traje-bionico-nexa/` (sellado y publicado en el canon) — cerrado por trabajo en TASK-1940.

## Delta 2026-10-01

- el catálogo de `foto:*` suma los Sparks (`spark`, `spark-*`, `sparks-plantel`) y la guarda `validarRobots`, y sus kits viven en `ai-generations/2026-10-01_sparks/`: migran con `scripts/foto` — cerrado por trabajo en TASK-1941.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->


## Delta 2026-09-29 — el creative-workbench consume `foto` desde su fuente canónica

- Nació `efeoncepro/creative-workbench`, el repo del equipo creativo, gobernado desde Greenhouse
  ([ADR](../../architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md)). `pnpm creative:sync` le exporta **copias
  selladas** de los CLIs `foto:*` y `ai:*`: su cierre de imports se calcula desde `scripts/foto`, `scripts/ai` y
  `src/lib/ai` de `greenhouse-eo`. No es un segundo pipeline, pero sí un consumidor.
- **Impacto en esta task:** al migrar `foto` al taller, actualiza `scripts/creative-workbench/export-manifest.json`
  para que el workbench tome `foto` desde el taller (o desde el paquete que salga de ahí) y no desde el delegador. Si
  no, el workbench seguiría recibiendo la copia retirada.
- **Bucket:** `efeonce-creative-canon` (proyecto `efeonce-creative-workbench`) está pensado para las referencias
  aprobadas del catálogo de foto (`assets.lock.json`). Úsalo como bucket de referencias del taller en vez de crear
  otro con el mismo contenido.

## Delta 2026-09-27 (tarde) — primeras herramientas ya viven en el taller

- **Ya en el taller** (`main` = `ed89a0b`, empujado), fuera del alcance de esta task pero relevante para ella:
  - `tools/glitch-motion` (sólo Glitch, TASK-1924): motion, sonido (B) y música aprobados; 12 pruebas en verde.
  - `tools/brand-sound` (workspace, `exports ./dsp`): primitivas de síntesis **migradas byte a byte** (`2d411b8`) desde
    `greenhouse-eo` `ai-generations/2026-09-26_branding-sonoro`, que queda como **histórico** (ya no es la fuente). Los
    30 WAV de la versión B salen idénticos antes y después de la migración.
- **Dependencia de red nueva y acotada:** `glitch-motion` baja los másteres de la música del bucket público por URL con
  sha256 fijado (caché `.cache/`, ignorada por git; falla cerrado). Registrada en el
  [Delta del ADR del taller](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md#delta-2026-09-27--glitch-motion-y-brand-sound-en-el-taller).
- **No cambia el alcance de esta task:** siguen pendientes el CI mínimo, el bucket de binarios, `foto` y
  `brand-motion`. Si el motor de la identidad sonora de Efeonce (`orbit-sound.mjs` de `brand-motion`) migra, debe usar
  `tools/brand-sound` (una sola lógica). El Lifecycle no cambia.

## Delta 2026-09-27

- TASK-1926 agrega al pipeline `foto:*` el registro cine y `pnpm foto:cine` (con sus módulos); se migran con el resto en esta task.

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
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
- Status real: `Diseno. Fuera del alcance de esta task ya viven en el taller tools/glitch-motion (TASK-1924) y tools/brand-sound (migrado byte a byte desde ai-generations/2026-09-26_branding-sonoro, 2d411b8); CI, bucket, foto y brand-motion siguen sin migrar`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-brand-workshop main; sin worktrees`

## Summary

Mueve la producción de marca que se fue acumulando en `greenhouse-eo` —el pipeline de fotografía
(`scripts/foto`, 16 comandos `foto:*`), el motion de «La órbita» (`scripts/creative/brand-motion`) y las corridas
nuevas— al repo taller `efeoncepro/efeonce-brand-workshop`, sin cambiar cómo trabaja el operador: sigue operando
desde `greenhouse-eo`, con las mismas skills y los mismos comandos, que pasan a delegar al taller.

## Why This Task Exists

El operador lo dijo el 2026-09-27: «Greenhouse se llena de piezas y demás que no son su scope». La producción
de marca es de Globe a largo plazo, pero Globe está hibernado y el operador no quiere reactivarlo mientras amplía
su modelo de negocio; OneDrive sin git desalinea a los agentes. La decisión
[`EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md`](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md)
creó el repo taller (esqueleto `430d5b0`). Falta mover lo que ya existe sin romper el pipeline: 46 archivos de
skills, reglas y docs citan `scripts/foto` o `pnpm foto:*`, y la regla auto-load
`.claude/rules/brand-photography.md` se dispara por rutas de este repo.

## Goal

- `tools/foto` y `tools/brand-motion` viven en el taller, con sus pruebas verdes allí.
- Los comandos `foto:*` y `creative:orbit:*` de Greenhouse siguen funcionando para el operador, como delegadores.
- Las corridas nuevas nacen en `corridas/` del taller, con binarios en GCS por sha256 y nada binario en git.
- Ninguna capacidad queda duplicada: una sola lógica por herramienta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md` (decisión gobernante)
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md` (el motor se queda en Greenhouse hasta EPIC-027)
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (generación de imagen, secretos)
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- Nunca un binario ni una ruta absoluta versionados en el taller; nunca docs gobernantes ni skills allí.
- Nunca dos implementaciones vivas de la misma herramienta: la copia de Greenhouse se retira o queda como delegador.
- El taller no despliega nada; su CI corre sólo en `pull_request`.
- El adaptador de generación del taller es propio y delgado, con los secretos de Secret Manager; no llama a
  `pnpm ai:image` de Greenhouse ni copia `src/lib/ai/` entero.

## Normative Docs

- `docs/operations/brand-photography/README.md` y `docs/operations/brand-photography/EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`
- `.claude/rules/brand-photography.md`
- `CLAUDE.md` §«Cross-repo action safety» (verificar relevancia y CI del repo destino antes de cada commit en el taller)

## Dependencies & Impact

### Depends on

- Repo `efeoncepro/efeonce-brand-workshop` creado (`430d5b0`) — hecho el 2026-09-27.
- Acceso de lectura a los secretos de generación de imagen desde la máquina del operador (ADC) [verificar el nombre exacto del secreto en `src/lib/ai/image-generator.ts`].

### Blocks / Impacts

- `TASK-1918` (foto:prompt y chequeos de la lente): modifica `scripts/foto/build-prompt.mjs`. Si se ejecuta después
  de esta, sus archivos viven en `tools/foto` del taller. Coordinar el orden; no migrar mientras 1918 esté `in-progress`.
- `TASK-1924` (motion de Glitch): nace en `tools/glitch-motion` del taller; convive con `tools/brand-motion`.
- `TASK-1920` (complete) y `TASK-1921` (to-do): `foto:isotipo` y la ruta productiva de piezas de marca citan rutas que cambian.
- 46 archivos de skills, reglas y docs que citan `scripts/foto` o `pnpm foto:*` (medido con grep el 2026-09-27).

### Files owned

- `scripts/foto/**` (hasta su retiro)
- `scripts/creative/brand-motion/**` (hasta su retiro)
- `package.json` (entradas `foto:*` y del motion de la órbita)
- `.claude/rules/brand-photography.md`
- `efeonce-brand-workshop/tools/foto/**`, `efeonce-brand-workshop/tools/brand-motion/**`, `efeonce-brand-workshop/.github/workflows/ci.yml`

## Current Repo State

### Already exists

- `efeoncepro/efeonce-brand-workshop`: `README.md`, `CLAUDE.md`/`AGENTS.md` (routers), `.gitignore` de binarios,
  `pnpm-workspace.yaml` con `tools/*`, `tools/README.md`, `corridas/README.md`.
- `scripts/foto/`: `build-prompt.mjs`, `generar.mjs`, `isotipo.mjs`, `emblema.mjs`, `componer.mjs`, `componer-cta*.mjs`,
  `lanyard*.mjs`, `bloques/`, `assets-lock.mjs` + `assets.lock.json`, pruebas (`*.test.mjs`, `*.test.ts`).
  Dependencias: `sharp`, `@efeoncepro/axis-tokens`, `@efeoncepro/axis-ui-contracts`, `zod`, `fontkit`,
  `@imgly/background-removal-node`, `dotenv`; un import de `@/lib/secrets/secret-manager`; `generar.mjs` llama a
  `pnpm ai:image`.
- `scripts/creative/brand-motion/`: `encode-orbit-motion.mjs`, `orbit-scene.js`, `orbit-sound.mjs`, `render-orbit-motion.mjs`.
- `ai-generations/` (~156 carpetas, 13 GB locales; imágenes gitignoreadas, fichas y prompts versionados).
- En el taller (2026-09-27): `tools/glitch-motion` (TASK-1924) y `tools/brand-sound` (primitivas de síntesis,
  migradas byte a byte desde `ai-generations/2026-09-26_branding-sonoro`, que queda como histórico).

### Gap

- El taller no tiene CI ni bucket de binarios (sí código: `tools/glitch-motion` y `tools/brand-sound`).
- `foto:generar` depende del generador de Greenhouse.
- La regla auto-load y las skills apuntan a rutas de Greenhouse.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `greenhouse-eo/scripts/foto`, `greenhouse-eo/scripts/creative/brand-motion`, `greenhouse-eo/ai-generations`
- Future candidate home: `undecided`
- Boundary: herramientas CLI locales en el repo taller `efeonce-brand-workshop`, que converge con Globe como paquete cuando Globe reactive su generación; consumers = el operador y los agentes desde sesiones en `greenhouse-eo` vía delegadores `pnpm foto:*`
- Server/browser split: `n/a` — sólo CLI local en Node
- Build impact: saca de Greenhouse `@imgly/background-removal-node`, `fontkit` y las dependencias del motion, sólo si ningún código de `src/` las usa (lo comprueba el Slice 4)
- Extraction blocker: el import de `@/lib/secrets/secret-manager` y la llamada a `pnpm ai:image` en `generar.mjs`

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

### Slice 1 — Fundación del taller

- CI mínimo en el taller (`.github/workflows/ci.yml`, sólo `pull_request`): lint + gate que rechaza binarios y rutas absolutas en archivos versionados.
- Bucket privado de binarios por sha256 (o prefijo en uno existente) [verificar con el operador] y formato de `corridas/<id>/manifiesto.json`.
- Adaptador delgado de generación de imagen con secretos de Secret Manager, con la misma interfaz de entrada que usa `generar.mjs`.

### Slice 2 — Migrar `foto`

- Copiar `scripts/foto` a `tools/foto` con su `package.json`, dependencias y pruebas; reemplazar el import de `@/lib/secrets/secret-manager` y la llamada a `pnpm ai:image` por el adaptador del Slice 1.
- Pruebas verdes en el taller (`build-prompt.test.ts`, `componer-cta.pruebas.mjs`, `componer-cta.regresion.mjs`, `cta-*.test.mjs`, `isotipo.test.ts`, `assets-lock`).
- Los 16 `foto:*` de Greenhouse pasan a delegar al taller, resolviendo rutas relativas contra el directorio de trabajo del operador.

### Slice 3 — Migrar `brand-motion`

- `scripts/creative/brand-motion` → `tools/brand-motion`; delegadores en Greenhouse; una sola lógica.

### Slice 4 — Retiro y documentación

- Borrar `scripts/foto/**` y `scripts/creative/brand-motion/**` de Greenhouse (quedan sólo los delegadores).
- Actualizar `.claude/rules/brand-photography.md` (y sus `paths`), las skills que citan esas rutas, el canon y los manuales; las corridas nuevas se documentan en `corridas/` del taller.
- Registrar el taller en `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` con estado «migrado».

## Out of Scope

- El motor del Artifact Composer y sus catálogos (se quedan en Greenhouse hasta EPIC-027).
- `tools/glitch-motion` (TASK-1924).
- Mover el histórico de `ai-generations/` (queda en Greenhouse como histórico).
- Reactivar Globe o crear capabilities en Globe.
- Recetas nuevas en AXIS (van en su propia task).

## Detailed Spec

Delegador de ejemplo en `package.json` de Greenhouse (el agente decide la forma final, pero debe resolver rutas):
un script `scripts/workshop/run.mjs <herramienta> <comando> [args]` que convierte cada argumento que exista como
ruta relativa al `cwd` del operador en ruta absoluta **en tiempo de ejecución** (nunca versionada) y ejecuta
`pnpm -C ../efeonce-brand-workshop --filter <herramienta> <comando>`. Si el taller no está clonado junto a
`greenhouse-eo`, falla con un mensaje en español que dice cómo clonarlo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. El Slice 4 (retiro) sólo después de que los delegadores de 2 y 3 hayan
  producido al menos una pieza real de punta a punta desde una sesión en Greenhouse.
- No iniciar el Slice 2 mientras `TASK-1918` esté `in-progress`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un delegador resuelve mal una ruta y el comando escribe en el repo equivocado | Tooling | medium | resolución de rutas en runtime + prueba de punta a punta antes del Slice 4 | el archivo de salida no aparece donde el operador lo pidió |
| Las skills siguen citando `scripts/foto` y un agente reconstruye el oficio | Tooling / agentes | medium | Slice 4 actualiza los 46 archivos medidos; grep de cierre en cero | grep de `scripts/foto` fuera de delegadores > 0 |
| Un binario entra a git en el taller | Taller | low | `.gitignore` + gate de CI | CI del taller en rojo |
| El adaptador de generación diverge del generador de Greenhouse (modelo, tamaños) | Generación | medium | misma interfaz y los mismos parámetros por defecto; comparar una ficha real en ambos | tamaños o costo por imagen distintos en el log |

### Feature flags / cutover

- Sin flag: el corte es por herramienta y reversible volviendo el script de `package.json` a la ruta local mientras
  `scripts/foto` exista (hasta el Slice 4).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir el commit del taller | minutos | sí |
| Slice 2 | apuntar `foto:*` de vuelta a `scripts/foto` (sigue existiendo) | minutos | sí |
| Slice 3 | igual que el Slice 2, para el motion | minutos | sí |
| Slice 4 | restaurar `scripts/foto` y `brand-motion` desde git (`git revert`) | minutos | sí |

### Production verification sequence

1. Generar y componer una pieza real desde una sesión en `greenhouse-eo` usando sólo los delegadores.
2. `pnpm foto:doctor` en verde contra el taller.
3. Pruebas del taller en verde en su CI.
4. Grep de cierre: ninguna referencia viva a `scripts/foto` o `scripts/creative/brand-motion` salvo los delegadores y el histórico.

### Out-of-band coordination required

- Confirmar con el operador el bucket de binarios y que la sesión de Glitch (TASK-1924) no esté escribiendo en
  `tools/` del taller al mismo tiempo que otra herramienta se migra.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El taller tiene CI en `pull_request` que rechaza binarios y rutas absolutas versionadas.
- [ ] `tools/foto` y `tools/brand-motion` corren sus pruebas en verde en el taller.
- [ ] `foto:generar` del taller no importa nada de `greenhouse-eo` ni llama a `pnpm ai:image`.
- [ ] Los 16 `foto:*` de Greenhouse delegan al taller y una pieza real se produjo de punta a punta con ellos.
- [ ] `scripts/foto/**` y `scripts/creative/brand-motion/**` ya no existen en Greenhouse (sólo delegadores).
- [ ] Grep de cierre: cero referencias vivas a `scripts/foto` fuera de delegadores e histórico.
- [ ] `.claude/rules/brand-photography.md` y las skills citan el taller como ubicación.
- [ ] El taller figura en `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`.

## Verification

- `pnpm local:check` en Greenhouse
- CI del taller en verde
- Pieza real de punta a punta desde una sesión en Greenhouse

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] la decisión `EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md` §6 quedó con el estado real

## Follow-ups

- Receta de publicidad (9:16 y 4:5) del registro cine en AXIS, si el operador aprueba las pruebas.
- Convergencia del taller con Globe cuando Globe reactive su capacidad de generación.

## Open Questions

- ¿Bucket nuevo para los binarios del taller o prefijo en uno existente?
- ¿El histórico de `ai-generations/` se archiva algún día fuera de Greenhouse?
