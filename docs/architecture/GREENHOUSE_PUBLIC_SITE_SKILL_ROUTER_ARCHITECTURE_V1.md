# Greenhouse Public Site Skill Router Architecture V1

> **Tipo:** Arquitectura operativa / agentes
> **Status:** Accepted
> **Fecha:** 2026-06-30
> **Owner:** Platform / Public Site Operations
> **Manual:** [operar-public-site-skill-router.md](../manual-de-uso/public-site/operar-public-site-skill-router.md)
> **Skills:** `.codex/skills/efeonce-public-site-wordpress/` and `.claude/skills/efeonce-public-site-wordpress/`

## 1. Proposito

Este documento define como funciona ahora la skill `efeonce-public-site-wordpress`.

La decision aceptada es que la skill principal sea un **router compacto** y que la memoria operativa larga viva en referencias cargables por dominio, workflow y landing.

Antes, `SKILL.md` mezclaba:

- reglas duras de seguridad;
- inventario runtime;
- incidentes historicos;
- comandos de Content Factory;
- contratos de landings;
- guardrails de widgets;
- notas de bridge, Kinsta, WP-CLI y Growth Forms.

Eso hacia que las lecturas se truncaran y que reglas importantes quedaran enterradas. El nuevo contrato aplica progressive disclosure: cargar lo minimo necesario para el trabajo actual.

## 2. Principios

1. **Router primero.** `SKILL.md` solo contiene reglas duras, matriz de carga, comandos comunes y protocolo de actualizacion.
2. **Referencia por dominio.** El detalle vive en `references/*.md`, con archivos pequenos y tematicos.
3. **Ficha por landing.** Cada landing publica con guardrails propios vive en `references/landings/<slug>.md`.
4. **Docs canonicas mandan.** Las referencias de la skill no reemplazan arquitectura, manuals, functional docs, tasks ni runtime verificado.
5. **Paridad Codex/Claude.** Los bundles `.codex` y `.claude` deben mantenerse sincronizados cuando el contrato aplica a ambos agentes.
6. **No secretos.** Ninguna referencia puede contener passwords, tokens, cookies, headers `Authorization`, private keys ni valores de secretos.
7. **Carga minima.** Un agente no debe leer todas las referencias por defecto; debe cargar la union minima que cubre el pedido.

## 3. Estructura

```text
.codex/skills/efeonce-public-site-wordpress/
  SKILL.md
  agents/openai.yaml
  references/
    landing-workflow.md
    landing-registry.md
    elementor-mutation.md
    growth-forms-wordpress.md
    content-factory-gutenberg.md
    agentic-blogpost-end-to-end.md
    custom-elementor-widgets.md
    layout-incidents.md
    runtime-and-discovery.md
    landings/
      aeo.md
      agencia-creativa.md
      hubspot-services.md
```

La copia Claude debe espejar esta estructura:

```text
.claude/skills/efeonce-public-site-wordpress/
```

## 4. Responsabilidades

| Archivo | Responsabilidad |
| --- | --- |
| `SKILL.md` | Trigger, reglas duras, matriz de carga y comandos comunes. No almacena historia larga. |
| `landing-workflow.md` | Loop comun para trabajar landings publicas: identificar, inspeccionar, respaldar, mutar, purgar, verificar y cerrar. |
| `landing-registry.md` | Indice de landings vivas con URL, post id, status, ficha y guardrails claves. |
| `elementor-mutation.md` | Carril seguro para `Document::save()`, backups, metas Ohio, CSS scoped, controles Ohio y riesgos. |
| `growth-forms-wordpress.md` | Contrato WordPress como host surface de Growth Forms y limites del bridge AEO. |
| `content-factory-gutenberg.md` | AI Content Factory, Gutenberg posts, maps, draft/private clones y comandos `public-website:content-factory:*`. |
| `agentic-blogpost-end-to-end.md` | Orquestacion completa idea→publicacion: skills, metadata, media, autorizacion humana, snapshot/rollback y QA live. |
| `custom-elementor-widgets.md` | Plugin contenedor `eo-elementor-widgets`, widgets server-rendered vs host adapters y deploy rail. |
| `layout-incidents.md` | Incidentes layout historicos aun utiles: Blog, Contacto y lecciones de Ohio/meta vs CSS global. |
| `runtime-and-discovery.md` | Inventario runtime, WP Abilities, Application Password reference, bridge, Kinsta, repo binding y WordPress React boundary. |
| `landings/*.md` | Contratos compactos por landing: ids, secciones, hashes, forms, assets, gates y no-hacer. |

## 5. Flujo De Carga

El agente sigue este algoritmo:

1. Cargar `SKILL.md`.
2. Identificar el tipo de trabajo.
3. Cargar las referencias indicadas por la matriz.
4. Si el trabajo toca una landing registrada, cargar su ficha.
5. Si la landing no esta registrada, cargar `landing-workflow.md` y `landing-registry.md`, inspeccionar runtime y crear la ficha cuando el cambio deja guardrails repetibles.
6. Consultar docs canonicas cuando una referencia apunta a ellas o cuando el cambio modifica un contrato estable.

Ejemplos:

| Pedido | Referencias |
| --- | --- |
| Cambiar spacing de AEO `/aeo-2/` | `landing-workflow.md`, `landing-registry.md`, `elementor-mutation.md`, `landings/aeo.md` |
| Revisar submit Growth Forms en WordPress | `growth-forms-wordpress.md`, landing file si aplica |
| Editar un post Gutenberg existente | `content-factory-gutenberg.md`, `runtime-and-discovery.md` |
| Crear y publicar un blogpost agentic end to end | `content-factory-gutenberg.md`, `agentic-blogpost-end-to-end.md`, `runtime-and-discovery.md` |
| Crear un custom widget Elementor | `custom-elementor-widgets.md`, `elementor-mutation.md`, landing file si aplica |
| Investigar WP/Kinsta/bridge | `runtime-and-discovery.md` |
| Corregir un layout antiguo Blog/Contacto | `layout-incidents.md`, `elementor-mutation.md` |

## 6. Contrato De Actualizacion

Cuando una sesion descubre una regla nueva:

1. Actualizar primero la fuente canonica si existe (`docs/architecture`, `docs/documentation`, `docs/manual-de-uso`, task o issue).
2. Actualizar la referencia mas pequena que enruta esa regla.
3. Actualizar `landing-registry.md` y/o `landings/<slug>.md` si el aprendizaje es landing-specific.
4. Sincronizar `.codex` y `.claude`.
5. Validar ambas skills.
6. Registrar delta en `project_context.md`, `Handoff.md` y `changelog.md` si cambia el workflow o un contrato operativo.

No se debe re-acumular historia larga en `SKILL.md`. Si una referencia crece demasiado, se divide por tema o landing.

## 7. Validacion

Comandos canonicos:

```bash
python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/efeonce-public-site-wordpress
python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py .claude/skills/efeonce-public-site-wordpress
diff -qr .codex/skills/efeonce-public-site-wordpress .claude/skills/efeonce-public-site-wordpress
pnpm docs:closure-check -- .codex/skills/efeonce-public-site-wordpress .claude/skills/efeonce-public-site-wordpress project_context.md Handoff.md changelog.md
pnpm docs:context-check
```

Para auditoria de perdida de cobertura, comparar comandos y temas de la version anterior contra el nuevo bundle:

```bash
python3 - <<'PY'
import re, subprocess, pathlib
old = subprocess.check_output(['git','show','HEAD:.codex/skills/efeonce-public-site-wordpress/SKILL.md'], text=True)
new = ''.join(p.read_text() for p in pathlib.Path('.codex/skills/efeonce-public-site-wordpress').rglob('*.md'))
cmds = sorted(set(re.findall(r'pnpm public-website:[A-Za-z0-9:_-]+', old)))
missing = [c for c in cmds if c not in new]
print('missing=', missing)
PY
```

Un refactor de la skill solo puede cerrarse si:

- `SKILL.md` sigue compacto;
- los comandos previos quedan cubiertos por referencias o docs canonicas enlazadas;
- Codex y Claude estan sincronizados;
- no se introducen secretos;
- las referencias nuevas son pequenas y cargables bajo demanda.

## 8. Relacion Con Docs Canonicas

La skill router es memoria operativa para agentes. No es source of truth de producto ni arquitectura final.

Fuentes canonicas relacionadas:

- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md`
- `docs/documentation/public-site/public-site-content-factory-end-to-end.md`
- `docs/manual-de-uso/public-site/operar-public-site-content-factory.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/public-site/aeo-landing-elementor.md`

Cuando haya conflicto entre skill/reference y runtime verificado, prevalece runtime + arquitectura/docs canonicas; la skill se corrige.
