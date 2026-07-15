# Pendiente de construir — 2 láminas del deck SKY: clientes + testimonios (build-ready)

> **Estado:** diseño confirmado por el operador (2026-07-15), **build bloqueado** hasta que el composer
> quede limpio (Codex mid-flight en TASK-1414 → regla single-owner de `ISSUE-122` / runbook
> `docs/operations/runbooks/composer-visual-gate.md`). Este doc es para no perder nada + construir rápido.
> **Ambos slides necesitan PLANTILLA NUEVA en el catálogo** (`registry.json` + `resolvers.ts` + `.html`/
> `.slots.json`) + internalizar assets → es trabajo del composer, que hoy es área activa de Codex.

## Lámina A — "SKY ya está en buena compañía" (clientes)

- **Content-type nuevo:** `client-logos` (grilla de logos con **plate de contraste por logo** — reusar el
  patrón del `tool-logo-asset` / `ToolStackFull` que Codex agregó en TASK-1414, para que logos claros y
  oscuros queden legibles sin parches por marca). Resolver cerrado `client-logo-asset` (clave → SVG
  aprobado), espejo de `tool-logo-asset`.
- **Headline (ángulo confirmado):** SKY es cliente → *"SKY ya trabaja con Efeonce — en muy buena compañía"*
  (o variante). El logo de **SKY va DENTRO de la grilla, destacado**.
- **Stat de apoyo (el "+"):** **"+120 empresas en movimiento"** (línea real del sitio) — señala que hay
  muchos más clientes que los mostrados.
- **Logos (curaduría "los más relevantes" + SKY, confirmado):** SKY · Carozzi · Marca Chile · Gobierno de
  Santiago · Bresler · Aguas Andinas · Universidad de Temuco · ANAM (8 fuertes + el "+120"). *(Fuera:
  BeFun y Berel — menos reconocibles / Berel rinde tenue sobre navy.)* Breadth: gobierno + consumo masivo
  + servicios + academia = credibilidad transversal.
- **Assets fuente (SVG limpios, de AXIS Figma):** `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/assets/img/brand-logos/`
  → `sky.svg`, `carozzi.svg`, `marca-chile.svg`, `gobierno-santiago.svg`, `bresler.svg`, `aguas-andinas.svg`,
  `universidad-temuco.svg`, `anam.svg`. **Internalizar** al catálogo (render hermético bloquea red).
- **Molde:** navy AXIS, plates de contraste, spacing generoso, SKY resaltado. Premium = grilla uniforme,
  no un collage. GVC mirado hasta enterprise.

## Lámina B — "Esto dice el equipo de SKY" (testimonios)

- **Content-type nuevo:** `testimonials` (2 tarjetas de cita con comillas + nombre + rol + enlace).
- **Headline (golpe, confirmado honesto):** *"SKY ya trabaja con Efeonce. Un año. Esto dice su equipo."*
  El comité ve a **su propia gente** avalando → baja el riesgo de adjudicar.
- **Las 2 reviews (verbatim, de experiencia.efeoncepro.com — SOLO SKY):**
  - **Constanza Rojas — Team SKY:** *"Super contenta con el trabajo que hemos realizado este año. Nos han
    ayudado harto en las automatizaciones y en agilizar procesos. Hemos formado un muy bonito equipo, son
    personas super cálidas. Le agradezco a todo el equipo por estar siempre dispuestos a trabajar con
    nosotros y entregar lo mejor de si."*
  - **Adriana Contreras — Team SKY:** *"Agradezco el super trabajo que hemos estado haciendo con efeonce.
    Hemos mejorado muchísimo en cuanto a las herramientas tecnológicas. Siento que hemos podido gracias a
    ellos agilizar mucho la carga de trabajo. Espero que a futuro vengan muchísimas cosas grandes y que
    siempre podamos estar trabajando de la mano."*
- **Enlace (confirmado):** **`https://experiencia.efeoncepro.com`** — la landing que **resume el primer año
  completo** de trabajo con SKY + las reviews. Va en la lámina como pieza viva verificable (como la
  Radiografía). Registrar también en `artifact-manifest.json` (audience `client_facing`, `render: by_link`).
- 🔴 **Framing honesto (regla dura):** las reviews hablan de **automatizaciones / herramientas / agilizar
  procesos** — la relación **general** de un año, **NO** del blog/SEO. La lámina las enmarca como **prueba
  de relación y confianza** (SKY ya nos conoce y está feliz), **NUNCA** como "resultados de nuestro servicio
  SEO". Real, verificable, cero caso inventado (doctrina `seo-aeo-practice`).

## Secuencia en el deck

Van cerca del cierre, como prueba social antes de la económica: idealmente **después de la #18 equipo**
(quién ejecuta) y **antes de `seguro`/`cumplimiento`** (el "por qué es seguro adjudicar"). El orden exacto
se fija al construir, contra el `deck-plan` ya con las 3 láminas de Codex insertadas.

## Pasos de build (cuando el composer esté limpio — single owner)

1. Leer el runbook `docs/operations/runbooks/composer-visual-gate.md` (obligatorio antes de `--freeze`).
2. Confirmar composer **limpio** (`git status` sin `M`/`D`/`??` ajenos en `src/lib/artifact-composer`/baseline).
3. Crear plantilla `client-logos` (`.html` + `.slots.json` + registry + resolver `client-logo-asset` +
   internalizar los 8 SVG a `assets/clients/`) y plantilla `testimonials` (`.html` + `.slots.json` + registry).
4. Suite: `pnpm vitest run src/lib/artifact-composer` (composability/boundary/catalog-extensibility).
5. Insertar las 2 láminas en `deck-plan.json` + `pnpm deck:compose` + **Read de los 2 frames** (GVC).
6. `BASELINE_DELTAS.md` (2 láminas + sus probes) + `pnpm composer:visual-gate --freeze` + **commit atómico**.
7. Registrar `experiencia.efeoncepro.com` en `artifact-manifest.json`.
