# Operar Public Site y Content Factory

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Public Site / Content Factory
> **Comandos:** `pnpm public-website:*`
> **Documentacion relacionada:** `docs/documentation/public-site/public-site-content-factory-end-to-end.md`

## Antes de empezar

Asume modo no mutante hasta que una task diga lo contrario. El sitio publico no se toca por accidente.

## Inspeccionar el sitio

1. Ejecuta discovery read-only si necesitas inventario.
2. Usa inspect o inspect-post-deep para una pagina/post especifico.
3. Revisa fingerprints, bloques, SEO, assets y layout notes.
4. Guarda evidencia versionada si la decision importa.

## Preparar contenido

1. Crea o recibe un brief.
2. Genera un plan/draft local.
3. Valida el draft.
4. Si el caso es editar contenido existente, genera refresh plan y patch plan.
5. Revisa que el plan diga que no muta published source.

## Preparar draft en WordPress

1. Verifica que el bridge draft-only este disponible.
2. Usa flujo de draft/private clone.
3. Revisa el draft creado.
4. No publiques como parte de la preparacion.

## Que no hacer

- No usar WP admin manual para saltarse manifests.
- No editar published source sin clone/backup/aprobacion.
- No limpiar cache ni deployar si la task no lo pide.
- No meter secrets en prompts o docs.
- No asumir que un plan local ya esta publicado.

## Problemas comunes

### El layout se rompe

Revisa docs Ohio/Elementor, page meta, containers y CSS page-scoped. No metas CSS global sin diagnostico.

### El bridge no permite escribir

Puede estar en modo draft-only o sin rollout. Eso es correcto; documenta blocker y owner.
