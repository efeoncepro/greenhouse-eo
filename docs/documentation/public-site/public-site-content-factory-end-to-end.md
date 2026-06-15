# Public Site y Content Factory end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Public Site / WordPress / Content Factory
> **Rutas/scripts principales:** `/admin/public-site`, `pnpm public-website:*`, `docs/operations/public-site-*`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`, `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`

## Para que sirve

Public Site conecta Greenhouse con `efeoncepro.com` en WordPress/Kinsta. Content Factory ayuda a inspeccionar, planificar y preparar drafts o patches gobernados sin mutar el sitio publico por accidente.

La postura actual es conservadora:

- Greenhouse observa, planifica y prepara drafts.
- WordPress/Kinsta sirven el sitio publico.
- GitHub/runtime repo gobierna codigo.
- Writes/publicacion siguen gated por tareas de rollout y aprobacion humana.

## Evidencia revisada

Codigo y scripts:

- APIs `src/app/api/admin/public-site/**`.
- Librerias `src/lib/public-site/**`.
- Scripts `pnpm public-website:discover`, `bridge-inspect`, `content-factory:*`, `diff-runtime`, `deploy-dry-run`, `runtime-status`, `wpcli`.
- Documentos `docs/operations/public-site-*` y docs public-site existentes.

DB agregada:

- No hay schema `greenhouse_public_site` en la DB auditada.
- Public Site opera principalmente por archivos, manifests, reports versionados y APIs externas.
- Knowledge tiene 37 documentos y 425 chunks; puede ingerir manuales Public Site.

## Mapa funcional

| Capa | Estado actual | Que hace |
|---|---|---|
| Discovery | scripts read-only | Inventaria WordPress, theme, plugins, posts/pages |
| Runtime binding | docs/operations + repo runtime | Declara repo y baseline live |
| Content Factory | planners/validators | Genera planes y drafts, no publica por defecto |
| Bridge plugin | foundation draft-only | Health/readiness y writes limitados cuando este habilitado |
| Kinsta/GitOps | target | Deploy/rollback futuro gobernado |

## Flujo seguro

1. Descubrir runtime actual (`public-website:discover`).
2. Inspeccionar post/page o bloque.
3. Generar refresh plan o patch plan.
4. Validar draft/plan.
5. Preparar draft/private clone cuando el bridge lo permita.
6. Revisar evidencia.
7. Publicar solo por flujo aprobado futuro; no como efecto lateral del plan.

## Que hace automatico Greenhouse

- Lee WordPress/REST/WP-CLI cuando hay credenciales.
- Genera manifests, fingerprints y patch plans.
- Valida Gutenberg blocks y operaciones permitidas.
- Distingue draft/private/published.
- Evita mutar published source por defecto.

## Que hace el operador

- Decide objetivo editorial.
- Revisa plan y evidencia.
- Aprueba drafts o publica por canal autorizado.
- Verifica layout/cache/SEO/HubSpot despues de cambios.

## Fronteras importantes

- `efeonce-web` no es source of truth del WordPress live actual.
- No editar Elementor/Ohio por HTML crudo sin ownership.
- No publicar ni limpiar cache como parte de un plan read-only.
- No tratar drafts como contenido publicado.
- No exponer secrets o application passwords en docs/prompts.

## Preguntas que Nexa debe responder

- Como inspecciono un post de WordPress?
- Como preparo un draft sin tocar el publicado?
- Que diferencia hay entre refresh plan, patch plan y draft clone?
- Que comandos son read-only?
- Por que no puedo publicar desde Nexa todavia?
- Que evidencia necesito antes de tocar el sitio publico?

## Documentacion relacionada

- `docs/documentation/public-site/gutenberg-post-authoring-recipes.md`
- `docs/documentation/public-site/wordpress-ohio-elementor-layout.md`
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-layout.md`
- `docs/manual-de-uso/public-site/wordpress-ohio-elementor-landing-playbook.md`
