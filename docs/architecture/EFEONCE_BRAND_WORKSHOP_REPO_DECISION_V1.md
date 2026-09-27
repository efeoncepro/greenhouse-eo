# Efeonce Brand Workshop — repo taller de producción de marca (ADR)

> **Tipo:** decisión de arquitectura (ADR)
> **Versión:** 1.0
> **Estado:** **Accepted** (2026-09-27) — decisión del operador (Julio Reyes)
> **Creado:** 2026-09-27 por Claude
> **Repo:** [`efeoncepro/efeonce-brand-workshop`](https://github.com/efeoncepro/efeonce-brand-workshop) (privado, rama `main`, esqueleto `430d5b0`)
> **Relacionados:** [Artifact Composer (ADR)](GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md) ·
> [Marketing Studio — fuente única e ingesta](marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md) ·
> [Glitch — línea gráfica](GLITCH_GRAPHIC_LINE_DECISION_V1.md) · [Globe / Creative Studio](creative-studio/) ·
> [ecosistema de repos](../operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md) ·
> Migración: [`TASK-1925`](../tasks/to-do/TASK-1925-brand-workshop-migration.md)

## 1. Contexto

La producción de marca de Efeonce —fotografía (`pnpm foto:*`), composición de piezas, motion de «La órbita»
y ahora el motion semanal de Glitch— se fue quedando en `greenhouse-eo` por comodidad: `scripts/foto/`,
`scripts/creative/brand-motion/`, las corridas de `ai-generations/` (13 GB locales, ~156 carpetas) y, el
2026-09-27, catálogos de piezas de marca dentro del Artifact Composer. El operador lo detectó: «Greenhouse se
llena de piezas y demás que no son su scope».

El reparto correcto ya estaba escrito en otras decisiones:

| Qué | Dueño de largo plazo |
|---|---|
| La regla (recetas, valores y contratos por superficie y formato) | **AXIS** |
| La generación (el pixel: foto, fichas, isotipo compuesto, video) | **Globe (Creative Studio)** — «produce y gobierna piezas generadas» |
| La composición determinista | El **motor** del Artifact Composer, que se extrae como paquete (EPIC-027) |
| La pieza terminada (campaña, versiones, copy, anuncio, aprobación, derechos) | **Marketing Studio** |

Pero Globe no está disponible como destino: el operador todavía amplía su modelo de negocio y **no quiere
reactivar la suite** (Globe está hibernado desde `a330316`). Se evaluaron dos lugares transitorios y se
rechazaron:

- **Globe como taller** (`efeonce-globe/tooling/…`): su CI corre con cada `push`, sus gates de rutas absolutas
  y de bytes nulos barren `git ls-files` (todo el repo), y según ADR-010 Globe es un **producto comercial**:
  un taller adentro lo vuelve alcance de hecho mientras su modelo sigue abierto. Mismo veredicto que dio la
  sesión «Integrar Glitch en línea gráfica», revisado entre sesiones.
- **OneDrive como taller único**: sin git, los agentes se desalinean (dicho por el operador).

## 2. Decisión

Se crea **`efeoncepro/efeonce-brand-workshop`**, un repo privado que es **un taller, no un producto**:

1. **Alcance:** herramientas de producción de marca (`tools/*`: `foto`, `brand-motion`, `glitch-motion`),
   corridas con sus fichas, prompts y manifiestos (`corridas/`) y recetas en prueba.
2. **Sin despliegue ni runtime.** Nada de Vercel, Cloud Run ni crons. El CI, cuando entre código, corre sólo
   en `pull_request`: lint y un gate de binarios y rutas absolutas. Si algo necesita correr como servicio, no
   es del taller: es de Globe o de Greenhouse.
3. **Binarios fuera de git.** Imágenes, video, audio, PDF y 3D van a GCS por sha256; la entrega al equipo va por
   OneDrive. Cada corrida lleva un `manifiesto.json` que los lista. Git guarda sólo texto.
4. **Generación con un adaptador propio y delgado**, con los mismos secretos de Secret Manager. El taller no
   llama al CLI de Greenhouse (`pnpm ai:image`) ni copia su cliente de IA completo: ese adaptador es la semilla
   que Globe absorbe al converger.
5. **Documentación gobernante en `greenhouse-eo`**, igual que Globe y Marketing Studio: este ADR, el canon
   fotográfico (`docs/operations/brand-photography/`), la línea gráfica y las tasks. El repo sólo lleva código,
   un `README.md` y `CLAUDE.md`/`AGENTS.md` como routers.
6. **Se opera desde `greenhouse-eo`.** El operador trabaja desde sesiones en este repo y usa sus skills. Por eso:
   - el taller vive como hermano en `/Users/jreye/Documents/efeonce-brand-workshop` y se invoca con
     `pnpm -C ../efeonce-brand-workshop <comando>`;
   - las skills (`design-studio`, `efeonce-advertising-creative`, `efeonce-graphic-line`,
     `motion-design-studio`, `axis-design-system`) se quedan en `greenhouse-eo/.claude/skills/` y **nunca se
     copian** al taller;
   - las reglas auto-load por ruta (`.claude/rules/brand-photography.md`, con `paths` en `scripts/foto/**` y
     `ai-generations/**`) no se disparan con archivos de otro repo. Mientras dure la migración, los comandos
     `foto:*` de Greenhouse quedan como **delegadores** hacia el taller, y las skills declaran el taller como
     ubicación. Así el punto de entrada y la carga del canon no cambian para el operador.
7. **Convergencia con Globe.** Cuando Globe reactive su capacidad de generación, el taller converge con Globe
   como paquete, con su historia. Hasta entonces, el taller no agrega nada que Globe tendría que desarmar.

## 3. Qué entra y qué no

| Entra al taller | No entra |
|---|---|
| `tools/foto` (desde `scripts/foto`), `tools/brand-motion` (desde `scripts/creative/brand-motion`), `tools/glitch-motion` (nace aquí, TASK-1924) | Binarios, documentación gobernante, código de producto, skills |
| Corridas nuevas (fichas, prompts, logs, manifiestos) | Propuestas y brochure comercial: son dominio de Greenhouse (aggregate `Proposal`) |
| Recetas de piezas en prueba (por ejemplo, la publicidad del registro cine en 9:16 y 4:5) | Recetas aprobadas: su regla va a AXIS y la pieza terminada a Marketing Studio |

**El motor del Artifact Composer se queda en Greenhouse** hasta que EPIC-027 lo extraiga. Los catálogos de piezas
de marca que no son del dominio comercial (`graphic-line-stills`, y las recetas de web, DOOH y motion) no crecen
más ahí: una receta nueva de ese tipo nace en AXIS; su composición se resuelve en el taller o en el motor
extraído. **No se agrega un catálogo de publicidad en Greenhouse.**

> **Delta 2026-09-27 — extender `foto:*` antes de la migración está permitido** (decisión del operador). Mientras
> TASK-1925 no migre el pipeline, una capacidad nueva de fotografía se construye **extendiendo los comandos `foto:*`
> en Greenhouse** (caso: TASK-1926, registro cine y `foto:cine`) y se muda con el resto. Construirla en el taller
> partiría el pipeline en dos. Lo que no cambia: nada de catálogos de publicidad en el Artifact Composer ni
> compositores nuevos.

## 4. Reglas duras

- **NUNCA** un binario en el repo del taller; **NUNCA** una ruta absoluta de una máquina en un archivo versionado.
- **NUNCA** documentación gobernante en el taller: va a `greenhouse-eo`.
- **NUNCA** despliegue, servicio ni cron en el taller.
- **NUNCA** copiar skills al taller; se operan desde `greenhouse-eo`.
- **NUNCA** dos pipelines de la misma capacidad: al migrar una herramienta, la copia de Greenhouse se retira (o
  queda como delegador), no convive con otra lógica.
- **NUNCA** usar Globe como taller mientras esté hibernado.

## 5. Consecuencias

- Greenhouse deja de acumular producción de marca; conserva canon, skills, propuestas y el motor del composer.
- El operador no cambia su forma de trabajar: sigue en `greenhouse-eo` con las mismas skills y comandos.
- Hay un costo de migración (TASK-1925) y un periodo de delegadores.
- `ai-generations/` queda como histórico en Greenhouse; las corridas nuevas nacen en el taller.
- Riesgo: que el taller se vuelva un segundo Greenhouse. Lo mitigan las reglas del §4 y la condición de
  convergencia con Globe.

## 6. Estado

| Paso | Estado |
|---|---|
| Repo creado, privado, esqueleto con routers, `.gitignore` de binarios y workspace `tools/*` | ✅ 2026-09-27 (`430d5b0`) |
| `tools/glitch-motion` | Lo construye TASK-1924 (sesión de Glitch, avisada el 2026-09-27) |
| Migración de `foto` y `brand-motion`, delegadores y reglas | TASK-1925 |
| CI mínimo (`pull_request`) y bucket de binarios | TASK-1925 |
| Convergencia con Globe | Cuando Globe reactive su capacidad de generación |
