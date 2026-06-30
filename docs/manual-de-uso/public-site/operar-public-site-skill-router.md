# Operar la skill router del Public Site WordPress

> **Tipo:** Manual de uso / agentes
> **Version:** 1.0
> **Fecha:** 2026-06-30
> **Arquitectura:** [GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_SITE_SKILL_ROUTER_ARCHITECTURE_V1.md)
> **Skill Codex:** `.codex/skills/efeonce-public-site-wordpress/`
> **Skill Claude:** `.claude/skills/efeonce-public-site-wordpress/`

## Para Que Sirve

Este manual explica como usar y mantener la skill `efeonce-public-site-wordpress` despues del refactor a router.

La skill ya no carga toda la memoria operativa del sitio publico en un solo `SKILL.md`. Ahora:

- `SKILL.md` es la entrada liviana;
- `references/` guarda detalles por tema;
- `references/landings/` guarda contratos por landing.

Esto evita lecturas truncadas, reduce tokens y hace que futuras landings no inflen el archivo principal.

## Cuando Usarla

Usala para trabajo sobre:

- `efeoncepro.com`;
- WordPress/Kinsta;
- Ohio + Elementor;
- landings publicas;
- WP-CLI / REST / WP Abilities;
- Greenhouse WordPress bridge;
- Growth Forms embeds;
- AI Content Factory / Gutenberg;
- custom Elementor widgets;
- incidentes visuales o de layout del sitio publico.

Para cambios visuales en landings publicas, cargar tambien `greenhouse-gvc-playwright`.

Para cierre de cambios de skill, workflow, implementacion o incidentes, cargar `greenhouse-documentation-governor`.

## Paso A Paso Para Un Trabajo Normal

1. Carga la skill `efeonce-public-site-wordpress`.
2. Lee la matriz `Load Matrix` de `SKILL.md`.
3. Identifica el tipo de trabajo:
   - landing visual;
   - Elementor mutation;
   - Growth Forms;
   - Content Factory/Gutenberg;
   - custom widget;
   - runtime discovery;
   - incidente layout.
4. Carga solo las referencias necesarias.
5. Si el trabajo toca una landing registrada, carga su ficha.
6. Inspecciona runtime/Elementor antes de escribir.
7. Aplica el cambio por el carril gobernado correspondiente.
8. Verifica desktop/mobile 390px y gates especificos.
9. Actualiza docs/referencias si el contrato cambio.

## Que Referencia Cargar

| Si vas a... | Carga |
| --- | --- |
| Trabajar una landing publica | `references/landing-workflow.md` + `references/landing-registry.md` + ficha de landing |
| Mutar Elementor o CSS scoped | `references/elementor-mutation.md` |
| Tocar un form publico o Growth Forms | `references/growth-forms-wordpress.md` |
| Editar posts Gutenberg o Content Factory | `references/content-factory-gutenberg.md` |
| Crear/cambiar custom Elementor widget | `references/custom-elementor-widgets.md` |
| Diagnosticar Blog/Contacto u otro incidente historico | `references/layout-incidents.md` |
| Explorar Kinsta/WP/bridge/runtime | `references/runtime-and-discovery.md` |
| Trabajar AEO `/aeo-2/` | `references/landings/aeo.md` |
| Trabajar Agencia Creativa | `references/landings/agencia-creativa.md` |
| Trabajar HubSpot Services | `references/landings/hubspot-services.md` |

## Ejemplos

### AEO: Ajuste visual de la conversion

Cargar:

```text
SKILL.md
references/landing-workflow.md
references/landing-registry.md
references/elementor-mutation.md
references/growth-forms-wordpress.md
references/landings/aeo.md
```

Gates tipicos:

```bash
pnpm public-website:verify-aeo-form-typography
```

Verificar tambien `heroans` si el cambio no toca el hero.

### Post Gutenberg Existente

Cargar:

```text
references/content-factory-gutenberg.md
references/runtime-and-discovery.md
```

Flujo tipico:

```bash
pnpm public-website:content-factory:inspect-post-deep -- --post-id <id> --write
pnpm public-website:content-factory:refresh-plan -- --inspection <inspection.json> --write
pnpm public-website:content-factory:patch-plan -- --refresh-plan <plan.json> --brief <brief.json> --write
```

No mutar el post publicado. El write futuro debe ir a draft/private clone y requiere aprobacion.

### Custom Elementor Widget

Cargar:

```text
references/custom-elementor-widgets.md
references/elementor-mutation.md
references/runtime-and-discovery.md
```

Reglas claves:

- usar el plugin contenedor `eo-elementor-widgets`;
- no crear plugin nuevo por widget;
- scopear CSS bajo root del widget;
- validar PHP/JS;
- purgar cache y verificar paginas consumidoras.

### Runtime / Bridge Discovery

Cargar:

```text
references/runtime-and-discovery.md
```

Comandos tipicos:

```bash
pnpm public-website:discover
pnpm public-website:bridge-inspect -- --page-id <id>
pnpm public-website:runtime-status
pnpm public-website:diff-runtime
```

No pegar secretos en comandos ni logs.

## Como Registrar Una Nueva Landing

Cuando una landing nueva acumula guardrails repetibles:

1. Agrega fila a `references/landing-registry.md`.
2. Crea `references/landings/<slug>.md`.
3. Incluye como minimo:
   - URL;
   - `postId`;
   - status;
   - secciones root;
   - widgets especiales;
   - forms/surfaces;
   - hashes o featured image guardrails;
   - gates y no-hacer;
   - rollback/backups relevantes.
4. Sincroniza Codex y Claude.
5. Valida la skill.

## Como Actualizar La Skill

1. Edita primero la copia Codex:

```text
.codex/skills/efeonce-public-site-wordpress/
```

2. Mantén `SKILL.md` corto. Si una seccion se vuelve larga, crea o divide una referencia.
3. Sincroniza Claude:

```bash
rsync -a --delete .codex/skills/efeonce-public-site-wordpress/ .claude/skills/efeonce-public-site-wordpress/
```

4. Valida:

```bash
python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/efeonce-public-site-wordpress
python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/efeonce-public-site-wordpress
diff -qr .codex/skills/efeonce-public-site-wordpress .claude/skills/efeonce-public-site-wordpress
```

5. Si cambio el workflow, actualiza:

- `project_context.md`;
- `Handoff.md`;
- `changelog.md`;
- esta arquitectura/manual si el modelo de carga cambio.

6. Cierra con:

```bash
pnpm docs:closure-check -- .codex/skills/efeonce-public-site-wordpress .claude/skills/efeonce-public-site-wordpress project_context.md Handoff.md changelog.md
pnpm docs:context-check
```

## Auditoria De Que No Se Perdio Nada

Cuando refactorices una referencia o la matriz de carga, compara contra la version previa.

Comandos y cobertura minima:

```bash
python3 - <<'PY'
import re, subprocess, pathlib
old = subprocess.check_output(['git','show','HEAD:.codex/skills/efeonce-public-site-wordpress/SKILL.md'], text=True)
new = ''.join(p.read_text() for p in pathlib.Path('.codex/skills/efeonce-public-site-wordpress').rglob('*.md'))
cmds = sorted(set(re.findall(r'pnpm public-website:[A-Za-z0-9:_-]+', old)))
missing = [c for c in cmds if c not in new]
print('old_public_website_commands=', len(cmds))
print('missing=', missing)
PY
```

La lista `missing` debe quedar vacia o cada comando debe estar cubierto por una doc canonica enlazada.

Tambien revisa temas, no solo comandos:

- WP Abilities;
- Application Password;
- Kinsta staging/cache/backups;
- bridge provisioning;
- Content Factory/Gutenberg;
- Growth Forms;
- Elementor `Document::save()`;
- hero/featured image guardrails;
- layout incidents;
- WordPress React/Interactivity boundary.

## Que No Hacer

- No volver a convertir `SKILL.md` en un monolito.
- No crear una skill nueva por cada landing como primer recurso.
- No duplicar la doc canonica completa dentro de referencias.
- No guardar secretos ni headers.
- No sincronizar solo Codex o solo Claude cuando la regla aplica a ambos.
- No declarar que una referencia esta vigente si contradice runtime verificado.

## Estado Correcto De Cierre

Un cambio en esta skill queda cerrado cuando:

- Codex y Claude estan sincronizados;
- `quick_validate.py` pasa;
- `diff -qr` no muestra diferencias;
- los comandos anteriores siguen cubiertos;
- los docs de cierre estan actualizados;
- el agente puede cargar una landing nueva sin leer toda la historia del sitio.
