# Operar Public Site y Content Factory

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Public Site / Content Factory / Astro binding
> **Comandos/API:** `pnpm public-website:*`, `GET /api/admin/public-site/binding`
> **Documentacion relacionada:** `docs/documentation/public-site/public-site-content-factory-end-to-end.md`, `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_BINDING_READER_V1.md`

## Antes de empezar

Asume modo no mutante hasta que una task diga lo contrario. El sitio publico no se toca por accidente.

## Inspeccionar el sitio

1. Ejecuta discovery read-only si necesitas inventario.
2. Usa inspect o inspect-post-deep para una pagina/post especifico.
3. Revisa fingerprints, bloques, SEO, assets y layout notes.
4. Guarda evidencia versionada si la decision importa.

## Leer el binding Astro/Vercel desde Greenhouse

1. Usa `GET /api/admin/public-site/binding` con sesion admin de Greenhouse.
2. Verifica `contractVersion="public-site-astro-binding.v1"`.
3. Revisa `status`, `confidence` y `degradedSources[]` antes de confiar en el estado live.
4. Compara `github.commits[]` con `vercel.deployments[]` cuando necesites saber si el deploy production coincide con `main`.
5. Si GitHub o Vercel degradan por token/scope, no inventes credenciales ni cambies env vars sin task; documenta el blocker y mantiene el cierre como parcial para esa fuente.

Este reader es solo lectura. No dispara builds, deploys, rollback, alias, DNS ni cambios en WordPress/Kinsta.

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
- No usar el binding reader como permiso implicito para tocar Vercel/GitHub.
- No meter secrets en prompts o docs.
- No asumir que un plan local ya esta publicado.

## Problemas comunes

### El layout se rompe

Revisa docs Ohio/Elementor, page meta, containers y CSS page-scoped. No metas CSS global sin diagnostico.

### El bridge no permite escribir

Puede estar en modo draft-only o sin rollout. Eso es correcto; documenta blocker y owner.
